#!/usr/bin/env npx tsx
import { createTransport } from 'nodemailer';
import { getFromKeychain } from '../src/core/credentials.js';
import { readFileSync } from 'fs';

async function main() {
  const user = getFromKeychain('GMAIL_USER');
  const pass = getFromKeychain('GMAIL_APP_PASSWORD');
  if (!user || !pass) { console.error('Gmail credentials not found in Keychain'); process.exit(1); }

  const transport = createTransport({ service: 'gmail', auth: { user, pass } });

  const emails = JSON.parse(readFileSync('./content/outreach/generated/ground-level-profiled-2026-02-07.json', 'utf-8'));

  const seen = new Set<string>();
  const samples: any[] = [];
  for (const e of emails) {
    const v = e.video.includes('vH-M') ? 'Chase The Sun' :
              e.video.includes('Ba8H') ? 'Father Ocean' :
              e.video.includes('I-lp') ? 'Efthymia' :
              e.video.includes('q1mT') ? 'Transcendence' : 'Who Is Flutur';
    if (!seen.has(v)) { seen.add(v); samples.push({...e, videoName: v}); }
  }

  let html = `
<div style="font-family:Helvetica Neue,Arial,sans-serif;max-width:700px;margin:0 auto">
  <h2 style="color:#1a1a1a">FLUTUR OUTREACH — 5 Sample Emails (1 per video)</h2>
  <p style="color:#666">${emails.length} email totali. Un esempio per ogni video usato.</p>
  <hr style="border:none;border-top:1px solid #ddd">`;

  for (const s of samples) {
    html += `
  <div style="border:1px solid #e0e0e0;padding:20px;margin:15px 0;border-radius:8px;background:#fafafa">
    <p style="margin:0 0 8px"><strong style="color:#333">${s.videoName}</strong> <span style="color:#888">| ${s.strategy}</span></p>
    <p style="margin:0 0 4px;color:#555">TO: <code>${s.to}</code> — ${s.venue} (${s.country})</p>
    <p style="margin:0 0 12px;color:#555">SUBJECT: <strong>${s.subject}</strong></p>
    <hr style="border:none;border-top:1px solid #eee">
    <div style="padding:10px 0;color:#222;line-height:1.6">${s.body}</div>
  </div>`;
  }

  html += `
  <hr style="border:none;border-top:1px solid #ddd">
  <h3 style="color:#1a1a1a">Tutte ${emails.length} email</h3>
  <table style="width:100%;border-collapse:collapse;font-size:13px">
    <tr style="background:#f5f5f5"><th style="text-align:left;padding:6px">#</th><th style="text-align:left;padding:6px">Venue</th><th style="text-align:left;padding:6px">Country</th><th style="text-align:left;padding:6px">To</th><th style="text-align:left;padding:6px">Video</th></tr>`;

  emails.forEach((e: any, i: number) => {
    const v = e.video.includes('vH-M') ? 'Chase' :
              e.video.includes('Ba8H') ? 'Father' :
              e.video.includes('I-lp') ? 'Efthymia' :
              e.video.includes('q1mT') ? 'Transc.' : 'WhoIs';
    html += `<tr style="border-bottom:1px solid #eee"><td style="padding:4px 6px">${i+1}</td><td style="padding:4px 6px"><b>${e.venue}</b></td><td style="padding:4px 6px">${e.country}</td><td style="padding:4px 6px;font-size:11px">${e.to}</td><td style="padding:4px 6px">${v}</td></tr>`;
  });

  html += `</table>
  <p style="color:#999;font-size:11px;margin-top:20px">Generated ${new Date().toISOString()} — Review before sending.</p>
</div>`;

  const info = await transport.sendMail({
    from: user,
    to: user,
    subject: `[FLUTUR PREVIEW] ${emails.length} email — 5 campioni per video`,
    html
  });
  console.log('Preview sent to', user, '—', info.messageId);
}

main().catch(e => { console.error('Error:', e.message); process.exit(1); });
