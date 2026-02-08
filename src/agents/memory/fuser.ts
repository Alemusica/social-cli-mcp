/**
 * V7 Monad Fuser — Merge two monads into one (sublinear growth)
 *
 * Fusion protocol (from DD-015 RNA working copy):
 *   1. Entities: Union by ID. Same entity → keep newer attrs, MERGE sigma2 from both
 *   2. Decisions (σ₂): Always keep ALL — irriducible, never drop. Deduplicate exact matches.
 *   3. Observations: Newer contradicts older → keep newer. Otherwise union.
 *   4. Actions: Chronological union, deduplicate by (description + target).
 *
 * Result: |FUSE(M1,M2)| ≤ |M1| + |M2| — sublinear because shared entities don't duplicate.
 */

import { getDb } from '../../db/client.js';
import { serializeToV7, parseV7 } from './writer.js';
import type {
  V7Monad,
  V7Entity,
  V7Decision,
  V7Observation,
  V7Action,
  Department,
} from './types.js';

const FUSION_THRESHOLD = 5; // Fuse after this many unfused sessions

// ═══════════════════════════════════════════════════════════════
// CORE FUSION
// ═══════════════════════════════════════════════════════════════

/**
 * Fuse two V7 monads into one. M_old is the existing memory, M_new is the latest session.
 */
export function fuseMonads(mOld: V7Monad, mNew: V7Monad): V7Monad {
  const department = mNew.department;
  const date = mNew.date; // Fused monad gets the latest date

  // 1. ENTITIES: Union by ID
  const entityMap = new Map<string, V7Entity>();

  // Start with old entities
  for (const e of mOld.entities) {
    entityMap.set(e.id, { ...e });
  }

  // Merge new entities
  for (const e of mNew.entities) {
    const existing = entityMap.get(e.id);
    if (existing) {
      // Same entity: keep newer attrs, merge sigma2
      entityMap.set(e.id, {
        ...e,
        attrs: { ...existing.attrs, ...e.attrs }, // newer overwrites on conflict
        sigma2: dedup([...existing.sigma2, ...e.sigma2]),
      });
    } else {
      entityMap.set(e.id, { ...e });
    }
  }

  // 2. DECISIONS (σ₂): Union all, deduplicate exact matches
  const allDecisions = [...mOld.decisions, ...mNew.decisions];
  const decisions = dedupDecisions(allDecisions);

  // 3. OBSERVATIONS: Newer contradicts older → keep newer
  const observations = fuseObservations(mOld.observations, mNew.observations);

  // 4. ACTIONS: Chronological union, deduplicate
  const allActions = [...mOld.actions, ...mNew.actions];
  const actions = dedupActions(allActions);

  // Regenerate V7 text
  const entities = [...entityMap.values()];
  const raw = regenerateV7Text(department, date, entities, decisions, observations, actions);

  return {
    version: '7.0',
    agentId: `dept:${department}`,
    sessionId: `fused_${date.replace(/-/g, '_')}`,
    department,
    date,
    entities,
    decisions,
    observations,
    actions,
    raw,
  };
}

// ═══════════════════════════════════════════════════════════════
// FUSION HELPERS
// ═══════════════════════════════════════════════════════════════

function dedup(arr: string[]): string[] {
  return [...new Set(arr)];
}

function dedupDecisions(decisions: V7Decision[]): V7Decision[] {
  const seen = new Set<string>();
  const result: V7Decision[] = [];

  for (const d of decisions) {
    const key = d.content.trim().toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      result.push(d);
    }
  }
  return result;
}

