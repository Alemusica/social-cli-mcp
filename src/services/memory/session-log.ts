/**
 * Session Log — Conversation Narrative Persistence (Drizzle)
 *
 * Captures what happened in each Claude ↔ Alessio conversation:
 * - Key decisions made
 * - Actions taken (emails sent, scripts run, files created)
 * - Entities discussed
 * - Open questions / next steps
 *
 * Unlike agent_session (V7 monad for automated agents),
 * session_log is for human↔Claude conversations.
 *
 * Three access modes:
 *   SQL    → getRecentSessionLogs(), getSessionLogsByEntity()
 *   Graph  → memoryLink table (session → entity)
 *   Vector → semanticSearch() via HNSW index on summary embedding
 *
 * Migrated from: src/agents/memory/session-log.ts
 * Change: SurrealDB getDb() → Drizzle ORM, tenantId required
 */

import { db } from "../../db/client.js";
import { sessionLog, memoryLink } from "../../db/schema.js";
import { eq, and, desc, gte, sql } from "drizzle-orm";
import { cosineDistance } from "drizzle-orm";
import { createLogger } from "../../lib/logger.js";

const log = createLogger("session-log");

// ── Types ────────────────────────────────────────────────────

export interface SessionLogEntry {
  /** Short title: "Gulf research persistence", "Victoria reply draft" */
  title: string;
  /** What triggered this session: "user request", "morning check", "follow-up" */
  trigger: string;
  /** Key actions taken (imperative): "Saved YT analytics to DB", "Drafted reply to Victoria" */
  actions: string[];
  /** Decisions made (σ₂-level): "Gulf signal downgraded from strong to medium" */
  decisions: string[];
  /** Entities touched: ["market:gulf", "venue:banana_island_anantara"] */
  entities: string[];
  /** Files created or modified */
  files: { path: string; action: "created" | "modified" | "read" }[];
  /** Open questions or next steps */
  nextSteps: string[];
  /** One-paragraph summary of the conversation (for vector embedding) */
  summary?: string;
  /** Free-form notes */
  notes?: string;
  /** Pre-computed embedding vector (384d MiniLM). If absent, stored without vector. */
  embedding?: number[];
}

// ── Functions ────────────────────────────────────────────────

/**
 * Save a conversation session log.
 * Creates structured record + memory_link entries for entities.
 */
export async function saveSessionLog(
  tenantId: string,
  entry: SessionLogEntry,
): Promise<string> {
  const summary =
    entry.summary ||
    `${entry.title}. Actions: ${entry.actions.join("; ")}. ` +
    (entry.decisions.length > 0 ? `Decisions: ${entry.decisions.join("; ")}. ` : "") +
    (entry.nextSteps.length > 0 ? `Next: ${entry.nextSteps.join("; ")}.` : "");

  const [record] = await db
    .insert(sessionLog)
    .values({
      tenantId,
      title: entry.title,
      trigger: entry.trigger,
      actions: entry.actions,
      decisions: entry.decisions,
      entities: entry.entities,
      files: entry.files as any,
      nextSteps: entry.nextSteps,
      summary,
      embedding: entry.embedding as any,
    })
    .returning({ id: sessionLog.id });

  const sessionId = record.id;

  // Create memory_link edges: session → entity (σ₁)
  for (const entityId of entry.entities) {
    await db.insert(memoryLink).values({
      tenantId,
      fromDept: "session",
      toEntity: entityId,
      signalType: "session",
      content: entry.title,
      sigma: "σ₁",
    });
  }

  // σ₂ decisions get their own memory_links (irriducible)
  for (const decision of entry.decisions) {
    for (const entityId of entry.entities) {
      await db.insert(memoryLink).values({
        tenantId,
        fromDept: "session",
        toEntity: entityId,
        signalType: "decision",
        content: decision,
        sigma: "σ₂",
      });
    }
  }

  log.info("saveSessionLog", { id: sessionId, title: entry.title, entities: entry.entities.length });
  return sessionId;
}

/**
 * Get recent session logs (for context injection at conversation start).
 */
