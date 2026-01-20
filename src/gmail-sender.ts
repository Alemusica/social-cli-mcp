/**
 * Gmail Sender - Send emails via SMTP with App Password
 * For venue follow-ups and outreach campaigns
 */

import * as nodemailer from 'nodemailer';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

interface EmailConfig {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

interface VenueFollowUp {
  venue: string;
  to: string;
  subject: string;
  body: string;
  originalDate: string;
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
async function sendEmail(config: EmailConfig): Promise<boolean> {
  const transporter = createTransporter();

  try {
    const info = await transporter.sendMail({
      from: `"Flutur" <${process.env.GMAIL_USER}>`,
      to: config.to,
      subject: config.subject,
      html: config.html,
      text: config.text || config.html.replace(/<[^>]*>/g, ''),
    });

    console.log(`✅ Sent to ${config.to}: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to send to ${config.to}:`, error);
    return false;
  }
}

// Send batch of emails with delay
async function sendBatch(emails: EmailConfig[], delayMs = 2000): Promise<void> {
  console.log(`\n📧 Sending ${emails.length} emails...\n`);

  let sent = 0;
  let failed = 0;

  for (const email of emails) {
    const success = await sendEmail(email);
    if (success) sent++;
    else failed++;

    // Delay between emails to avoid rate limiting
    if (emails.indexOf(email) < emails.length - 1) {
      await new Promise(r => setTimeout(r, delayMs));
    }
  }

  console.log(`\n📊 Results: ${sent} sent, ${failed} failed`);
}

// Load follow-ups from JSON file
function loadFollowUps(filePath: string): VenueFollowUp[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(content);
}

// Convert follow-up to email config
function followUpToEmail(followUp: VenueFollowUp): EmailConfig {
  return {
    to: followUp.to,
    subject: followUp.subject,
    html: followUp.body,
  };
}

// Main CLI
async function main() {
  const command = process.argv[2];
  const arg = process.argv[3];

  switch (command) {
    case 'test':
      // Send test email
      const testTo = arg || 'alessio.cazzaniga87@gmail.com';
      console.log(`📧 Sending test email to ${testTo}...`);

      await sendEmail({
        to: testTo,
        subject: 'Test Email from social-cli-mcp',
        html: `
          <h2>Test Email</h2>
          <p>This is a test email from the social-cli-mcp Gmail sender.</p>
          <p>If you're seeing this, the email system is working!</p>
          <br>
          <p>— Flutur</p>
        `,
      });
      break;

    case 'send-followups':
      // Send all follow-ups from JSON file
      const followUpsPath = arg || 'content/outreach/venue-followups.json';

      if (!fs.existsSync(followUpsPath)) {
        console.error(`❌ File not found: ${followUpsPath}`);
        process.exit(1);
      }

      const followUps = loadFollowUps(followUpsPath);
      const emails = followUps.map(followUpToEmail);

      console.log(`📋 Loaded ${emails.length} follow-up emails`);
      console.log('\nRecipients:');
      emails.forEach(e => console.log(`  - ${e.to}: ${e.subject}`));

      console.log('\n⏳ Starting in 3 seconds... (Ctrl+C to cancel)');
      await new Promise(r => setTimeout(r, 3000));

      await sendBatch(emails);
      break;

    case 'send-test-batch':
      // Send all follow-ups to test email first
      const testBatchPath = arg || 'content/outreach/venue-followups.json';
      const testEmail = process.argv[4] || 'alessio.cazzaniga87@gmail.com';

      if (!fs.existsSync(testBatchPath)) {
        console.error(`❌ File not found: ${testBatchPath}`);
        process.exit(1);
      }

      const testFollowUps = loadFollowUps(testBatchPath);

      console.log(`📧 Sending ${testFollowUps.length} test emails to ${testEmail}...\n`);

      for (const followUp of testFollowUps) {
        await sendEmail({
          to: testEmail,
          subject: `[TEST - ${followUp.venue}] ${followUp.subject}`,
          html: `
            <div style="background: #f5f5f5; padding: 10px; margin-bottom: 20px; border-radius: 5px;">
              <strong>Original To:</strong> ${followUp.to}<br>
              <strong>Original Date:</strong> ${followUp.originalDate}<br>
              <strong>Venue:</strong> ${followUp.venue}
            </div>
            ${followUp.body}
          `,
        });

        await new Promise(r => setTimeout(r, 1000));
      }

      console.log(`\n✅ All test emails sent to ${testEmail}`);
      break;

    default:
      console.log(`
Gmail Sender - Venue Follow-up Tool

Commands:
  npx tsx src/gmail-sender.ts test [email]
    Send a test email (default: alessio.cazzaniga87@gmail.com)

  npx tsx src/gmail-sender.ts send-test-batch [json-file] [test-email]
    Send all follow-ups to a test email first

  npx tsx src/gmail-sender.ts send-followups [json-file]
    Send all follow-ups to actual recipients

Examples:
  npx tsx src/gmail-sender.ts test
  npx tsx src/gmail-sender.ts send-test-batch content/outreach/venue-followups.json alessio.cazzaniga87@gmail.com
  npx tsx src/gmail-sender.ts send-followups content/outreach/venue-followups.json
      `);
  }
}

main().catch(console.error);
