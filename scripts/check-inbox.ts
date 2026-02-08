#!/usr/bin/env npx tsx
/**
 * Comprehensive inbox check for ALL outreach replies
 * Pulls domains from tracking.json dynamically
 */
import Imap from 'imap';
import { loadSecretsToEnv } from '../src/keychain.js';
import { simpleParser } from 'mailparser';
import * as fs from 'fs';

loadSecretsToEnv();

// Load all contacted domains from tracking
const tracking: any[] = JSON.parse(fs.readFileSync('content/outreach/tracking.json', 'utf-8'));
const CONTACTED_DOMAINS = new Set<string>();
const VENUE_BY_DOMAIN: Record<string, string> = {};

tracking.forEach(t => {
  if (t.to && t.to.includes('@')) {
    const domain = t.to.split('@')[1].toLowerCase();
    if (!['gmail.com', 'hotmail.com', 'gmx.de', 'yahoo.com'].includes(domain)) {
      CONTACTED_DOMAINS.add(domain);
      VENUE_BY_DOMAIN[domain] = t.venue;
    }
  }
});

console.log('═'.repeat(60));
console.log('FLUTUR OUTREACH - FULL INBOX CHECK');
console.log('═'.repeat(60));
console.log(`\n🔍 Checking replies from ${CONTACTED_DOMAINS.size} venue domains (${tracking.length} emails tracked)\n`);

interface EmailResult {
  date: Date | undefined;
  from: string;
  fromDomain: string;
  subject: string;
  preview: string;
  venue: string;
  type: 'human_reply' | 'auto_reply' | 'bounce';
}

function classifyEmail(from: string, subject: string, text: string): EmailResult['type'] {
  const subj = subject.toLowerCase();
  const body = text.toLowerCase();
  const f = from.toLowerCase();

  if (f.includes('mailer-daemon') || f.includes('postmaster')) return 'bounce';
  if (subj.includes('delivery') && (subj.includes('fail') || subj.includes('notification'))) return 'bounce';
  if (subj.includes('undeliverable') || subj.includes('returned')) return 'bounce';

  if (subj.includes('automatic reply') || subj.includes('auto-reply') || subj.includes('autoreply')) return 'auto_reply';
  if (subj.includes('out of office') || subj.includes('absence')) return 'auto_reply';
  if (subj.includes('risposta automatica') || subj.includes('fuori ufficio')) return 'auto_reply';
  if (body.includes('this is an automated') || body.includes('auto-reply')) return 'auto_reply';

  return 'human_reply';
}

