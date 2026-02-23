#!/usr/bin/env npx tsx
/**
 * Seed Calendar — Villa Porta Friday Residency
 *
 * Usage: npx tsx scripts/seed-calendar.ts [year]
 * Default: 2026
 *
 * Seeds VP Fridays Jul+Aug as committed dates.
 */

import { getDb } from '../src/db/client.js';
import { seedVillaPortaFridays, getAvailability } from '../src/calendar/calendar-engine.js';

async function main() {
  const year = parseInt(process.argv[2] || '2026', 10);

  console.log(`\n${'═'.repeat(50)}`);
  console.log(`  SEED CALENDAR — Villa Porta Fridays ${year}`);
  console.log(`${'═'.repeat(50)}\n`);

  // Ensure DB connection
  await getDb();

  const result = await seedVillaPortaFridays(year);

  console.log(`  Seeded:  ${result.seeded} Fridays`);
  console.log(`  Skipped: ${result.skipped} (already existed)`);

  // Verify
  const julStart = `${year}-07-01`;
  const augEnd = `${year}-08-31`;
  const committed = await getAvailability(julStart, augEnd);
  const vpDates = committed.filter(c => c.venue_entity === 'venue:villa_porta' || c.venue?.includes('Villa Porta'));

  console.log(`\n  Verification: ${vpDates.length} VP Fridays in DB for Jul-Aug ${year}`);

  for (const d of vpDates) {
    console.log(`    ${d.date} (${d.day_of_week}) — ${d.status}`);
  }

  console.log(`\n${'═'.repeat(50)}\n`);
  process.exit(0);
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
