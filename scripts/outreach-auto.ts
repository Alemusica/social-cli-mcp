#!/usr/bin/env npx tsx
/**
 * OUTREACH AUTOMATOR — Single command for the entire outreach pipeline
 *
 * Commands:
 *   npx tsx scripts/outreach-auto.ts check       — Scan inbox, update tracking.json
 *   npx tsx scripts/outreach-auto.ts followup     — Generate follow-up emails
 *   npx tsx scripts/outreach-auto.ts send         — Send generated follow-ups
 *   npx tsx scripts/outreach-auto.ts full         — check + followup (dry run)
 *   npx tsx scripts/outreach-auto.ts full --send  — check + followup + send
 *   npx tsx scripts/outreach-auto.ts report       — Pipeline summary
 */
import Imap from 'imap';
import { simpleParser, ParsedMail } from 'mailparser';
import * as nodemailer from 'nodemailer';
import * as fs from 'fs';
import * as path from 'path';
import { loadSecretsToEnv } from '../src/keychain.js';

loadSecretsToEnv();

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

interface TrackingEntry {
  id: string;
  venue: string;
  to: string;
  status: string;
  messageId?: string;
  timestamp: string;
  sentAt: string;
  followUpDue: string;
  bounced?: boolean;
  bounceType?: string;
  bounceReason?: string;
  bounceDetectedAt?: string;
  replyReceived?: boolean;
  replyType?: 'human' | 'auto' | 'mailinblack';
  replyDate?: string;
  replyPreview?: string;
  followUpSent?: boolean;
  followUpSentAt?: string;
  followUp2Sent?: boolean;
  followUp2SentAt?: string;
}

interface InboxMatch {
  date: Date | undefined;
  from: string;
  fromEmail: string;
  fromDomain: string;
  subject: string;
  body: string;
  venue: string;
  trackingId: string;
  type: 'human' | 'auto' | 'bounce' | 'mailinblack' | 'newsletter';
}

// ═══════════════════════════════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════════════════════════════

const TRACKING_PATH = 'content/outreach/tracking.json';
const FOLLOWUP_DIR = 'content/outreach/generated';
const SELF_EMAIL = (process.env.GMAIL_USER || '').toLowerCase();

// Domains that are NEVER venue replies
const EXCLUDE_DOMAINS = new Set([
  'gmail.com', 'hotmail.com', 'gmx.de', 'yahoo.com', 'outlook.com',
  // Newsletter / marketing platforms
  'mailchimp.com', 'mailchimpapp.com', 'sendgrid.net', 'sendinblue.com',
  'constantcontact.com', 'hubspot.com', 'mailgun.org', 'sparkpostmail.com',
  'amazonses.com', 'mandrillapp.com', 'intercom-mail.com', 'crisp.email',
  // Google
  'google.com', 'googlemail.com', 'youtube.com',
  // Social
  'twitter.com', 'x.com', 'facebook.com', 'instagram.com', 'linkedin.com',
  'github.com', 'notifications.github.com',
  // Dev services
  'vercel.com', 'netlify.com', 'heroku.com', 'supabase.io', 'anthropic.com',
  'stripe.com', 'paypal.com',
]);

// Anti-spam verification systems
const ANTI_SPAM_INDICATORS = [
  'mailinblack', 'protect.mailinblack',
  'barracuda', 'spamtitan', 'mimecast',
  'click here to verify', 'verify your identity',
  'deliver my email', 'autoriser',
];

// Video assets for follow-up emails — ONLY confirmed working URLs
// Source: content/artist-links.json
const VIDEOS: Record<string, { url: string; label: string }> = {
  efthymia: {
    url: 'https://youtu.be/I-lpfRHTSG4',
    label: 'Efthymia (RAV Vast solo — Greece)',
  },
  fatherOceanHighlight: {
    url: 'https://youtu.be/Ba8HiRS4hjc',
    label: 'Deep Melodic Lift — Father Ocean highlight (Anjunadeep tone)',
  },
  transcendence: {
    url: 'https://youtu.be/q1mTTMnQCvo',
    label: 'Transcendence (RAV ritual → organic house)',
  },
  ggt: {
    url: 'https://youtu.be/NI23tAP0c8U',
    label: "Greece's Got Talent",
  },
};

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

function loadTracking(): TrackingEntry[] {
  return JSON.parse(fs.readFileSync(TRACKING_PATH, 'utf-8'));
}

function saveTracking(entries: TrackingEntry[]): void {
  fs.writeFileSync(TRACKING_PATH, JSON.stringify(entries, null, 2));
}

function extractEmail(from: string): string {
  const match = from.match(/<([^>]+)>/);
  return (match ? match[1] : from).toLowerCase().trim();
}

function extractDomain(email: string): string {
  return email.split('@').pop()?.replace('>', '').trim() || '';
}

