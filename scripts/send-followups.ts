#!/usr/bin/env npx tsx
import * as nodemailer from 'nodemailer';
import * as fs from 'fs';
import { loadSecretsToEnv } from '../src/keychain.js';

loadSecretsToEnv();

const emails = JSON.parse(fs.readFileSync('content/outreach/generated/followup-priority-2026-01-27.json', 'utf-8'));

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

async function sendAll() {
  const results: any[] = [];

  for (const email of emails) {
    console.log(`📧 Sending to ${email.venue}...`);

    try {
      const info = await transporter.sendMail({
        from: `"Flutur" <${process.env.GMAIL_USER}>`,
        to: email.to,
        subject: email.subject,
        html: email.body,
        text: email.body.replace(/<[^>]*>/g, ''),
      });

      console.log(`✅ ${email.venue}: ${info.messageId}`);
      results.push({
        venue: email.venue,
        to: email.to,
        status: 'sent',
        messageId: info.messageId,
        timestamp: new Date().toISOString(),
      });

      // Small delay between emails
      await new Promise(r => setTimeout(r, 2000));
    } catch (error: any) {
      console.log(`❌ ${email.venue}: ${error.message}`);
      results.push({
        venue: email.venue,
        to: email.to,
        status: 'failed',
        error: error.message,
      });
    }
  }

  // Save results
  fs.writeFileSync(
    'content/outreach/generated/followup-priority-2026-01-27-results.json',
    JSON.stringify(results, null, 2)
  );

  console.log('\n📊 Results saved to followup-priority-2026-01-27-results.json');
  console.log(`Sent: ${results.filter(r => r.status === 'sent').length}/${results.length}`);
}

sendAll();
