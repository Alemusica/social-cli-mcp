#!/usr/bin/env npx tsx
/**
 * Import Outreach Email to SurrealDB
 *
 * Salva email outreach con relazioni corrette al graph database.
 *
 * Usage:
 *   # Da JSON file
 *   npx tsx scripts/import-outreach-email.ts import emails.json
 *
 *   # Singola email interattiva
 *   npx tsx scripts/import-outreach-email.ts add
 *
 *   # Verifica stato outreach
 *   npx tsx scripts/import-outreach-email.ts status
 */

import { getDb, closeDb } from '../src/db/client.js';
import { readFileSync, writeFileSync, existsSync } from 'fs';

interface OutreachEmail {
  venue: string;
  to: string;
  subject: string;
  body: string;
  sentAt?: string;
  campaign?: string;
  venueType?: string;
  region?: string;
  notes?: string;
}

interface ImportResult {
  emailId: string;
  venue: string;
  to: string;
  venueLinked: boolean;
  venueId?: string;
}

/**
 * Import single email to DB with venue relation
 */
async function importEmail(email: OutreachEmail, campaign: string): Promise<ImportResult> {
  const db = await getDb();

  const trackingId = `outreach-${campaign}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const sentAt = email.sentAt || new Date().toISOString();
  const followUpDue = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // +7 days

  // Escape strings for SurrealQL
  const escapeStr = (s: string) => s.replace(/"/g, '\\"').replace(/\n/g, '\\n');

  // 1. Create email record
  const [emailResult] = await db.query(`
    CREATE email SET
      tracking_id = "${trackingId}",
      subject = "${escapeStr(email.subject)}",
      body = "${escapeStr(email.body)}",
      to_address = "${email.to}",
      email_type = "initial",
      sent_at = d"${sentAt}",
      bounced = false,
      follow_up_due = d"${followUpDue}",
      campaign = "${campaign}",
      venue_name = "${escapeStr(email.venue)}",
      venue_type = "${email.venueType || 'unknown'}",
      region = "${email.region || 'unknown'}",
      notes = "${email.notes ? escapeStr(email.notes) : ''}"
  `);

  const emailId = (emailResult as any)?.[0]?.id;

  if (!emailId) {
    throw new Error(`Failed to create email for ${email.venue}`);
  }

  // 2. Try to find and link venue
  const [venueMatch] = await db.query(`
    SELECT id, name FROM venue
    WHERE string::lowercase(name) CONTAINS string::lowercase($search)
    LIMIT 1
  `, { search: email.venue.split(' ')[0] }); // Search by first word of venue name

  let venueLinked = false;
  let venueId: string | undefined;

  if ((venueMatch as any[])?.[0]?.id) {
    venueId = (venueMatch as any[])[0].id;
    await db.query(`
      RELATE $email->sent_to->$venue SET
        campaign = $campaign,
        sent_at = d"${sentAt}"
    `, { email: emailId, venue: venueId, campaign });
    venueLinked = true;
  }

  return {
    emailId,
    venue: email.venue,
    to: email.to,
    venueLinked,
    venueId,
  };
}

/**
 * Import from JSON file
 */
async function importFromJson(filePath: string, campaign: string): Promise<void> {
  if (!existsSync(filePath)) {
    console.error(`❌ File not found: ${filePath}`);
    process.exit(1);
  }

  const emails: OutreachEmail[] = JSON.parse(readFileSync(filePath, 'utf-8'));
  console.log(`\n📧 Importing ${emails.length} emails from ${filePath}\n`);
  console.log(`Campaign: ${campaign}\n`);

  const results: ImportResult[] = [];
  let success = 0;
  let failed = 0;

  for (const email of emails) {
    try {
      const result = await importEmail(email, campaign);
      results.push(result);
      const linkIcon = result.venueLinked ? '🔗' : '⚠️';
      console.log(`✅ ${email.venue} → ${email.to} ${linkIcon}`);
      success++;
    } catch (e: any) {
      console.error(`❌ ${email.venue}: ${e.message}`);
      failed++;
    }
  }

  // Summary
  console.log('\n' + '━'.repeat(50));
  console.log('📊 Import Complete:');
  console.log(`   ✅ Success: ${success}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log(`   🔗 Linked to venues: ${results.filter(r => r.venueLinked).length}`);
  console.log('━'.repeat(50));

  // Save results
  const resultsPath = filePath.replace('.json', '-imported.json');
  writeFileSync(resultsPath, JSON.stringify(results, null, 2));
  console.log(`\n💾 Results saved to ${resultsPath}`);

  await closeDb();
}

