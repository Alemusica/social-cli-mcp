#!/usr/bin/env npx tsx
/**
 * Persist Gulf (Qatar/UAE/Saudi) Deep Research into Agent Memory System
 * Department: marketing (venue outreach, market intelligence)
 */

import { memory } from '../src/agents/memory/index.js';
import { closeDb } from '../src/db/client.js';

async function main() {
  const sessionId = await memory.save({
    agentId: 'deep-research',
    department: 'marketing',
    trigger: 'deep-research:gulf-market-2026',
    entitiesTouched: [
      {
        id: 'market:gulf',
        type: 'market',
        label: 'Gulf (Qatar/UAE/Saudi)',
        context: '4,033 organic YT views — real demand signal',
        attrs: {
          yt_views_qatar: '3,118 (16% of total channel)',
          yt_views_uae: '551',
          yt_views_saudi: '364',
          season: 'October–April (peak Nov–Mar)',
          ramadan_2026: 'Feb 19 – Mar 20 (ambient PERMITTED, suhoor booking)',
          hotel_residency_fee: 'AED 8,000–15,000/month + free accom/meals/visa',
          private_event_fee: 'AED 2,000–5,000 per event',
          sound_healing_fee: 'AED 200–500/participant group, AED 700+ private',
          competition: 'thin (4 handpan players in UAE)',
          travel_rome_dubai: '5h40min direct, €300–850 RT',
          ata_carnet: 'ESSENTIAL for duty-free equipment import',
        },
        sigma2: [
          'Gulf organic views (4,033) from ZERO targeting — real demand, not marketing artifact',
          'Ramadan = opportunity NOT obstacle: instrumental/ambient explicitly permitted for suhoor',
          'Self-contained = biggest advantage: eliminates sound engineer + backline negotiations',
          'RAV Vast "B Arabian Night" scale exists — manufacturer validated regional interest',
          'Hotel residency model: AED 8K-15K/month + accommodation + meals + visa = low risk entry',
          'Italian expat community (15,000 in UAE) + IIC Abu Dhabi = networking infrastructure',
        ],
      },
      {
        id: 'market:qatar',
        type: 'market',
        label: 'Qatar',
        context: 'Highest priority — 3,118 views, post-FIFA infrastructure',
        attrs: {
          yt_views: '3,118 (16% of channel)',
          infrastructure: 'post-FIFA 2022 world-class',
          visa: 'work visa sponsored by employer, 30-day tourist visa-on-arrival',
        },
        sigma2: ['Qatar = entry point for Gulf (strongest organic signal + best infrastructure)'],
      },
      {
        id: 'venue:banana_island_anantara',
        type: 'resort',
        label: 'Banana Island Resort by Anantara',
        context: 'Doha — STRONGEST single lead in Qatar',
        attrs: {
          booking: 'already hosts Yoga & Sound Healing Retreats (Daniel Matallana)',
          spa: "Middle East's only island wellness centre",
          phone: '+974 4040 5043',
          email: 'reservations.doha@anantara.com',
        },
        sigma2: ['Already books EXACTLY what FLUTUR offers — highest probability Qatar lead'],
      },
      {
        id: 'venue:st_regis_doha_sax',
        type: 'hotel-venue',
        label: 'SAX at St. Regis Doha',
        context: '"Home of live music in the Middle East"',
        attrs: {
          venues: '15 dining/lounge venues',
          phone: '+974 444-60000',
          vibe: 'refined lounge, low-lit, leather-chair',
        },
        sigma2: [],
      },
      {
        id: 'venue:zulal_wellness_resort',
        type: 'destination-spa',
        label: 'Zulal Wellness Resort by Chiva-Som',
        context: 'Northern Qatar — first destination spa',
        attrs: {
          focus: 'Traditional Arabic & Islamic Medicine + holistic wellness',
          opportunity: 'ambient music residency or retreat collaboration',
        },
        sigma2: [],
      },
      {
        id: 'venue:azure_beach_doha',
        type: 'beach-club',
        label: 'Azure Beach',
        context: 'Qetaifan Island North, Doha',
        attrs: {
          phone: '+974 7080 7326',
          email: 'info@azure-beach.com',
          feature: 'infinity pool, live entertainment + resident DJs',
        },
        sigma2: [],
      },
      {
        id: 'venue:katara_cultural_village',
        type: 'cultural-hub',
        label: 'Katara Cultural Village',
        context: "Qatar's premier cultural hub",
        attrs: {
          capacity_amphitheatre: '5,000',
          capacity_opera: '550',
          operator: 'Cultural Village Foundation',
        },
        sigma2: [],
      },
      {
        id: 'venue:playa_jbr',
        type: 'beach-club',
        label: 'Playa at La Vie JBR',
        context: 'Dubai',
        attrs: {
          ethos: '"mellow shamanic beats from live music and DJ sets"',
        },
        sigma2: ['Venue ethos EXPLICITLY aligned with handpan/ambient aesthetics'],
      },
      {
        id: 'venue:palazzo_versace_qs',
        type: 'hotel-venue',
        label: "Q's Bar and Lounge (Palazzo Versace)",
        context: 'Dubai — founded by Quincy Jones',
        attrs: {
          award: '"Best Live Music Bar" in Dubai',
          schedule: 'Wed–Sun 7 PM – 1 AM',
          booking: 'handpicked emerging artists, intimate performances',
        },
        sigma2: [],
      },
      {
        id: 'venue:alula',
        type: 'destination',
        label: 'AlUla',
        context: 'Saudi Arabia — strongest single opportunity',
        attrs: {
          festival: 'AlUla Wellness Festival (Oct–Nov)',
          precedent: 'handpan lessons by Valentina Avdeeva',
          program: '"Whispers in the Canyon" sound bath ceremonies',
          azimuth: 'AZIMUTH Festival booked Christian Löffler + Shkoon (ambient electronic)',
          contact: 'experiencealula.com',
        },
        sigma2: ['AlUla already featured handpan + sound bath ceremonies in resonant canyons'],
      },
      {
        id: 'venue:amaala',
        type: 'mega-resort',
        label: 'AMAALA Triple Bay',
        context: 'Saudi Arabia — "new home for wellness in the world"',
        attrs: {
          resorts: 'Six Senses, Equinox, Rosewood, Nammos, Clinique La Prairie',
          pr_contact: 'Reem.Aljbreen@RedSeaGlobal.com',
          max_visitors: '500,000/year',
        },
        sigma2: ['Ultra-luxury wellness resorts opening NOW — need entertainment programming'],
      },
      {
        id: 'venue:sharjah_art_foundation',
        type: 'cultural-institution',
        label: 'Sharjah Art Foundation',
        context: 'Sharjah, UAE — best cultural fit',
        attrs: {
          program: 'Perform Sharjah (Oct–Dec)',
          music: '"traditional and experimental musical forms"',
          note: 'dry emirate — purely cultural, no nightlife',
          contact: 'sharjahart.org',
        },
        sigma2: [],
      },
      {
        id: 'agency:scarlett_entertainment',
        type: 'booking-agency',
        label: 'Scarlett Entertainment',
        context: 'Dubai/Doha — 16,000+ entertainers',
        attrs: {
          years_qatar: '12',
          handpan: 'already represents handpan acts',
          website: 'scarlettentertainment.com',
        },
        sigma2: [],
      },
      {
        id: 'agency:artist_related_group',
        type: 'booking-agency',
        label: 'Artist Related Group',
        context: 'Dubai — hotel residency specialist',
        attrs: {
          phone: '+971 556257012',
          email: 'info@artistrelatedgroup.com',
          specialty: 'hotel residencies, weekly/seasonal programs',
        },
        sigma2: [],
      },
      {
        id: 'agency:vento_entertainment',
        type: 'booking-agency',
        label: 'Vento Entertainment',
        context: 'Dubai — already represents handpan player',
        attrs: {
          email: 'info@ventoentertainment.com',
          phone: '+971 557736747',
        },
        sigma2: [],
      },
      {
        id: 'contact:iic_abu_dhabi',
        type: 'institution',
        label: 'Italian Cultural Institute Abu Dhabi',
        context: 'Only Italian govt cultural center in Gulf',
        attrs: {
          website: 'iicabudhabi.esteri.it',
          precedent: 'hosted Paolo Fresu concerts',
        },
        sigma2: [],
      },
      {
        id: 'contact:shamanic_ae',
        type: 'retail',
        label: 'Shamanic.ae',
        context: 'Dubai — physical store selling RAV Vast',
        attrs: {
          products: 'RAV Vast, RAV Moon, RAV Anima',
        },
        sigma2: ['Physical RAV Vast retail in Dubai = direct evidence of local demand'],
      },
    ],
    decisions: [
      {
        content: 'Qatar = Gulf entry point (3,118 views, 16% of channel, best infrastructure)',
        entities: ['market:qatar', 'market:gulf'],
        rationale: 'Strongest organic signal + post-FIFA world-class venues',
        date: '2026-02-07',
      },
      {
        content: 'Gulf booking path: agencies FIRST (Scarlett, Artist Related Group, Vento, Talent Factory)',
        entities: ['market:gulf', 'agency:scarlett_entertainment', 'agency:artist_related_group', 'agency:vento_entertainment'],
        rationale: 'Hotel residency model is proven and low-risk. Agencies handle visa + accommodation.',
        date: '2026-02-07',
      },
      {
        content: 'Banana Island Anantara Doha = FIRST venue contact (already books sound healing)',
        entities: ['venue:banana_island_anantara', 'market:qatar'],
        rationale: 'They already host exactly what FLUTUR offers — lowest friction lead',
        date: '2026-02-07',
      },
      {
        content: 'Gulf positioning: hotel residency (AED 8K-15K/month + accom) over one-off gigs',
        entities: ['market:gulf'],
        rationale: 'Residency = visa + housing + meals solved. Self-contained setup = key advantage.',
        date: '2026-02-07',
      },
      {
        content: 'Ramadan = booking opportunity (suhoor entertainment 9:30 PM – 3 AM, ambient permitted)',
        entities: ['market:gulf'],
        rationale: 'Most entertainment stops during Ramadan but instrumental/ambient explicitly allowed',
        date: '2026-02-07',
      },
      {
        content: 'ATA Carnet ESSENTIAL before any Gulf trip (Camera di Commercio, duty-free equipment import)',
        entities: ['market:gulf'],
        rationale: 'Without it, UAE requires cash/bank guarantee for customs duties',
        date: '2026-02-07',
      },
      {
        content: 'AlUla (Saudi) = strongest single opportunity in KSA — handpan already featured',
        entities: ['venue:alula', 'market:gulf'],
        rationale: 'Wellness Festival featured Valentina Avdeeva handpan + canyon sound baths',
        date: '2026-02-07',
      },
    ],
    observations: [
      { content: 'Gulf YT organic: Qatar 3,118 + UAE 551 + Saudi 364 = 4,033 views from ZERO targeting', sigma: 'σ₂' },
      { content: 'Only 4 handpan performers active in entire UAE — market validated but competition thin', sigma: 'σ₂' },
      { content: 'RAV Vast "B Arabian Night" scale exists — manufacturer confirmed regional demand', sigma: 'σ₂' },
      { content: 'Playa JBR explicitly uses "mellow shamanic beats" — venue ethos IS handpan/ambient', sigma: 'σ₁' },
      { content: 'Beyond Wellness floating sound healing = sell-out permanent fixture at One&Only Royal Mirage', sigma: 'σ₁' },
      { content: 'Saadiyat Nights (Abu Dhabi) booked Max Richter + Ludovico Einaudi — ambient/neo-classical appetite proven', sigma: 'σ₂' },
      { content: 'Saudi entertainment: 0 → 5,526 licensed events in 2024, projected $4.9-6.1B by 2030', sigma: 'σ₁' },
      { content: 'AMAALA opening NOW: Six Senses, Equinox, Rosewood — all need wellness entertainment', sigma: 'σ₂' },
      { content: 'Wynn Al Marjan Island (RAK): $5.1B, 900-seat theater, Spring 2027 — build relationships NOW', sigma: 'σ₁' },
      { content: '15,000 Italian expats in UAE + IIC Abu Dhabi (hosted Paolo Fresu) = networking infrastructure', sigma: 'σ₁' },
      { content: 'UAE Cultural Golden Visa (10 years) available to musicians — 5+ years experience required', sigma: 'σ₁' },
    ],
    actions: [
      {
        description: 'Deep Research completed: Gulf market (Qatar/UAE/Saudi) strategic guide',
        target: 'market:gulf',
        result: 'content/outreach/deep-research/gulf-market-2026.md',
        date: '2026-02-07',
      },
    ],
  });

  console.log('✅ Gulf intelligence persisted. Session:', sessionId);

  // Verify
  const gulf = await memory.queryEntity('market:gulf');
  console.log('\n📊 market:gulf — intelligence:');
  console.log('  Departments:', gulf?.departments.join(', '));
  console.log('  Decisions:', gulf?.decisions.length);
  console.log('  Observations:', gulf?.observations.length);

  const qatar = await memory.queryEntity('market:qatar');
  console.log('\n📊 market:qatar — intelligence:');
  console.log('  Departments:', qatar?.departments.join(', '));
  console.log('  Decisions:', qatar?.decisions.length);

  // Show all shared entities (cross-department convergence)
  const shared = await memory.sharedEntities();
  if (shared.length > 0) {
    console.log('\n🔗 Shared entities (cross-department convergence):');
    for (const s of shared) {
      console.log(`  ${s.entity}: ${s.departments.join(' + ')} (${s.linkCount} links)`);
    }
  }

  await closeDb();
}

main().catch(err => {
  console.error('❌', err.message);
  process.exit(1);
});
