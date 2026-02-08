/**
 * Session Log — Conversation Narrative Persistence
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
 *   Graph  → session_touched relation (session → entity)
 *   Vector → semanticSearch() via HNSW index on summary embedding
 */

import { getDb } from '../../db/client.js';

export interface SessionLogEntry {
  /** Short title: "Gulf research persistence", "Victoria reply draft" */
  title: string;
  /** What triggered this session: "user request", "morning check", "follow-up" */
  trigger: string;
  /** Key actions taken (imperative): "Saved YT analytics to SurrealDB", "Drafted reply to Victoria" */
  actions: string[];
  /** Decisions made (σ₂-level): "Gulf signal downgraded from strong to medium" */
  decisions: string[];
  /** Entities touched: ["market:gulf", "venue:banana_island_anantara"] */
  entities: string[];
  /** Files created or modified */
  files: { path: string; action: 'created' | 'modified' | 'read' }[];
  /** Open questions or next steps */
  nextSteps: string[];
  /** One-paragraph summary of the conversation (for vector embedding) */
  summary?: string;
  /** Free-form notes */
  notes?: string;
  /** Pre-computed embedding vector (384d MiniLM). If absent, stored without vector. */
  embedding?: number[];
}

/**
 * Save a conversation session log to SurrealDB.
 * Creates structured record + graph relations to entities.
 */
export async function saveSessionLog(entry: SessionLogEntry): Promise<string> {
  const db = await getDb();
  const id = `session_${new Date().toISOString().slice(0, 10).replace(/-/g, '_')}_${randomSuffix()}`;

  // Build the summary from components if not provided
  const summary = entry.summary ||
    `${entry.title}. Actions: ${entry.actions.join('; ')}. ` +
    (entry.decisions.length > 0 ? `Decisions: ${entry.decisions.join('; ')}. ` : '') +
    (entry.nextSteps.length > 0 ? `Next: ${entry.nextSteps.join('; ')}.` : '');

  await db.query(`
    UPSERT type::thing("session_log", $id) SET
      title = $title,
      trigger_source = $trigger,
      actions = $actions,
      decisions = $decisions,
      entities = $entities,
      files = $files,
      next_steps = $nextSteps,
      summary = $summary,
      notes = $notes,
      embedding = $embedding,
      started_at = time::now(),
      created_at = time::now()
  `, {
    id,
    title: entry.title,
    trigger: entry.trigger,
    actions: entry.actions,
    decisions: entry.decisions,
    entities: entry.entities,
    files: entry.files,
    nextSteps: entry.nextSteps,
    summary,
    notes: entry.notes || '',
    embedding: entry.embedding || null,
  });

  // Create graph edges: session → entity (via memory_link)
  for (const entityId of entry.entities) {
    const linkId = `session_${entityId.replace(/[^a-zA-Z0-9]/g, '_')}_${id}`;
    await db.query(`
      UPSERT type::thing("memory_link", $linkId) SET
        from_dept = 'session',
        to_entity = $entity,
        signal_type = 'session',
        content = $title,
        sigma = 'σ₁',
        created_at = time::now()
    `, {
      linkId,
      entity: entityId,
      title: entry.title,
    });
  }

  // σ₂ decisions also get their own memory_links (irriducible)
  for (const decision of entry.decisions) {
    for (const entityId of entry.entities) {
      const decLinkId = `sdec_${entityId.replace(/[^a-zA-Z0-9]/g, '_')}_${id}`;
      await db.query(`
        UPSERT type::thing("memory_link", $linkId) SET
          from_dept = 'session',
          to_entity = $entity,
          signal_type = 'decision',
          content = $content,
          sigma = 'σ₂',
          created_at = time::now()
      `, {
        linkId: decLinkId,
        entity: entityId,
        content: decision,
      });
    }
  }

  return id;
}

/**
 * Get recent session logs (for context injection at conversation start).
 */
export async function getRecentSessionLogs(days: number = 7): Promise<any[]> {
  const db = await getDb();
  const since = new Date(Date.now() - days * 86400000).toISOString();
  const [results] = await db.query(`
    SELECT id, title, trigger_source, actions, decisions, entities, next_steps, summary, created_at
    FROM session_log
    WHERE created_at >= type::datetime($since)
    ORDER BY created_at DESC
    LIMIT 20
  `, { since });
  return (results as any[]) || [];
}

/**
 * Get session logs that touched a specific entity.
 */
export async function getSessionLogsByEntity(entityId: string): Promise<any[]> {
  const db = await getDb();
  const [results] = await db.query(`
    SELECT id, title, actions, decisions, next_steps, summary, created_at
    FROM session_log
    WHERE entities CONTAINS $entity
    ORDER BY created_at DESC
  `, { entity: entityId });
  return (results as any[]) || [];
}

/**
 * Semantic search over session logs using vector similarity.
 * Requires embedding to be pre-computed (384d MiniLM).
 */
export async function semanticSearchSessions(
  queryEmbedding: number[],
  limit: number = 5,
): Promise<any[]> {
  const db = await getDb();
  const [results] = await db.query(`
    SELECT id, title, summary, actions, decisions, entities, created_at,
           vector::distance::knn() AS distance
    FROM session_log
    WHERE embedding <|${limit},40|> $embedding
    ORDER BY distance
  `, { embedding: queryEmbedding });
  return (results as any[]) || [];
}

/**
 * Load full session context for conversation bootstrap.
 * Returns recent sessions + active σ₂ decisions + convergence points.
 */
export async function loadSessionContext(): Promise<{
  recentSessions: any[];
  activeDecisions: any[];
  convergencePoints: any[];
}> {
  const db = await getDb();

  const [sessions] = await db.query(`
    SELECT id, title, trigger_source, actions, decisions, entities, next_steps, summary, created_at
    FROM session_log
    ORDER BY created_at DESC
    LIMIT 5
  `);

  const [decisions] = await db.query(`
    SELECT * FROM memory_link
    WHERE sigma = 'σ₂' AND signal_type = 'decision'
    ORDER BY created_at DESC
    LIMIT 30
  `);

  const [allLinks] = await db.query(`
    SELECT to_entity, from_dept FROM memory_link ORDER BY to_entity
  `);

  // Group by entity in JS (SurrealDB GROUP BY has quirks with array aggs)
  const byEntity = new Map<string, { depts: Set<string>; count: number }>();
  for (const r of (allLinks as any[]) || []) {
    const entry = byEntity.get(r.to_entity) || { depts: new Set(), count: 0 };
    entry.depts.add(r.from_dept);
    entry.count++;
    byEntity.set(r.to_entity, entry);
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

  return {
    recentSessions: (sessions as any[]) || [],
    activeDecisions: (decisions as any[]) || [],
    convergencePoints,
  };
}

function randomSuffix(): string {
  return Math.random().toString(36).slice(2, 6);
}