function daysBetween(d1: Date, d2: Date): number {
  return Math.floor((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
}

// ═══════════════════════════════════════════════════════════════
// EMAIL CLASSIFIER — reads FULL body, not just subject
// ═══════════════════════════════════════════════════════════════

function classifyEmail(fromEmail: string, from: string, subject: string, body: string): InboxMatch['type'] {
  const subj = subject.toLowerCase();
  const bodyLow = body.toLowerCase();
  const f = from.toLowerCase();

  // Self-sent emails — exclude completely
  if (fromEmail === SELF_EMAIL) return 'newsletter'; // will be filtered out

  // Bounce detection
  if (f.includes('mailer-daemon') || f.includes('postmaster')) return 'bounce';
  if (subj.includes('delivery') && (subj.includes('fail') || subj.includes('notification'))) return 'bounce';
  if (subj.includes('undeliverable') || subj.includes('returned') || subj.includes('non recapitabile')) return 'bounce';
  if (bodyLow.includes('550 5.1.1') || bodyLow.includes('user unknown') || bodyLow.includes('mailbox not found')) return 'bounce';
  if (bodyLow.includes('delivery has failed') || bodyLow.includes('message could not be delivered')) return 'bounce';

  // Anti-spam verification (Mailinblack etc.)
  if (ANTI_SPAM_INDICATORS.some(ind => bodyLow.includes(ind) || subj.includes(ind) || f.includes(ind))) return 'mailinblack';

  // Auto-reply detection — subject
  if (subj.includes('automatic reply') || subj.includes('auto-reply') || subj.includes('autoreply')) return 'auto';
  if (subj.includes('automated email') || subj.includes('automated reply')) return 'auto';
  if (subj.includes('out of office') || subj.includes('absence') || subj.includes('away')) return 'auto';
  if (subj.includes('risposta automatica') || subj.includes('fuori ufficio') || subj.includes('fuori sede')) return 'auto';
  if (subj.includes('take a breath')) return 'auto'; // Shanti Space style
  // Auto-reply detection — body
  if (bodyLow.includes('this is an automated') || bodyLow.includes('auto-reply') || bodyLow.includes('auto reply')) return 'auto';
  if (bodyLow.includes('risposta automatica') || bodyLow.includes('messaggio automatico')) return 'auto';
  if (bodyLow.includes('we acknowledge the receipt') || bodyLow.includes('will respond shortly')) return 'auto';
  if (bodyLow.includes('our office hours are') || bodyLow.includes('we try to balance our online life')) return 'auto';
  if (bodyLow.includes('thank you for reaching out') && bodyLow.includes('we appreciate your patience')) return 'auto';
  if (bodyLow.includes('grazie per averci contattato') && bodyLow.includes('riaprirà')) return 'auto'; // seasonal auto
  // "Out of office" patterns in body
  if (bodyLow.includes('i am currently out') || bodyLow.includes('i\'m out of the office')) return 'auto';
  if (bodyLow.includes('sono fuori ufficio') || bodyLow.includes('attualmente assente')) return 'auto';

  // Newsletter detection (bulk senders)
  if (f.includes('noreply') || f.includes('no-reply') || f.includes('newsletter')) return 'newsletter';
  if (subj.includes('unsubscribe') || bodyLow.includes('unsubscribe from this list')) return 'newsletter';
  if (bodyLow.includes('you are receiving this email because') || bodyLow.includes('email preferences')) return 'newsletter';

  return 'human';
}

// ═══════════════════════════════════════════════════════════════
// INBOX SCANNER — IMAP with full body parsing
// ═══════════════════════════════════════════════════════════════

async function scanInbox(daysBack: number = 30): Promise<InboxMatch[]> {
  const tracking = loadTracking();

  // Build domain→tracking lookup (only custom domains, no generic)
  const domainMap = new Map<string, TrackingEntry[]>();
  const emailMap = new Map<string, TrackingEntry>();

  for (const t of tracking) {
    if (!t.to?.includes('@')) continue;
    const domain = extractDomain(t.to);
    if (EXCLUDE_DOMAINS.has(domain)) continue;

    if (!domainMap.has(domain)) domainMap.set(domain, []);
    domainMap.get(domain)!.push(t);
    emailMap.set(t.to.toLowerCase(), t);
  }

  console.log(`\n  Scanning inbox (${domainMap.size} venue domains, ${daysBack} days back)...`);

  return new Promise<InboxMatch[]>((resolve, reject) => {
    const imap = new Imap({
      user: process.env.GMAIL_USER!,
      password: process.env.GMAIL_APP_PASSWORD!,
      host: 'imap.gmail.com',
      port: 993,
      tls: true,
      tlsOptions: { rejectUnauthorized: false },
    });

    const results: InboxMatch[] = [];

    imap.once('ready', () => {
      imap.openBox('INBOX', true, (err, box) => {
        if (err) { reject(err); return; }

        const since = new Date();
        since.setDate(since.getDate() - daysBack);

        imap.search([['SINCE', since.toISOString().split('T')[0]]], (err, uids) => {
          if (err) { reject(err); return; }
          if (!uids?.length) {
            console.log('  No emails found in timeframe');
            imap.end();
            resolve([]);
            return;
          }

          console.log(`  ${uids.length} total emails — filtering...`);

          let processed = 0;

          const f = imap.fetch(uids, { bodies: '', struct: true });

          f.on('message', (msg) => {
            msg.on('body', async (stream) => {
              try {
                const parsed: ParsedMail = await simpleParser(stream);
                const fromRaw = parsed.from?.text || '';
                const fromEmail = extractEmail(fromRaw);
                const fromDomain = extractDomain(fromEmail);
                const subject = parsed.subject || '';
                const body = parsed.text || '';

                // Skip self-sent
                if (fromEmail === SELF_EMAIL) { processed++; return; }

                // Allow mailer-daemon even from excluded domains
                const isMailerDaemon = fromEmail.includes('mailer-daemon') || fromEmail.includes('postmaster');

                // Skip excluded domains (unless it's a bounce notification)
                if (EXCLUDE_DOMAINS.has(fromDomain) && !isMailerDaemon) { processed++; return; }

                // Match against venue domains
                const matchedEntries = [...domainMap.entries()].find(([d]) =>
                  fromDomain === d || fromDomain.endsWith('.' + d)
                );

                // Also check: is this a bounce that references one of our emails?
                const isBounceFrom = fromRaw.toLowerCase().includes('mailer-daemon') ||
                  fromRaw.toLowerCase().includes('postmaster');
                const bounceMentionsUs = isBounceFrom && (
                  body.toLowerCase().includes('flutur') ||
                  tracking.some(t => body.includes(t.to))
                );

                if (!matchedEntries && !bounceMentionsUs) { processed++; return; }

                const type = classifyEmail(fromEmail, fromRaw, subject, body);

                // Skip newsletters completely
                if (type === 'newsletter') { processed++; return; }

                // Determine which tracking entry this matches
                let venue = 'Unknown';
                let trackingId = '';

                if (matchedEntries) {
                  const [, entries] = matchedEntries;
                  venue = entries[0].venue;
                  trackingId = entries[0].id;
                } else if (bounceMentionsUs) {
                  // Find which venue this bounce is about
                  const matchedEntry = tracking.find(t => body.includes(t.to));
                  if (matchedEntry) {
                    venue = matchedEntry.venue;
                    trackingId = matchedEntry.id;
                  }
                }

                results.push({
                  date: parsed.date,
                  from: fromRaw,
                  fromEmail,
                  fromDomain,
                  subject,
                  body: body.substring(0, 2000), // Keep first 2000 chars for context
                  venue,
                  trackingId,
                  type,
                });
              } catch { /* skip unparseable */ }
              processed++;
            });
          });

          f.once('end', () => {
            const wait = setInterval(() => {
              if (processed >= uids.length) {
                clearInterval(wait);
                imap.end();
                resolve(results);
              }
            }, 200);
            setTimeout(() => { clearInterval(wait); imap.end(); resolve(results); }, 60000);
          });
        });
      });
    });

    imap.once('error', (err: Error) => reject(err));
    imap.connect();
  });
}

// ═══════════════════════════════════════════════════════════════
// CHECK — Scan inbox + update tracking.json
// ═══════════════════════════════════════════════════════════════

async function runCheck(daysBack: number): Promise<InboxMatch[]> {
  console.log('\n' + '═'.repeat(60));
  console.log('  FLUTUR OUTREACH — INBOX CHECK');
  console.log('═'.repeat(60));

  const matches = await scanInbox(daysBack);
  const tracking = loadTracking();

  // Sort by date
  matches.sort((a, b) => (b.date?.getTime() || 0) - (a.date?.getTime() || 0));

  const human = matches.filter(m => m.type === 'human');
  const auto = matches.filter(m => m.type === 'auto');
  const bounces = matches.filter(m => m.type === 'bounce');
  const mailinblack = matches.filter(m => m.type === 'mailinblack');

  // Update tracking entries
  // Group matches by trackingId, keep the most "important" classification
  // Priority: human > auto > mailinblack > bounce > newsletter
  let updated = 0;

  // Build best classification per trackingId
  const bestByEntry = new Map<string, InboxMatch>();
  const typePriority: Record<string, number> = { human: 4, auto: 3, mailinblack: 2, bounce: 1, newsletter: 0 };

  for (const match of matches) {
    if (!match.trackingId) continue;
    const existing = bestByEntry.get(match.trackingId);
    if (!existing || (typePriority[match.type] || 0) > (typePriority[existing.type] || 0)) {
      bestByEntry.set(match.trackingId, match);
    }
  }

  for (const [trackingId, match] of bestByEntry) {
    const entry = tracking.find(t => t.id === trackingId);
    if (!entry) continue;

    if (match.type === 'bounce' && !entry.bounced) {
      entry.bounced = true;
      entry.bounceType = 'hard';
      entry.bounceReason = match.subject.substring(0, 100);
      entry.bounceDetectedAt = new Date().toISOString();
      updated++;
    } else if (match.type === 'human') {
      // Always update to human even if previously wrongly classified
      if (entry.replyType !== 'human') {
        entry.replyReceived = true;
        entry.replyType = 'human';
        entry.replyDate = match.date?.toISOString();
        entry.replyPreview = match.body.substring(0, 300);
        updated++;
      }
    } else if (match.type === 'auto') {
      // Update to auto, or correct from human→auto
      if (!entry.replyReceived || entry.replyType === 'human') {
        entry.replyReceived = true;
        entry.replyType = 'auto';
        entry.replyDate = match.date?.toISOString();
        updated++;
      }
    } else if (match.type === 'mailinblack' && !entry.replyReceived) {
      entry.replyReceived = true;
      entry.replyType = 'mailinblack';
      entry.replyDate = match.date?.toISOString();
      updated++;
    }
  }

  if (updated > 0) {
    saveTracking(tracking);
    console.log(`\n  Updated ${updated} entries in tracking.json`);
  }

  // Print results
  console.log('\n' + '═'.repeat(60));

  if (human.length > 0) {
    console.log(`\n  HUMAN REPLIES (${human.length}):\n`);
    for (const r of human) {
      console.log(`  ${r.date?.toLocaleDateString('it-IT')} — ${r.venue}`);
      console.log(`    From: ${r.from}`);
      console.log(`    Subject: ${r.subject}`);
      console.log(`    ${r.body.substring(0, 250).replace(/\n/g, '\n    ')}`);
      console.log('');
    }
  } else {
    console.log('\n  No new human replies.');
  }

  if (auto.length > 0) {
    console.log(`\n  AUTO-REPLIES (${auto.length}):`);
    for (const r of auto) {
      console.log(`    - ${r.venue}: ${r.subject}`);
    }
  }

  if (mailinblack.length > 0) {
    console.log(`\n  ANTI-SPAM VERIFICATION (${mailinblack.length}):`);
    for (const r of mailinblack) {
      console.log(`    - ${r.venue}: Needs verification click in Gmail`);
    }
  }

  if (bounces.length > 0) {
    console.log(`\n  BOUNCES (${bounces.length}):`);
    for (const r of bounces) {
      console.log(`    - ${r.venue}: ${r.subject.substring(0, 80)}`);
    }
  }

  // Pipeline stats
  const totalSent = tracking.filter(t => t.status === 'sent').length;
  const totalBounced = tracking.filter(t => t.bounced).length;
  const totalReplied = tracking.filter(t => t.replyReceived).length;
  const humanReplies = tracking.filter(t => t.replyType === 'human').length;
  const autoReplies = tracking.filter(t => t.replyType === 'auto').length;
  const delivered = totalSent - totalBounced;

  console.log('\n' + '═'.repeat(60));
  console.log('  PIPELINE SUMMARY');
  console.log('═'.repeat(60));
  console.log(`  Total sent:        ${totalSent}`);
  console.log(`  Bounced:           ${totalBounced}`);
  console.log(`  Delivered:         ${delivered}`);
  console.log(`  Human replies:     ${humanReplies}`);
  console.log(`  Auto-replies:      ${autoReplies}`);
  console.log(`  Awaiting reply:    ${delivered - totalReplied}`);
  console.log(`  Response rate:     ${delivered > 0 ? ((humanReplies / delivered) * 100).toFixed(1) : 0}%`);
  console.log('═'.repeat(60));

  return matches;
}

// ═══════════════════════════════════════════════════════════════
// FOLLOW-UP GENERATOR
// ═══════════════════════════════════════════════════════════════

interface FollowUpEmail {
  id: string;
  venue: string;
  to: string;
  subject: string;
  html: string;
  text: string;
  isSecondFollowUp: boolean;
  originalSentAt: string;
  daysSinceOriginal: number;
}

function generateFollowUps(): FollowUpEmail[] {
  const tracking = loadTracking();
  const now = new Date();
  const followUps: FollowUpEmail[] = [];

  // Build set of emails that have received ANY reply (for cross-batch dedup)
  const repliedEmails = new Set<string>();
  const bouncedEmails = new Set<string>();
  for (const t of tracking) {
    const email = t.to.toLowerCase();
    if (t.replyReceived) repliedEmails.add(email);
    if (t.bounced) bouncedEmails.add(email);
  }

  // Track emails we're already following up to avoid duplicates
  const followUpTargets = new Set<string>();

  for (const entry of tracking) {
    if (entry.status !== 'sent') continue;
    if (entry.bounced) continue;
    if (entry.replyReceived) continue;

    const email = entry.to.toLowerCase();

    // Skip if same email got a reply on another tracking entry
    if (repliedEmails.has(email)) continue;
    // Skip if same email bounced on another entry
    if (bouncedEmails.has(email)) continue;
    // Skip if we're already generating a follow-up for this email
    if (followUpTargets.has(email)) continue;

    const sentDate = new Date(entry.sentAt);
    const days = daysBetween(sentDate, now);

    // First follow-up: 7+ days after send, not yet sent
    if (days >= 7 && !entry.followUpSent) {
      followUps.push(buildFollowUpEmail(entry, false, days));
      followUpTargets.add(email);
    }
    // Second follow-up: 14+ days after send, first already sent
    else if (days >= 14 && entry.followUpSent && !entry.followUp2Sent) {
      followUps.push(buildFollowUpEmail(entry, true, days));
      followUpTargets.add(email);
    }
  }

  return followUps;
}

// ─── Venue categorization ─────────────────────────────────

type VenueCategory = 'ecstatic_dance' | 'wellness_retreat' | 'beach_club' | 'hotel' | 'music_venue' | 'festival' | 'general';
type VenueLang = 'it' | 'en';

function categorizeVenue(entry: TrackingEntry): VenueCategory {
  const id = entry.id.toLowerCase();
  const name = entry.venue.toLowerCase();
  const to = entry.to.toLowerCase();

  if (id.includes('ecstatic') || name.includes('ecstatic') || name.includes('nirvadance') || name.includes('rising spirits') || name.includes('euphoria ecstatic')) return 'ecstatic_dance';
  if (name.includes('retreat') || name.includes('yoga') || name.includes('wellness') || name.includes('meditation') || name.includes('healing') || name.includes('osho') || name.includes('mandali') || name.includes('orada') || name.includes('pyramids of chi')) return 'wellness_retreat';
  if (name.includes('festival') || name.includes('terraforma') || name.includes('locus') || name.includes('pangonia') || name.includes('conference')) return 'festival';
  if (name.includes('beach') || name.includes('sunset') || name.includes('brisa') || name.includes('lounge') || name.includes('alma vibes') || name.includes('scogliera') || name.includes('conca') || name.includes('babylon') || name.includes('comporta') || name.includes('duna') || name.includes('pathos') || name.includes('nikki')) return 'beach_club';
  if (name.includes('hotel') || name.includes('resort') || name.includes('palace') || name.includes('monastero') || name.includes('masseria') || name.includes('borgo') || name.includes('castello') || name.includes('villa') || name.includes('locanda') || name.includes('habitas') || name.includes('nômade') || name.includes('ahau') || name.includes('boutique') || name.includes('estalagem') || name.includes('boma')) return 'hotel';
  if (name.includes('jazz') || name.includes('club') || name.includes('music') || name.includes('locomotiv') || name.includes('estragon') || name.includes('prachtwerk') || name.includes('donau') || name.includes('caffe') || name.includes('point ephemere') || name.includes('django') || name.includes('ophelia') || name.includes('flamingo')) return 'music_venue';

  return 'general';
}

function detectLanguage(entry: TrackingEntry): VenueLang {
  const id = entry.id.toLowerCase();
  const to = entry.to.toLowerCase();
  // Italian venues
  if (id.startsWith('italy-') || to.endsWith('.it')) return 'it';
  if (['locomotiv', 'estragon', 'bravo', 'juparana', 'rastrello', 'popilia', 'danesi', 'aurora', 'mattuiani', 'fondazioneravello', 'capovaticano', 'villapaolatropea', 'santavenere', 'locandadonserafino', 'notohotel', 'villadorata', 'camerajazzclub', 'monasterosantarosa', 'borgoegnazia', 'torremaizza', 'scoglierapositano', 'concadelsogno', 'musicontherocks', 'grandhotelparkers', 'hotelmetropolitan', 'iporticihotel', 'hoteltouring', 'ecstaticdancemilano', 'lakecomowellness', 'terraformafestival', 'bassculture'].some(w => to.includes(w) || id.includes(w))) return 'it';
  return 'en';
}

function selectVideo(cat: VenueCategory): { url: string; label: string } {
  switch (cat) {
    case 'beach_club':
    case 'hotel':
      return VIDEOS.fatherOceanHighlight; // Monolink/Böhmer melodic house + RAV drop — exactly what they'd book
    case 'ecstatic_dance':
      return VIDEOS.transcendence; // Silence → RAV ritual → organic house transition
    case 'wellness_retreat':
      return VIDEOS.efthymia; // RAV solo Greece, transcendental energy journey
    case 'festival':
      return VIDEOS.efthymia; // Full energy arc, meditation to peak
    case 'music_venue':
      return VIDEOS.ggt; // TV credentials, stage presence proof
    case 'general':
    default:
      return VIDEOS.fatherOceanHighlight; // Best all-rounder: sunset, melodic house, RAV
  }
}

function humanizeDays(days: number): { en: string; it: string } {
  if (days <= 8) return { en: 'about a week ago', it: 'circa una settimana fa' };
  if (days <= 17) return { en: 'a couple of weeks ago', it: 'un paio di settimane fa' };
  return { en: 'a few weeks ago', it: 'qualche settimana fa' };
}

// ─── Follow-up email builder ──────────────────────────────

function buildFollowUpEmail(entry: TrackingEntry, isSecond: boolean, days: number): FollowUpEmail {
  const cat = categorizeVenue(entry);
  const lang = detectLanguage(entry);
  const video = selectVideo(cat);
  const daysText = humanizeDays(days);

  let subject: string;
  let text: string;

  if (isSecond) {
    // ── SECOND FOLLOW-UP (final touch, very short) ──
    if (lang === 'it') {
      subject = `Flutur — live act per ${entry.venue}`;
      text = `Buongiorno,

un ultimo messaggio. Sono Flutur — creo sessioni live con RAV Vast, chitarra, voce e live looping. Un set completo, una persona.

Se cercate musica dal vivo per la stagione 2026: ${video.url}

Grazie per il tempo,
Flutur
linktr.ee/flutur`;
    } else {
      subject = `Flutur — live act for ${entry.venue}`;
      text = `Hi,

One last note. I'm Flutur — I create full live sets with RAV Vast, guitar, vocals, and live looping. Complete show, one person.

If you're looking for live music for 2026 season: ${video.url}

Thanks for your time,
Flutur
linktr.ee/flutur`;
    }
  } else {
    // ── FIRST FOLLOW-UP (venue-type specific) ──
    text = buildFirstFollowUp(entry, cat, lang, video, daysText);
    subject = buildSubject(entry, cat, lang);
  }

  const html = text.split('\n').map(line => line.trim() === '' ? '<br>' : `<p>${line}</p>`).join('\n');

  return {
    id: entry.id,
    venue: entry.venue,
    to: entry.to,
    subject,
    html,
    text,
    isSecondFollowUp: isSecond,
    originalSentAt: entry.sentAt,
    daysSinceOriginal: days,
  };
}

function buildSubject(entry: TrackingEntry, cat: VenueCategory, lang: VenueLang): string {
  const v = entry.venue;
  switch (cat) {
    case 'ecstatic_dance':
      return lang === 'it'
        ? `RAV Vast live per Ecstatic Dance — follow up`
        : `RAV Vast live for Ecstatic Dance — follow up`;
    case 'wellness_retreat':
      return lang === 'it'
        ? `Sound journey & RAV Vast per ${v} — follow up`
        : `Sound journey & RAV Vast for ${v} — follow up`;
    case 'beach_club':
      return lang === 'it'
        ? `Sunset session live per ${v} — follow up`
        : `Sunset session artist for ${v} — follow up`;
    case 'hotel':
      return lang === 'it'
        ? `Musica live per ospiti ${v} — follow up`
        : `Live music for ${v} guests — follow up`;
    case 'festival':
      return lang === 'it'
        ? `Artist application ${v} — follow up`
        : `Artist application ${v} — follow up`;
    case 'music_venue':
      return lang === 'it'
        ? `Live looping set per ${v} — follow up`
        : `Live looping set for ${v} — follow up`;
    default:
      return `Flutur live act — follow up`;
  }
}

function buildFirstFollowUp(
  entry: TrackingEntry,
  cat: VenueCategory,
  lang: VenueLang,
  video: { url: string },
  daysText: { en: string; it: string },
): string {
  const v = entry.venue;

  // ── ECSTATIC DANCE ──
  if (cat === 'ecstatic_dance') {
    return lang === 'it'
      ? `Ciao,

vi avevo scritto ${daysText.it} per proporvi un live set per ecstatic dance — RAV Vast + live looping, dalla fase meditativa al picco energetico.

Un breve video: ${video.url}

Disponibile per la stagione 2026. Faccio anche workshop con RAV Vast se vi interessa.

Flutur
RAV Vast Endorsed Artist
linktr.ee/flutur`
      : `Hi,

I wrote ${daysText.en} about performing a live set for ecstatic dance — RAV Vast + live looping, from meditative warm-up to peak energy.

Short video: ${video.url}

Available for 2026 season. I also offer RAV Vast / sound healing workshops if that's relevant.

Flutur
RAV Vast Endorsed Artist
linktr.ee/flutur`;
  }

  // ── WELLNESS / RETREAT ──
  if (cat === 'wellness_retreat') {
    return lang === 'it'
      ? `Buongiorno,

vi avevo scritto ${daysText.it} riguardo sessioni di sound journey con RAV Vast per i vostri ospiti.

Ho 4 anni di esperienza come artista residente per sunset meditation in hotel di lusso (Villa Porta, Lago Maggiore).

Video: ${video.url}

Sarei felice di parlarne quando vi fa comodo.

Flutur
RAV Vast Endorsed Artist
linktr.ee/flutur`
      : `Hi,

I reached out ${daysText.en} about sound journey sessions with RAV Vast for your guests.

I have 4 years of experience as resident artist for sunset meditation at a luxury hotel (Villa Porta, Lake Maggiore).

Video: ${video.url}

Happy to discuss when it suits you.

Flutur
RAV Vast Endorsed Artist
linktr.ee/flutur`;
  }

  // ── BEACH CLUB ──
  if (cat === 'beach_club') {
    return lang === 'it'
      ? `Ciao,

vi avevo scritto ${daysText.it} per proporvi un set live per le vostre serate. Creo sessioni sunset con chitarra, RAV Vast e live looping — stile Café del Mar ma dal vivo.

4 anni di residenza artistica su terrazza lago (Villa Porta). Una persona, set completo.

Video: ${video.url}

Disponibile stagione 2026.

Flutur
linktr.ee/flutur`
      : `Hi,

I wrote ${daysText.en} about performing live sunset sessions at ${v}. I create ambient sets with guitar, RAV Vast, and live looping — Café del Mar style, but live.

4 years as resident artist at a lakeside terrace (Villa Porta). One person, full set.

Video: ${video.url}

Available for 2026 season.

Flutur
linktr.ee/flutur`;
  }

  // ── HOTEL ──
  if (cat === 'hotel') {
    return lang === 'it'
      ? `Buongiorno,

vi avevo contattato ${daysText.it} riguardo musica live per i vostri ospiti — aperitivo, poolside o eventi speciali.

Ho 4 anni di esperienza come artista residente a Villa Porta (Lago Maggiore), creando sessioni ambient per hotel di lusso.

Video: ${video.url}

Setup minimale, nessun requisito tecnico. Voce, chitarra, RAV Vast e loop station.

Flutur
linktr.ee/flutur`
      : `Hi,

I reached out ${daysText.en} about live music for your guests — aperitivo, poolside, or special events.

I have 4 years as resident artist at Villa Porta (Lake Maggiore), creating ambient sessions for luxury hotel guests.

Video: ${video.url}

Minimal setup, no technical requirements. Voice, guitar, RAV Vast, and loop station.

Flutur
linktr.ee/flutur`;
  }

  // ── FESTIVAL ──
  if (cat === 'festival') {
    return lang === 'it'
      ? `Ciao,

vi avevo scritto ${daysText.it} per proporre il mio live set per ${v}.

Offro: performance live (RAV Vast + looping + voce) e workshop di sound healing. Il set va dalla meditazione al picco energetico — adatto a main stage o healing area.

Credenziali: Greece's Got Talent (4 SÌ), main stage Drishti Beats Festival (USA), RAV Vast Endorsed Artist.

Video: ${video.url}

Flutur
linktr.ee/flutur`
      : `Hi,

I wrote ${daysText.en} to propose my live set for ${v}.

I offer: live performance (RAV Vast + looping + vocals) and sound healing workshops. The set ranges from meditation to peak energy — works for main stage or healing area.

Credentials: Greece's Got Talent (4 YES votes), Drishti Beats Festival main stage (USA), RAV Vast Endorsed Artist.

Video: ${video.url}

Flutur
linktr.ee/flutur`;
  }

  // ── MUSIC VENUE ──
  if (cat === 'music_venue') {
    return lang === 'it'
      ? `Ciao,

vi avevo scritto ${daysText.it} per proporvi un live set di world music con live looping.

Creo arrangiamenti per band completa da solo — RAV Vast, chitarra, voce, loop. Apparso su Greece's Got Talent (4 SÌ).

Video: ${video.url}

Disponibile per serate 2026.

Flutur
linktr.ee/flutur`
      : `Hi,

I wrote ${daysText.en} about performing a world music live looping set at ${v}.

I create full-band arrangements solo — RAV Vast, guitar, voice, loops. Featured on Greece's Got Talent (4 YES votes).

Video: ${video.url}

Available for 2026 bookings.

Flutur
linktr.ee/flutur`;
  }

  // ── GENERAL FALLBACK ──
  return lang === 'it'
    ? `Buongiorno,

vi avevo scritto ${daysText.it}. Sono Flutur — musicista live con RAV Vast, chitarra, voce e live looping.

Un breve video: ${video.url}

Disponibile per collaborazioni 2026.

Flutur
linktr.ee/flutur`
    : `Hi,

I reached out ${daysText.en}. I'm Flutur — live musician with RAV Vast, guitar, vocals, and live looping.

Short video: ${video.url}

Available for 2026 collaborations.

Flutur
linktr.ee/flutur`;
}

async function runFollowUp(doSend: boolean): Promise<FollowUpEmail[]> {
  console.log('\n' + '═'.repeat(60));
  console.log('  FLUTUR OUTREACH — FOLLOW-UP GENERATOR');
  console.log('═'.repeat(60));

  const followUps = generateFollowUps();

  if (followUps.length === 0) {
    console.log('\n  No follow-ups needed right now.');
    console.log('  All sent emails are either replied, bounced, or too recent.\n');
    return [];
  }

  const first = followUps.filter(f => !f.isSecondFollowUp);
  const second = followUps.filter(f => f.isSecondFollowUp);

  console.log(`\n  First follow-ups:  ${first.length}`);
  console.log(`  Second follow-ups: ${second.length}`);
  console.log(`  Total to send:     ${followUps.length}\n`);

  // Show preview
  for (const fu of followUps) {
    const tag = fu.isSecondFollowUp ? '[2nd]' : '[1st]';
    console.log(`  ${tag} ${fu.venue} <${fu.to}> (${fu.daysSinceOriginal}d ago)`);
  }

  // Save to file
  const timestamp = new Date().toISOString().split('T')[0];
  const outputPath = path.join(FOLLOWUP_DIR, `auto-followup-${timestamp}.json`);
  fs.mkdirSync(FOLLOWUP_DIR, { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(followUps, null, 2));
  console.log(`\n  Saved to ${outputPath}`);

  if (doSend) {
    console.log('\n  Sending follow-ups...\n');
    await sendFollowUps(followUps);
  } else {
    console.log('\n  Dry run — use --send flag to send.');
  }

  return followUps;
}

// ═══════════════════════════════════════════════════════════════
// SENDER
// ═══════════════════════════════════════════════════════════════

async function sendFollowUps(followUps: FollowUpEmail[]): Promise<void> {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });

  const tracking = loadTracking();
  let sent = 0;
  let failed = 0;

  for (const fu of followUps) {
    try {
      const info = await transporter.sendMail({
        from: `"Flutur" <${process.env.GMAIL_USER}>`,
        to: fu.to,
        subject: fu.subject,
        html: fu.html,
        text: fu.text,
      });

      console.log(`  Sent: ${fu.venue} <${fu.to}> — ${info.messageId}`);
      sent++;

      // Update tracking
      const entry = tracking.find(t => t.id === fu.id);
      if (entry) {
        if (fu.isSecondFollowUp) {
          entry.followUp2Sent = true;
          entry.followUp2SentAt = new Date().toISOString();
        } else {
          entry.followUpSent = true;
          entry.followUpSentAt = new Date().toISOString();
        }
      }

      // 2s delay between emails
      await new Promise(r => setTimeout(r, 2000));
    } catch (error: any) {
      console.log(`  FAILED: ${fu.venue} — ${error.message}`);
      failed++;
    }
  }

  saveTracking(tracking);
  console.log(`\n  Results: ${sent} sent, ${failed} failed`);
  console.log(`  Tracking updated.`);
}

// ═══════════════════════════════════════════════════════════════
// REPORT — Just show pipeline stats
// ═══════════════════════════════════════════════════════════════

function runReport(): void {
  const tracking = loadTracking();
  const now = new Date();

  const sent = tracking.filter(t => t.status === 'sent');
  const bounced = tracking.filter(t => t.bounced);
  const humanReplies = tracking.filter(t => t.replyType === 'human');
  const autoReplies = tracking.filter(t => t.replyType === 'auto');
  const mailinblack = tracking.filter(t => t.replyType === 'mailinblack');
  const followUpSent = tracking.filter(t => t.followUpSent);
  const followUp2Sent = tracking.filter(t => t.followUp2Sent);
  const delivered = sent.length - bounced.length;

  // Overdue for follow-up (sent >7 days ago, no reply, no follow-up sent)
  const overdue = sent.filter(t => {
    if (t.bounced || t.replyReceived || t.followUpSent) return false;
    return daysBetween(new Date(t.sentAt), now) >= 7;
  });

  console.log('\n' + '═'.repeat(60));
  console.log('  FLUTUR OUTREACH PIPELINE REPORT');
  console.log('  ' + now.toLocaleDateString('it-IT', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }));
  console.log('═'.repeat(60));
  console.log(`  Total sent:            ${sent.length}`);
  console.log(`  Bounced:               ${bounced.length}`);
  console.log(`  Delivered:             ${delivered}`);
  console.log(`  ─────────────────────────────────`);
  console.log(`  Human replies:         ${humanReplies.length}`);
  console.log(`  Auto-replies:          ${autoReplies.length}`);
  console.log(`  Anti-spam gates:       ${mailinblack.length}`);
  console.log(`  ─────────────────────────────────`);
  console.log(`  Follow-ups sent:       ${followUpSent.length}`);
  console.log(`  2nd follow-ups sent:   ${followUp2Sent.length}`);
  console.log(`  Overdue for follow-up: ${overdue.length}`);
  console.log(`  ─────────────────────────────────`);
  console.log(`  Response rate:         ${delivered > 0 ? ((humanReplies.length / delivered) * 100).toFixed(1) : 0}%`);
  console.log('═'.repeat(60));

  if (humanReplies.length > 0) {
    console.log('\n  HUMAN REPLIES:');
    for (const r of humanReplies) {
      console.log(`    - ${r.venue} (${r.replyDate?.split('T')[0]}): ${r.replyPreview?.substring(0, 100) || 'see Gmail'}`);
    }
  }

  if (overdue.length > 0) {
    console.log(`\n  OVERDUE FOR FOLLOW-UP (${overdue.length}):`);
    for (const o of overdue) {
      const days = daysBetween(new Date(o.sentAt), now);
      console.log(`    - ${o.venue} <${o.to}> — ${days} days ago`);
    }
  }

  if (bounced.length > 0) {
    console.log(`\n  BOUNCED (${bounced.length}):`);
    for (const b of bounced) {
      console.log(`    - ${b.venue} <${b.to}>`);
    }
  }

  console.log('');
}

