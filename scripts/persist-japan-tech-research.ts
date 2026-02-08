#!/usr/bin/env npx tsx
/**
 * Persist Japan Tech-Focused Deep Research into Agent Memory System
 * Department: engineering (tech workshops, creative coding, Ableton API)
 * Cross-links market:japan with marketing department
 */

import { memory } from '../src/agents/memory/index.js';
import { closeDb } from '../src/db/client.js';

async function main() {
  const sessionId = await memory.save({
    agentId: 'deep-research',
    department: 'engineering',
    trigger: 'deep-research:japan-tech-workshops-2026',
    entitiesTouched: [
      {
        id: 'market:japan',
        type: 'market',
        label: 'Japan',
        context: 'Asia — tech+wellness dual runway',
        attrs: {
          first_trip_budget: '€4,400–€7,800 (investment, NOT payday)',
          best_season: 'Late Oct – mid Nov',
          jr_pass: 'NO longer worth it (70% price hike 2023)',
          visa_free_tourism: '90 days (Italy)',
          entertainment_visa: 'Category 2, needs JP sponsor, 1-3 months',
          noruma_system: 'Pay-to-play for unknown artists — AVOID live houses',
          workshop_revenue: '¥5,000–¥8,000/person, 10–15 attendees realistic',
          anniversary_2026: '160th Italy-Japan diplomatic relations',
          ableton_gap: 'ZERO Certified Training Centers in Japan',
        },
        sigma2: [
          'First trip = €4,000–€6,000 market development INVESTMENT, revenue secondary',
          'MUTEK.JP x Ableton 2025 "Digi Lab" = direct precedent for FLUTUR offering',
          'Zen2.0 at 760-year-old Kenchoji Temple: tech+spirituality convergence PROVEN',
          '2026 = 160th anniversary Italy-Japan relations — peak cultural programming',
          'No Ableton Certified Training Centers in Japan — positioning gap',
          'No practitioner combines RAV Vast + guitar + Ableton live looping in Japan',
          'RAV Vast overtones (4-7 per strike) map onto bonshō/shakuhachi tradition',
          'JR Pass NO longer worth it — use Peach/Jetstar budget airlines instead',
        ],
      },
      {
        id: 'contact:shalestone_music',
        type: 'tour-manager',
        label: 'Shalestone Music',
        context: 'Osaka — #1 lead, 80% probability',
        attrs: {
          email: 'info@shalestonemusic.jp',
          email_alt: 'booking@shalestonemusic.jp',
          since: '2006',
          genres: 'acoustic to spiritual to punk',
          services: 'booking, hotel, bilingual tour manager, transport, promo, visa assistance, workshops',
          probability: '80%',
        },
        sigma2: [
          'SINGLE most efficient path to structured first Japan tour with visa support',
          'Explicitly offers "clinics or workshops" as part of tour packages',
        ],
      },
      {
        id: 'contact:daito_manabe',
        type: 'artist-reference',
        label: 'Daito Manabe (Rhizomatiks)',
        context: 'Gold standard programmer-artist in Japan',
        attrs: {
          tools: 'custom Ableton Live tools, openFrameworks, Max/MSP',
          alma_mater: 'IAMAS',
          event: 'MUTEK.JP 2025 Digi Lab with Ableton Japan',
        },
        sigma2: ['Proves demand for programmer-artist live performance in Japan'],
      },
      {
        id: 'venue:fabcafe_tokyo',
        type: 'tech-venue',
        label: 'FabCafe Tokyo',
        context: 'Shibuya — digital fabrication café',
        attrs: {
          operator: 'Loftwork Inc.',
          frequency: 'events every 3 days',
          topics: 'creative coding, AI, maker',
          phone: '03-6416-9190',
          probability: '40%',
        },
        sigma2: [],
      },
      {
        id: 'venue:100banch',
        type: 'tech-venue',
        label: '100BANCH',
        context: 'Shibuya — Panasonic innovation hub',
        attrs: {
          events_per_year: '~150',
          festival: 'Nananana Festival (accepts creative proposals)',
        },
        sigma2: [],
      },
      {
        id: 'venue:zen2_0',
        type: 'conference',
        label: 'Zen2.0',
        context: 'Kenchoji Temple, Kamakura (760+ years old)',
        attrs: {
          mission: 'connect technology and spirituality',
          topics: 'neuroscience, tech, spiritual traditions',
          frequency: 'annual',
        },
        sigma2: ['Tech+spirituality convergence at a 760-year-old temple — perfect FLUTUR fit'],
      },
      {
        id: 'venue:ableton_meetup_tokyo',
        type: 'community',
        label: 'Ableton Meetup Tokyo',
        context: 'WOMB Lounge, Shibuya',
        attrs: {
          running_since: '10+ years',
          meetups: '54+',
          price: '¥2,000–¥3,000/attendee',
          probability: '50%',
        },
        sigma2: ['10+ year community, NO Ableton Certified Training Centers in Japan = gap'],
      },
      {
        id: 'venue:dommune',
        type: 'performance-venue',
        label: 'DOMMUNE',
        context: 'Shibuya, 50 cap, live-streamed globally',
        attrs: {
          streaming: 'global live stream',
          capacity: '~50',
        },
        sigma2: ['Ideal for filmed intimate performance — global reach from tiny room'],
      },
      {
        id: 'venue:art_bar_magayura',
        type: 'ambient-venue',
        label: 'Art bar MagaYura',
        context: 'Osaka, near JR Noda',
        attrs: {
          vibe: 'intimate ambient/improvised, no backline required',
          probability: '55%',
        },
        sigma2: [],
      },
      {
        id: 'contact:koizumi_gakki',
        type: 'instrument-shop',
        label: 'Koizumi Gakki (民族楽器コイズミ)',
        context: 'Tokyo — ethnic instrument shop',
        attrs: {
          stocks: 'RAV Vast drums',
          opportunity: 'in-store demo',
          probability: '55%',
        },
        sigma2: [],
      },
      {
        id: 'contact:iccj',
        type: 'institution',
        label: 'Italian Chamber of Commerce Japan (ICCJ)',
        context: 'Networking, cultural aperitivo events',
        attrs: {
          probability: '50%',
        },
        sigma2: [],
      },
      {
        id: 'festival:mutek_jp',
        type: 'festival',
        label: 'MUTEK.JP',
        context: 'November, Shibuya',
        attrs: {
          focus: 'electronic arts + PRO Conference',
          platform: 'Peatix for registration',
          probability: '30%',
        },
        sigma2: ['Collaborated with Ableton Japan 2025 — Digi Lab with Daito Manabe'],
      },
      {
        id: 'festival:the_labyrinth',
        type: 'festival',
        label: 'The Labyrinth',
        context: 'September, Gunma',
        attrs: {
          vibe: 'ritual/ambient forest festival',
          sound: 'Funktion One',
          lineup: 'secret, capacity-capped',
          contact: 'mindgames.jp',
        },
        sigma2: [],
      },
      {
        id: 'venue:tsukiji_honganji',
        type: 'temple',
        label: 'Tsukiji Honganji',
        context: 'Tokyo — hosted "Temple of Sound" 2023',
        attrs: {
          event: 'Temple of Sound (UK Church of Sound debut in Japan)',
          ticket_price: '¥7,500',
        },
        sigma2: ['Temple events are REAL and documented — ¥7,500 tickets for ambient in temples'],
      },
    ],
    decisions: [
      {
        content: 'First Japan trip = €4,000–€6,000 market development investment, NOT a payday',
        entities: ['market:japan'],
        rationale: 'Noruma system means unknown artists pay to play. Revenue comes trip 2+',
        date: '2026-02-07',
      },
      {
        content: 'Shalestone Music = FIRST CONTACT (80% probability, visa support, workshop packages)',
        entities: ['market:japan', 'contact:shalestone_music'],
        rationale: 'Only tour management company explicitly serving foreign indie artists with visa assistance',
        date: '2026-02-07',
      },
      {
        content: 'Tech workshop positioning: Ableton API scripting + live performance (NOT dry tutorial)',
        entities: ['market:japan', 'venue:ableton_meetup_tokyo', 'venue:fabcafe_tokyo'],
        rationale: 'MUTEK.JP x Ableton 2025 Digi Lab proves demand. Zero Certified Training Centers = gap.',
        date: '2026-02-07',
      },
      {
        content: 'RAV Vast = contemporary bonshō/shakuhachi (overtone lineage marketing for Japan)',
        entities: ['market:japan'],
        rationale: '4-7 overtones per strike maps onto millennia-old ichi-on-jō-butsu tradition',
        date: '2026-02-07',
      },
      {
        content: 'IIC Tokyo proposal: frame within 160th anniversary Italy-Japan programming',
        entities: ['market:japan', 'contact:iic_tokyo'],
        rationale: '2026 = 160th anniversary, peak cultural programming year',
        date: '2026-02-07',
      },
      {
        content: 'Skip JR Pass — use Peach/Jetstar budget airlines (Tokyo-Osaka from ¥3,100)',
        entities: ['market:japan'],
        rationale: '70% price hike in 2023 made JR Pass uneconomical',
        date: '2026-02-07',
      },
    ],
    observations: [
      { content: 'MUTEK.JP x Ableton Japan 2025 "Digi Lab": Daito Manabe demoed custom Ableton Live tools = FLUTUR exact offering', sigma: 'σ₂' },
      { content: 'Zen2.0 at 760-year-old Kenchoji Temple: world largest Zen+tech conference, proves tech+spirituality convergence', sigma: 'σ₂' },
      { content: 'Zero Ableton Certified Training Centers in Japan despite 10+ year Ableton Meetup community', sigma: 'σ₂' },
      { content: 'RAV Vast 4-7 overtones per strike maps onto bonshō temple bell tradition (atari→oshi→okuri phases)', sigma: 'σ₂' },
      { content: 'Temple events documented: Tsukiji Honganji "Temple of Sound" ¥7,500, JUHLA "テラオト" at temples in Sendagi', sigma: 'σ₂' },
      { content: 'Noruma (ノルマ) system: unknown artists sell 15-20 ticket quota or pay difference. Venue rental ¥100K-500K/night', sigma: 'σ₁' },
      { content: 'Workshop revenue best margin: ¥5,000-8,000/person × 10-15 people = ¥20K-95K net after venue. Full-day ¥100K-250K', sigma: 'σ₁' },
      { content: 'Japanese sound healing = "not spiritual, not healing" pragmatic framing (Magali Luhan). Contemporary tech adds credibility', sigma: 'σ₁' },
      { content: 'TOPLAP Japan uses SuperCollider/TidalCycles, Ableton community uses production. FLUTUR = underserved intersection', sigma: 'σ₂' },
      { content: 'Aman Tokyo commissions live entertainment through Syn Tokyo (syn.world) — music curation agency', sigma: 'σ₁' },
    ],
    actions: [
      {
        description: 'Deep Research completed: Japan tech workshops + dual runway validation',
        target: 'market:japan',
        result: 'content/outreach/deep-research/japan-tech-workshops-2026.md',
        date: '2026-02-07',
      },
    ],
  });

  console.log('✅ Japan tech research persisted. Session:', sessionId);

  // Verify cross-department view
  const japan = await memory.queryEntity('market:japan');
  console.log('\n📊 market:japan — cross-department intelligence:');
  console.log('  Departments:', japan?.departments.join(', '));
  console.log('  Decisions:', japan?.decisions.length);
  console.log('  Observations:', japan?.observations.length);
  console.log('  Actions:', japan?.actions.length);

  await closeDb();
}

main().catch(err => {
  console.error('❌', err.message);
  process.exit(1);
});
