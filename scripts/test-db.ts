/**
 * Test SurrealDB connection and count records
 */
import { getDb, closeDb } from '../src/db/client.js';

async function test() {
  try {
    const db = await getDb();

    const [venues] = await db.query('SELECT count() FROM venue GROUP ALL');
    const [content] = await db.query('SELECT count() FROM content GROUP ALL');
    const [emails] = await db.query('SELECT count() FROM email GROUP ALL');
    const [arcs] = await db.query('SELECT count() FROM story_arc GROUP ALL');
    const [drafts] = await db.query('SELECT count() FROM post_draft GROUP ALL');

    console.log('\n📊 SurrealDB Status:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Venues:       ${(venues as any)?.[0]?.count ?? 0}`);
    console.log(`Content:      ${(content as any)?.[0]?.count ?? 0}`);
    console.log(`Emails:       ${(emails as any)?.[0]?.count ?? 0}`);
    console.log(`Story Arcs:   ${(arcs as any)?.[0]?.count ?? 0}`);
    console.log(`Post Drafts:  ${(drafts as any)?.[0]?.count ?? 0}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    await closeDb();
    process.exit(0);
  } catch (e: any) {
    console.error('❌ Error:', e.message);
    process.exit(1);
  }
}

test();
