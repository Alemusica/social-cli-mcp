#!/usr/bin/env npx tsx
/**
 * Generate outreach emails from Deep Research venues
 * Filters for valid emails and generates targeted pitches
 */

import * as fs from 'fs';

interface DeepResearchVenue {
  name: string;
  location: string;
  country: string;
  website: string;
  email: string;
  type: string;
  whyFit: string;
  bookingWindow: string;
  tier: number;
  socialProof: string;
  source: string;
}

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
  strategy: string;
  generatedAt: string;
}

// Videos for different contexts
const VIDEOS = {
  efthymia: 'https://www.youtube.com/watch?v=P2lJjO_vEv4',
  whoIsFlutur: 'https://www.youtube.com/watch?v=rmnShcDsBBY',
  fatherOcean: 'https://www.youtube.com/watch?v=XwQp8Z1LHMM',
  transcendence: 'https://www.youtube.com/watch?v=Wjr6RPDhLRQ',
  chaseTheSun: 'https://www.youtube.com/watch?v=vH-M_n0aQwE',
  ggt: 'https://www.youtube.com/watch?v=n9aP-YSWwPg',
};

const LINKTREE = 'https://linktr.ee/flutur';

// Check if email is valid for outreach
function isValidEmail(email: string): boolean {
  if (!email) return false;
  const invalid = [
    'instagram:', 'website_form', 'website_application', 'via_',
    'facebook', 'eventbrite:', 'social_media', 'app.', 'whatsapp:',
    '.com/contact', 'pyramidyoga.com/contact', 'maladhara.com/contact'
  ];
  return !invalid.some(x => email.toLowerCase().includes(x));
}

