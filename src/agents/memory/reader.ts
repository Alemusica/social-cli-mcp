/**
 * Memory Reader — Query agent memory from SurrealDB
 *
 * Query patterns:
 *   By entity:     "What does marketing know about Japan?"
 *   By department:  "Give me marketing's working memory"
 *   By time:        "All σ₂ decisions from last 7 days"
 *   By keyword:     "Any decisions about pricing?"
 *   Cross-dept:     "Who has touched venue:afrogreco?"
 */

import { getDb } from '../../db/client.js';
import { parseV7 } from './writer.js';
import type {
  Department,
  V7Monad,
  V7Decision,
  V7Entity,
  V7Observation,
  EntityMemory,
  DeptMemorySummary,
  AgentSessionRecord,
  MemoryLinkRecord,
} from './types.js';

// ═══════════════════════════════════════════════════════════════
// ENTITY QUERIES
// ═══════════════════════════════════════════════════════════════

/**
 * What do we know about a specific entity across all departments?
 */
export async function getMemoryByEntity(entityId: string): Promise<EntityMemory | null> {
  const db = await getDb();

  // Get all memory_links for this entity
  const [links] = await db.query(`
    SELECT * FROM memory_link
    WHERE to_entity = $entity
    ORDER BY created_at DESC
  `, { entity: entityId });

  const linkRecords = (links as MemoryLinkRecord[]) || [];
  if (linkRecords.length === 0) return null;

  // Get sessions that touched this entity
  const [sessions] = await db.query(`
    SELECT * FROM agent_session
    WHERE $entity IN entities_touched
    ORDER BY started_at DESC
    LIMIT 10
  `, { entity: entityId });

  const sessionRecords = (sessions as AgentSessionRecord[]) || [];

  // Build entity from most recent session that has it
  let entity: V7Entity | null = null;
  for (const session of sessionRecords) {
    if (session.monad_text) {
      const monad = parseV7(session.monad_text, session.agent_id, session.department as Department);
      const found = monad.entities.find(e => e.id === entityId);
      if (found) { entity = found; break; }
    }
  }

  if (!entity) {
    entity = {
      id: entityId,
      type: 'unknown',
      label: entityId,
      attrs: {},
      sigma2: [],
    };
  }

  // Collect decisions, observations, actions from links
  const decisions: V7Decision[] = [];
  const observations: V7Observation[] = [];
  const departments = new Set<Department>();

  for (const link of linkRecords) {
    departments.add(link.from_dept as Department);
    if (link.signal_type === 'decision') {
      decisions.push({
        content: link.content,
        entities: [entityId],
        date: link.created_at,
      });
    } else if (link.signal_type === 'observation') {
      observations.push({
        content: link.content,
        sigma: link.sigma === 'σ₂' ? 'σ₂' : 'σ₁',
      });
    }
  }

  return {
    entity,
    decisions,
    observations,
    actions: linkRecords
      .filter(l => l.signal_type === 'action')
      .map(l => ({ description: l.content, target: entityId, date: l.created_at })),
    departments: [...departments],
  };
}

/**
 * What does a specific department know about an entity?
 */
export async function getDeptEntityMemory(
  entityId: string,
  department: Department,
): Promise<MemoryLinkRecord[]> {
  const db = await getDb();

  const [links] = await db.query(`
    SELECT * FROM memory_link
    WHERE to_entity = $entity AND from_dept = $dept
    ORDER BY created_at DESC
  `, { entity: entityId, dept: department });

  return (links as MemoryLinkRecord[]) || [];
}

// ═══════════════════════════════════════════════════════════════
// DEPARTMENT QUERIES
// ═══════════════════════════════════════════════════════════════

/**
 * Get the fused working memory for a department.
 */
export async function getDeptMemory(department: Department): Promise<V7Monad | null> {
  const db = await getDb();
  const deptId = department.replace(/[^a-zA-Z0-9]/g, '_');

  const [records] = await db.query(`
    SELECT * FROM dept_memory
    WHERE department = $dept
    LIMIT 1
  `, { dept: department });

  const record = (records as any[])?.[0];
  if (!record?.monad_text) return null;

  return parseV7(record.monad_text, `dept:${department}`, department);
}

/**
 * Get summary of a department's memory state.
 */
export async function getDeptMemorySummary(department: Department): Promise<DeptMemorySummary | null> {
  const db = await getDb();

  const [records] = await db.query(`
    SELECT * FROM dept_memory WHERE department = $dept LIMIT 1
  `, { dept: department });

  const record = (records as any[])?.[0];
  if (!record) return null;

  const monad = parseV7(record.monad_text, `dept:${department}`, department);

  return {
    department,
    sessionCount: record.session_count || 0,
    entityCount: (record.entities || []).length,
    sigma2Count: (record.sigma2_decisions || []).length,
    lastUpdated: record.last_fused,
    monad,
  };
}

