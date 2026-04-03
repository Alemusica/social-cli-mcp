/**
 * Pipeline Service — Shared Interface Layer (Drizzle)
 *
 * Single source of truth for pipeline operations.
 * MCP Server, Telegram Bot, and Admin Dashboard all call this.
 *
 * Relationships:
 *   USES: email-generator (generateOutreachBatch) — NOT migrated, imported from old path
 *   USES: email-guard (daily limits, dedup)
 *   USES: preflight (pre-send checks)
 *   USES: Postgres outreach_batch table (state persistence)
 *   CALLED BY: mcp-server, telegram-bot, admin-dashboard API routes
 *
 * Migrated from: src/outreach/pipeline-service.ts
 * Change: SurrealDB getDb() -> Drizzle ORM
 */

import * as fs from "fs";
import * as path from "path";
import { db } from "../../db/client.js";
import { email as emailTable, outreachBatch, venue } from "../../db/schema.js";
import { eq, and, desc, inArray } from "drizzle-orm";
import {
  isDailyLimitReached,
  getTodaySendCount,
  wasEmailEverSent,
  recordSend,
  DAILY_LIMIT,
} from "../../lib/email-guard.js";
import { preflightCheck } from "./preflight.js";
import { GmailSender, loadGmailSender } from "../platform/gmail.js";
import { createLogger } from "../../lib/logger.js";

const log = createLogger("outreach-pipeline");

// ── Types ────────────────────────────────────────────────────

export interface PipelineConfig {
  inputFile: string;
  outputDir: string;
  batchPrefix: string;
  dryRun: boolean;
  skipAudit: boolean;
  maxBatchSize: number;
  maxRetries: number;
}

export interface OutreachEmail {
  id: string;
  venue: string;
  city: string;
  country: string;
  type: string;
  tier: number;
  to: string;
  subject: string;
  body: string;
  video: string;
  strategy: string;
  generatedAt: string;
  _meta?: {
    confidence: number;
    flaggedForReview: boolean;
    brandReviewPass: boolean;
    brandIssues: string[];
    auditNotes: string[];
    categorySource: "deterministic" | "agent";
  };
}

export interface PipelineResult {
  generated: OutreachEmail[];
  skippedPreflight: Array<{ venue: string; email: string; reason: string }>;
  skippedBrand: Array<{ venue: string; issues: string[] }>;
  flaggedForReview: OutreachEmail[];
  audit: { pass: boolean; issues: any[]; summary: string } | null;
  outputFile: string | null;
  stats: {
    totalInput: number;
    validEmails: number;
    preflightPassed: number;
    composed: number;
    brandPassed: number;
    finalOutput: number;
  };
}

export interface PipelineBatch {
  id: string;
  status: "generating" | "preview" | "approved" | "sending" | "sent" | "error";
  config: PipelineConfig;
  result?: PipelineResult;
  emailCount: number;
  createdAt: string;
  approvedAt?: string;
  sentAt?: string;
  errorMessage?: string;
  sendResults?: SendResult[];
}

export interface SendResult {
  id: string;
  venue: string;
  to: string;
  status: "sent" | "skipped" | "failed" | "duplicate";
  messageId?: string;
  error?: string;
  timestamp: string;
}

export interface DailyLimits {
  sent: number;
  limit: number;
  remaining: number;
  isLimitReached: boolean;
}

// ── Pipeline Execution ───────────────────────────────────────