// Generate email based on venue type and country
function generateEmail(venue: DeepResearchVenue): { subject: string; body: string; strategy: string; video: string } {
  const isItalian = venue.country === 'Italy';
  const isSpanish = venue.country === 'Spain' && venue.location.toLowerCase().includes('ibiza');

  // ═══════════════════════════════════════════════════════════════
  // ECSTATIC DANCE
  // ═══════════════════════════════════════════════════════════════
  if (venue.type === 'ecstatic_dance') {
    if (isItalian) {
      return {
        strategy: 'ECSTATIC_DANCE_IT',
        video: VIDEOS.efthymia,
        subject: `Live Set per Ecstatic Dance | RAV Vast + Live Looping`,
        body: `
<p>Ciao,</p>

<p>Suono RAV Vast + live looping per ecstatic dance - dal warm-up meditativo al picco energetico. 4 anni di residenza sunset in hotel di lusso.</p>

<p>→ <a href="${VIDEOS.efthymia}">Demo sound journey</a></p>

<p>Disponibile 2026. Anche workshop RAV Vast / sound healing se interessati.</p>

<p>Flutur<br>
RAV Vast Endorsed Artist<br>
<a href="${LINKTREE}">linktr.ee/flutur</a></p>
        `.trim()
      };
    }
    return {
      strategy: 'ECSTATIC_DANCE_EN',
      video: VIDEOS.efthymia,
      subject: `Live Set for Ecstatic Dance | RAV Vast + Live Looping`,
      body: `
<p>Hi,</p>

<p>I perform RAV Vast + live looping for ecstatic dance - from meditative warm-up to peak energy. 4-year sunset residency at luxury hotel.</p>

<p>→ <a href="${VIDEOS.efthymia}">Sound journey demo</a></p>

<p>Available 2026. Also offer RAV Vast / sound healing workshops if interested.</p>

<p>Flutur<br>
RAV Vast Endorsed Artist<br>
<a href="${LINKTREE}">linktr.ee/flutur</a></p>
      `.trim()
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // FESTIVALS
  // ═══════════════════════════════════════════════════════════════
  if (venue.type === 'festival') {
    const festivalName = venue.name.replace(/Festival|Fest/gi, '').trim();
    if (isItalian) {
      return {
        strategy: 'FESTIVAL_IT',
        video: VIDEOS.whoIsFlutur,
        subject: `Artist Application | ${festivalName} 2026`,
        body: `
<p>Buongiorno,</p>

<p>Mi candido per ${venue.name} 2026.</p>

<p><strong>Chi sono:</strong></p>
<ul>
  <li>RAV Vast Endorsed Artist</li>
  <li>Greece's Got Talent - 4 SÌ</li>
  <li>Main stage @ Drishti Beats Festival (Aspen, Colorado)</li>
  <li>4 anni residenza sunset in hotel 5 stelle</li>
</ul>

<p>→ <a href="${VIDEOS.whoIsFlutur}">La mia storia (3 min)</a></p>

<p>Propongo: Sunset ceremony + opzionale workshop sound healing.</p>

<p>Flutur<br>
<a href="${LINKTREE}">linktr.ee/flutur</a></p>
        `.trim()
      };
    }
    return {
      strategy: 'FESTIVAL_EN',
      video: VIDEOS.whoIsFlutur,
      subject: `Artist Application | ${festivalName} 2026`,
      body: `
<p>Hi,</p>

<p>Applying for ${venue.name} 2026.</p>

<p><strong>Credentials:</strong></p>
<ul>
  <li>RAV Vast Endorsed Artist</li>
  <li>Greece's Got Talent - 4 YES votes</li>
  <li>Main stage @ Drishti Beats Festival (Aspen, Colorado)</li>
  <li>4-year sunset residency at 5-star hotel</li>
</ul>

<p>→ <a href="${VIDEOS.whoIsFlutur}">My story (3 min)</a></p>

<p>Offering: Sunset ceremony + optional sound healing workshop.</p>

<p>Flutur<br>
<a href="${LINKTREE}">linktr.ee/flutur</a></p>
      `.trim()
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // RETREATS
  // ═══════════════════════════════════════════════════════════════
  if (venue.type === 'retreat') {
    if (isItalian) {
      return {
        strategy: 'RETREAT_IT',
        video: VIDEOS.efthymia,
        subject: `Sound Journey per Retreat | RAV Vast`,
        body: `
<p>Buongiorno,</p>

<p>Creo sound journey con RAV Vast per retreat - 4 anni di esperienza in setting di lusso con ospiti wellness.</p>

<p>→ <a href="${VIDEOS.efthymia}">Sessione meditativa</a></p>

<p>Disponibile per collaborazioni 2026. Anche workshop intro al RAV Vast.</p>

<p>Flutur<br>
RAV Vast Endorsed Artist<br>
<a href="${LINKTREE}">linktr.ee/flutur</a></p>
        `.trim()
      };
    }
    return {
      strategy: 'RETREAT_EN',
      video: VIDEOS.efthymia,
      subject: `Sound Journey for Retreats | RAV Vast`,
      body: `
<p>Hi,</p>

<p>I create sound journeys with RAV Vast for retreats - 4 years experience in luxury wellness settings.</p>

<p>→ <a href="${VIDEOS.efthymia}">Meditation session</a></p>

<p>Available for 2026 collaborations. Also offer RAV Vast intro workshops.</p>

<p>Flutur<br>
RAV Vast Endorsed Artist<br>
<a href="${LINKTREE}">linktr.ee/flutur</a></p>
      `.trim()
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // BEACH CLUBS
  // ═══════════════════════════════════════════════════════════════
  if (venue.type === 'beach_club') {
    if (isItalian) {
      return {
        strategy: 'BEACH_CLUB_IT',
        video: VIDEOS.fatherOcean,
        subject: `Sunset Sessions Live | RAV Vast + Looping`,
        body: `
<p>Buongiorno,</p>

<p>Greece's Got Talent (4 SÌ). 4 anni residenza sunset a Villa Porta (Lago Maggiore). RAV Vast + live looping per aperitivo e sunset.</p>

<p>→ <a href="${VIDEOS.fatherOcean}">Demo sunset session</a></p>

<p>Disponibile stagione 2026.</p>

<p>Flutur<br>
<a href="${LINKTREE}">linktr.ee/flutur</a></p>
        `.trim()
      };
    }
    return {
      strategy: 'BEACH_CLUB_EN',
      video: VIDEOS.fatherOcean,
      subject: `Sunset Sessions Live | RAV Vast + Looping`,
      body: `
<p>Hi,</p>

<p>Greece's Got Talent (4 YES). 4-year sunset residency at Villa Porta (Lake Maggiore). RAV Vast + live looping for aperitivo and sunset.</p>

<p>→ <a href="${VIDEOS.fatherOcean}">Sunset session demo</a></p>

<p>Available 2026 season.</p>

<p>Flutur<br>
<a href="${LINKTREE}">linktr.ee/flutur</a></p>
      `.trim()
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // HOTELS
  // ═══════════════════════════════════════════════════════════════
  if (venue.type === 'hotel') {
    return {
      strategy: 'HOTEL_EN',
      video: VIDEOS.fatherOcean,
      subject: `Guest Experience | Sunset Sound Journey`,
      body: `
<p>Hi,</p>

<p>I'm a sound journey artist with 4-year residency at Villa Porta, a luxury Lake Maggiore hotel - creating sunset ceremonies for guests.</p>

<p>→ <a href="${VIDEOS.fatherOcean}">Demo session</a></p>

<p>Exploring opportunities for 2026. Setup is minimal and self-contained.</p>

<p>Flutur<br>
RAV Vast Endorsed Artist<br>
<a href="${LINKTREE}">linktr.ee/flutur</a></p>
      `.trim()
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // UNIQUE VENUES (caves, amphitheaters, etc.)
  // ═══════════════════════════════════════════════════════════════
  if (venue.type === 'unique_venue') {
    if (isItalian) {
      return {
        strategy: 'UNIQUE_IT',
        video: VIDEOS.transcendence,
        subject: `Live Performance | RAV Vast + Live Looping`,
        body: `
<p>Buongiorno,</p>

<p>Il vostro spazio sembra perfetto per il mio sound - RAV Vast + live looping. Greece's Got Talent (4 SÌ), main stage al Drishti Beats Festival.</p>

<p>→ <a href="${VIDEOS.transcendence}">Demo live performance</a></p>

<p>Disponibile 2026.</p>

<p>Flutur<br>
RAV Vast Endorsed Artist<br>
<a href="${LINKTREE}">linktr.ee/flutur</a></p>
        `.trim()
      };
    }
    return {
      strategy: 'UNIQUE_EN',
      video: VIDEOS.transcendence,
      subject: `Live Performance | RAV Vast + Live Looping`,
      body: `
<p>Hi,</p>

<p>Your venue seems perfect for my sound - RAV Vast + live looping. Greece's Got Talent (4 YES), main stage at Drishti Beats Festival (Aspen, CO).</p>

<p>→ <a href="${VIDEOS.transcendence}">Live performance demo</a></p>

<p>Available 2026.</p>

<p>Flutur<br>
RAV Vast Endorsed Artist<br>
<a href="${LINKTREE}">linktr.ee/flutur</a></p>
      `.trim()
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // DEFAULT
  // ═══════════════════════════════════════════════════════════════
  return {
    strategy: 'DEFAULT_EN',
    video: VIDEOS.whoIsFlutur,
    subject: `Live Performance Inquiry | RAV Vast Artist`,
    body: `
<p>Hi,</p>

<p>RAV Vast Endorsed Artist. 4-year sunset residency at luxury hotel. Greece's Got Talent (4 YES). Main stage at Drishti Beats Festival.</p>

<p>→ <a href="${VIDEOS.whoIsFlutur}">My story (3 min)</a></p>

<p>Exploring opportunities for 2026.</p>

<p>Flutur<br>
<a href="${LINKTREE}">linktr.ee/flutur</a></p>
    `.trim()
  };
}

async function main() {
  // Load venues
  const inputFile = process.argv[2] || 'content/outreach/venues/deep-research-2026-01-27.json';
  const venues: DeepResearchVenue[] = JSON.parse(fs.readFileSync(inputFile, 'utf-8'));

  console.log(`\n📂 Loaded ${venues.length} venues from ${inputFile}\n`);

  // Filter for valid emails only
  const venuesWithEmail = venues.filter(v => isValidEmail(v.email));
  console.log(`📧 ${venuesWithEmail.length} venues have valid email addresses\n`);

  // Show skipped venues (no valid email)
  const skipped = venues.filter(v => !isValidEmail(v.email));
  if (skipped.length > 0) {
    console.log(`⏭️  Skipped (no valid email):`);
    skipped.forEach(v => console.log(`   - ${v.name}: ${v.email || 'no email'}`));
    console.log('');
  }

  // Generate emails
  const emails: OutreachEmail[] = [];
  for (const venue of venuesWithEmail) {
    const { subject, body, strategy, video } = generateEmail(venue);
    const city = venue.location.split(',')[0].trim();

    emails.push({
      id: `dr-${venue.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}`,
      venue: venue.name,
      city,
      country: venue.country,
      type: venue.type,
      tier: venue.tier,
      to: venue.email,
      subject,
      body,
      video,
      strategy,
      generatedAt: new Date().toISOString(),
    });
  }

  // Sort by tier
  emails.sort((a, b) => a.tier - b.tier);

  // Save all
  const outDir = 'content/outreach/generated';
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `${outDir}/deep-research-outreach-${timestamp}.json`;
  fs.writeFileSync(filename, JSON.stringify(emails, null, 2));
  console.log(`\n✅ Saved ${emails.length} emails: ${filename}`);

  // Save Tier 1 only
  const tier1 = emails.filter(e => e.tier === 1);
  const tier1File = `${outDir}/deep-research-tier1-${timestamp}.json`;
  fs.writeFileSync(tier1File, JSON.stringify(tier1, null, 2));
  console.log(`✅ Tier 1 (${tier1.length} emails): ${tier1File}`);

  // Print stats
  console.log('\n' + '═'.repeat(60));
  console.log('DEEP RESEARCH OUTREACH SUMMARY');
  console.log('═'.repeat(60));

  console.log(`\n📧 ${emails.length} emails generated\n`);

  // By country
  const byCountry: Record<string, number> = {};
  emails.forEach(e => { byCountry[e.country] = (byCountry[e.country] || 0) + 1; });
  console.log('🌍 BY COUNTRY:');
  Object.entries(byCountry).sort((a, b) => b[1] - a[1]).forEach(([c, n]) => console.log(`   ${c}: ${n}`));

  // By type
  const byType: Record<string, number> = {};
  emails.forEach(e => { byType[e.type] = (byType[e.type] || 0) + 1; });
  console.log('\n🏷️  BY TYPE:');
  Object.entries(byType).sort((a, b) => b[1] - a[1]).forEach(([t, n]) => console.log(`   ${t}: ${n}`));

  // By tier
  console.log('\n⭐ BY TIER:');
  [1, 2, 3].forEach(tier => {
    const count = emails.filter(e => e.tier === tier).length;
    console.log(`   Tier ${tier}: ${count}`);
  });

  // List Tier 1
  console.log('\n📋 TIER 1 EMAILS (Cold Email OK):');
  tier1.forEach((e, i) => {
    console.log(`${i + 1}. ${e.venue} (${e.country}) → ${e.to}`);
  });

  console.log('\n' + '═'.repeat(60));
  console.log(`\nNext: npx tsx scripts/send-outreach.ts preview ${tier1File}`);
}

main().catch(console.error);
