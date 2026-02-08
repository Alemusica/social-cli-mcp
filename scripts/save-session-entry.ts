/**
 * Save a session_log entry to SurrealDB.
 * Used at end of Claude Code sessions.
 *
 * Usage: npx tsx scripts/save-session-entry.ts <json-file>
 *        npx tsx scripts/save-session-entry.ts --inline '<json>'
 */

import { getDb } from '../src/db/client.js';

interface SessionEntry {
  title: string;
  trigger: string;
  actions: string[];
  decisions: string[];
  entities: string[];
  files: { path: string; action: string }[];
  nextSteps: string[];
  summary: string;
  notes?: string;
}

function randomSuffix(): string {
  return Math.random().toString(36).slice(2, 6);
}

async function main() {
  const args = process.argv.slice(2);

  let entry: SessionEntry;

  if (args[0] === '--inline') {
    entry = JSON.parse(args[1]);
  } else if (args[0]) {
    const { readFileSync } = await import('fs');
    entry = JSON.parse(readFileSync(args[0], 'utf-8'));
  } else {
    console.error('Usage: npx tsx scripts/save-session-entry.ts <json-file>');
    console.error('       npx tsx scripts/save-session-entry.ts --inline \'<json>\'');
    process.exit(1);
  }

  const db = await getDb();
  const id = `session_${new Date().toISOString().slice(0, 10).replace(/-/g, '_')}_${randomSuffix()}`;

  // Save session_log record
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
    summary: entry.summary,
    notes: entry.notes || '',
  });

  // Create memory_links for entities (σ₁)
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
    `, { linkId, entity: entityId, title: entry.title });
  }

  // Create σ₂ decision links
  for (const decision of entry.decisions) {
    for (const entityId of entry.entities) {
      const decId = `sdec_${entityId.replace(/[^a-zA-Z0-9]/g, '_')}_${id}`;
      await db.query(`
        UPSERT type::thing("memory_link", $linkId) SET
          from_dept = 'session',
          to_entity = $entity,
          signal_type = 'decision',
          content = $content,
          sigma = 'σ₂',
          created_at = time::now()
      `, { linkId: decId, entity: entityId, content: decision });
    }
  }

  console.log(`Saved session_log: ${id}`);
  console.log(`  Title: ${entry.title}`);
  console.log(`  Actions: ${entry.actions.length}`);
  console.log(`  Decisions: ${entry.decisions.length}`);
  console.log(`  Entities: ${entry.entities.length}`);
  console.log(`  Memory links created: ${entry.entities.length + (entry.decisions.length * entry.entities.length)}`);

  process.exit(0);
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
