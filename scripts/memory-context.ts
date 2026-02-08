/**
 * Memory Context Loader — Session Bootstrap
 *
 * Loads structured memory context from SurrealDB for Claude session start.
 * Replaces flat MEMORY.md with live, queryable data.
 *
 * Usage:
 *   npx tsx scripts/memory-context.ts                  # Full context
 *   npx tsx scripts/memory-context.ts --entity market:japan   # Entity focus
 *   npx tsx scripts/memory-context.ts --last            # Last session only
 *   npx tsx scripts/memory-context.ts --decisions       # Active σ₂ only
 *
 * Output: V7 monade-formatted context for prompt injection.
 */

import { getDb } from '../src/db/client.js';

const args = process.argv.slice(2);
const entityArg = args.includes('--entity') ? args[args.indexOf('--entity') + 1] : null;
const lastOnly = args.includes('--last');
const decisionsOnly = args.includes('--decisions');

async function main() {
  const db = await getDb();

  if (entityArg) {
    await printEntityContext(db, entityArg);
  } else if (lastOnly) {
    await printLastSession(db);
  } else if (decisionsOnly) {
    await printActiveDecisions(db);
  } else {
    await printFullContext(db);
  }

  process.exit(0);
}

async function printFullContext(db: any) {
  console.log('# v7.0 | session-context | bootstrap | ' + new Date().toISOString().split('T')[0]);
  console.log('');

  // 1. Recent sessions (SQL)
  const [sessions] = await db.query(`
    SELECT id, title, trigger_source, actions, decisions, entities, next_steps, summary, created_at
    FROM session_log
    ORDER BY created_at DESC
    LIMIT 5
  `);
  const sessionList = (sessions as any[]) || [];

  if (sessionList.length > 0) {
    console.log('## Recent Sessions');
    for (const s of sessionList) {
      const date = s.created_at ? new Date(s.created_at).toISOString().split('T')[0] : '?';
      console.log(`S "${s.title}" @${date} [${s.id}]`);
      if (s.actions?.length > 0) {
        for (const a of s.actions.slice(0, 5)) console.log(`  X ${a}`);
      }
      if (s.decisions?.length > 0) {
        for (const d of s.decisions) console.log(`  σ₂ ${d}`);
      }
      if (s.next_steps?.length > 0) {
        for (const n of s.next_steps) console.log(`  → ${n}`);
      }
      if (s.entities?.length > 0) {
        console.log(`  .entities = [${s.entities.join(', ')}]`);
      }
    }
    console.log('');
  }

  // 2. Active σ₂ decisions (Graph — irriducible)
  const [decisions] = await db.query(`
    SELECT * FROM memory_link
    WHERE sigma = 'σ₂' AND signal_type = 'decision'
    ORDER BY created_at DESC
    LIMIT 30
  `);
  const decisionList = (decisions as any[]) || [];

  if (decisionList.length > 0) {
    console.log('## Active Decisions (σ₂)');
    for (const d of decisionList) {
      console.log(`σ₂ ${d.content} → ${d.to_entity} [${d.from_dept}]`);
    }
    console.log('');
  }

  // 3. Convergence points (Graph — cross-department)
  const [allLinks] = await db.query(`
    SELECT to_entity, from_dept FROM memory_link ORDER BY to_entity
  `);
  const byEntity = new Map<string, { depts: Set<string>; count: number }>();
  for (const r of (allLinks as any[]) || []) {
    const entry = byEntity.get(r.to_entity) || { depts: new Set(), count: 0 };
    entry.depts.add(r.from_dept);
    entry.count++;
    byEntity.set(r.to_entity, entry);
  }
  const shared = [...byEntity.entries()]
    .filter(([, v]) => v.depts.size > 1)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 10);

  if (shared.length > 0) {
    console.log('## Cross-Department Convergence');
    for (const [entity, v] of shared) {
      console.log(`E "${entity}" .depts=[${[...v.depts].join(',')}] .links=${v.count}`);
    }
    console.log('');
  }

  // 4. Agent memory state (SQL summary)
  const [agentSessions] = await db.query(`
    SELECT department, count() AS total, math::max(started_at) AS last_active
    FROM agent_session
    GROUP BY department
  `);
  const deptStats = (agentSessions as any[]) || [];

  if (deptStats.length > 0) {
    console.log('## Department State');
    for (const d of deptStats) {
      const lastDate = d.last_active ? new Date(d.last_active).toISOString().split('T')[0] : '?';
      console.log(`D "${d.department}" .sessions=${d.total} .last=${lastDate}`);
    }
    console.log('');
  }

  // 5. Data freshness (graceful — function may not exist)
  try {
    const [freshness] = await db.query(`RETURN fn::data_freshness()`);
    if (freshness) {
      console.log('## Data Freshness');
      const f = freshness as any;
      if (f.hashtag_analysis?.age_hours != null) {
        console.log(`  .hashtag_analysis = ${f.hashtag_analysis.age_hours}h ago`);
      }
      if (f.audience_snapshot?.age_hours != null) {
        console.log(`  .audience_snapshot = ${f.audience_snapshot.age_hours}h ago`);
      }
      console.log('');
    }
  } catch {
    // fn::data_freshness not defined in this DB instance — skip
  }
}