async function main() {
  const daysBack = parseInt(process.argv[2] || '21');

  const results = await new Promise<EmailResult[]>((resolve, reject) => {
    const imap = new Imap({
      user: process.env.GMAIL_USER!,
      password: process.env.GMAIL_APP_PASSWORD!,
      host: 'imap.gmail.com',
      port: 993,
      tls: true,
      tlsOptions: { rejectUnauthorized: false }
    });

    const found: EmailResult[] = [];

    imap.once('ready', () => {
      imap.openBox('INBOX', true, (err, box) => {
        if (err) { reject(err); return; }

        console.log(`📬 Inbox: ${box.messages.total} messages`);

        const since = new Date();
        since.setDate(since.getDate() - daysBack);

        imap.search([['SINCE', since.toISOString().split('T')[0]]], (err, uids) => {
          if (err) { reject(err); return; }
          if (!uids || uids.length === 0) {
            console.log('No recent emails');
            imap.end();
            resolve([]);
            return;
          }

          console.log(`📧 ${uids.length} emails in last ${daysBack} days — scanning...\n`);

          let processed = 0;

          const f = imap.fetch(uids, { bodies: '', struct: true });

          f.on('message', (msg) => {
            msg.on('body', async (stream) => {
              try {
                const parsed = await simpleParser(stream);
                const from = parsed.from?.text?.toLowerCase() || '';
                const fromDomain = from.includes('@')
                  ? from.split('@').pop()!.replace('>', '').trim()
                  : '';
                const subject = parsed.subject || '';
                const text = parsed.text || '';

                // Match against contacted domains
                const matchedDomain = [...CONTACTED_DOMAINS].find(d =>
                  fromDomain === d || fromDomain.endsWith('.' + d)
                );

                // Also check for outreach keywords in body
                const mentionsFlutur = text.toLowerCase().includes('flutur') ||
                  text.toLowerCase().includes('rav vast') ||
                  text.toLowerCase().includes('sunset session') ||
                  text.toLowerCase().includes('sound journey') ||
                  text.toLowerCase().includes('live looping') ||
                  subject.toLowerCase().includes('sunset session') ||
                  subject.toLowerCase().includes('rav vast') ||
                  subject.toLowerCase().includes('artist application') ||
                  subject.toLowerCase().includes('sound healing') ||
                  subject.toLowerCase().includes('live set for ecstatic') ||
                  subject.toLowerCase().includes('live looping');

                // Bounce check
                const isBounce = from.includes('mailer-daemon') || from.includes('postmaster');
                const bounceRefersToUs = isBounce && mentionsFlutur;

                if (matchedDomain || mentionsFlutur || bounceRefersToUs) {
                  const venue = matchedDomain ? (VENUE_BY_DOMAIN[matchedDomain] || matchedDomain) : 'Unknown';
                  found.push({
                    date: parsed.date,
                    from: parsed.from?.text || from,
                    fromDomain,
                    subject,
                    preview: text.substring(0, 400),
                    venue,
                    type: classifyEmail(from, subject, text)
                  });
                }
              } catch { /* skip */ }
              processed++;
            });
          });

          f.once('end', () => {
            const wait = setInterval(() => {
              if (processed >= uids.length) {
                clearInterval(wait);
                imap.end();
                resolve(found);
              }
            }, 200);
            setTimeout(() => { clearInterval(wait); imap.end(); resolve(found); }, 45000);
          });
        });
      });
    });

    imap.once('error', (err: Error) => reject(err));
    imap.connect();
  });

  // Sort and categorize
  results.sort((a, b) => (b.date?.getTime() || 0) - (a.date?.getTime() || 0));

  const human = results.filter(r => r.type === 'human_reply');
  const auto = results.filter(r => r.type === 'auto_reply');
  const bounces = results.filter(r => r.type === 'bounce');

  console.log('═'.repeat(60));

  if (human.length > 0) {
    console.log(`\n🎉 HUMAN REPLIES (${human.length}):\n`);
    human.forEach(r => {
      console.log(`  📧 ${r.date?.toLocaleDateString('it-IT')} — ${r.venue}`);
      console.log(`     From: ${r.from}`);
      console.log(`     Subject: ${r.subject}`);
      console.log(`     ${r.preview.substring(0, 200).replace(/\n/g, ' ')}...`);
      console.log('');
    });
  } else {
    console.log('\n❌ No human replies yet.');
  }

  if (auto.length > 0) {
    console.log(`\n📋 AUTO-REPLIES (${auto.length}):`);
    auto.forEach(r => {
      console.log(`  - ${r.venue} (${r.fromDomain}): ${r.subject}`);
    });
  }

  if (bounces.length > 0) {
    console.log(`\n⚠️  NEW BOUNCES (${bounces.length}):`);
    bounces.forEach(r => {
      console.log(`  - ${r.subject.substring(0, 80)}`);
      console.log(`    ${r.preview.substring(0, 120).replace(/\n/g, ' ')}`);
    });
  }

  // Overall stats
  const totalSent = tracking.length;
  const knownBounced = tracking.filter(t => t.bounced).length;

  console.log('\n' + '═'.repeat(60));
  console.log('OUTREACH PIPELINE');
  console.log('═'.repeat(60));
  console.log(`  Total sent:       ${totalSent}`);
  console.log(`  Known bounced:    ${knownBounced}`);
  console.log(`  New bounces:      ${bounces.length}`);
  console.log(`  Auto-replies:     ${auto.length}`);
  console.log(`  Human replies:    ${human.length}`);
  console.log(`  Awaiting reply:   ${totalSent - knownBounced - human.length}`);
  console.log(`  Response rate:    ${totalSent > 0 ? ((human.length / (totalSent - knownBounced)) * 100).toFixed(1) : 0}%`);
  console.log('═'.repeat(60));
}

main().catch(console.error);