export async function runPipeline(
  inputFile: string,
  tenantId: string,
  options: Partial<PipelineConfig> = {},
): Promise<PipelineBatch> {
  // Enforce: only one active batch at a time
  const active = await getActiveBatch(tenantId);
  if (active) {
    throw new Error(
      `Batch ${active.id} is already ${active.status}. ` +
        `Resolve it before starting a new pipeline.`,
    );
  }

  const resolvedInput = path.resolve(inputFile);
  if (!fs.existsSync(resolvedInput)) {
    throw new Error(`Input file not found: ${resolvedInput}`);
  }

  const config: PipelineConfig = {
    inputFile: resolvedInput,
    outputDir: options.outputDir || "content/outreach/generated",
    batchPrefix: options.batchPrefix || deriveBatchPrefix(resolvedInput),
    dryRun: true, // always dry-run — sendApprovedBatch handles actual send
    skipAudit: options.skipAudit ?? false,
    maxBatchSize: Math.min(options.maxBatchSize ?? 20, 20),
    maxRetries: options.maxRetries ?? 1,
  };

  // Save initial batch record
  const batchId = `batch_${Date.now()}`;
  const batch: PipelineBatch = {
    id: batchId,
    status: "generating",
    config,
    emailCount: 0,
    createdAt: new Date().toISOString(),
  };

  await saveBatch(batch, tenantId);

  try {
    // Import email generator dynamically — it may still reference old paths
    // TODO: email generation logic — was in old src/outreach/email-generator.ts
    // Needs reimplementation using new services architecture
    const result: PipelineResult = {
      generated: [],
      skippedPreflight: [],
      skippedBrand: [],
      flaggedForReview: [],
      audit: null,
      outputFile: null,
      stats: {
        totalInput: 0,
        validEmails: 0,
        preflightPassed: 0,
        composed: 0,
        brandPassed: 0,
        finalOutput: 0,
      },
    };

    batch.status = "preview";
    batch.result = result;
    batch.emailCount = result.generated.length;
    await saveBatch(batch, tenantId);

    return batch;
  } catch (err: any) {
    batch.status = "error";
    batch.errorMessage = err.message;
    await saveBatch(batch, tenantId);
    throw err;
  }
}

// ── Preview ──────────────────────────────────────────────────

export async function getBatchPreview(
  batchId: string,
  tenantId: string,
): Promise<{
  batch: PipelineBatch;
  emails: Array<{
    index: number;
    venue: string;
    city: string;
    country: string;
    type: string;
    tier: number;
    to: string;
    subject: string;
    video: string;
    strategy: string;
    confidence: number;
    flagged: boolean;
    bodyPreview: string;
  }>;
  rejected: PipelineResult["skippedBrand"];
  stats: PipelineResult["stats"];
  audit: PipelineResult["audit"];
}> {
  const batch = await loadBatch(batchId, tenantId);
  if (!batch) throw new Error(`Batch ${batchId} not found`);
  if (!batch.result) throw new Error(`Batch ${batchId} has no result yet`);

  const emails = batch.result.generated.map((e, i) => ({
    index: i,
    venue: e.venue,
    city: e.city,
    country: e.country,
    type: e.type,
    tier: e.tier,
    to: e.to,
    subject: e.subject,
    video: e.video,
    strategy: e.strategy,
    confidence: e._meta?.confidence ?? 0,
    flagged: e._meta?.flaggedForReview ?? false,
    bodyPreview: e.body.replace(/<[^>]*>/g, "").slice(0, 300),
  }));

  return {
    batch,
    emails,
    rejected: batch.result.skippedBrand,
    stats: batch.result.stats,
    audit: batch.result.audit,
  };
}

export async function getEmailDetail(
  batchId: string,
  index: number,
  tenantId: string,
): Promise<OutreachEmail> {
  const batch = await loadBatch(batchId, tenantId);
  if (!batch?.result) throw new Error(`Batch ${batchId} not found or no result`);
  const emailItem = batch.result.generated[index];
  if (!emailItem)
    throw new Error(
      `Email index ${index} out of range (batch has ${batch.result.generated.length})`,
    );
  return emailItem;
}

// ── Approval Gate (sigma-2) ──────────────────────────────────

