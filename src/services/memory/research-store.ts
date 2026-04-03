/**
 * Web Research Persistence (Drizzle)
 *
 * Every web search and fetch during Claude sessions should be saved here.
 * Before searching: check if we already have relevant research.
 * After searching: save the results.
 *
 * Protocol:
 *   1. BEFORE WebSearch/WebFetch → call find(topic) or search(query)
 *   2. If fresh result exists (< 7 days) → use it, skip the search
 *   3. AFTER new search → call save() with findings
 *   4. If research leads to σ₂ decisions → include in decisions array
 *
 * Migrated from: src/db/research-store.ts
 * Change: SurrealDB getDb() → Drizzle ORM, tenantId required
 */

import { db } from "../../db/client.js";
import { webResearch, memoryLink } from "../../db/schema.js";
import { eq, and, desc, gte, or, ilike } from "drizzle-orm";
import { createLogger } from "../../lib/logger.js";

const log = createLogger("research-store");

// ── Types ────────────────────────────────────────────────────

export interface WebResearchEntry {
  query: string;
  sourceType: "web_search" | "web_fetch" | "deep_research";
  topic: string;          // entity-style: "venue:afrogreco", "market:japan"
  findings: string;       // Summary of key findings
  rawData?: string;       // Raw response (truncated to 10K chars)
  entities?: string[];    // Related entity IDs
  decisions?: string[];   // σ₂ decisions derived
  sessionId?: string;
  urls?: string[];
  expiresInDays?: number; // Default 30
}

// ── Functions ────────────────────────────────────────────────

export async function saveResearch(
  tenantId: string,
  entry: WebResearchEntry,
): Promise<string> {
  const [record] = await db
    .insert(webResearch)
    .values({
      tenantId,
      query: entry.query,
      sourceType: entry.sourceType,
      topic: entry.topic,
      findings: entry.findings,
      entities: entry.entities || [],
      decisions: entry.decisions || [],
      urls: entry.urls || [],
      stillValid: true,
    })
    .returning({ id: webResearch.id });

  const researchId = record.id;

  // Create memory_links for entities (σ₁ observations)
  for (const entityId of entry.entities || []) {
    await db.insert(memoryLink).values({
      tenantId,
      fromDept: "reception",
      toEntity: entityId,
      signalType: "observation",
      content: `Research: ${entry.query} → ${entry.findings.slice(0, 100)}`,
      sigma: "σ₁",
    });
  }

  // Save σ₂ decisions to memory_link
  for (const decision of entry.decisions || []) {
    for (const entityId of entry.entities || []) {
      await db.insert(memoryLink).values({
        tenantId,
        fromDept: "reception",
        toEntity: entityId,
        signalType: "decision",
        content: decision,
        sigma: "σ₂",
      });
    }
  }

  log.info("saveResearch", { id: researchId, topic: entry.topic, sourceType: entry.sourceType });
  return researchId;
}

export async function findResearch(
  tenantId: string,
  topic: string,
  maxAgeDays = 7,
): Promise<any[]> {
  const cutoff = new Date(Date.now() - maxAgeDays * 86400000);

  return db
    .select()
    .from(webResearch)
    .where(and(
      eq(webResearch.tenantId, tenantId),
      eq(webResearch.topic, topic),
      eq(webResearch.stillValid, true),
      gte(webResearch.createdAt, cutoff),
    ))
    .orderBy(desc(webResearch.createdAt));
}

export async function searchByQuery(
  tenantId: string,
  queryFragment: string,
  maxAgeDays = 30,
): Promise<any[]> {
  const cutoff = new Date(Date.now() - maxAgeDays * 86400000);

  return db
    .select()
    .from(webResearch)
    .where(and(
      eq(webResearch.tenantId, tenantId),
      eq(webResearch.stillValid, true),
      gte(webResearch.createdAt, cutoff),
      or(
        ilike(webResearch.query, `%${queryFragment}%`),
        ilike(webResearch.findings, `%${queryFragment}%`),
      ),
    ))
    .orderBy(desc(webResearch.createdAt))
    .limit(10);
}

export async function invalidateResearch(
  tenantId: string,
  topic: string,
): Promise<void> {
  await db
    .update(webResearch)
    .set({ stillValid: false })
    .where(and(
      eq(webResearch.tenantId, tenantId),
      eq(webResearch.topic, topic),
    ));
}

export async function getRecentResearch(
  tenantId: string,
  limit = 20,
): Promise<any[]> {
  return db
    .select({
      id: webResearch.id,
      query: webResearch.query,
      topic: webResearch.topic,
      findings: webResearch.findings,
      sourceType: webResearch.sourceType,
      createdAt: webResearch.createdAt,
    })
    .from(webResearch)
    .where(and(
      eq(webResearch.tenantId, tenantId),
      eq(webResearch.stillValid, true),
    ))
    .orderBy(desc(webResearch.createdAt))
    .limit(limit);
}

// ── researchStore namespace ─────────────────────────────────

export const researchStore = {
  save: saveResearch,
  find: findResearch,
  search: searchByQuery,
  invalidate: invalidateResearch,
  recent: getRecentResearch,
};