// ═══════════════════════════════════════════════════════════════
// TELEGRAM REPORT (for integration)
// ═══════════════════════════════════════════════════════════════

export function buildOutreachBriefing(): string {
  const tracking = loadTracking();
  const now = new Date();

  const sent = tracking.filter(t => t.status === 'sent');
  const bounced = tracking.filter(t => t.bounced);
  const humanReplies = tracking.filter(t => t.replyType === 'human');
  const delivered = sent.length - bounced.length;

  const overdue = sent.filter(t => {
    if (t.bounced || t.replyReceived || t.followUpSent) return false;
    return daysBetween(new Date(t.sentAt), now) >= 7;
  });

  const lines: string[] = [];
  lines.push(`\n🎵 **OUTREACH PIPELINE:**`);
  lines.push(`📧 ${sent.length} sent | ${bounced.length} bounced | ${delivered} delivered`);
  lines.push(`💬 ${humanReplies.length} replies (${delivered > 0 ? ((humanReplies.length / delivered) * 100).toFixed(1) : 0}% rate)`);

  if (overdue.length > 0) {
    lines.push(`\n⏰ **${overdue.length} venues need follow-up:**`);
    for (const o of overdue.slice(0, 5)) {
      const days = daysBetween(new Date(o.sentAt), now);
      lines.push(`  • ${o.venue} (${days}d ago)`);
    }
    if (overdue.length > 5) lines.push(`  ... and ${overdue.length - 5} more`);
    lines.push(`\nRun: \`npx tsx scripts/outreach-auto.ts full --send\``);
  }

  if (humanReplies.length > 0) {
    lines.push(`\n🎉 **Replies to action:**`);
    for (const r of humanReplies) {
      lines.push(`  • ${r.venue}: ${r.replyPreview?.substring(0, 80) || 'check Gmail'}`);
    }
  }

  return lines.join('\n');
}

