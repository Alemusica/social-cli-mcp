/**
 * FLUTUR BOUNCE CHECKER
 * Check Gmail for delivery failures and update tracking
 *
 * Usage:
 *   npx tsx scripts/check-bounces.ts
 */

import Imap from 'imap';
import { simpleParser } from 'mailparser';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
import { loadSecretsToEnv } from '../src/keychain.js';

dotenv.config();
loadSecretsToEnv();

interface BounceResult {
  originalTo: string;
  venue?: string;
  bounceType: 'hard' | 'soft' | 'unknown';
  reason: string;
  detectedAt: string;
}

// Patterns to detect bounces
const BOUNCE_PATTERNS = [
  /Delivery Status Notification \(Failure\)/i,
  /Mail delivery failed/i,
  /Undelivered Mail Returned to Sender/i,
  /Address not found/i,
  /User unknown/i,
  /mailbox unavailable/i,
  /550.*rejected/i,
  /554.*delivery error/i,
];

const SOFT_BOUNCE_PATTERNS = [
  /mailbox full/i,
  /over quota/i,
  /temporarily rejected/i,
  /try again later/i,
];

async function connectToGmail(): Promise<Imap> {
  return new Promise((resolve, reject) => {
    const imap = new Imap({
      user: process.env.GMAIL_USER!,
      password: process.env.GMAIL_APP_PASSWORD!,
      host: 'imap.gmail.com',
      port: 993,
      tls: true,
      tlsOptions: { rejectUnauthorized: false }
    });

    imap.once('ready', () => resolve(imap));
    imap.once('error', reject);
    imap.connect();
  });
}

async function searchBounces(imap: Imap): Promise<BounceResult[]> {
  return new Promise((resolve, reject) => {
    // Search in the last 24 hours
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    imap.openBox('INBOX', true, (err) => {
      if (err) return reject(err);

      // Search for bounce-related emails (IMAP OR only takes 2 args, nest them)
      imap.search([
        ['SINCE', yesterday],
        ['OR',
          ['FROM', 'mailer-daemon'],
          ['OR',
            ['FROM', 'postmaster'],
            ['OR',
              ['SUBJECT', 'Delivery Status'],
              ['OR',
                ['SUBJECT', 'Undelivered'],
                ['SUBJECT', 'Mail delivery failed']
              ]
            ]
          ]
        ]
      ], async (err, results) => {
        if (err) return reject(err);

        if (!results || results.length === 0) {
          console.log('✅ No bounce emails found in the last 24 hours');
          return resolve([]);
        }

        console.log(`🔍 Found ${results.length} potential bounce emails`);

        const bounces: BounceResult[] = [];
        const fetch = imap.fetch(results, { bodies: '' });

        fetch.on('message', (msg) => {
          msg.on('body', async (stream) => {
            try {
              const parsed = await simpleParser(stream);
              const body = (parsed.text || '') + (parsed.subject || '');

              // Check if it's a bounce
              const isBounce = BOUNCE_PATTERNS.some(p => p.test(body));
              if (!isBounce) return;

              // Extract original recipient
              const toMatch = body.match(/(?:Original-Recipient|Final-Recipient|To):\s*(?:rfc822;)?\s*([^\s<>\n]+@[^\s<>\n]+)/i);
              const originalTo = toMatch ? toMatch[1].trim() : 'unknown';

              // Determine bounce type
              const isSoftBounce = SOFT_BOUNCE_PATTERNS.some(p => p.test(body));

              bounces.push({
                originalTo,
                bounceType: isSoftBounce ? 'soft' : 'hard',
                reason: parsed.subject || 'Delivery failure',
                detectedAt: new Date().toISOString()
              });
            } catch (e) {
              console.error('Error parsing email:', e);
            }
          });
        });

        fetch.once('end', () => {
          resolve(bounces);
        });

        fetch.once('error', reject);
      });
    });
  });
}

function updateTracking(bounces: BounceResult[]) {
  const trackingFile = 'content/outreach/tracking.json';
  if (!fs.existsSync(trackingFile)) {
    console.log('⚠️ No tracking file found');
    return;
  }

  const tracking = JSON.parse(fs.readFileSync(trackingFile, 'utf-8'));
  let updated = 0;

  for (const bounce of bounces) {
    const entry = tracking.find((t: any) => t.to === bounce.originalTo);
    if (entry) {
      entry.bounced = true;
      entry.bounceType = bounce.bounceType;
      entry.bounceReason = bounce.reason;
      entry.bounceDetectedAt = bounce.detectedAt;
      bounce.venue = entry.venue;
      updated++;
    }
  }

  if (updated > 0) {
    fs.writeFileSync(trackingFile, JSON.stringify(tracking, null, 2));
    console.log(`📋 Updated ${updated} entries in tracking`);
  }

  return tracking;
}

async function main() {
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('FLUTUR BOUNCE CHECKER');
  console.log('═══════════════════════════════════════════════════════════════\n');

  try {
    console.log('📧 Connecting to Gmail IMAP...');
    const imap = await connectToGmail();

    console.log('🔍 Searching for bounces...');
    const bounces = await searchBounces(imap);

    imap.end();

    if (bounces.length === 0) {
      console.log('\n✅ No delivery failures detected!');
      return;
    }

    console.log(`\n❌ Found ${bounces.length} bounces:`);

    updateTracking(bounces);

    // Print summary
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('BOUNCE SUMMARY');
    console.log('═══════════════════════════════════════════════════════════════\n');

    const hardBounces = bounces.filter(b => b.bounceType === 'hard');
    const softBounces = bounces.filter(b => b.bounceType === 'soft');

    if (hardBounces.length > 0) {
      console.log('🔴 HARD BOUNCES (invalid addresses - remove from list):');
      hardBounces.forEach(b => {
        console.log(`   - ${b.venue || 'Unknown'}: ${b.originalTo}`);
        console.log(`     Reason: ${b.reason}`);
      });
    }

    if (softBounces.length > 0) {
      console.log('\n🟡 SOFT BOUNCES (temporary - can retry later):');
      softBounces.forEach(b => {
        console.log(`   - ${b.venue || 'Unknown'}: ${b.originalTo}`);
        console.log(`     Reason: ${b.reason}`);
      });
    }

    // Save bounce report
    const reportFile = `content/outreach/bounce-report-${new Date().toISOString().split('T')[0]}.json`;
    fs.writeFileSync(reportFile, JSON.stringify(bounces, null, 2));
    console.log(`\n📊 Report saved: ${reportFile}`);

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
