/**
 * FLUTUR OUTREACH EMAIL GENERATOR
 * Short, punchy cold emails that get responses
 *
 * Best practices:
 * - Under 100 words
 * - One video link
 * - Social proof first
 * - Clear CTA
 */

import { ALL_VENUES } from '../src/db/venues-database.js';
import { ALL_VIDEOS, type VideoData } from '../src/db/videos-database.js';
import * as fs from 'fs';

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
  videoTitle: string;
  videoPitch: string;
  strategy: string;
  generatedAt: string;
}

const transcendenceVideo = ALL_VIDEOS.find(v => v.id === 'rocca-transcendence-rav')!;
const chaseTheSunVideo = ALL_VIDEOS.find(v => v.id === 'rocca-chase-the-sun')!;
const fatherOceanVideo = ALL_VIDEOS.find(v => v.id === 'rocca-father-ocean-rav')!;
const efthymiaVideo = ALL_VIDEOS.find(v => v.id === 'efthymia')!;
const ggtVideo = ALL_VIDEOS.find(v => v.id === 'greeces-got-talent')!;
const whoIsVideo = ALL_VIDEOS.find(v => v.id === 'who-is-flutur')!;

const LINKTREE = 'https://linktr.ee/flutur';

// ═══════════════════════════════════════════════════════════════
// ITALIAN - SHORT & PUNCHY
// ═══════════════════════════════════════════════════════════════

function generateItalianEmail(venue: typeof ALL_VENUES[0]): { subject: string; body: string; strategy: string; video: VideoData } {
  const vibeStr = (venue.vibe || []).join(' ').toLowerCase();

  // BEACH / SUNSET - Scegli video in base al vibe del venue
  if (venue.type.includes('beach') || venue.type.includes('sunset') || vibeStr.includes('sunset')) {
    // Se il venue è melodic/organic/anjuna → Father Ocean
    const isMelodicVenue = vibeStr.includes('melodic') || vibeStr.includes('organic') || vibeStr.includes('anjuna') || vibeStr.includes('deep');

    if (isMelodicVenue) {
      return {
        strategy: 'SUNSET_MELODIC_IT',
        video: fatherOceanVideo,
        subject: `Sunset Sessions | RAV Vast Live`,
        body: `
<p>Buongiorno,</p>

<p>Greece's Got Talent (4 SÌ). 4 anni residenza Villa Porta, Lago Maggiore. RAV Vast + live looping.</p>

<p>→ <a href="${fatherOceanVideo.url}">RAV Vast su sound Anjunadeep</a></p>

<p>Disponibile per stagione 2026.</p>

<p>Flutur<br>
<a href="${LINKTREE}">linktr.ee/flutur</a></p>
        `.trim()
      };
    }

    // Altrimenti → Chase The Sun (nostalgia Planet Funk)
    return {
      strategy: 'SUNSET_NOSTALGIA_IT',
      video: chaseTheSunVideo,
      subject: `Sunset Sessions | Chitarra Live su Planet Funk`,
      body: `
<p>Buongiorno,</p>

<p>Greece's Got Talent (4 SÌ). 4 anni residenza Villa Porta, Lago Maggiore. Chitarra percussiva + live looping.</p>

<p>→ <a href="${chaseTheSunVideo.url}">Chase The Sun - live remix</a></p>

<p>Disponibile per stagione 2026.</p>

<p>Flutur<br>
<a href="${LINKTREE}">linktr.ee/flutur</a></p>
      `.trim()
    };
  }

  // WELLNESS / SPA
  if (venue.type.includes('wellness') || venue.type.includes('spa') || vibeStr.includes('yoga')) {
    return {
      strategy: 'SOUND_HEALING',
      video: efthymiaVideo,
      subject: `Sound Healing | RAV Vast`,
      body: `
<p>Buongiorno,</p>

<p>Creo sessioni di sound healing con RAV Vast. 4 anni di residenza in hotel 5 stelle creando esperienze meditative al tramonto.</p>

<p>→ <a href="${efthymiaVideo.url}">Sessione meditativa</a></p>

<p>Disponibile per il vostro programma wellness 2026.</p>

<p>Flutur<br>
<a href="${LINKTREE}">linktr.ee/flutur</a></p>
      `.trim()
    };
  }

  // JAZZ / MUSIC VENUE
  if (venue.type.includes('jazz') || venue.type.includes('music_venue') || venue.type.includes('concert')) {
    return {
      strategy: 'WORLD_MUSIC',
      video: transcendenceVideo,
      subject: `Live Looping | World Music`,
      body: `
<p>Buongiorno,</p>

<p>Polistrumentista, RAV Vast + chitarra + loop station. Greece's Got Talent (4 SÌ). 4 anni residenza hotel lusso.</p>

<p>→ <a href="${transcendenceVideo.url}">RAV Vast + Live Looping</a></p>

<p>Cerco date per 2026.</p>

<p>Flutur<br>
<a href="${LINKTREE}">linktr.ee/flutur</a></p>
      `.trim()
    };
  }

  // FESTIVAL
  if (venue.type.includes('festival')) {
    return {
      strategy: 'FESTIVAL_APPLICATION',
      video: whoIsVideo,
      subject: `Artist Application | Ambient/Organic Live`,
      body: `
<p>Buongiorno,</p>

<p>RAV Vast + live looping. Greece's Got Talent (4 SÌ). 4 anni residenza creando cerimonie sunset in hotel di lusso.</p>

<p>→ <a href="${whoIsVideo.url}">La mia storia (3 min)</a></p>

<p>Candidatura per ${venue.name} 2026.</p>

<p>Flutur<br>
RAV Vast Endorsed Artist</p>
      `.trim()
    };
  }

  // BOUTIQUE HOTEL / ROOFTOP (default)
  return {
    strategy: 'BOUTIQUE_SUNSET',
    video: transcendenceVideo,
    subject: `Musica Ambient | Aperitivo & Sunset`,
    body: `
<p>Buongiorno,</p>

<p>4 anni artista residente Villa Porta (Lago Maggiore). RAV Vast + live looping per aperitivo e sunset sessions.</p>

<p>→ <a href="${transcendenceVideo.url}">Il mio sound</a></p>

<p>Esploro collaborazioni per stagione 2026.</p>

<p>Flutur<br>
<a href="${LINKTREE}">linktr.ee/flutur</a></p>
    `.trim()
  };
}

