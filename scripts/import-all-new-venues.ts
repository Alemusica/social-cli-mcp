#!/usr/bin/env npx tsx
/**
 * Import ALL new venue sources + agencies to SurrealDB
 * Sources:
 *   1. greek-islands-ground-level-2026-02-06.json (31 venues)
 *   2. spain-portugal-beach-bars-2026.json (40+ venues)
 *   3. Manually defined agencies (ACE Music, Afrogreco, Palmera, etc.)
 *
 * Run: npx tsx scripts/import-all-new-venues.ts
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

  let totalImported = 0;
  let totalSkipped = 0;

  // ═══════════════════════════════════════════════
  // SOURCE 1: Greek Islands Ground Level
  // ═══════════════════════════════════════════════
  console.log('═══ SOURCE 1: Greek Islands Ground Level ═══');
  const greekVenues = JSON.parse(
    fs.readFileSync('content/outreach/venues/greek-islands-ground-level-2026-02-06.json', 'utf-8')
  );

  for (const v of greekVenues) {
    if (existingNames.has(v.name.toLowerCase().trim())) {
      totalSkipped++;
      continue;
    }
    const id = toSurrealId(v.name);
    try {
      await db.query(`
        CREATE type::thing('venue', $id) SET
          name = $name,
          location = $location,
          country = $country,
          website = $website,
          contact_email = $email,
          instagram = $instagram,
          type = $type,
          why_fit = $whyFit,
          booking_window = $bookingWindow,
          tier = $tier,
          source = $source,
          status = 'prospect',
          region = $region,
          island = $island,
          insider_tip = $insiderTip,
          music_frequency = $musicFrequency,
          season = $season,
          booking_process = $bookingProcess,
          created_at = time::now()
      `, {
        id,
        name: v.name,
        location: v.location || '',
        country: v.country || 'Greece',
        website: v.website || '',
        email: v.email || '',
        instagram: v.instagram || '',
        type: v.type || 'beach_bar',
        whyFit: v.whyGoodFit || '',
        bookingWindow: v.bookingWindow || '',
        tier: v.tier || 1,
        source: 'greek_islands_ground_level_2026',
        region: v.region || '',
        island: v.island || '',
        insiderTip: v.insiderTip || '',
        musicFrequency: v.musicFrequency || '',
        season: v.season || 'May-Oct',
        bookingProcess: v.bookingProcess || ''
      });
      totalImported++;
      console.log(`  ✅ ${v.name} (${v.island || v.country})`);
      existingNames.add(v.name.toLowerCase().trim());
    } catch (err: any) {
      if (err.message?.includes('already exists')) {
        totalSkipped++;
      } else {
        console.log(`  ❌ ${v.name}: ${err.message}`);
      }
    }
  }

  // ═══════════════════════════════════════════════
  // SOURCE 2: Spain/Portugal Beach Bars
  // ═══════════════════════════════════════════════
  console.log('\n═══ SOURCE 2: Spain/Portugal Beach Bars ═══');
  const spainVenues = JSON.parse(
    fs.readFileSync('content/outreach/venues/spain-portugal-beach-bars-2026.json', 'utf-8')
  );

  for (const v of spainVenues) {
    const name = v.venue_name || v.name;
    if (!name || existingNames.has(name.toLowerCase().trim())) {
      totalSkipped++;
      continue;
    }
    const id = toSurrealId(name);
    try {
      await db.query(`
        CREATE type::thing('venue', $id) SET
          name = $name,
          location = $address,
          country = $country,
          website = $website,
          contact_email = $email,
          instagram = $instagram,
          type = $type,
          why_fit = $whyFit,
          tier = $tier,
          source = $source,
          status = 'prospect',
          region = $region,
          segment = $segment,
          recommended_video = $recVideo,
          needs_verification = $needsVerify,
          created_at = time::now()
      `, {
        id,
        name: name,
        address: v.address || v.location || '',
        country: v.country || 'Spain',
        website: v.website || '',
        email: v.contact_email || v.email || '',
        instagram: v.instagram || '',
        type: v.type || 'beach_bar',
        whyFit: v.why_good_fit || v.whyGoodFit || '',
        tier: v.tier || 1,
        source: 'spain_portugal_beach_bars_2026',
        region: v.region || '',
        segment: v.segment || '',
        recVideo: v.recommended_video || '',
        needsVerify: v.needs_verification || false
      });
      totalImported++;
      console.log(`  ✅ ${name} (${v.region || v.country})`);
      existingNames.add(name.toLowerCase().trim());
    } catch (err: any) {
      if (err.message?.includes('already exists')) {
        totalSkipped++;
      } else {
        console.log(`  ❌ ${name}: ${err.message}`);
      }
    }
  }

  // ═══════════════════════════════════════════════
  // SOURCE 3: Booking Agencies (HIGH PRIORITY)
  // ═══════════════════════════════════════════════
  console.log('\n═══ SOURCE 3: Booking Agencies ═══');

  // Define agency table if not exists
  await db.query(`
    DEFINE TABLE IF NOT EXISTS booking_agency SCHEMALESS;
    DEFINE FIELD IF NOT EXISTS name ON booking_agency TYPE string;
    DEFINE FIELD IF NOT EXISTS status ON booking_agency TYPE string DEFAULT 'prospect';
    DEFINE FIELD IF NOT EXISTS created_at ON booking_agency TYPE datetime DEFAULT time::now();
  `);

  const agencies = [
    {
      id: 'palmera_booking',
      name: 'Palmera Booking',
      location: 'Monaco / South of France',
      website: 'https://www.palmerabooking.com',
      email: 'VERIFY_ON_WEBSITE',
      regions: ['Monaco', 'Côte d\'Azur', 'South of France', 'Mediterranean'],
      venue_types: ['Luxury hotels', 'Beach clubs', 'Private events', 'Galas'],
      commission: 'Standard agency commission',
      priority: 1,
      urgency: 'CRITICAL - Auditions in Monaco FEBRUARY 2026 = NOW',
      notes: 'Has auditions in Monaco in February 2026. Must apply IMMEDIATELY.',
      source: 'deep_research_attachment'
    },
    {
      id: 'ace_music',
      name: 'ACE Music',
      location: 'Mediterranean',
      website: 'VERIFY',
      email: 'VERIFY',
      regions: ['Mediterranean', 'Europe'],
      venue_types: ['Hotels', 'Beach clubs', 'Resorts'],
      commission: '0% - FREE for artists',
      priority: 1,
      urgency: 'HIGH - No commission = pure profit',
      notes: 'Zero commission model. Venue pays the agency directly. Artist gets full fee.',
      source: 'deep_research_attachment'
    },
    {
      id: 'afrogreco',
      name: 'Afrogreco',
      location: 'Greece',
      website: 'VERIFY',
      email: 'VERIFY',
      regions: ['Greece', 'Greek Islands', 'Mykonos', 'Santorini'],
      venue_types: ['5-star hotels', 'Luxury resorts', 'Beach clubs'],
      commission: 'Standard agency commission',
      priority: 1,
      urgency: 'HIGH - Covers 5-star hotels in Greece. Perfect for RAV Vast sunset sessions.',
      notes: 'Specializes in luxury Greek hospitality entertainment. Greece Got Talent is strong opener.',
      source: 'deep_research_attachment'
    },
    {
      id: 'scarlett_entertainment',
      name: 'Scarlett Entertainment',
      location: 'UK / International',
      website: 'https://www.scarlettentertainment.com',
      email: 'VERIFY_ON_WEBSITE',
      regions: ['Mediterranean', 'Middle East', 'Europe', 'Worldwide'],
      venue_types: ['Corporate events', 'Hotels', 'Private events', 'Festivals'],
      commission: 'Standard agency commission',
      priority: 2,
      notes: 'Large international entertainment agency.',
      source: 'deep_research_attachment'
    },
    {
      id: 'ibiza_music_agency',
      name: 'Ibiza Music Agency',
      location: 'Ibiza, Spain',
      website: 'https://www.ibizamusicagency.com',
      email: 'info@ibizamusicagency.com',
      regions: ['Ibiza', 'Formentera', 'Mallorca'],
      venue_types: ['Hotels', 'Beach clubs', 'Restaurants', 'Private villas'],
      commission: 'Commission-based',
      priority: 2,
      notes: 'Established Ibiza hospitality circuit agency.',
      source: 'deep_research_attachment'
    },
    {
      id: 'la_bottega_degli_artisti',
      name: 'La Bottega degli Artisti',
      location: 'Italy',
      website: 'VERIFY',
      email: 'VERIFY',
      regions: ['Italy', 'Puglia', 'Salento', 'Sicily', 'Sardinia'],
      venue_types: ['Hotels', 'Agriturismi', 'Beach clubs', 'Wine bars', 'Festivals'],
      commission: 'Standard agency commission',
      priority: 2,
      notes: 'Italian booking agency. Good for Salento corridor and Italian venues.',
      source: 'deep_research_attachment'
    },
    {
      id: 'musicastrada',
      name: 'Musicastrada',
      location: 'Italy',
      website: 'https://www.musicastrada.it',
      email: 'VERIFY',
      regions: ['Italy', 'Tuscany', 'Mediterranean'],
      venue_types: ['Festivals', 'Cultural venues', 'Summer events'],
      commission: 'Standard agency commission',
      priority: 2,
      notes: 'Italian music network/festival circuit.',
      source: 'deep_research_attachment'
    },
    {
      id: 'remarc_music',
      name: 'Remarc Music',
      location: 'Mediterranean',
      website: 'VERIFY',
      email: 'VERIFY',
      regions: ['Mediterranean', 'Europe'],
      venue_types: ['Hotels', 'Resorts', 'Beach clubs'],
      commission: 'Standard agency commission',
      priority: 3,
      notes: 'Mediterranean entertainment agency.',
      source: 'deep_research_attachment'
    },
    {
      id: 'elastic_lounge',
      name: 'Elastic Lounge',
      location: 'UK',
      website: 'https://www.elasticlounge.com',
      email: 'VERIFY',
      regions: ['UK', 'International', 'Mediterranean'],
      venue_types: ['Hotels', 'Corporate events', 'Private parties'],
      commission: 'Standard agency commission',
      priority: 3,
      notes: 'Hotel entertainment specialist. Past clients: Claridge\'s, Burj Al Arab.',
      source: 'deep_research_attachment'
    },
    {
      id: 'talents_productions',
      name: 'Talents & Productions',
      location: 'Monaco / France',
      website: 'VERIFY',
      email: 'VERIFY',
      regions: ['Monaco', 'Côte d\'Azur', 'South of France'],
      venue_types: ['Luxury hotels', 'Galas', 'Private events', 'Corporate'],
      commission: 'Standard agency commission',
      priority: 2,
      notes: 'Monaco-based luxury entertainment agency.',
      source: 'deep_research_attachment'
    }
  ];

  let agencyImported = 0;
  for (const a of agencies) {
    try {
      await db.query(`
        CREATE type::thing('booking_agency', $id) SET
          name = $name,
          location = $location,
          website = $website,
          contact_email = $email,
          regions = $regions,
          venue_types = $venueTypes,
          commission = $commission,
          priority = $priority,
          urgency = $urgency,
          notes = $notes,
          source = $source,
          status = 'prospect',
          created_at = time::now()
      `, {
        id: a.id,
        name: a.name,
        location: a.location,
        website: a.website,
        email: a.email,
        regions: a.regions,
        venueTypes: a.venue_types,
        commission: a.commission,
        priority: a.priority,
        urgency: a.urgency || '',
        notes: a.notes,
        source: a.source
      });
      agencyImported++;
      const marker = a.priority === 1 ? '🔥' : '✅';
      console.log(`  ${marker} ${a.name} (P${a.priority}) ${a.urgency ? '— ' + a.urgency : ''}`);
    } catch (err: any) {
      if (err.message?.includes('already exists')) {
        console.log(`  ⏭️  ${a.name} (already in DB)`);
      } else {
        console.log(`  ❌ ${a.name}: ${err.message}`);
      }
    }
  }

  // ═══════════════════════════════════════════════
  // SUMMARY
  // ═══════════════════════════════════════════════
  const [venueCount] = await db.query<[{ count: number }[]]>('SELECT count() FROM venue GROUP ALL');
  const [agencyCount] = await db.query<[{ count: number }[]]>('SELECT count() FROM booking_agency GROUP ALL');

  console.log('\n' + '═'.repeat(50));
  console.log('📊 IMPORT COMPLETE');
  console.log('═'.repeat(50));
  console.log(`✅ Venues imported: ${totalImported}`);
  console.log(`⏭️  Venues skipped (duplicates): ${totalSkipped}`);
  console.log(`🏢 Agencies imported: ${agencyImported}`);
  console.log(`📍 Total venues in DB: ${(venueCount as any)?.[0]?.count || 'unknown'}`);
  console.log(`📍 Total agencies in DB: ${(agencyCount as any)?.[0]?.count || 'unknown'}`);

  console.log('\n🔥 IMMEDIATE ACTIONS:');
  console.log('  1. Palmera Booking — Monaco auditions THIS MONTH');
  console.log('  2. ACE Music — 0% commission, apply NOW');
  console.log('  3. Afrogreco — 5-star Greek hotels, Greece Got Talent is opener');

  await closeDb();
  process.exit(0);
}

main().catch(console.error);