export async function approveBatch(batchId: string, tenantId: string): Promise<PipelineBatch> {
  const batch = await loadBatch(batchId, tenantId);
  if (!batch) throw new Error(`Batch ${batchId} not found`);
  if (batch.status !== "preview") {
    throw new Error(`Cannot approve batch in status '${batch.status}'. Must be 'preview'.`);
  }

  batch.status = "approved";
  batch.approvedAt = new Date().toISOString();
  await saveBatch(batch, tenantId);
  return batch;
}

// ── Send ─────────────────────────────────────────────────────

export async function sendApprovedBatch(
  batchId: string,
  tenantId: string,
): Promise<PipelineBatch> {
  const batch = await loadBatch(batchId, tenantId);
  if (!batch) throw new Error(`Batch ${batchId} not found`);
  if (batch.status !== "approved") {
    throw new Error(`Cannot send batch in status '${batch.status}'. Must be 'approved'.`);
  }
  if (!batch.result?.generated.length) {
    throw new Error("Batch has no emails to send");
  }

  if (await isDailyLimitReached(tenantId)) {
    throw new Error(`Daily send limit reached (${DAILY_LIMIT}/day). Try again tomorrow.`);
  }

  batch.status = "sending";
  await saveBatch(batch, tenantId);

  try {
    const sender = loadGmailSender();
    if (!sender.isConfigured()) {
      throw new Error("Gmail sender not configured — GMAIL_USER and GMAIL_APP_PASSWORD required");
    }

    const results: SendResult[] = [];
    const DELAY_MS = 3000;

    for (let i = 0; i < batch.result.generated.length; i++) {
      const emailItem = batch.result.generated[i];

      // Check daily limit before each send
      if (await isDailyLimitReached(tenantId)) {
        results.push({
          id: emailItem.id,
          venue: emailItem.venue,
          to: emailItem.to,
          status: "skipped",
          error: "Daily limit reached",
          timestamp: new Date().toISOString(),
        });
        continue;
      }

      // Dedup check
      const alreadySent = await wasEmailEverSent(emailItem.to, tenantId);
      if (alreadySent) {
        results.push({
          id: emailItem.id,
          venue: emailItem.venue,
          to: emailItem.to,
          status: "duplicate",
          error: `Already sent to ${emailItem.to}`,
          timestamp: new Date().toISOString(),
        });
        continue;
      }

      // Preflight
      try {
        const pf = await preflightCheck(emailItem.to, "initial", tenantId, emailItem.venue);
        if (!pf.clear) {
          results.push({
            id: emailItem.id,
            venue: emailItem.venue,
            to: emailItem.to,
            status: "skipped",
            error: pf.blockers.join("; "),
            timestamp: new Date().toISOString(),
          });
          continue;
        }
      } catch {
        // Preflight DB unavailable — proceed (dedup already checked above)
      }

      // Send via GmailSender
      try {
        const info = await sender.send({
          to: emailItem.to,
          subject: emailItem.subject,
          html: emailItem.body,
          text: emailItem.body.replace(/<[^>]*>/g, ""),
        });

        if (!info.success) {
          results.push({
            id: emailItem.id,
            venue: emailItem.venue,
            to: emailItem.to,
            status: "failed",
            error: info.error || "Unknown send error",
            timestamp: new Date().toISOString(),
          });
          continue;
        }

        await recordSend(emailItem.to, emailItem.venue, tenantId);
        results.push({
          id: emailItem.id,
          venue: emailItem.venue,
          to: emailItem.to,
          status: "sent",
          messageId: info.messageId,
          timestamp: new Date().toISOString(),
        });

        // Persist to email table
        await persistSentEmail(emailItem, info.messageId || "", tenantId);
      } catch (err: any) {
        results.push({
          id: emailItem.id,
          venue: emailItem.venue,
          to: emailItem.to,
          status: "failed",
          error: err.message,
          timestamp: new Date().toISOString(),
        });
      }

      // Rate limit
      if (i < batch.result.generated.length - 1) {
        await new Promise((r) => setTimeout(r, DELAY_MS));
      }
    }

    batch.status = "sent";
    batch.sentAt = new Date().toISOString();
    batch.sendResults = results;
    await saveBatch(batch, tenantId);

    // Update tracking.json
    updateTracking(results);

    return batch;
  } catch (err: any) {
    batch.status = "error";
    batch.errorMessage = err.message;
    await saveBatch(batch, tenantId);
    throw err;
  }
}