// ═══════════════════════════════════════════════════════════════
// ENGLISH - SHORT & PUNCHY
// ═══════════════════════════════════════════════════════════════

function generateEnglishEmail(venue: typeof ALL_VENUES[0]): { subject: string; body: string; strategy: string; video: VideoData } {
  const vibeStr = (venue.vibe || []).join(' ').toLowerCase();

  // BEACH / SUNSET - Father Ocean (Anjunadeep vibe) per beach club internazionali
  if (venue.type.includes('beach') || venue.type.includes('sunset') || vibeStr.includes('sunset')) {
    return {
      strategy: 'SUNSET_SESSION_INTL',
      video: fatherOceanVideo,
      subject: `Sunset Sessions | RAV Vast Live`,
      body: `
<p>Hi,</p>

<p>Greece's Got Talent (4 YES). 4-year residency at luxury Lake Maggiore hotel. RAV Vast + live looping.</p>

<p>→ <a href="${fatherOceanVideo.url}">RAV Vast on Anjunadeep sound</a></p>

<p>Available for 2026 season.</p>

<p>Flutur<br>
<a href="${LINKTREE}">linktr.ee/flutur</a></p>
      `.trim()
    };
  }

  // WELLNESS / SPA
  if (venue.type.includes('wellness') || venue.type.includes('spa') || vibeStr.includes('yoga')) {
    return {
      strategy: 'SOUND_HEALING',
      video: efthymiaVideo,
      subject: `Sound Healing | RAV Vast`,
      body: `
<p>Hi,</p>

<p>I create sound healing sessions with RAV Vast. 4-year residency at 5-star hotel creating sunset meditation experiences.</p>

<p>→ <a href="${efthymiaVideo.url}">Meditation session</a></p>

<p>Available for your 2026 wellness program.</p>

<p>Flutur<br>
<a href="${LINKTREE}">linktr.ee/flutur</a></p>
      `.trim()
    };
  }

  // JAZZ / MUSIC VENUE
  if (venue.type.includes('jazz') || venue.type.includes('music_venue') || venue.type.includes('concert')) {
    return {
      strategy: 'WORLD_MUSIC',
      video: transcendenceVideo,
      subject: `Live Looping | World Music`,
      body: `
<p>Hi,</p>

<p>Multi-instrumentalist. RAV Vast + guitar + loop station. Greece's Got Talent (4 YES). 4-year luxury hotel residency.</p>

<p>→ <a href="${transcendenceVideo.url}">RAV Vast + Live Looping</a></p>

<p>Looking for 2026 dates.</p>

<p>Flutur<br>
<a href="${LINKTREE}">linktr.ee/flutur</a></p>
      `.trim()
    };
  }

  // FESTIVAL
  if (venue.type.includes('festival')) {
    return {
      strategy: 'FESTIVAL_APPLICATION',
      video: whoIsVideo,
      subject: `Artist Application | Ambient/Organic Live`,
      body: `
<p>Hi,</p>

<p>RAV Vast + live looping. Greece's Got Talent (4 YES). 4-year residency creating sunset ceremonies at luxury hotel.</p>

<p>→ <a href="${whoIsVideo.url}">My story (3 min)</a></p>

<p>Applying for ${venue.name} 2026.</p>

<p>Flutur<br>
RAV Vast Endorsed Artist</p>
      `.trim()
    };
  }

  // BOUTIQUE HOTEL / ROOFTOP (default)
  return {
    strategy: 'BOUTIQUE_SUNSET',
    video: transcendenceVideo,
    subject: `Ambient Music | Aperitivo & Sunset`,
    body: `
<p>Hi,</p>

<p>4-year resident artist at Villa Porta (Lake Maggiore). RAV Vast + live looping for aperitivo and sunset sessions.</p>

<p>→ <a href="${transcendenceVideo.url}">My sound</a></p>

<p>Exploring collaborations for 2026 season.</p>

<p>Flutur<br>
<a href="${LINKTREE}">linktr.ee/flutur</a></p>
    `.trim()
  };
}

