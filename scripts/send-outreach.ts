/**
 * FLUTUR OUTREACH EMAIL SENDER
 * Send generated emails in batch with rate limiting
 *
 * Usage:
 *   npx tsx scripts/send-outreach.ts test <json-file>     # Send all to test email
 *   npx tsx scripts/send-outreach.ts send <json-file>     # Send to actual recipients
 *   npx tsx scripts/send-outreach.ts preview <json-file>  # Preview without sending
 */

import * as nodemailer from 'nodemailer';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import { wasEmailSentToday, isDailyLimitReached, recordSend, getTodaySendCount } from '../src/utils/email-guard.js';
import { loadSecretsToEnv } from '../src/keychain.js';

dotenv.config();
loadSecretsToEnv();

interface OutreachEmail {
  id: string;
  venue: string;
  city: string;
  country: string;
  type: string;
  tier: number;
  to: string;
  subject: string;
  body: string;
  video: string;
  strategy: string;
  generatedAt: string;
}

interface SendResult {
  id: string;
  venue: string;
  to: string;
  status: 'sent' | 'skipped' | 'failed' | 'duplicate';
  messageId?: string;
  error?: string;
  timestamp: string;
}

// Create transporter
function createTransporter() {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;

  if (!user || !pass) {
    throw new Error('GMAIL_USER and GMAIL_APP_PASSWORD required in .env');
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass },
  });
}

// Send single email
async function sendEmail(
  transporter: nodemailer.Transporter,
  email: OutreachEmail,
  testMode: boolean,
  testEmail?: string
): Promise<SendResult> {
  const to = testMode ? testEmail! : email.to;

  // Check for duplicates (only in real send mode)
  if (!testMode) {
    const alreadySent = await wasEmailSentToday(to);
    if (alreadySent) {
      return {
        id: email.id,
        venue: email.venue,
        to,
        status: 'duplicate',
        error: `Already sent to ${to} today`,
        timestamp: new Date().toISOString(),
      };
    }
  }

  const subject = testMode
    ? `[TEST - ${email.venue}] ${email.subject}`
    : email.subject;

  const html = testMode
    ? `
      <div style="background: #f5f5f5; padding: 15px; margin-bottom: 20px; border-radius: 5px; font-family: monospace;">
        <strong>🎯 OUTREACH TEST EMAIL</strong><br><br>
        <strong>Venue:</strong> ${email.venue}<br>
        <strong>Location:</strong> ${email.city}, ${email.country}<br>
        <strong>Original To:</strong> ${email.to}<br>
        <strong>Strategy:</strong> ${email.strategy}<br>
        <strong>Tier:</strong> ${email.tier}<br>
        <strong>Video:</strong> ${email.video}
      </div>
      ${email.body}
    `
    : email.body;

  try {
    const info = await transporter.sendMail({
      from: `"Flutur" <${process.env.GMAIL_USER}>`,
      to,
      subject,
      html,
      text: html.replace(/<[^>]*>/g, ''),
    });

    return {
      id: email.id,
      venue: email.venue,
      to,
      status: 'sent',
      messageId: info.messageId,
      timestamp: new Date().toISOString(),
    };
  } catch (error: any) {
    return {
      id: email.id,
      venue: email.venue,
      to,
      status: 'failed',
      error: error.message,
      timestamp: new Date().toISOString(),
    };
  }
}

// Send batch with rate limiting
async function sendBatch(
  emails: OutreachEmail[],
  testMode: boolean,
  testEmail?: string
): Promise<SendResult[]> {
  const transporter = createTransporter();
  const results: SendResult[] = [];

  // Rate limiting: 3 seconds between emails, max 20/hour
  const DELAY_MS = 3000;
  const MAX_PER_BATCH = testMode ? 100 : 20; // More lenient in test mode

  const toSend = emails.slice(0, MAX_PER_BATCH);

  console.log(`\n📧 Sending ${toSend.length} emails (${testMode ? 'TEST MODE' : 'REAL SEND'})...\n`);

  if (!testMode) {
    // SAFETY: check daily limit before starting
    if (isDailyLimitReached()) {
      console.error('\n🛑 BLOCKED: Daily send limit reached. No emails sent.');
      return results;
    }
    const todayCount = getTodaySendCount();
    console.log(`📊 Today's send count: ${todayCount}/25`);
    console.log('⚠️  SENDING TO REAL RECIPIENTS IN 5 SECONDS... (Ctrl+C to cancel)\n');
    await new Promise(r => setTimeout(r, 5000));
  }

  for (let i = 0; i < toSend.length; i++) {
    const email = toSend[i];
    const progress = `[${i + 1}/${toSend.length}]`;

    console.log(`${progress} ${email.venue} (${email.city})`);
    console.log(`        → ${testMode ? testEmail : email.to}`);

    const result = await sendEmail(transporter, email, testMode, testEmail);
    results.push(result);

    if (result.status === 'sent') {
      if (!testMode) recordSend(email.to, email.venue);
      console.log(`        ✅ Sent (${result.messageId})`);
    } else if (result.status === 'duplicate') {
      console.log(`        ⏭️  Skipped (duplicate)`);
    } else {
      console.log(`        ❌ Failed: ${result.error}`);
    }

    // Delay between emails
    if (i < toSend.length - 1) {
      await new Promise(r => setTimeout(r, DELAY_MS));
    }
  }

  return results;
}