async function printEntityContext(db: any, entityId: string) {
  console.log(`# v7.0 | entity-context | ${entityId} | ${new Date().toISOString().split('T')[0]}`);
  console.log('');

  // All memory_links for this entity
  const [links] = await db.query(`
    SELECT * FROM memory_link
    WHERE to_entity = $entity
    ORDER BY created_at DESC
  `, { entity: entityId });
  const linkList = (links as any[]) || [];

  if (linkList.length === 0) {
    console.log(`No memory found for entity: ${entityId}`);
    return;
  }

  const depts = new Set(linkList.map((l: any) => l.from_dept));
  console.log(`E "${entityId}" .depts=[${[...depts].join(',')}] .links=${linkList.length}`);
  console.log('');

  // Group by signal type
  const decisions = linkList.filter((l: any) => l.signal_type === 'decision');
  const observations = linkList.filter((l: any) => l.signal_type === 'observation');
  const actions = linkList.filter((l: any) => l.signal_type === 'action');
  const sessions = linkList.filter((l: any) => l.signal_type === 'session');

  if (decisions.length > 0) {
    console.log('## Decisions');
    for (const d of decisions) console.log(`σ₂ ${d.content} [${d.from_dept}]`);
    console.log('');
  }
  if (observations.length > 0) {
    console.log('## Observations');
    for (const o of observations) console.log(`${o.sigma} ${o.content} [${o.from_dept}]`);
    console.log('');
  }
  if (actions.length > 0) {
    console.log('## Actions');
    for (const a of actions) console.log(`X ${a.content} [${a.from_dept}]`);
    console.log('');
  }
  if (sessions.length > 0) {
    console.log('## Sessions');
    for (const s of sessions) console.log(`S ${s.content} [${s.from_dept}]`);
    console.log('');
  }

  // Session logs that reference this entity
  const [sessionLogs] = await db.query(`
    SELECT id, title, actions, decisions, created_at
    FROM session_log
    WHERE entities CONTAINS $entity
    ORDER BY created_at DESC
    LIMIT 5
  `, { entity: entityId });
  const logList = (sessionLogs as any[]) || [];

  if (logList.length > 0) {
    console.log('## Conversation History');
    for (const s of logList) {
      const date = s.created_at ? new Date(s.created_at).toISOString().split('T')[0] : '?';
      console.log(`S "${s.title}" @${date}`);
    }
    console.log('');
  }
}

async function printLastSession(db: any) {
  const [sessions] = await db.query(`
    SELECT * FROM session_log ORDER BY created_at DESC LIMIT 1
  `);
  const s = (sessions as any[])?.[0];

  if (!s) {
    console.log('No session logs found.');
    return;
  }

  console.log(`# Last Session: ${s.title}`);
  console.log(`Date: ${s.created_at ? new Date(s.created_at).toISOString() : '?'}`);
  console.log(`Trigger: ${s.trigger_source}`);
  console.log('');
  if (s.summary) {
    console.log(`## Summary\n${s.summary}`);
    console.log('');
  }
  if (s.actions?.length > 0) {
    console.log('## Actions');
    for (const a of s.actions) console.log(`- ${a}`);
    console.log('');
  }
  if (s.decisions?.length > 0) {
    console.log('## Decisions (σ₂)');
    for (const d of s.decisions) console.log(`- ${d}`);
    console.log('');
  }
  if (s.next_steps?.length > 0) {
    console.log('## Next Steps');
    for (const n of s.next_steps) console.log(`- ${n}`);
    console.log('');
  }
  if (s.entities?.length > 0) {
    console.log(`## Entities: ${s.entities.join(', ')}`);
  }
}

async function printActiveDecisions(db: any) {
  console.log('# Active σ₂ Decisions');
  console.log('');

  const [decisions] = await db.query(`
    SELECT to_entity, content, from_dept, created_at
    FROM memory_link
    WHERE sigma = 'σ₂' AND signal_type = 'decision'
    ORDER BY created_at DESC
  `);

  for (const d of (decisions as any[]) || []) {
    const date = d.created_at ? new Date(d.created_at).toISOString().split('T')[0] : '?';
    console.log(`σ₂ ${d.content} → ${d.to_entity} [${d.from_dept} @${date}]`);
  }
}

main().catch(err => {
  console.error('Error loading memory context:', err.message);
  process.exit(1);
});
