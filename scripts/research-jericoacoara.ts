#!/usr/bin/env npx tsx
/**
 * Jericoacoara Venue Research — Generate venue JSON + persist to SurrealDB
 *
 * Hardcoded deep research for Jericoacoara, Brazil.
 * Bohemian/spiritual beach village — Efthymia test passes for most venues here.
 *
 * Run: npx tsx scripts/research-jericoacoara.ts
 */

import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { getDb, closeDb } from '../src/db/client.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface RawVenueData {
  name: string;
  location: string;
  country: string;
  category: string;
  sub_category?: string;
  contact_email?: string;
  website?: string;
  instagram?: string;
  notes?: string;
  live_music_details?: string;
}

const JERI_VENUES: RawVenueData[] = [
  {
    name: 'Duna do Pôr do Sol',
    location: 'Jericoacoara, Ceará',
    country: 'Brazil',
    category: 'beach_venue',
    sub_category: 'sunset_spot',
    notes: 'Iconic sunset dune — live music sessions at golden hour. Tourist hub, high foot traffic.',
    live_music_details: 'Sunset performances, acoustic sets, drum circles. Artists play informally.',
  },
  {
    name: 'Café Gourmet de Jeri',
    location: 'Rua Principal, Jericoacoara',
    country: 'Brazil',
    category: 'restaurant_bar',
    sub_category: 'cafe_music',
    notes: 'Popular café on main street with live music evenings. Bohemian vibe.',
    live_music_details: 'Acoustic sets, Brazilian MPB, occasional international artists.',
  },
  {
    name: 'Pousada Jeriba',
    location: 'Jericoacoara, Ceará',
    country: 'Brazil',
    category: 'hotel',
    sub_category: 'pousada',
    website: 'https://www.pousadajeriba.com.br',
    notes: 'Mid-range pousada with events area. Pool parties and live sessions.',
    live_music_details: 'Pool sessions, sunset events, occasional live acts.',
  },
  {
    name: 'Bugaloo Beach Bar',
    location: 'Praia de Jericoacoara',
    country: 'Brazil',
    category: 'beach_club',
    sub_category: 'beach_bar',
    notes: 'Beachfront bar with DJ and live music. Electronic and acoustic mix.',
    live_music_details: 'DJ sets, live electronic, sunset sessions on the beach.',
  },
  {
    name: 'Carcará Ecofestival',
    location: 'Near Jericoacoara',
    country: 'Brazil',
    category: 'festival',
    sub_category: 'eco_festival',
    notes: 'Annual eco-festival near Jeri. Music, yoga, sustainability. Boutique 500-1000 capacity.',
    live_music_details: 'Multiple stages, electronic and world music, sound healing workshops.',
  },
  {
    name: 'Vila Kalango',
    location: 'Jericoacoara, Ceará',
    country: 'Brazil',
    category: 'hotel',
    sub_category: 'boutique_hotel',
    website: 'https://www.vilakalango.com.br',
    notes: 'Upscale boutique hotel. Wellness + events. Could host sound journeys.',
    live_music_details: 'Occasional live music events, wellness retreat programming.',
  },
  {
    name: 'Alchymist Beach Club',
    location: 'Praia de Jericoacoara',
    country: 'Brazil',
    category: 'beach_club',
    sub_category: 'luxury_beach',
    notes: 'Higher-end beach club. International crowd. Electronic music focused.',
    live_music_details: 'DJ residencies, guest artists, beach parties.',
  },
  {
    name: 'Tattoo Bar Jeri',
    location: 'Rua das Dunas, Jericoacoara',
    country: 'Brazil',
    category: 'bar',
    sub_category: 'nightlife',
    notes: 'Popular nightlife spot. Reggae, forró, live music.',
    live_music_details: 'Live bands most nights. Reggae, forró, rock. Open mic occasionally.',
  },
];

function toSurrealId(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

async function main() {
  console.log('='.repeat(60));
  console.log('  JERICOACOARA VENUE RESEARCH');
  console.log('  Deep research — hardcoded venue data');
  console.log('='.repeat(60));
  console.log();

  // ── Write JSON file ──────────────────────────────────────
  const outPath = join(__dirname, '..', 'content', 'outreach', 'venues', 'jericoacoara-deep-research-2026.json');
  writeFileSync(outPath, JSON.stringify(JERI_VENUES, null, 2), 'utf-8');
  console.log(`Written ${JERI_VENUES.length} venues to:`);
  console.log(`  ${outPath}\n`);

  // ── Upsert to SurrealDB ──────────────────────────────────
  const db = await getDb();

  let upserted = 0;
  let errors = 0;

  for (const venue of JERI_VENUES) {
    const id = toSurrealId(venue.name);
    try {
      // Build SET clause — only include non-null optional fields
      // SurrealDB SCHEMAFULL rejects NULL for option<string>, needs NONE
      const sets: string[] = [
        'name = $name',
        'location = $location',
        'country = $country',
        'type = $category',
        "source = 'jericoacoara-deep-research-2026'",
        "status = 'prospect'",
        'tier = 2',
        'created_at = time::now()',
      ];
      const params: Record<string, any> = {
        id,
        name: venue.name,
        location: venue.location,
        country: venue.country,
        category: venue.category,
      };

      if (venue.notes) { sets.push('notes = $notes'); params.notes = venue.notes; }
      if (venue.live_music_details) { sets.push('live_music_details = $live_music_details'); params.live_music_details = venue.live_music_details; }
      if (venue.website) { sets.push('website = $website'); params.website = venue.website; }
      if (venue.instagram) { sets.push('instagram = $instagram'); params.instagram = venue.instagram; }
      if (venue.contact_email) { sets.push('contact_email = $contact_email'); params.contact_email = venue.contact_email; }
      if (venue.sub_category) { sets.push('sub_category = $sub_category'); params.sub_category = venue.sub_category; }

      await db.query(
        `UPSERT type::thing('venue', $id) SET ${sets.join(',\n          ')}`,
        params,
      );
      upserted++;
      console.log(`  OK  ${venue.name} (${venue.category})`);
    } catch (err: any) {
      errors++;
      console.log(`  ERR ${venue.name}: ${err.message}`);
    }
  }

  // ── Summary ──────────────────────────────────────────────
  console.log();
  console.log('='.repeat(60));
  console.log('  SUMMARY');
  console.log('='.repeat(60));
  console.log(`  Venues in file : ${JERI_VENUES.length}`);
  console.log(`  Upserted to DB : ${upserted}`);
  console.log(`  Errors         : ${errors}`);

  const byCategory: Record<string, number> = {};
  for (const v of JERI_VENUES) {
    byCategory[v.category] = (byCategory[v.category] || 0) + 1;
  }
  console.log();
  console.log('  By category:');
  for (const [cat, count] of Object.entries(byCategory).sort((a, b) => b[1] - a[1])) {
    console.log(`    ${cat}: ${count}`);
  }

  await closeDb();
  process.exit(0);
}

main().catch(err => {
  console.error('ERR:', err.message);
  process.exit(1);
});
