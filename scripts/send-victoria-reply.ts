/**
 * Send Victoria (Afrogreco) reply with PDF attachments
 * Usage:
 *   npx tsx scripts/send-victoria-reply.ts test    → sends to self
 *   npx tsx scripts/send-victoria-reply.ts send    → sends to Victoria
 */
import * as nodemailer from 'nodemailer';
import * as fs from 'fs';
import * as path from 'path';
import { getFromKeychain } from '../src/core/index.js';

const VICTORIA_EMAIL = 'entertainment@afrogrecomusic.com';
const SELF_EMAIL = 'alessio.cazzaniga87@gmail.com';
const SUBJECT = 'Re: Live Musician — Sunset Sessions & Ambient | Summer 2026';

const HTML_BODY = `<p>Hi Victoria,</p>

<p>As promised — promo sheet and tech rider attached.</p>

<p>There's also a full EPK page with all videos, formats, and tech details:<br>
<a href="https://8i8.art/?utm_campaign=greek">8i8.art</a></p>

<p>Happy to jump on a call whenever suits you.</p>

<p>Best,<br>
Alessio</p>`;

const TEXT_BODY = `Hi Victoria,

As promised — promo sheet and tech rider attached.

There's also a full EPK page with all videos, formats, and tech details:
https://8i8.art/?utm_campaign=greek

Happy to jump on a call whenever suits you.

Best,
Alessio`;

const ATTACHMENTS = [
  {
    filename: 'flutur-promo-2026.pdf',
    path: path.resolve('link-hub/public/downloads/flutur-promo-2026.pdf'),
  },
  {
    filename: 'flutur-tech-rider-2026.pdf',
    path: path.resolve('link-hub/public/downloads/flutur-tech-rider-2026.pdf'),
  },
];

async function main() {
  const mode = process.argv[2];

  if (!mode || !['test', 'send'].includes(mode)) {
    console.log('Usage: npx tsx scripts/send-victoria-reply.ts [test|send]');
    process.exit(1);
  }

  // Verify attachments exist
  console.log('\n📎 Checking attachments...');
  for (const att of ATTACHMENTS) {
    if (!fs.existsSync(att.path)) {
      console.error(`❌ MISSING: ${att.path}`);
      process.exit(1);
    }
    const size = fs.statSync(att.path).size;
    console.log(`  ✅ ${att.filename} (${(size / 1024).toFixed(0)} KB)`);
  }

  // Load credentials
  const gmailUser = getFromKeychain('GMAIL_USER');
  const gmailPass = getFromKeychain('GMAIL_APP_PASSWORD');
  if (!gmailUser || !gmailPass) {
    console.error('❌ Gmail credentials not found in Keychain');
    process.exit(1);
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: gmailUser, pass: gmailPass },
  });

  const to = mode === 'test' ? SELF_EMAIL : VICTORIA_EMAIL;

  console.log(`\n📧 Sending to: ${to}`);
  console.log(`📌 Subject: ${SUBJECT}`);
  console.log(`📎 Attachments: ${ATTACHMENTS.map(a => a.filename).join(', ')}`);

  if (mode === 'send') {
    console.log('\n⚠️  SENDING TO VICTORIA IN 5 SECONDS... (Ctrl+C to cancel)');
    await new Promise(r => setTimeout(r, 5000));
  }

  const info = await transporter.sendMail({
    from: `"Alessio Cazzaniga" <${gmailUser}>`,
    to,
    subject: mode === 'test' ? `[TEST] ${SUBJECT}` : SUBJECT,
    html: HTML_BODY,
    text: TEXT_BODY,
    attachments: ATTACHMENTS,
  });

  console.log(`\n✅ SENT — Message ID: ${info.messageId}`);
  console.log(`   To: ${to}`);

  if (mode === 'test') {
    console.log('\n→ Check your inbox. If OK, run: npx tsx scripts/send-victoria-reply.ts send');
  } else {
    console.log('\n🎯 Email sent to Victoria. Ball in her court.');
  }
}

main().catch(e => { console.error('❌', e.message); process.exit(1); });
