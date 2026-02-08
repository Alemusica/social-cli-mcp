/**
 * Web Research Persistence
 *
 * Every web search and fetch during Claude sessions should be saved here.
 * Before searching: check if we already have relevant research.
 * After searching: save the results.
 *
 * Protocol (for CLAUDE.md / MEMORY.md):
 *   1. BEFORE WebSearch/WebFetch → call findResearch(topic) or searchByQuery(query)
 *   2. If fresh result exists (< 7 days) → use it, skip the search
 *   3. AFTER new search → call saveResearch() with findings
 *   4. If research leads to σ₂ decisions → include in decisions array
 */

import { getDb } from './client.js';

export interface WebResearchEntry {
  query: string;
  sourceType: 'web_search' | 'web_fetch' | 'deep_research';
  topic: string;          // entity-style: "venue:afrogreco", "market:japan"
  findings: string;       // Summary of key findings
  rawData?: string;       // Raw response (truncated to 10K chars)
  entities?: string[];    // Related entity IDs
  decisions?: string[];   // σ₂ decisions derived
  sessionId?: string;
  urls?: string[];
  expiresInDays?: number; // Default 30
}

function researchId(topic: string, query: string): string {
  const topicSlug = topic.replace(/[^a-zA-Z0-9]/g, '_');
  const querySlug = query.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 30);
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '_');
  return `${topicSlug}_${querySlug}_${date}`;
}

export async function saveResearch(entry: WebResearchEntry): Promise<string> {
  const db = await getDb();
  const id = researchId(entry.topic, entry.query);

  const expiresAt = entry.expiresInDays
    ? new Date(Date.now() + entry.expiresInDays * 86400000).toISOString()
    : new Date(Date.now() + 30 * 86400000).toISOString(); // default 30 days

  // Build SET clauses — SurrealDB option<T> needs NONE, not null
  const params: Record<string, any> = {
    id,
    query: entry.query,
    sourceType: entry.sourceType,
    topic: entry.topic,
    findings: entry.findings,
    entities: entry.entities || [],
    decisions: entry.decisions || [],
    urls: entry.urls || [],
    expiresAt,
  };

  let setClauses = `
      query = $query,
      source_type = $sourceType,
      topic = $topic,
      findings = $findings,
      entities = $entities,
      decisions = $decisions,
      urls = $urls,
      still_valid = true,
      expires_at = type::datetime($expiresAt),
      created_at = time::now()`;

  if (entry.rawData) { setClauses += `, raw_data = $rawData`; params.rawData = entry.rawData.slice(0, 10000); }
  if (entry.sessionId) { setClauses += `, session_id = $sessionId`; params.sessionId = entry.sessionId; }

  await db.query(`UPSERT type::thing("web_research", $id) SET ${setClauses}`, params);

  // Create memory_links for entities
  for (const entity of (entry.entities || [])) {
    const linkId = `research_${entity.replace(/[^a-zA-Z0-9]/g, '_')}_${id.slice(0, 20)}`;
    await db.query(`
      UPSERT type::thing("memory_link", $linkId) SET
        from_dept = 'reception',
        to_entity = $entity,
        signal_type = 'observation',
        content = $content,
        sigma = 'σ₁',
        created_at = time::now()
    `, {
      linkId,
      entity,
      content: `Research: ${entry.query} → ${entry.findings.slice(0, 100)}`,
    });
  }

  // Save σ₂ decisions to memory_link
  for (const decision of (entry.decisions || [])) {
    for (const entity of (entry.entities || [])) {
      const decId = `rdec_${entity.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now().toString(36)}`;
      await db.query(`
        UPSERT type::thing("memory_link", $linkId) SET
          from_dept = 'reception',
          to_entity = $entity,
          signal_type = 'decision',
          content = $content,
          sigma = 'σ₂',
          created_at = time::now()
      `, { linkId: decId, entity, content: decision });
    }
  }

  return id;
}

export async function findResearch(topic: string, maxAgeDays = 7): Promise<any[]> {
  const db = await getDb();
  const cutoff = new Date(Date.now() - maxAgeDays * 86400000).toISOString();
  const [result] = await db.query(
    `SELECT * FROM web_research WHERE topic = $topic AND still_valid = true AND created_at > type::datetime($cutoff) ORDER BY created_at DESC`,
    { topic, cutoff },
  );
  return result as any[];
}

export async function searchByQuery(queryFragment: string, maxAgeDays = 30): Promise<any[]> {
  const db = await getDb();
  const cutoff = new Date(Date.now() - maxAgeDays * 86400000).toISOString();
  const [result] = await db.query(
    `SELECT * FROM web_research WHERE still_valid = true AND created_at > type::datetime($cutoff) AND (query CONTAINS $q OR findings CONTAINS $q) ORDER BY created_at DESC LIMIT 10`,
    { q: queryFragment, cutoff },
  );
  return result as any[];
}

export async function invalidateResearch(topic: string): Promise<void> {
  const db = await getDb();
  await db.query(
    `UPDATE web_research SET still_valid = false WHERE topic = $topic`,
    { topic },
  );
}

export async function getRecentResearch(limit = 20): Promise<any[]> {
  const db = await getDb();
  const [result] = await db.query(
    `SELECT id, query, topic, findings, source_type, created_at FROM web_research WHERE still_valid = true ORDER BY created_at DESC LIMIT $limit`,
    { limit },
  );
  return result as any[];
}

export async function migrateOldResearch(): Promise<number> {
  const db = await getDb();
  // Migrate data from the old schemaless `research` table to `web_research`
  const [existing] = await db.query(`SELECT * FROM research`);
  const records = existing as any[];
  let migrated = 0;

  for (const r of records) {
    const id = String(r.id).replace('research:', 'migrated_');
    await db.query(`
      UPSERT type::thing("web_research", $id) SET
        query = $topic,
        source_type = 'deep_research',
        topic = $category,
        findings = $findings,
        decisions = $decisions,
        session_id = $sessionId,
        urls = $sources,
        still_valid = true,
        created_at = $createdAt
    `, {
      id: id.replace(/[^a-zA-Z0-9_]/g, '_'),
      topic: r.topic || '',
      category: r.category || 'general',
      findings: r.findings || '',
      decisions: r.decision ? [r.decision] : [],
      sessionId: r.session_id || null,
      sources: r.sources || [],
      createdAt: r.created_at || new Date().toISOString(),
    });
    migrated++;
  }

  return migrated;
}

export const researchStore = {
  save: saveResearch,
  find: findResearch,
  search: searchByQuery,
  invalidate: invalidateResearch,
  recent: getRecentResearch,
  migrateOld: migrateOldResearch,
};
