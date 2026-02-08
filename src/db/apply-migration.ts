#!/usr/bin/env npx tsx
/**
 * Apply database migrations
 */

import { readFileSync } from 'fs';
import { getDb, closeDb } from './client.js';

async function main() {
  const migrationFile = process.argv[2];

  if (!migrationFile) {
    console.log('Usage: npx tsx apply-migration.ts <migration-file.surql>');
    console.log('Example: npx tsx apply-migration.ts migrations/002_add_analysis_tables.surql');
    process.exit(1);
  }

  console.log(`📦 Applying migration: ${migrationFile}`);

  const db = await getDb();

  try {
    const sql = readFileSync(migrationFile, 'utf-8');

    // Split by semicolons and run each statement
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`   Running ${statements.length} statements...`);

    for (const stmt of statements) {
      try {
        await db.query(stmt);
        console.log(`   ✅ ${stmt.substring(0, 50)}...`);
      } catch (err: any) {
        if (err.message?.includes('already exists')) {
          console.log(`   ⏭️  Skipped (exists): ${stmt.substring(0, 40)}...`);
        } else {
          console.error(`   ❌ Failed: ${stmt.substring(0, 40)}...`);
          console.error(`      Error: ${err.message}`);
        }
      }
    }

    console.log('\n✅ Migration complete!');
  } catch (err) {
    console.error('❌ Migration failed:', err);
  } finally {
    await closeDb();
  }
}

main();