// Preview emails without sending
function previewEmails(emails: OutreachEmail[]) {
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('PREVIEW MODE - NO EMAILS SENT');
  console.log('═══════════════════════════════════════════════════════════════\n');

  emails.forEach((email, i) => {
    console.log(`─────────────────────────────────────────────────────────────────`);
    console.log(`EMAIL #${i + 1}: ${email.venue}`);
    console.log(`─────────────────────────────────────────────────────────────────`);
    console.log(`To: ${email.to}`);
    console.log(`Subject: ${email.subject}`);
    console.log(`Strategy: ${email.strategy}`);
    console.log(`Video: ${email.video}`);
    console.log(`\nBody preview:`);
    console.log(email.body.replace(/<[^>]*>/g, '').substring(0, 500) + '...\n');
  });
}

// Print results summary
function printSummary(results: SendResult[]) {
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('SEND RESULTS SUMMARY');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const sent = results.filter(r => r.status === 'sent').length;
  const failed = results.filter(r => r.status === 'failed').length;
  const duplicates = results.filter(r => r.status === 'duplicate').length;

  console.log(`✅ Sent: ${sent}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`⏭️  Duplicates skipped: ${duplicates}`);

  if (failed > 0) {
    console.log('\n❌ FAILED EMAILS:');
    results.filter(r => r.status === 'failed').forEach(r => {
      console.log(`   - ${r.venue}: ${r.error}`);
    });
  }
}

// Main CLI
async function main() {
  const [, , command, jsonFile, testEmail] = process.argv;

  if (!command || !jsonFile) {
    console.log(`
FLUTUR OUTREACH EMAIL SENDER

Usage:
  npx tsx scripts/send-outreach.ts preview <json-file>
    Preview emails without sending

  npx tsx scripts/send-outreach.ts test <json-file> [test-email]
    Send all emails to test address (default: your Gmail)

  npx tsx scripts/send-outreach.ts send <json-file>
    Send to actual recipients (max 20/batch, 3s delay)

Examples:
  npx tsx scripts/send-outreach.ts preview content/outreach/generated/tier1-ready-2026-01-21.json
  npx tsx scripts/send-outreach.ts test content/outreach/generated/tier1-ready-2026-01-21.json
  npx tsx scripts/send-outreach.ts send content/outreach/generated/tier1-ready-2026-01-21.json
    `);
    process.exit(1);
  }

  if (!fs.existsSync(jsonFile)) {
    console.error(`❌ File not found: ${jsonFile}`);
    process.exit(1);
  }

  const emails: OutreachEmail[] = JSON.parse(fs.readFileSync(jsonFile, 'utf-8'));
  console.log(`\n📂 Loaded ${emails.length} emails from ${jsonFile}`);

  switch (command) {
    case 'preview':
      previewEmails(emails);
      break;

    case 'test': {
      const to = testEmail || process.env.GMAIL_USER || 'alessio.cazzaniga87@gmail.com';
      console.log(`\n🧪 TEST MODE: All emails will be sent to ${to}`);
      const results = await sendBatch(emails, true, to);
      printSummary(results);

      // Save results
      const resultsFile = jsonFile.replace('.json', '-test-results.json');
      fs.writeFileSync(resultsFile, JSON.stringify(results, null, 2));
      console.log(`\n📊 Results saved to: ${resultsFile}`);
      break;
    }

    case 'send': {
      console.log('\n🚀 REAL SEND MODE: Emails will be sent to actual recipients!');
      const results = await sendBatch(emails, false);
      printSummary(results);

      // Save results
      const resultsFile = jsonFile.replace('.json', '-send-results.json');
      fs.writeFileSync(resultsFile, JSON.stringify(results, null, 2));
      console.log(`\n📊 Results saved to: ${resultsFile}`);

      // Update tracking
      const trackingFile = 'content/outreach/tracking.json';
      let tracking: any[] = [];
      if (fs.existsSync(trackingFile)) {
        tracking = JSON.parse(fs.readFileSync(trackingFile, 'utf-8'));
      }
      tracking.push(...results.map(r => ({
        ...r,
        sentAt: r.timestamp,
        followUpDue: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      })));
      fs.writeFileSync(trackingFile, JSON.stringify(tracking, null, 2));
      console.log(`📋 Tracking updated: ${trackingFile}`);
      break;
    }

    default:
      console.error(`❌ Unknown command: ${command}`);
      process.exit(1);
  }
}

main().catch(console.error);