// ═══════════════════════════════════════════════════════════════
// MAIN CLI
// ═══════════════════════════════════════════════════════════════

async function main() {
  const command = process.argv[2] || 'report';
  const flags = process.argv.slice(3);
  const doSend = flags.includes('--send');
  const daysBack = parseInt(flags.find(f => f.startsWith('--days='))?.split('=')[1] || '30');

  switch (command) {
    case 'check':
      await runCheck(daysBack);
      break;

    case 'followup':
      await runFollowUp(doSend);
      break;

    case 'full':
      await runCheck(daysBack);
      await runFollowUp(doSend);
      break;

    case 'send': {
      // Send the most recent auto-followup file
      const files = fs.readdirSync(FOLLOWUP_DIR)
        .filter(f => f.startsWith('auto-followup-'))
        .sort()
        .reverse();

      if (files.length === 0) {
        console.log('No follow-up files found. Run "followup" first.');
        break;
      }

      const latest = path.join(FOLLOWUP_DIR, files[0]);
      console.log(`Sending from: ${latest}`);
      const followUps: FollowUpEmail[] = JSON.parse(fs.readFileSync(latest, 'utf-8'));
      await sendFollowUps(followUps);
      break;
    }

    case 'report':
      runReport();
      break;

    default:
      console.log(`
FLUTUR OUTREACH AUTOMATOR

Commands:
  check              Scan Gmail inbox, update tracking.json with replies/bounces
  followup           Generate follow-up emails (dry run)
  followup --send    Generate AND send follow-ups
  full               check + followup (dry run)
  full --send        check + followup + send
  send               Send most recent generated follow-ups
  report             Pipeline summary from tracking.json

Options:
  --days=N           Days to look back in inbox (default: 30)
  --send             Actually send emails (otherwise dry run)

Examples:
  npx tsx scripts/outreach-auto.ts check
  npx tsx scripts/outreach-auto.ts full --send
  npx tsx scripts/outreach-auto.ts report
`);
  }
}

main().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