/**
 * Show outreach status
 */
async function showStatus(): Promise<void> {
  const db = await getDb();

  console.log('\n' + '═'.repeat(50));
  console.log('📧 OUTREACH STATUS');
  console.log('═'.repeat(50));

  // Total emails by campaign
  const [byCampaign] = await db.query(`
    SELECT campaign, count() as total,
           count(IF bounced = true THEN 1 ELSE NONE END) as bounced
    FROM email
    GROUP BY campaign
  `);

  console.log('\nBy Campaign:');
  for (const c of (byCampaign as any[]) || []) {
    console.log(`  ${c.campaign}: ${c.total} sent, ${c.bounced || 0} bounced`);
  }

  // Pending follow-ups
  const [pendingFollowups] = await db.query(`
    SELECT venue_name, to_address, follow_up_due
    FROM email
    WHERE bounced = false
      AND follow_up_due < time::now() + 3d
      AND follow_up_due > time::now() - 7d
    ORDER BY follow_up_due ASC
    LIMIT 10
  `);

  console.log('\n⏰ Follow-ups Due Soon:');
  for (const f of (pendingFollowups as any[]) || []) {
    const due = new Date(f.follow_up_due).toLocaleDateString();
    console.log(`  ${f.venue_name} (${f.to_address}) - due ${due}`);
  }

  // Emails with venue links
  const [linked] = await db.query(`
    SELECT count() as total FROM email WHERE ->sent_to->venue
  `);
  const [total] = await db.query(`
    SELECT count() as total FROM email
  `);

  const linkedCount = (linked as any)?.[0]?.total || 0;
  const totalCount = (total as any)?.[0]?.total || 0;

  console.log(`\n🔗 Graph Relations: ${linkedCount}/${totalCount} emails linked to venues`);

  console.log('\n' + '═'.repeat(50));

  await closeDb();
}

/**
 * Interactive add single email
 */
async function addInteractive(): Promise<void> {
  const readline = await import('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const ask = (q: string): Promise<string> => new Promise(resolve => {
    rl.question(q, resolve);
  });

  console.log('\n📧 Add Outreach Email\n');

  const email: OutreachEmail = {
    venue: await ask('Venue name: '),
    to: await ask('Email address: '),
    subject: await ask('Subject: '),
    body: await ask('Body (or "skip" to leave empty): '),
    venueType: await ask('Venue type (retreat/festival/venue/other): '),
    region: await ask('Region: '),
  };

  if (email.body === 'skip') email.body = '';

  const campaign = await ask('Campaign name [2026-01-outreach]: ') || '2026-01-outreach';

  rl.close();

  console.log('\nImporting...');
  const result = await importEmail(email, campaign);

  console.log(`\n✅ Email saved: ${result.emailId}`);
  if (result.venueLinked) {
    console.log(`🔗 Linked to venue: ${result.venueId}`);
  } else {
    console.log('⚠️ No matching venue found in DB');
  }

  await closeDb();
}

// CLI
async function main() {
  const command = process.argv[2];
  const arg = process.argv[3];

  switch (command) {
    case 'import':
      if (!arg) {
        console.log('Usage: npx tsx scripts/import-outreach-email.ts import <file.json> [campaign]');
        process.exit(1);
      }
      const campaign = process.argv[4] || `outreach-${new Date().toISOString().split('T')[0]}`;
      await importFromJson(arg, campaign);
      break;

    case 'add':
      await addInteractive();
      break;

    case 'status':
      await showStatus();
      break;

    default:
      console.log(`
Import Outreach Emails to SurrealDB
====================================

Commands:
  import <file.json> [campaign]   Import emails from JSON
  add                             Add single email interactively
  status                          Show outreach status

JSON Format:
  [
    {
      "venue": "Venue Name",
      "to": "email@venue.com",
      "subject": "Email subject",
      "body": "Email body",
      "venueType": "retreat|festival|venue",
      "region": "Region/Country"
    }
  ]

Examples:
  npx tsx scripts/import-outreach-email.ts import content/outreach/new-emails.json
  npx tsx scripts/import-outreach-email.ts add
  npx tsx scripts/import-outreach-email.ts status
      `);
  }
}

main().catch(console.error);
