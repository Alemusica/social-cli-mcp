/**
 * Import full venue database into SurrealDB
 */

import { getDb, closeDb } from './client.js';
import { importVenuesToDb, importBookingAgentsToDb, ALL_VENUES, USA_BOOKING_AGENTS } from './venues-database.js';
import { insertArtistProfile } from './artist-profile.js';

async function main() {
  console.log('🚀 Importing full venue database to SurrealDB...');
  console.log('═'.repeat(50));

  try {
    const db = await getDb();

    // Clear existing venues first
    console.log('\n🗑️ Clearing existing venues...');
    await db.query('DELETE FROM venue;');
    await db.query('DELETE FROM booking_agent;');

    // Import venues
    await importVenuesToDb(db);

    // Import booking agents
    await importBookingAgentsToDb(db);

    // Import artist profile
    console.log('\n👤 Importing artist profile...');
    await insertArtistProfile(db);

    console.log('\n' + '═'.repeat(50));
    console.log('✅ Full import complete!');
    console.log(`\n📊 Total: ${ALL_VENUES.length} venues + ${USA_BOOKING_AGENTS.length} booking agents`);

    // Quick stats
    const tierStats = await db.query(`
      SELECT tier, count() as count FROM venue GROUP BY tier ORDER BY tier;
    `);
    console.log('\n📈 By Tier:', tierStats);

  } catch (error) {
    console.error('❌ Import failed:', error);
  } finally {
    await closeDb();
  }
}

main();
