#!/usr/bin/env npx tsx
/**
 * Persist Japan Deep Research into Agent Memory System
 */

import { memory } from '../src/agents/memory/index.js';
import { closeDb } from '../src/db/client.js';

async function main() {
  const sessionId = await memory.save({
    agentId: 'deep-research',
    department: 'marketing',
    trigger: 'deep-research:japan-market-2026',
    entitiesTouched: [
      {
        id: 'market:japan',
        type: 'market',
        label: 'Japan',
        context: 'Asia',
        attrs: {
          status: 'researched',
          optimal_window: 'Oct-Nov 2026',
          budget: '$2800-3950 (3 weeks)',
          break_even: '8-13 mixed events',
          visa: 'Entertainment Visa Category 2',
          yt_views: '27',
          yt_engagement: '4.3 min/view (highest globally)',
        },
        sigma2: [
          'EIAF Artist-in-Residence Yokohama: $10K grant, DEADLINE MARCH 1 2026',
          'Japan = only market where dev+musician identity BOTH valued',
          'NO busking (Heaven Artist prohibits amplified), indoor only',
          'Relationship-driven: cold email does NOT work, need introductions',
          'No traditional booking agents for indie intl artists (pay-to-play system)',
          'Self-contained setup = key advantage (no backline negotiations)',
        ],
      },
      {
        id: 'contact:iic_tokyo',
        type: 'institution',
        label: 'Italian Cultural Institute Tokyo',
        context: 'italiana.esteri.it',
        attrs: {
          capacity: '372-seat auditorium',
          precedent: 'Enzo Favata 2023 live electronics',
          series: 'Italian Vibes: Sound of Youth 2025',
        },
        sigma2: ['IIC = highest probability institutional booking pathway'],
      },
      {
        id: 'contact:tokyo_handpan_lab',
        type: 'community',
        label: 'Tokyo HandPan Lab',
        context: 'tokyohandpanlab.com',
        attrs: {
          leader: 'Reo Matsumoto',
          event: 'Tokyo HandPan Festival',
          funding: 'Arts Council Tokyo',
        },
        sigma2: ['Community embedding = organic audience access'],
      },
      {
        id: 'contact:shalestone_music',
        type: 'tour-manager',
        label: 'Shalestone Music',
        context: 'Osaka',
        attrs: {
          email: 'booking@shalestonemusic.jp',
          since: '2006',
          genres: 'acoustic to spiritual to punk',
          services: 'booking, hotel, bilingual tour manager, transport, promo',
        },
        sigma2: ['Most practical first-step for managed touring'],
      },
      {
        id: 'contact:handpan_japan',
        type: 'dealer',
        label: 'Handpan Japan LLC',
        context: 'contact@handpanjapan.com',
        attrs: { role: 'key community connector' },
        sigma2: [],
      },
      {
        id: 'venue:forestlimit',
        type: 'listening-space',
        label: 'Forestlimit',
        context: 'Hatagaya, Tokyo',
        attrs: { capacity: '~50', programming: 'ambient/deep listening', door: '¥2500' },
        sigma2: [],
      },
      {
        id: 'venue:ftarri',
        type: 'experimental',
        label: 'Ftarri',
        context: 'Suidobashi, Tokyo',
        attrs: { capacity: '~30', email: 'info@ftarri.com', owner: 'Yoshiyuki Suzuki' },
        sigma2: ['Daily experimental concerts, intl artists, deeply connected'],
      },
      {
        id: 'venue:eat_play_works',
        type: 'wellness',
        label: 'Eat Play Works',
        context: 'Hiroo, Tokyo',
        attrs: { program: 'Weekly Wed sound baths ¥3000', facilitator: 'Hiko Konami' },
        sigma2: ['Open to guest facilitators'],
      },
      {
        id: 'venue:park_hyatt_tokyo',
        type: 'luxury-hotel',
        label: 'Park Hyatt Tokyo',
        context: 'Peak Bar',
        attrs: { program: 'nightly live acoustic', setting: 'bamboo grove, Mt. Fuji views' },
        sigma2: ['Events & Catering dept accepts proposals'],
      },
      {
        id: 'festival:sukiyaki',
        type: 'festival',
        label: 'SUKIYAKI Meets the World',
        context: 'Nanto, Toyama (late August)',
        attrs: { since: '1991', apply_via: 'gigmit.com', genres: 'experimental, ethno-fusion, worldbeat' },
        sigma2: ['Artist residencies + satellite editions in Tokyo/Nagoya/Okinawa'],
      },
      {
        id: 'grant:eiaf',
        type: 'residency',
        label: 'EIAF Artist-in-Residence Yokohama',
        context: '7artscafe.co.jp/eiaf',
        attrs: { value: '$10,000', covers: 'airfare, housing, living, materials', req: '5+ years pro experience' },
        sigma2: ['DEADLINE: MARCH 1 2026 — APPLY IMMEDIATELY'],
      },
    ],
    decisions: [
      {
        content: 'Japan entry: IIC Tokyo + Tokyo HandPan Lab + Shalestone Music (3 channels)',
        entities: ['market:japan', 'contact:iic_tokyo', 'contact:tokyo_handpan_lab', 'contact:shalestone_music'],
        rationale: 'Relationship-driven market, need institutional + community + managed channels',
        date: '2026-02-07',
      },
      {
        content: 'EIAF Yokohama residency: APPLY BEFORE MARCH 1 2026',
        entities: ['grant:eiaf', 'market:japan'],
        rationale: '$10K grant for sound artists, covers everything, perfect fit',
        date: '2026-02-07',
      },
      {
        content: 'Japan tour window: October-November 2026 (3 weeks)',
        entities: ['market:japan'],
        rationale: 'Best weather, cheap accom, rich cultural calendar, autumn mood fits ceremonial',
        date: '2026-02-07',
      },
      {
        content: 'Avoid noruma (pay-to-play) live houses entirely',
        entities: ['market:japan'],
        rationale: 'Target self-organized ceremonies + wellness workshops + private events instead',
        date: '2026-02-07',
      },
      {
        content: 'YouTube priority for Japan (78.4M users, primary music discovery)',
        entities: ['market:japan'],
        rationale: 'JP social priority: YouTube > X/Twitter > Instagram > TikTok > LINE',
        date: '2026-02-07',
      },
    ],
    observations: [
      { content: 'Japan handpan community small but organized — Tokyo HandPan Festival hosted intl artists with Arts Council funding', sigma: 'σ₂' },
      { content: 'Sound bath ¥3000-5000/session ($20-34) — growing market on centuries-old orin/temple bell foundations', sigma: 'σ₁' },
      { content: 'IIC Tokyo hosted Enzo Favata 2023 (soprano sax + live electronics) = direct precedent for FLUTUR', sigma: 'σ₂' },
      { content: 'FLUTUR competitive advantage in Japan: multi-instrumental ceremonial electronics category barely exists there', sigma: 'σ₂' },
      { content: 'Entertainment Visa Cat 2: need Japanese org sponsor, file Certificate of Eligibility 1-3 months before', sigma: 'σ₁' },
      { content: 'JP hashtags: #ハンドパン #サウンドヒーリング #音浴 #アンビエント #瞑想音楽 #ライブループ', sigma: 'σ₁' },
    ],
    actions: [
      {
        description: 'Deep Research completed: Japan market strategic guide',
        target: 'market:japan',
        result: 'content/outreach/deep-research/japan-market-2026.md',
        date: '2026-02-07',
      },
    ],
  });

  console.log('✅ Japan intelligence persisted. Session:', sessionId);

  // Verify cross-department view
  const japan = await memory.queryEntity('market:japan');
  console.log('\n📊 market:japan — cross-department intelligence:');
  console.log('  Departments:', japan?.departments.join(', '));
  console.log('  Decisions:', japan?.decisions.length);
  console.log('  Observations:', japan?.observations.length);

  // Show shared entities (Japan should show up in both marketing + engineering)
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
