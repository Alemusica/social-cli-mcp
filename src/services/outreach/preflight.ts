/**
 * Outreach Pre-flight Check (Drizzle)
 *
 * Composes all dedup + state checks into one function
 * called before ANY outreach action.
 *
 * Sources (checked in order):
 *   1. Daily send limit
 *   2. Postgres email table (authoritative)
 *   3. conversationStore — thread status + history
 *   4. tracking.json — file fallback
 *
 * FAIL-CLOSED: if DB unreachable, blocks.
 *
 * Migrated from: src/outreach/preflight.ts
 * Change: SurrealDB getDb() -> Drizzle ORM
 */

import { db } from "../../db/client.js";
import { email, outreachReply } from "../../db/schema.js";
import { eq, and, ilike, desc, sql } from "drizzle-orm";
import { isDailyLimitReached } from "../../lib/email-guard.js";
import { getConversation, type OutreachConversation } from "./conversation.js";
import { createLogger } from "../../lib/logger.js";
import * as fs from "fs";
import * as path from "path";

const log = createLogger("outreach-preflight");
const TRACKING_FILE = path.join(process.cwd(), "content/outreach/tracking.json");

// ── Types ──

export type ActionType = "initial" | "followup" | "reply";

export interface PreflightResult {
  clear: boolean;
  blockers: string[];
  warnings: string[];
  conversation: OutreachConversation | null;
  lastContactDays: number | null;
  dbEmailCount: number;
}

// ── Core ──

/**
 * Run all pre-flight checks for an outreach action.
 *
 * @param to - recipient email address
 * @param actionType - what kind of action: initial | followup | reply
 * @param tenantId - tenant context
 * @param venueName - venue name (for conversation lookup, optional)
 */
export async function preflightCheck(
  to: string,
  actionType: ActionType,
  tenantId: string,
  venueName?: string,
): Promise<PreflightResult> {
  const blockers: string[] = [];
  const warnings: string[] = [];
  let conversation: OutreachConversation | null = null;
  let lastContactDays: number | null = null;
  let dbEmailCount = 0;

  const toLC = to.toLowerCase();

  // ── 1. Daily limit ──
  if (await isDailyLimitReached(tenantId)) {
    blockers.push("Daily send limit reached");
  }

  // ── 2. Postgres email table (authoritative) ──
  try {
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(email)
      .where(
        and(
          eq(email.tenantId, tenantId),
          ilike(email.toAddress, toLC),
        ),
      );

    dbEmailCount = Number(countResult[0]?.count ?? 0);

    if (dbEmailCount > 0) {
      // Get details for rule evaluation
      const details = await db
        .select({
          emailType: email.emailType,
          sentAt: email.sentAt,
          responseReceived: email.responseReceived,
          responseSentiment: email.responseSentiment,
        })
        .from(email)
        .where(
          and(
            eq(email.tenantId, tenantId),
            ilike(email.toAddress, toLC),
          ),
        )
        .orderBy(desc(email.sentAt));

      const latest = details[0];

      if (latest?.sentAt) {
        const sentAt = new Date(latest.sentAt);
        lastContactDays = Math.floor((Date.now() - sentAt.getTime()) / 86400000);
      }

      // Apply rules per actionType
      if (actionType === "initial") {
        blockers.push(`Already contacted: ${dbEmailCount} email(s) in DB to ${to}`);
      }

      if (actionType === "followup") {
        if (lastContactDays !== null && lastContactDays < 7) {
          blockers.push(`Too soon for follow-up: last contact ${lastContactDays}d ago (min 7d)`);
        }

        // Check for human reply in email table (responseReceived)
        const hasReply = details.some((e) => e.responseReceived);

        if (hasReply) {
          blockers.push("Human reply exists \u2014 follow-up inappropriate, reply instead");
        }

        const hasFollowup = details.some((e) => e.emailType === "followup");
        if (hasFollowup) {
          warnings.push("A follow-up was already sent previously");
        }
      }

      if (actionType === "reply") {
        const hasReply = details.some((e) => e.responseReceived);
        if (!hasReply) {
          // Also check outreach_reply table
          const domain = toLC.split("@")[1] || "";
          const replyCount = await db
            .select({ count: sql<number>`count(*)` })
            .from(outreachReply)
            .where(
              and(
                eq(outreachReply.tenantId, tenantId),
                ilike(outreachReply.fromAddress, `%${domain}`),
                eq(outreachReply.replyType, "human_reply"),
              ),
            );

          if (Number(replyCount[0]?.count ?? 0) === 0) {
            blockers.push("No human reply found \u2014 nothing to reply to");
          }
        }
      }
    } else if (actionType === "followup") {
      blockers.push("No initial email found in DB \u2014 cannot follow up");
    } else if (actionType === "reply") {
      warnings.push("No email record in DB \u2014 replying to unknown thread");
    }
  } catch (err) {
    blockers.push(`DB unreachable \u2014 FAIL CLOSED: ${err}`);
  }

  // ── 3. Conversation store (thread context) ──
  if (venueName) {
    try {
      conversation = await getConversation(venueName, tenantId);
    } catch {
      warnings.push("Could not load conversation history");
    }
  }

  // ── 4. tracking.json (file fallback) ──
  if (actionType === "initial" && dbEmailCount === 0) {
    try {
      if (fs.existsSync(TRACKING_FILE)) {
        const tracking = JSON.parse(fs.readFileSync(TRACKING_FILE, "utf-8"));
        const found = tracking.some((t: any) => t.to?.toLowerCase() === toLC);
        if (found) {
          blockers.push(`Found in tracking.json (not yet in DB) for ${to}`);
        }
      }
    } catch {
      blockers.push("Cannot read tracking.json \u2014 FAIL CLOSED");
    }
  }

  return {
    clear: blockers.length === 0,
    blockers,
    warnings,
    conversation,
    lastContactDays,
    dbEmailCount,
  };
}

// ── Export ──

export const preflight = {
  check: preflightCheck,
};