// ── Queries ──────────────────────────────────────────────────

export async function getBatchStatus(
  tenantId: string,
  batchId?: string,
): Promise<PipelineBatch | PipelineBatch[]> {
  if (batchId) {
    const batch = await loadBatch(batchId, tenantId);
    if (!batch) throw new Error(`Batch ${batchId} not found`);
    return batch;
  }
  return listRecentBatches(tenantId);
}

export async function getDailyLimits(tenantId: string): Promise<DailyLimits> {
  const sent = await getTodaySendCount(tenantId);
  return {
    sent,
    limit: DAILY_LIMIT,
    remaining: Math.max(0, DAILY_LIMIT - sent),
    isLimitReached: sent >= DAILY_LIMIT,
  };
}

export async function getOrchestrationStats(
  batchId: string,
  tenantId: string,
): Promise<{
  emailCount: number;
  stats: PipelineResult["stats"] | null;
  rejected: PipelineResult["skippedBrand"];
  flagged: number;
  audit: PipelineResult["audit"];
}> {
  const batch = await loadBatch(batchId, tenantId);
  if (!batch?.result) throw new Error(`Batch ${batchId} not found or no result`);

  return {
    emailCount: batch.emailCount,
    stats: batch.result.stats,
    rejected: batch.result.skippedBrand,
    flagged: batch.result.flaggedForReview.length,
    audit: batch.result.audit,
  };
}

// ── Persistence (Drizzle → outreach_batch table) ─────────────

async function saveBatch(batch: PipelineBatch, tenantId: string): Promise<void> {
  try {
    const dataPayload: Record<string, any> = {
      config: batch.config,
      result_json: batch.result ? JSON.stringify(batch.result) : null,
      error_message: batch.errorMessage || null,
      send_results: batch.sendResults ? JSON.stringify(batch.sendResults) : null,
    };

    // Upsert: try update first, then insert
    const existing = await db
      .select({ id: outreachBatch.id })
      .from(outreachBatch)
      .where(eq(outreachBatch.id, batch.id))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(outreachBatch)
        .set({
          status: batch.status,
          emailCount: batch.emailCount,
          data: dataPayload,
          approvedAt: batch.approvedAt ? new Date(batch.approvedAt) : null,
          sentAt: batch.sentAt ? new Date(batch.sentAt) : null,
        })
        .where(eq(outreachBatch.id, batch.id));
    } else {
      await db.insert(outreachBatch).values({
        id: batch.id,
        tenantId,
        status: batch.status,
        emailCount: batch.emailCount,
        inputFile: batch.config.inputFile,
        data: dataPayload,
        approvedAt: batch.approvedAt ? new Date(batch.approvedAt) : null,
        sentAt: batch.sentAt ? new Date(batch.sentAt) : null,
      });
    }
  } catch (err) {
    log.warn(`could not persist batch ${batch.id} to DB`, { error: String(err) });
  }
}

async function loadBatch(batchId: string, tenantId: string): Promise<PipelineBatch | null> {
  try {
    const rows = await db
      .select()
      .from(outreachBatch)
      .where(and(eq(outreachBatch.id, batchId), eq(outreachBatch.tenantId, tenantId)))
      .limit(1);

    const row = rows[0];
    if (!row) return null;

    const data = (row.data || {}) as Record<string, any>;

    return {
      id: batchId,
      status: row.status as PipelineBatch["status"],
      config: data.config || {},
      result: data.result_json ? JSON.parse(data.result_json) : undefined,
      emailCount: row.emailCount || 0,
      createdAt: row.createdAt?.toISOString() || "",
      approvedAt: row.approvedAt?.toISOString() || undefined,
      sentAt: row.sentAt?.toISOString() || undefined,
      errorMessage: data.error_message || undefined,
      sendResults: data.send_results ? JSON.parse(data.send_results) : undefined,
    };
  } catch (err) {
    log.error("loadBatch failed", { batchId, error: String(err) });
    return null;
  }
}

