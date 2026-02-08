#!/usr/bin/env tsx
/**
 * Archive Instagram insights with custom date
 * Usage: npx tsx scripts/archive-insights-yesterday.ts
 */

import { bootstrap, archiveAudienceInsights } from '../src/core/index.js';

async function main() {
  console.log('📦 Archiving Instagram insights with date 2026-01-22...\n');

  await bootstrap({ verbose: false });

  // Archive with yesterday's date (2026-01-22 noon UTC)
  const yesterday = new Date('2026-01-22T12:00:00Z');
  const result = await archiveAudienceInsights(yesterday);

  if (result.success) {
    console.log('✅ Insights archived successfully!\n');
    console.log(`📊 Snapshot ID: ${result.snapshotId}`);
    console.log(`📅 Date: ${new Date(result.snapshot.captured_at).toLocaleString('it-IT')}`);
    console.log(`\n📈 Stats Saved:`);
    console.log(`   Followers: ${result.snapshot.followers?.toLocaleString()}`);

    const italy = result.snapshot.top_countries?.find(c => c.country === 'IT');
    const greece = result.snapshot.top_countries?.find(c => c.country === 'GR');

    if (italy) console.log(`   🇮🇹 Italy:  ${italy.count.toLocaleString()}`);
    if (greece) console.log(`   🇬🇷 Greece: ${greece.count.toLocaleString()}`);

    console.log(`   🔗 IT↔GR Corridor: ${result.snapshot.italy_greece_corridor_pct}%`);

    console.log(`\n💾 Saved to SurrealDB: audience_snapshot table`);
  } else {
    console.error('❌ Failed to archive:', result.error);
    process.exit(1);
  }

  process.exit(0);
}

main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
