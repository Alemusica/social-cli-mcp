#!/usr/bin/env npx tsx
/**
 * Quick verification of agent memory system state
 */

import { memory } from '../src/agents/memory/index.js';
import { closeDb, getDb } from '../src/db/client.js';

async function main() {
  const db = await getDb();

  // Count records
  const [sessions] = await db.query('SELECT count() FROM agent_session GROUP ALL');
  const [links] = await db.query('SELECT count() FROM memory_link GROUP ALL');
  const [depts] = await db.query('SELECT count() FROM dept_memory GROUP ALL');

  console.log('=== AGENT MEMORY SYSTEM STATUS ===');
  console.log('Sessions:', (sessions as any)?.[0]?.count || 0);
  console.log('Memory links:', (links as any)?.[0]?.count || 0);
  console.log('Fused dept memories:', (depts as any)?.[0]?.count || 0);

  // Department details
  const [deptRecords] = await db.query(`
    SELECT department, session_count,
           array::len(entities) as entity_count,
           array::len(sigma2_decisions) as sigma2_count,
           last_fused
    FROM dept_memory
  `);
  console.log('\n=== FUSED DEPARTMENTS ===');
  for (const d of (deptRecords as any[]) || []) {
    console.log(`  ${d.department}: ${d.session_count} sessions fused, ${d.entity_count} entities, ${d.sigma2_count} σ₂`);
  }

  // Cross-department entities
  const shared = await memory.sharedEntities();
  console.log('\n=== CROSS-DEPARTMENT CONVERGENCE ===');
  for (const s of shared) {
    console.log(`  ${s.entity}: ${s.departments.join(' + ')} (${s.linkCount} links)`);
  }

  // All unique entities
  const [entities] = await db.query('SELECT to_entity FROM memory_link GROUP BY to_entity');
  console.log('\nTotal unique entities in memory:', ((entities as any[]) || []).length);

  // Per-market summary
  for (const market of ['market:japan', 'market:gulf', 'market:qatar']) {
    const mem = await memory.queryEntity(market);
    if (mem) {
      console.log(`\n📊 ${market}:`);
      console.log(`  Departments: ${mem.departments.join(', ')}`);
      console.log(`  Decisions: ${mem.decisions.length}`);
      console.log(`  Observations: ${mem.observations.length}`);
      console.log(`  Actions: ${mem.actions.length}`);
    }
  }

  await closeDb();
}

main().catch(err => {
  console.error('❌', err.message);
  process.exit(1);
});
