#!/usr/bin/env npx tsx
/**
 * Import venues from full-mediterranean-database-2026.json to SurrealDB
 * Deduplicates by name against existing venues.
 *
 * Run: npx tsx scripts/import-full-mediterranean.ts
 */

import * as fs from 'fs';
import { getDb, closeDb } from '../src/db/client.js';

function toSurrealId(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

async function main() {
  const db = await getDb();

  // Get existing venues for dedup
  const [existingResult] = await db.query<[{ name: string }[]]>('SELECT name FROM venue');
  const existingNames = new Set((existingResult || []).map(v => v.name.toLowerCase().trim()));
  console.log(`📊 ${existingNames.size} existing venues in DB\n`);

  const venues = JSON.parse(
    fs.readFileSync('content/outreach/venues/full-mediterranean-database-2026.json', 'utf-8')
  );

  console.log(`📂 ${venues.length} venues in source file\n`);

  let imported = 0;
  let skipped = 0;

  for (const v of venues) {
    const name = v.name;
    if (!name) { skipped++; continue; }

    if (existingNames.has(name.toLowerCase().trim())) {
      skipped++;
      continue;
    }

    const id = toSurrealId(name);
    try {
      await db.query(`
        CREATE type::thing('venue', $id) SET
          name = $name,
          location = $location,
          country = $country,
          region = $region,
          website = $website,
          contact_email = $email,
          instagram = $instagram,
          phone = $phone,
          type = $type,
          tier = $tier,
          budget = $budget,
          season = $season,
          music_frequency = $musicFrequency,
          how_to_book = $howToBook,
          why_fit = $whyFit,
          source = $source,
          status = 'prospect',
          created_at = time::now()
      `, {
        id,
        name,
        location: v.location || '',
        country: v.country || '',
        region: v.region || '',
        website: v.website || '',
        email: v.email || '',
        instagram: v.instagram || '',
        phone: v.phone || '',
        type: v.type || 'beach_bar',
        tier: v.tier || 1,
        budget: v.budget || '',
        season: v.season || '',
        musicFrequency: v.musicFrequency || '',
        howToBook: v.howToBook || '',
        whyFit: v.whyFit || '',
        source: v.source || 'deep_research_full_2026'
      });
      imported++;
      console.log(`  ✅ ${name} (${v.region || v.country})`);
      existingNames.add(name.toLowerCase().trim());
    } catch (err: any) {
      if (err.message?.includes('already exists')) {
        skipped++;
        console.log(`  ⏭️  ${name} (ID collision)`);
      } else {
        console.log(`  ❌ ${name}: ${err.message}`);
      }
    }
  }

  // Summary
  const [venueCount] = await db.query<[{ count: number }[]]>('SELECT count() FROM venue GROUP ALL');

  console.log('\n' + '═'.repeat(50));
  console.log('📊 IMPORT COMPLETE');
  console.log('═'.repeat(50));
  console.log(`✅ Imported: ${imported}`);
  console.log(`⏭️  Skipped: ${skipped}`);
  console.log(`📍 Total venues in DB: ${(venueCount as any)?.[0]?.count || 'unknown'}`);

  await closeDb();
  process.exit(0);
}

main().catch(console.error);