function fuseObservations(old: V7Observation[], newer: V7Observation[]): V7Observation[] {
  // Build topic map from newer observations
  const newerTopics = new Set<string>();
  for (const o of newer) {
    if (o.topic) newerTopics.add(o.topic);
  }

  // Keep old observations that aren't contradicted by newer
  const result: V7Observation[] = [];
  for (const o of old) {
    if (o.topic && newerTopics.has(o.topic)) {
      // Contradicted by newer → skip old
      continue;
    }
    result.push(o);
  }

  // Add all newer observations
  result.push(...newer);

  // Deduplicate by content
  const seen = new Set<string>();
  return result.filter(o => {
    const key = o.content.trim().toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function dedupActions(actions: V7Action[]): V7Action[] {
  const seen = new Set<string>();
  const result: V7Action[] = [];

  for (const a of actions) {
    const key = `${a.description}|${a.target || ''}`;
    if (!seen.has(key)) {
      seen.add(key);
      result.push(a);
    }
  }
  return result;
}

function regenerateV7Text(
  department: Department,
  date: string,
  entities: V7Entity[],
  decisions: V7Decision[],
  observations: V7Observation[],
  actions: V7Action[],
): string {
  const lines: string[] = [];

  lines.push(`# v7.0 | dept:${department} | fused | ${date}`);
  lines.push('');

  if (entities.length > 0) {
    lines.push('## Entities');
    for (const e of entities) {
      let line = `E "${e.label}" :${e.type}`;
      if (e.context) line += ` @${e.context}`;
      line += ` [${e.id}]`;
      lines.push(line);

      for (const [key, val] of Object.entries(e.attrs)) {
        lines.push(`  .${key} = ${val}`);
      }
      for (const s2 of e.sigma2) {
        lines.push(`  σ₂ ${s2}`);
      }
    }
    lines.push('');
  }

  if (decisions.length > 0) {
    lines.push('## Decisions');
    for (const d of decisions) {
      const refs = d.entities.length > 0 ? ` → ${d.entities.join(', ')}` : '';
      lines.push(`σ₂ ${d.content}${refs}`);
      if (d.rationale) lines.push(`  ← ${d.rationale}`);
    }
    lines.push('');
  }

  if (observations.length > 0) {
    lines.push('## Observations');
    for (const o of observations) {
      lines.push(`${o.sigma} ${o.content}`);
    }
    lines.push('');
  }

  if (actions.length > 0) {
    lines.push('## Actions');
    for (const a of actions) {
      let line = `X ${a.description}`;
      if (a.target) line += ` → ${a.target}`;
      if (a.result) line += ` = ${a.result}`;
      lines.push(line);
    }
    lines.push('');
  }

  return lines.join('\n');
}

// ═══════════════════════════════════════════════════════════════
// AUTO-FUSION (triggered after saveSession)
// ═══════════════════════════════════════════════════════════════

/**
 * Check if a department needs fusion and run it if threshold exceeded.
 * Called after each session save.
 */
export async function maybeFuse(department: Department): Promise<boolean> {
  const db = await getDb();
  const deptId = department.replace(/[^a-zA-Z0-9]/g, '_');

  // Count unfused sessions for this department
  const [countResult] = await db.query(`
    SELECT count() FROM agent_session
    WHERE department = $dept
    AND status = 'completed'
    GROUP ALL
  `, { dept: department });

  const totalSessions = (countResult as any)?.[0]?.count || 0;

  // Get current dept_memory
  const [memRecords] = await db.query(`
    SELECT * FROM dept_memory WHERE department = $dept LIMIT 1
  `, { dept: department });

  const currentMem = (memRecords as any[])?.[0];
  const fusedCount = currentMem?.session_count || 0;
  const unfusedCount = totalSessions - fusedCount;

  if (unfusedCount < FUSION_THRESHOLD) return false;

  // Get unfused sessions (oldest first)
  const [sessions] = await db.query(`
    SELECT * FROM agent_session
    WHERE department = $dept
    AND status = 'completed'
    ORDER BY started_at ASC
  `, { dept: department });

  const sessionRecords = (sessions as any[]) || [];
  if (sessionRecords.length === 0) return false;

  // Start with existing dept memory or empty monad
  let fused: V7Monad = currentMem?.monad_text
    ? parseV7(currentMem.monad_text, `dept:${department}`, department)
    : {
        version: '7.0',
        agentId: `dept:${department}`,
        sessionId: `fused_init`,
        department,
        date: new Date().toISOString().split('T')[0],
        entities: [],
        decisions: [],
        observations: [],
        actions: [],
        raw: '',
      };

  // Fuse each unfused session
  const sessionsToFuse = sessionRecords.slice(fusedCount);
  for (const session of sessionsToFuse) {
    if (!session.monad_text) continue;
    const sessionMonad = parseV7(session.monad_text, session.agent_id, department);
    fused = fuseMonads(fused, sessionMonad);
  }

  const now = new Date().toISOString();
  const allEntities = fused.entities.map(e => e.id);
  const allSigma2 = fused.decisions.map(d => d.content);

  // Save fused memory
  await db.query(`
    UPSERT type::thing("dept_memory", $id) SET
      department = $dept,
      monad_text = $monadText,
      session_count = $sessionCount,
      last_fused = type::datetime($now),
      entities = $entities,
      sigma2_decisions = $sigma2
  `, {
    id: deptId,
    dept: department,
    monadText: fused.raw,
    sessionCount: totalSessions,
    now,
    entities: allEntities,
    sigma2: allSigma2,
  });

  // Mark old sessions as fused
  await db.query(`
    UPDATE agent_session SET status = 'fused'
    WHERE department = $dept AND status = 'completed'
  `, { dept: department });

  console.log(`🧬 Fused ${sessionsToFuse.length} sessions → dept:${department} (${allEntities.length} entities, ${allSigma2.length} σ₂)`);
  return true;
}