export async function getRecentSessionLogs(
  tenantId: string,
  days: number = 7,
): Promise<any[]> {
  const since = new Date(Date.now() - days * 86400000);

  return db
    .select({
      id: sessionLog.id,
      title: sessionLog.title,
      trigger: sessionLog.trigger,
      actions: sessionLog.actions,
      decisions: sessionLog.decisions,
      entities: sessionLog.entities,
      nextSteps: sessionLog.nextSteps,
      summary: sessionLog.summary,
      createdAt: sessionLog.createdAt,
    })
    .from(sessionLog)
    .where(and(
      eq(sessionLog.tenantId, tenantId),
      gte(sessionLog.createdAt, since),
    ))
    .orderBy(desc(sessionLog.createdAt))
    .limit(20);
}

/**
 * Get session logs that touched a specific entity.
 */
export async function getSessionLogsByEntity(
  tenantId: string,
  entityId: string,
): Promise<any[]> {
  // Postgres array contains: use && or @> operator via sql
  return db
    .select({
      id: sessionLog.id,
      title: sessionLog.title,
      actions: sessionLog.actions,
      decisions: sessionLog.decisions,
      nextSteps: sessionLog.nextSteps,
      summary: sessionLog.summary,
      createdAt: sessionLog.createdAt,
    })
    .from(sessionLog)
    .where(and(
      eq(sessionLog.tenantId, tenantId),
      sql`${sessionLog.entities} @> ARRAY[${entityId}]::text[]`,
    ))
    .orderBy(desc(sessionLog.createdAt));
}

/**
 * Semantic search over session logs using vector similarity.
 * Requires embedding to be pre-computed (384d MiniLM).
 */
export async function semanticSearchSessions(
  tenantId: string,
  queryEmbedding: number[],
  limit: number = 5,
): Promise<any[]> {
  const embeddingLiteral = sql`ARRAY[${sql.join(queryEmbedding.map(v => sql`${v}`), sql`, `)}]::vector`;

  return db
    .select({
      id: sessionLog.id,
      title: sessionLog.title,
      summary: sessionLog.summary,
      actions: sessionLog.actions,
      decisions: sessionLog.decisions,
      entities: sessionLog.entities,
      createdAt: sessionLog.createdAt,
    })
    .from(sessionLog)
    .where(and(
      eq(sessionLog.tenantId, tenantId),
      sql`${sessionLog.embedding} IS NOT NULL`,
    ))
    .orderBy(sql`${sessionLog.embedding} <=> ${embeddingLiteral}`)
    .limit(limit);
}

/**
 * Load full session context for conversation bootstrap.
 * Returns recent sessions + active σ₂ decisions + convergence points.
 */
export async function loadSessionContext(
  tenantId: string,
  limit: number = 5,
): Promise<{
  recentSessions: any[];
  activeDecisions: any[];
  convergencePoints: any[];
}> {
  const recentSessions = await db
    .select({
      id: sessionLog.id,
      title: sessionLog.title,
      trigger: sessionLog.trigger,
      actions: sessionLog.actions,
      decisions: sessionLog.decisions,
      entities: sessionLog.entities,
      nextSteps: sessionLog.nextSteps,
      summary: sessionLog.summary,
      createdAt: sessionLog.createdAt,
    })
    .from(sessionLog)
    .where(eq(sessionLog.tenantId, tenantId))
    .orderBy(desc(sessionLog.createdAt))
    .limit(limit);

  const activeDecisions = await db
    .select()
    .from(memoryLink)
    .where(and(
      eq(memoryLink.tenantId, tenantId),
      eq(memoryLink.sigma, "σ₂"),
      eq(memoryLink.signalType, "decision"),
    ))
    .orderBy(desc(memoryLink.createdAt))
    .limit(30);

  // Convergence: entities touched by 2+ departments
  const allLinks = await db
    .select({
      toEntity: memoryLink.toEntity,
      fromDept: memoryLink.fromDept,
    })
    .from(memoryLink)
    .where(eq(memoryLink.tenantId, tenantId));

  const byEntity = new Map<string, { depts: Set<string>; count: number }>();
  for (const r of allLinks) {
    const entry = byEntity.get(r.toEntity) || { depts: new Set(), count: 0 };
    entry.depts.add(r.fromDept);
    entry.count++;
    byEntity.set(r.toEntity, entry);
  }

  const convergencePoints = [...byEntity.entries()]
    .filter(([, v]) => v.depts.size > 1)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 15)
    .map(([entity, v]) => ({
      entity,
      departments: [...v.depts],
      linkCount: v.count,
    }));

  return { recentSessions, activeDecisions, convergencePoints };
}
