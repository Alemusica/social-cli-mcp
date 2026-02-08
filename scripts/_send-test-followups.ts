import * as nodemailer from 'nodemailer';
import * as fs from 'fs';
import { loadSecretsToEnv } from '../src/keychain.js';

loadSecretsToEnv();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
});

const f = JSON.parse(fs.readFileSync('content/outreach/generated/auto-followup-2026-02-06.json', 'utf-8'));
const hotel = f.find((x: any) => x.id === 'italy-monastero-santa-rosa');
const beach = f.find((x: any) => x.id === 'portugal-sublime-comporta-beach-club');
const ed = f.find((x: any) => x.id?.includes('ecstatic')) || f.find((x: any) => x.venue?.toLowerCase().includes('ecstatic'));
const music = f.find((x: any) => x.id?.includes('jazz') || x.id?.includes('38riv'));
const to = 'alessio.cazzaniga87@gmail.com';

async function send() {
  // Hotel IT → Father Ocean
  const r1 = await transporter.sendMail({
    from: `"Flutur" <${process.env.GMAIL_USER}>`,
    to,
    subject: `[TEST HOTEL IT] ${hotel.subject}`,
    html: `<div style="background:#f5f5f5;padding:10px;margin-bottom:20px;border-radius:5px"><b>To:</b> ${hotel.to}<br><b>Cat:</b> Hotel IT<br><b>Video:</b> Father Ocean</div>${hotel.html}`,
    text: hotel.text,
  });
  console.log('Hotel IT:', r1.messageId);

  // Beach Club EN → Father Ocean
  const r2 = await transporter.sendMail({
    from: `"Flutur" <${process.env.GMAIL_USER}>`,
    to,
    subject: `[TEST BEACH EN] ${beach.subject}`,
    html: `<div style="background:#f5f5f5;padding:10px;margin-bottom:20px;border-radius:5px"><b>To:</b> ${beach.to}<br><b>Cat:</b> Beach Club EN<br><b>Video:</b> Father Ocean</div>${beach.html}`,
    text: beach.text,
  });
  console.log('Beach EN:', r2.messageId);

  // ED → Transcendence
  if (ed) {
    const r3 = await transporter.sendMail({
      from: `"Flutur" <${process.env.GMAIL_USER}>`,
      to,
      subject: `[TEST ED] ${ed.subject}`,
      html: `<div style="background:#f5f5f5;padding:10px;margin-bottom:20px;border-radius:5px"><b>To:</b> ${ed.to}<br><b>Cat:</b> Ecstatic Dance<br><b>Video:</b> Transcendence</div>${ed.html}`,
      text: ed.text,
    });
    console.log('ED:', r3.messageId);
  }

  // Music Venue → GGT
  if (music) {
    const r4 = await transporter.sendMail({
      from: `"Flutur" <${process.env.GMAIL_USER}>`,
      to,
      subject: `[TEST MUSIC] ${music.subject}`,
      html: `<div style="background:#f5f5f5;padding:10px;margin-bottom:20px;border-radius:5px"><b>To:</b> ${music.to}<br><b>Cat:</b> Music Venue<br><b>Video:</b> GGT</div>${music.html}`,
      text: music.text,
    });
    console.log('Music:', r4.messageId);
  }
}

send().catch(console.error);