async function getActiveBatch(tenantId: string): Promise<PipelineBatch | null> {
  try {
    const rows = await db
      .select()
      .from(outreachBatch)
      .where(
        and(
          eq(outreachBatch.tenantId, tenantId),
          inArray(outreachBatch.status, ["generating", "preview"]),
        ),
      )
      .orderBy(desc(outreachBatch.createdAt))
      .limit(1);

    const row = rows[0];
    if (!row) return null;

    const data = (row.data || {}) as Record<string, any>;

    return {
      id: row.id,
      status: row.status as PipelineBatch["status"],
      config: data.config || {},
      result: data.result_json ? JSON.parse(data.result_json) : undefined,
      emailCount: row.emailCount || 0,
      createdAt: row.createdAt?.toISOString() || "",
      approvedAt: row.approvedAt?.toISOString() || undefined,
      sentAt: row.sentAt?.toISOString() || undefined,
      errorMessage: data.error_message || undefined,
    };
  } catch {
    return null;
  }
}

async function listRecentBatches(tenantId: string): Promise<PipelineBatch[]> {
  try {
    const rows = await db
      .select()
      .from(outreachBatch)
      .where(eq(outreachBatch.tenantId, tenantId))
      .orderBy(desc(outreachBatch.createdAt))
      .limit(10);

    return rows.map((row) => {
      const data = (row.data || {}) as Record<string, any>;
      return {
        id: row.id,
        status: row.status as PipelineBatch["status"],
        config: data.config || {},
        emailCount: row.emailCount || 0,
        createdAt: row.createdAt?.toISOString() || "",
        approvedAt: row.approvedAt?.toISOString() || undefined,
        sentAt: row.sentAt?.toISOString() || undefined,
        errorMessage: data.error_message || undefined,
      };
    });
  } catch {
    return [];
  }
}

// ── Helpers ──────────────────────────────────────────────────

async function persistSentEmail(
  emailItem: OutreachEmail,
  messageId: string,
  tenantId: string,
): Promise<void> {
  try {
    // Look up venue by name for FK
    const venueRows = await db
      .select({ id: venue.id })
      .from(venue)
      .where(
        and(
          eq(venue.tenantId, tenantId),
          eq(venue.name, emailItem.venue),
        ),
      )
      .limit(1);

    await db.insert(emailTable).values({
      tenantId,
      toAddress: emailItem.to,
      subject: emailItem.subject,
      body: emailItem.body,
      messageId,
      emailType: "initial",
      venueId: venueRows[0]?.id || null,
      batchId: null,
    });
  } catch (err) {
    log.warn("persistSentEmail failed — send-log is authoritative", { error: String(err) });
  }
}

function updateTracking(results: SendResult[]): void {
  const trackingFile = path.join(process.cwd(), "content/outreach/tracking.json");
  try {
    let tracking: any[] = [];
    if (fs.existsSync(trackingFile)) {
      tracking = JSON.parse(fs.readFileSync(trackingFile, "utf-8"));
    }
    const newEntries = results
      .filter((r) => r.status === "sent")
      .map((r) => ({
        ...r,
        sentAt: r.timestamp,
        followUpDue: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      }));
    tracking.push(...newEntries);
    fs.writeFileSync(trackingFile, JSON.stringify(tracking, null, 2));
  } catch {
    /* tracking update is best-effort */
  }
}

function deriveBatchPrefix(filepath: string): string {
  return (
    path
      .basename(filepath, path.extname(filepath))
      .replace(/deep-research-/g, "")
      .replace(/\d{4}-\d{2}-\d{2}/g, "")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "") || "batch"
  );
}
