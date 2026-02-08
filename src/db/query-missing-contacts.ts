/**
 * Query venues missing contact information
 */

import { getDb, closeDb } from './client.js';

async function main() {
  const db = await getDb();

  console.log('═══════════════════════════════════════════════════════════════');
  console.log('VENUES MISSING EMAIL CONTACTS (by tier)');
  console.log('═══════════════════════════════════════════════════════════════');

  // Get missing contacts by tier
  const missingTier1 = await db.query(`
    SELECT name, city, country, region, type, website, instagram
    FROM venue
    WHERE (contact_email IS NONE OR contact_email = '') AND tier = 1
    ORDER BY country ASC
  `);

  const missingTier2 = await db.query(`
    SELECT name, city, country, region, type, website, instagram
    FROM venue
    WHERE (contact_email IS NONE OR contact_email = '') AND tier = 2
    ORDER BY country ASC
  `);

  console.log('\n🌟 TIER 1 (Dream Venues) - Missing Contacts:');
  console.log('─'.repeat(50));
  const tier1 = missingTier1[0] || [];
  if (Array.isArray(tier1) && tier1.length > 0) {
    for (const v of tier1) {
      console.log(`  ${v.name} (${v.city}, ${v.country})`);
      console.log(`    Type: ${v.type}`);
      if (v.website) console.log(`    Web: ${v.website}`);
      if (v.instagram) console.log(`    IG: ${v.instagram}`);
      console.log('');
    }
    console.log(`  Total Tier 1 missing: ${tier1.length}`);
  } else {
    console.log('  All Tier 1 venues have contacts! ✅');
  }

  console.log('\n⭐ TIER 2 (Priority Venues) - Missing Contacts:');
  console.log('─'.repeat(50));
  const tier2 = missingTier2[0] || [];
  if (Array.isArray(tier2) && tier2.length > 0) {
    for (const v of tier2) {
      console.log(`  ${v.name} (${v.city}, ${v.country})`);
      if (v.website) console.log(`    Web: ${v.website}`);
      if (v.instagram) console.log(`    IG: ${v.instagram}`);
    }
    console.log(`\n  Total Tier 2 missing: ${tier2.length}`);
  } else {
    console.log('  All Tier 2 venues have contacts! ✅');
  }

  // Summary stats
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('SUMMARY BY COUNTRY');
  console.log('═══════════════════════════════════════════════════════════════');

  const byCountry = await db.query(`
    SELECT country,
           count() as total,
           count(IF contact_email != NONE AND contact_email != '' THEN 1 END) as with_email
    FROM venue
    GROUP BY country
    ORDER BY total DESC
  `);

  const countries = byCountry[0] || [];
  if (Array.isArray(countries)) {
    for (const c of countries) {
      const missing = c.total - (c.with_email || 0);
      const pct = Math.round(((c.with_email || 0) / c.total) * 100);
      console.log(`  ${c.country}: ${c.with_email || 0}/${c.total} have email (${pct}%) - ${missing} missing`);
    }
  }

  // Venues WITH contacts for reference
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('TIER 1 VENUES WITH CONTACTS (ready to outreach)');
  console.log('═══════════════════════════════════════════════════════════════');

  const readyTier1 = await db.query(`
    SELECT name, city, country, type, contact_email, instagram, vibe
    FROM venue
    WHERE contact_email != NONE AND contact_email != '' AND tier = 1
    ORDER BY country ASC
  `);

  const ready = readyTier1[0] || [];
  if (Array.isArray(ready)) {
    for (const v of ready) {
      console.log(`  ✅ ${v.name} (${v.city}, ${v.country})`);
      console.log(`     Email: ${v.contact_email}`);
      console.log(`     Type: ${v.type} | Vibe: ${(v.vibe || []).join(', ')}`);
      console.log('');
    }
    console.log(`  Total ready for outreach: ${ready.length}`);
  }

  await closeDb();
}

main();