// ═══════════════════════════════════════════════════════════════
// DECISION QUERIES
// ═══════════════════════════════════════════════════════════════

/**
 * Get all σ₂ decisions from the last N days.
 */
export async function getRecentDecisions(days: number = 7): Promise<V7Decision[]> {
  const db = await getDb();
  const since = new Date(Date.now() - days * 86400000).toISOString();

  const [links] = await db.query(`
    SELECT * FROM memory_link
    WHERE sigma = 'σ₂'
    AND signal_type = 'decision'
    AND created_at >= type::datetime($since)
    ORDER BY created_at DESC
  `, { since });

  return ((links as MemoryLinkRecord[]) || []).map(l => ({
    content: l.content,
    entities: [l.to_entity],
    date: l.created_at,
  }));
}

/**
 * Search decisions by keyword.
 */
export async function searchDecisions(keyword: string): Promise<V7Decision[]> {
  const db = await getDb();

  const [links] = await db.query(`
    SELECT * FROM memory_link
    WHERE signal_type = 'decision'
    AND content CONTAINS $keyword
    ORDER BY created_at DESC
    LIMIT 20
  `, { keyword });

  return ((links as MemoryLinkRecord[]) || []).map(l => ({
    content: l.content,
    entities: [l.to_entity],
    date: l.created_at,
  }));
}

// ═══════════════════════════════════════════════════════════════
// SESSION QUERIES
// ═══════════════════════════════════════════════════════════════

/**
 * Get recent sessions for a specific agent.
 */
export async function getRecentSessions(
  agentId: string,
  limit: number = 5,
): Promise<V7Monad[]> {
  const db = await getDb();

  const [sessions] = await db.query(`
    SELECT * FROM agent_session
    WHERE agent_id = $agentId
    AND status = 'completed'
    ORDER BY started_at DESC
    LIMIT $limit
  `, { agentId, limit });

  return ((sessions as AgentSessionRecord[]) || [])
    .filter(s => s.monad_text)
    .map(s => parseV7(s.monad_text, s.agent_id, s.department as Department));
}

/**
 * Get the most recent session for an agent (for continuity).
 */
export async function getLastSession(agentId: string): Promise<V7Monad | null> {
  const sessions = await getRecentSessions(agentId, 1);
  return sessions[0] || null;
}

// ═══════════════════════════════════════════════════════════════
// CROSS-DEPARTMENT QUERIES
// ═══════════════════════════════════════════════════════════════

/**
 * Which departments have intelligence about an entity?
 */
export async function getEntityDepartments(entityId: string): Promise<Department[]> {
  const db = await getDb();

  const [results] = await db.query(`
    SELECT from_dept FROM memory_link
    WHERE to_entity = $entity
    GROUP BY from_dept
  `, { entity: entityId });

  return ((results as any[]) || []).map(r => r.from_dept as Department);
}

/**
 * Get all entities that multiple departments share intelligence about.
 * These are cross-department convergence points (like Japan).
 */
export async function getSharedEntities(): Promise<{ entity: string; departments: Department[]; linkCount: number }[]> {
  const db = await getDb();

  // Get all links, group in JS (SurrealDB GROUP BY has quirks with array functions)
  const [results] = await db.query(`
    SELECT to_entity, from_dept
    FROM memory_link
    ORDER BY to_entity
  `);

  // Group by entity in JS
  const byEntity = new Map<string, { depts: Set<Department>; count: number }>();
  for (const r of (results as any[]) || []) {
    const entry = byEntity.get(r.to_entity) || { depts: new Set(), count: 0 };
    entry.depts.add(r.from_dept as Department);
    entry.count++;
    byEntity.set(r.to_entity, entry);
  }

  // Only entities touched by 2+ departments
  return [...byEntity.entries()]
    .filter(([, v]) => v.depts.size > 1)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 20)
    .map(([entity, v]) => ({
      entity,
      departments: [...v.depts],
      linkCount: v.count,
    }));
}

// ═══════════════════════════════════════════════════════════════
// MEMORY LOADING (for agent bootstrap)
// ═══════════════════════════════════════════════════════════════

/**
 * Load memory context for an agent at bootstrap time.
 * Returns the department's fused memory + the agent's recent sessions.
 */
export async function loadAgentMemory(agentId: string, department: Department): Promise<{
  deptMemory: V7Monad | null;
  recentSessions: V7Monad[];
  recentDecisions: V7Decision[];
}> {
  const [deptMemory, recentSessions, recentDecisions] = await Promise.all([
    getDeptMemory(department),
    getRecentSessions(agentId, 3),
    getRecentDecisions(7),
  ]);

  return { deptMemory, recentSessions, recentDecisions };
}
