#!/usr/bin/env npx tsx
/**
 * Check Gmail for replies to outreach emails
 * Searches for emails from specific venue domains
 */
import Imap from 'imap';
import { loadSecretsToEnv } from '../src/keychain.js';
import { simpleParser } from 'mailparser';

loadSecretsToEnv();

// Venues we contacted
const VENUE_DOMAINS = [
  'giardinodeivisionari.com',
  'ecstaticdanceberlin',
  'theshantispace.com',
  'nalu.gr',
  'ecstaticdancerotterdam',
  'kumharas',
  'sunsetashram'
];

const VENUE_KEYWORDS = [
  'house of mantra',
  'ecstatic dance',
  'sound journey',
  'rav vast',
  'flutur',
  'ceremonial'
];

const imap = new Imap({
  user: process.env.GMAIL_USER!,
  password: process.env.GMAIL_APP_PASSWORD!,
  host: 'imap.gmail.com',
  port: 993,
  tls: true,
  tlsOptions: { rejectUnauthorized: false }
});

function checkForReplies() {
  return new Promise<void>((resolve, reject) => {
    imap.once('ready', () => {
      // Search in INBOX
      imap.openBox('INBOX', true, (err, box) => {
        if (err) { reject(err); return; }

        console.log(`📬 Checking inbox (${box.messages.total} total messages)\n`);

        // Search for recent emails (last 7 days)
        const since = new Date();
        since.setDate(since.getDate() - 7);
        const sinceStr = since.toISOString().split('T')[0];

        imap.search([['SINCE', sinceStr]], (err, results) => {
          if (err) { reject(err); return; }

          if (!results || results.length === 0) {
            console.log('No recent emails found');
            imap.end();
            resolve();
            return;
          }

          console.log(`Found ${results.length} emails in last 7 days\n`);

          const f = imap.fetch(results, {
            bodies: '',
            struct: true
          });

          const relevantEmails: any[] = [];

          f.on('message', (msg, seqno) => {
            msg.on('body', async (stream) => {
              try {
                const parsed = await simpleParser(stream);
                const from = parsed.from?.text?.toLowerCase() || '';
                const subject = parsed.subject?.toLowerCase() || '';
                const text = parsed.text?.toLowerCase() || '';

                // Check if from venue domain
                const isFromVenue = VENUE_DOMAINS.some(domain => from.includes(domain));

                // Check if subject/body contains keywords
                const hasKeywords = VENUE_KEYWORDS.some(kw =>
                  subject.includes(kw) || text.includes(kw)
                );

                if (isFromVenue || hasKeywords) {
                  relevantEmails.push({
                    seqno,
                    date: parsed.date,
                    from: parsed.from?.text,
                    subject: parsed.subject,
                    preview: parsed.text?.substring(0, 200)
                  });
                }
              } catch (e) {
                // Ignore parse errors
              }
            });
          });

          f.once('end', () => {
            if (relevantEmails.length === 0) {
              console.log('❌ No replies from venues found yet\n');
              console.log('Venues contacted:');
              console.log('- Giardino dei Visionari');
              console.log('- Ecstatic Dance Berlin');
              console.log('- The Shanti Space');
              console.log('- Nalu Athens');
              console.log('\nFollow-up date: 2026-01-28');
            } else {
              console.log(`✅ Found ${relevantEmails.length} relevant emails:\n`);
              relevantEmails
                .sort((a, b) => (b.date?.getTime() || 0) - (a.date?.getTime() || 0))
                .forEach(email => {
                  console.log(`📧 ${email.date?.toLocaleString('it-IT')}`);
                  console.log(`   From: ${email.from}`);
                  console.log(`   Subject: ${email.subject}`);
                  if (email.preview) {
                    console.log(`   Preview: ${email.preview.substring(0, 100)}...`);
                  }
                  console.log('');
                });
            }
            imap.end();
            resolve();
          });
        });
      });
    });

    imap.once('error', (err: Error) => {
      console.error('IMAP error:', err.message);
      reject(err);
    });

    imap.connect();
  });
}

// Also check Sent folder to verify emails were sent
async function checkSentEmails() {
  return new Promise<void>((resolve, reject) => {
    const imap2 = new Imap({
      user: process.env.GMAIL_USER!,
      password: process.env.GMAIL_APP_PASSWORD!,
      host: 'imap.gmail.com',
      port: 993,
      tls: true,
      tlsOptions: { rejectUnauthorized: false }
    });

    imap2.once('ready', () => {
      imap2.openBox('[Gmail]/Sent Mail', true, (err, box) => {
        if (err) {
          // Try alternative name
          imap2.openBox('[Gmail]/Posta inviata', true, (err2, box2) => {
            if (err2) {
              console.log('Could not open Sent folder');
              imap2.end();
              resolve();
              return;
            }
            searchSent(imap2, box2, resolve);
          });
          return;
        }
        searchSent(imap2, box, resolve);
      });
    });

    imap2.once('error', () => {
      resolve(); // Ignore errors
    });

    imap2.connect();
  });
}

function searchSent(imap: Imap, box: Imap.Box, resolve: () => void) {
  const since = new Date();
  since.setDate(since.getDate() - 3);

  imap.search([['SINCE', since.toISOString().split('T')[0]]], (err, results) => {
    if (err || !results?.length) {
      imap.end();
      resolve();
      return;
    }

    console.log(`\n📤 Sent emails (last 3 days): ${results.length}\n`);

    const f = imap.fetch(results.slice(-10), {
      bodies: ['HEADER.FIELDS (TO SUBJECT DATE)']
    });

    f.on('message', (msg) => {
      msg.on('body', (stream) => {
        let buffer = '';
        stream.on('data', (chunk: Buffer) => buffer += chunk.toString('utf8'));
        stream.on('end', () => {
          const lines = buffer.split('\r\n');
          const to = lines.find(l => l.startsWith('To:'))?.replace('To: ', '') || '';
          const subject = lines.find(l => l.startsWith('Subject:'))?.replace('Subject: ', '') || '';
          const date = lines.find(l => l.startsWith('Date:'))?.replace('Date: ', '') || '';

          // Check if outreach email
          const isOutreach = VENUE_DOMAINS.some(d => to.toLowerCase().includes(d)) ||
            subject.toLowerCase().includes('ceremonial') ||
            subject.toLowerCase().includes('rav vast') ||
            subject.toLowerCase().includes('sound journey');

          if (isOutreach) {
            console.log(`✉️ ${date}`);
            console.log(`   To: ${to}`);
            console.log(`   Subject: ${subject}\n`);
          }
        });
      });
    });

    f.once('end', () => {
      imap.end();
      resolve();
    });
  });
}

async function main() {
  console.log('🔍 Checking for outreach replies...\n');
  await checkForReplies();
  await checkSentEmails();
}

main().catch(console.error);
