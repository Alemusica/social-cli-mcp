/**
 * Sync Outreach Tracking to SurrealDB
 * Imports tracking.json emails into email table with venue relations
 */
import { readFileSync } from 'fs';
import { getDb, closeDb } from '../src/db/client.js';

interface TrackingEntry {
  id: string;
  venue: string;
  to: string;
  status: 'sent' | 'duplicate' | 'error';
  messageId?: string;
  timestamp: string;
  sentAt: string;
  followUpDue: string;
  bounced?: boolean;
  bounceType?: string;
  bounceReason?: string;
  bounceDetectedAt?: string;
  error?: string;
}

async function syncOutreachToDb() {
  console.log('📧 Syncing outreach tracking to SurrealDB...\n');

  // Read tracking.json
  const trackingPath = './content/outreach/tracking.json';
  const trackingData: TrackingEntry[] = JSON.parse(readFileSync(trackingPath, 'utf-8'));

  // Filter only sent emails (not duplicates)
  const sentEmails = trackingData.filter(e => e.status === 'sent');
  console.log(`Found ${sentEmails.length} sent emails (excluding ${trackingData.length - sentEmails.length} duplicates)\n`);

  const db = await getDb();

  // Apply new schema fields first
  console.log('📝 Applying schema updates...');
  await db.query(`
    DEFINE FIELD IF NOT EXISTS tracking_id ON email TYPE option<string>;
    DEFINE FIELD IF NOT EXISTS bounced ON email TYPE bool DEFAULT false;
    DEFINE FIELD IF NOT EXISTS bounce_type ON email TYPE option<string>;
    DEFINE FIELD IF NOT EXISTS bounce_reason ON email TYPE option<string>;
    DEFINE FIELD IF NOT EXISTS bounce_detected_at ON email TYPE option<datetime>;
    DEFINE FIELD IF NOT EXISTS follow_up_due ON email TYPE option<datetime>;
    DEFINE FIELD IF NOT EXISTS campaign ON email TYPE option<string>;
    DEFINE INDEX IF NOT EXISTS idx_email_tracking ON email COLUMNS tracking_id;
  `);

  let imported = 0;
  let skipped = 0;
  let linked = 0;
  const errors: string[] = [];

  for (const entry of sentEmails) {
    try {
      // Check if already imported
      const [existing] = await db.query(
        'SELECT id FROM email WHERE tracking_id = $id',
        { id: entry.id }
      );

      if ((existing as any[])?.length > 0) {
        skipped++;
        continue;
      }

      // Create email record - handle optional fields properly
      // For SurrealDB, NONE is the proper null value for option types
      const messageId = entry.messageId ? `"${entry.messageId}"` : 'NONE';
      const bounceType = entry.bounceType ? `"${entry.bounceType}"` : 'NONE';
      const bounceReason = entry.bounceReason ? `"${entry.bounceReason.replace(/"/g, '\\"')}"` : 'NONE';
      const bounceDetectedAt = entry.bounceDetectedAt ? `d"${entry.bounceDetectedAt}"` : 'NONE';

      const [emailResult] = await db.query(`
        CREATE email SET
          tracking_id = "${entry.id}",
          subject = "Outreach to ${entry.venue.replace(/"/g, '\\"')}",
          body = "",
          to_address = "${entry.to}",
          email_type = "initial",
          message_id = ${messageId},
          sent_at = d"${entry.sentAt}",
          bounced = ${entry.bounced || false},
          bounce_type = ${bounceType},
          bounce_reason = ${bounceReason},
          bounce_detected_at = ${bounceDetectedAt},
          follow_up_due = d"${entry.followUpDue}",
          campaign = "2026-01-21-batch"
      `);

      imported++;

      // Try to link to venue
      const emailId = (emailResult as any)?.[0]?.id;
      if (emailId) {
        // Find venue by name (fuzzy match)
        const [venueMatch] = await db.query(
          'SELECT id FROM venue WHERE string::lowercase(name) = string::lowercase($name) LIMIT 1',
          { name: entry.venue }
        );

        if ((venueMatch as any[])?.[0]?.id) {
          const venueId = (venueMatch as any[])[0].id;
          await db.query(
            'RELATE $email->sent_to->$venue SET campaign = $campaign',
            {
              email: emailId,
              venue: venueId,
              campaign: '2026-01-21-batch'
            }
          );
          linked++;
        }
      }

    } catch (e: any) {
      errors.push(`${entry.venue}: ${e.message}`);
    }
  }

  // Summary
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 Sync Complete:');
  console.log(`   ✅ Imported: ${imported}`);
  console.log(`   ⏭️  Skipped (already in DB): ${skipped}`);
  console.log(`   🔗 Linked to venues: ${linked}`);

  // Count bounced
  const bouncedCount = sentEmails.filter(e => e.bounced).length;
  console.log(`   ❌ Bounced emails: ${bouncedCount}`);

  if (errors.length > 0) {
    console.log(`   ⚠️  Errors: ${errors.length}`);
    errors.slice(0, 5).forEach(e => console.log(`      - ${e}`));
  }

  // Verify final count
  const [finalCount] = await db.query('SELECT count() FROM email GROUP ALL');
  console.log(`\n📬 Total emails in DB: ${(finalCount as any)?.[0]?.count ?? 0}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  await closeDb();
}

syncOutreachToDb().catch(console.error);
