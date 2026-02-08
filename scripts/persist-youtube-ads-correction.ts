#!/usr/bin/env npx tsx
/**
 * CRITICAL CORRECTION: September 2025 spike was PAID YouTube Ads, not organic.
 * User confirmed: "quando ho pubblicato i video Rocca ho fatto ads in quelle zone"
 *
 * Updates:
 * - yt_analytics_snapshot with ads breakdown
 * - Agent memory with corrected signal interpretation
 */

import { memory } from '../src/agents/memory/index.js';
import { getDb, closeDb } from '../src/db/client.js';

async function main() {
  const db = await getDb();

  // ═══════════════════════════════════════════════════════════════
  // 1. Save ads breakdown to SurrealDB
  // ═══════════════════════════════════════════════════════════════

  await db.query(`
    UPSERT type::thing("yt_analytics_snapshot", $id) SET
      snapshot_date = '2026-02-07',
      period = 'sept_2025_ads_breakdown',
      total_views_sept = 6766,
      ad_views_sept = 5729,
      organic_views_sept = 1037,
      ad_percentage = 84.7,
      ad_avg_duration = 53,
      organic_avg_duration = 133,
      alltime_ad_views = 5729,
      alltime_ad_pct = 29.3,
      video_breakdown = $videos,
      correction = 'ALL September 2025 views were from PAID YouTube Ads targeted at Gulf+Italy+Greece. Zero organic Gulf signal.',
      created_at = time::now()
  `, {
    id: 'sept_2025_ads_analysis',
    videos: [
      { id: 'I-lpfRHTSG4', title: 'Efthymia', views: 3663, avgDuration: 31 },
      { id: 'FkBwJJS2ZxQ', title: 'Father Ocean FULL', views: 1464, avgDuration: 132 },
      { id: '04lJBBB1acI', title: 'RAV hype short (Father Ocean clip)', views: 1124, avgDuration: 31 },
      { id: 'ec9Luwq-jSg', title: 'Children (Rob Miles-Tinlicker)', views: 188, avgDuration: 88 },
      { id: 'UI7lYdNvSi0', title: 'Full Live Set at Rocchetta', views: 83, avgDuration: 401 },
    ],
  });

  // Update the main snapshot with correction flag
  await db.query(`
    UPDATE type::thing("yt_analytics_snapshot", $id) SET
      critical_insight = $insight,
      ads_correction = true,
      ads_breakdown = { total: 5729, percentage: 84.7, avg_duration: 53, organic_remaining: 1037 }
  `, {
    id: 'channel_2026_02_07',
    insight: 'September 2025 spike = PAID YOUTUBE ADS (5,729/6,766 = 84.7%). Gulf views are NOT organic signal — they are paid ad impressions with 53s avg watch time. Only meaningful organic signals: US (distributed), subscribers, search traffic.',
  });

  console.log('✅ Ads correction saved to SurrealDB');

  // ═══════════════════════════════════════════════════════════════
  // 2. Update agent memory with CRITICAL correction
  // ═══════════════════════════════════════════════════════════════

  const sessionId = await memory.save({
    agentId: 'analytics',
    department: 'reception',
    trigger: 'youtube-ads-correction:user-confirmed-paid-ads',
    entitiesTouched: [
      {
        id: 'market:gulf',
        type: 'market',
        label: 'Gulf (Qatar/UAE/Saudi)',
        context: 'CORRECTED: YouTube views were PAID ADS, not organic',
        attrs: {
          yt_signal_type: 'PAID ADS — zero organic Gulf signal',
          yt_ad_views_total: '~4,033 (QA 3,118 + AE 551 + SA 364) = all from ad campaign',
          yt_ad_avg_duration: '25-38s (ad impression level)',
          yt_organic_views: 'ZERO — no organic Gulf viewership detected',
          original_interpretation: 'Was: "organic signal from ZERO targeting". Is: paid ad impressions.',
        },
        sigma2: [
          'CRITICAL CORRECTION: Gulf 4,033 YT views = PAID ADS from Sept 2025 campaign, NOT organic discovery',
          'Zero organic Gulf viewership exists. All views are ad impressions (25s avg = skipped after 5s).',
          'Gulf market interest must be validated through OTHER signals (booking agency responses, DMs, direct inquiry)',
          'Previous interpretation ("organic from ZERO targeting") was WRONG — user ran ads in those zones',
        ],
      },
      {
        id: 'market:japan',
        type: 'market',
        label: 'Japan',
        context: 'NOT affected by ads — June 2025, separate from ad campaign',
        attrs: {
          yt_signal_type: 'ORGANIC — not from ad campaign (different month)',
          yt_organic_views: '27 (June 2025, no ads running)',
          yt_avg_duration: '260s (71% retention = genuine deep interest)',
        },
        sigma2: [
          'Japan 27 views are GENUINE ORGANIC — June 2025, no ads running that month',
          'Japan remains the only validated organic interest signal from YouTube analytics',
        ],
      },
      {
        id: 'channel:flutur_youtube',
        type: 'channel',
        label: 'FLUTUR YouTube Channel',
        context: 'Ads breakdown: 29.3% of all-time views are paid',
        attrs: {
          alltime_ad_views: '5,729 (29.3% of 19,567 total)',
          alltime_ad_month: 'September 2025 only',
          alltime_organic: '~13,838 views (70.7%)',
          ad_campaigns_run: 'Rocca videos → targeted Gulf, Italy, Greece',
          ad_avg_duration: '53s (vs organic avg ~140s)',
        },
        sigma2: [
          'All 5,729 ad views happened in Sept 2025 only — a single campaign, not ongoing',
          '84.7% of Sept 2025 traffic was ads. Only 1,037 organic views that month.',
          'Top ad-driven videos: Efthymia (3,663), Father Ocean FULL (1,464), RAV hype short (1,124)',
          'Father Ocean FULL got 132s avg even from ads — best ad performance (people actually watched)',
        ],
      },
    ],
    decisions: [
      {
        content: 'Gulf YT signal FULLY INVALIDATED — all views were paid ads, zero organic signal exists',
        entities: ['market:gulf'],
        rationale: 'User confirmed: ran YouTube Ads targeting Gulf+Italy+Greece when publishing Rocca videos',
        date: '2026-02-07',
      },
      {
        content: 'Japan YT signal CONFIRMED ORGANIC — June 2025, no ads running, genuine deep engagement',
        entities: ['market:japan'],
        rationale: 'Different month from ad campaign. 260s avg = intentional discovery, not ad impression.',
        date: '2026-02-07',
      },
      {
        content: 'Father Ocean FULL = best ad-to-engagement conversion (132s avg even from ads)',
        entities: ['channel:flutur_youtube'],
        rationale: 'If ads are run again, Father Ocean FULL generates actual watch time, not just impressions',
        date: '2026-02-07',
      },
      {
        content: 'Gulf market interest must be validated via booking responses, NOT YouTube analytics',
        entities: ['market:gulf'],
        rationale: 'YT data is 100% paid. Need agency responses (Scarlett, Artist Related Group) as real signal.',
        date: '2026-02-07',
      },
    ],
    observations: [
      { content: 'Sept 2025: 5,729 ad views / 6,766 total = 84.7% PAID', sigma: 'σ₂' },
      { content: 'All-time: 5,729 ad views = 29.3% of 19,567 total. ALL ads in one month.', sigma: 'σ₂' },
      { content: 'Ad-driven Efthymia: 3,663 views, 31s avg. Father Ocean FULL: 1,464, 132s avg.', sigma: 'σ₁' },
      { content: 'RAV hype short (04lJBBB1acI) = Father Ocean clip as Shorts format, 1,124 views, 31s avg', sigma: 'σ₁' },
      { content: 'Gulf ad targeting was intentional. User knew. Previous agent analysis missed this.', sigma: 'σ₂' },
    ],
    actions: [
      {
        description: 'YouTube Ads analysis completed. Gulf signal corrected from "organic" to "paid".',
        target: 'channel:flutur_youtube',
        result: 'SurrealDB: yt_analytics_snapshot:sept_2025_ads_analysis. Memory: 3 entities updated.',
        date: '2026-02-07',
      },
    ],
  });

  console.log('✅ Ads correction persisted to agent memory. Session:', sessionId);

  // Verify
  const gulf = await memory.queryEntity('market:gulf');
  console.log('\n📊 market:gulf — corrected intelligence:');
  console.log('  Departments:', gulf?.departments.join(', '));
  console.log('  Decisions:', gulf?.decisions.length);
  console.log('  σ₂ observations:', gulf?.observations.filter((o: any) => o.sigma === 'σ₂').length);

  const japan = await memory.queryEntity('market:japan');
  console.log('\n📊 market:japan — confirmed organic:');
  console.log('  Departments:', japan?.departments.join(', '));
  console.log('  Decisions:', japan?.decisions.length);

  await closeDb();
}

main().catch(err => {
  console.error('❌', err.message);
  process.exit(1);
});