// ═══════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════

function generateEmail(venue: typeof ALL_VENUES[0]) {
  return venue.country === 'Italy' ? generateItalianEmail(venue) : generateEnglishEmail(venue);
}

function generateAllEmails(): OutreachEmail[] {
  const venuesWithEmail = ALL_VENUES.filter(v => v.email);
  const emails: OutreachEmail[] = [];

  for (const venue of venuesWithEmail) {
    const { subject, body, strategy, video } = generateEmail(venue);
    emails.push({
      id: `${venue.country.toLowerCase()}-${venue.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}`,
      venue: venue.name,
      city: venue.city,
      country: venue.country,
      type: venue.type,
      tier: venue.tier,
      to: venue.email!,
      subject,
      body,
      video: video.url,
      videoTitle: video.title,
      videoPitch: video.pitchAngle,
      strategy,
      generatedAt: new Date().toISOString(),
    });
  }

  emails.sort((a, b) => {
    if (a.tier !== b.tier) return a.tier - b.tier;
    return a.country.localeCompare(b.country);
  });

  return emails;
}

function printStats(emails: OutreachEmail[]) {
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('FLUTUR OUTREACH - SHORT & PUNCHY');
  console.log('═══════════════════════════════════════════════════════════════\n');

  console.log(`📧 ${emails.length} emails generated\n`);

  const byCountry: Record<string, number> = {};
  emails.forEach(e => { byCountry[e.country] = (byCountry[e.country] || 0) + 1; });
  console.log('🌍 BY COUNTRY:');
  Object.entries(byCountry).sort((a, b) => b[1] - a[1]).forEach(([c, n]) => console.log(`   ${c}: ${n}`));

  const byStrategy: Record<string, number> = {};
  emails.forEach(e => { byStrategy[e.strategy] = (byStrategy[e.strategy] || 0) + 1; });
  console.log('\n🎯 BY STRATEGY:');
  Object.entries(byStrategy).sort((a, b) => b[1] - a[1]).forEach(([s, n]) => console.log(`   ${s}: ${n}`));

  console.log('\n📋 TIER 1:');
  emails.filter(e => e.tier === 1).forEach((e, i) => {
    console.log(`${i + 1}. ${e.venue} (${e.country}) → ${e.to}`);
  });
}

async function main() {
  const emails = generateAllEmails();

  const outDir = 'content/outreach/generated';
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `${outDir}/outreach-emails-${timestamp}.json`;
  fs.writeFileSync(filename, JSON.stringify(emails, null, 2));
  console.log(`\n✅ Saved: ${filename}`);

  const tier1 = emails.filter(e => e.tier === 1);
  const tier1File = `${outDir}/tier1-ready-${timestamp}.json`;
  fs.writeFileSync(tier1File, JSON.stringify(tier1, null, 2));
  console.log(`✅ Tier 1: ${tier1File}`);

  printStats(emails);
}

main().catch(console.error);
