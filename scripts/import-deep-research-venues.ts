#!/usr/bin/env npx tsx
/**
 * Import Deep Research Venues to SurrealDB
 * Avoids duplicates by checking existing venues
 */

import * as fs from 'fs';
import { getDb } from '../src/db/client.js';

interface Venue {
  name: string;
  location: string;
  country: string;
  website: string;
  email: string;
  type: string;
  whyFit: string;
  bookingWindow: string;
  tier: number;
  socialProof: string;
  source: string;
}

async function main() {
  const db = await getDb();

  // Load venues from JSON
  const venues: Venue[] = JSON.parse(
    fs.readFileSync('content/outreach/venues/deep-research-2026-01-27.json', 'utf-8')
  );

  console.log(`📥 Loading ${venues.length} venues from Deep Research...\n`);

  // Get existing venues from DB
  const [existingResult] = await db.query<[{ name: string; contact_email: string }[]]>(
    'SELECT name, contact_email FROM venue'
  );
  const existing = existingResult || [];

  const existingNames = new Set(existing.map(v => v.name.toLowerCase().trim()));
  const existingEmails = new Set(existing.map(v => v.contact_email?.toLowerCase().trim()).filter(Boolean));

  console.log(`📊 Found ${existing.length} existing venues in DB\n`);

  let imported = 0;
  let skipped = 0;
  let duplicates: string[] = [];

  for (const venue of venues) {
    const nameLower = venue.name.toLowerCase().trim();
    const emailLower = venue.email?.toLowerCase().trim();

    // Check for duplicates
    const isDuplicateName = existingNames.has(nameLower);
    const isDuplicateEmail = emailLower && !emailLower.includes('instagram') && !emailLower.includes('website') && existingEmails.has(emailLower);

    if (isDuplicateName || isDuplicateEmail) {
      skipped++;
      duplicates.push(venue.name);
      continue;
    }

    // Create venue record
    const venueId = venue.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');

    try {
      await db.query(`
        CREATE venue:${venueId} SET
          name = $name,
          location = $location,
          country = $country,
          website = $website,
          contact_email = $email,
          type = $type,
          why_fit = $whyFit,
          booking_window = $bookingWindow,
          tier = $tier,
          social_proof_needed = $socialProof,
          source = $source,
          status = 'prospect',
          created_at = time::now()
      `, {
        name: venue.name,
        location: venue.location,
        country: venue.country,
        website: venue.website,
        email: venue.email,
        type: venue.type,
        whyFit: venue.whyFit,
        bookingWindow: venue.bookingWindow,
        tier: venue.tier,
        socialProof: venue.socialProof,
        source: venue.source
      });

      imported++;
      console.log(`✅ ${venue.name} (${venue.country})`);
    } catch (error: any) {
      if (error.message?.includes('already exists')) {
        skipped++;
        duplicates.push(venue.name);
      } else {
        console.log(`❌ ${venue.name}: ${error.message}`);
      }
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log(`📊 IMPORT SUMMARY`);
  console.log('='.repeat(50));
  console.log(`✅ Imported: ${imported}`);
  console.log(`⏭️  Skipped (duplicates): ${skipped}`);
  console.log(`📍 Total in DB: ${existing.length + imported}`);

  if (duplicates.length > 0) {
    console.log(`\n⚠️  Skipped duplicates:`);
    duplicates.forEach(d => console.log(`   - ${d}`));
  }

  // Summary by country
  console.log('\n📍 By Country:');
  const byCountry: Record<string, number> = {};
  venues.forEach(v => {
    byCountry[v.country] = (byCountry[v.country] || 0) + 1;
  });
  Object.entries(byCountry)
    .sort((a, b) => b[1] - a[1])
    .forEach(([country, count]) => {
      console.log(`   ${country}: ${count}`);
    });

  // Summary by type
  console.log('\n🏷️  By Type:');
  const byType: Record<string, number> = {};
  venues.forEach(v => {
    byType[v.type] = (byType[v.type] || 0) + 1;
  });
  Object.entries(byType)
    .sort((a, b) => b[1] - a[1])
    .forEach(([type, count]) => {
      console.log(`   ${type}: ${count}`);
    });

  // Summary by tier
  console.log('\n⭐ By Tier:');
  const byTier: Record<number, number> = {};
  venues.forEach(v => {
    byTier[v.tier] = (byTier[v.tier] || 0) + 1;
  });
  [1, 2, 3].forEach(tier => {
    console.log(`   Tier ${tier}: ${byTier[tier] || 0}`);
  });

  process.exit(0);
}

main().catch(console.error);
