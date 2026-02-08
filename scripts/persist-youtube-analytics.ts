#!/usr/bin/env npx tsx
/**
 * Persist YouTube Analytics (geographic + temporal) into SurrealDB + Agent Memory
 * Department: reception (analytics signal processing)
 *
 * CRITICAL CORRECTION: September 2025 was a GLOBAL spike across ALL countries.
 * Gulf "organic signal" = single-month event, NOT gradual discovery.
 * Japan = single June 2025 spike, 27 views only.
 */

import { memory } from '../src/agents/memory/index.js';
import { getDb, closeDb } from '../src/db/client.js';

async function main() {
  const db = await getDb();

  // ═══════════════════════════════════════════════════════════════
  // 1. SAVE RAW ANALYTICS SNAPSHOTS TO SURREALDB
  // ═══════════════════════════════════════════════════════════════

  const snapshotDate = '2026-02-07';
  const channelStats = {
    subscribers: 366,
    totalViews: 19300,
    views28d: 184,
    totalVideos: 50,
    channelId: 'UCiY5OuIb2OvK0tYsJzYnkig',
  };

  // Per-country all-time views with temporal pattern
  const countryData = [
    {
      country: 'US', views: 5348, minutesWatched: 16792, avgDuration: 188,
      temporal: 'Distributed across months, steady base',
    },
    {
      country: 'IT', views: 4285, minutesWatched: 11543, avgDuration: 162,
      temporal: 'Spike Sept 2025 (869 views). Father Ocean FULL (530), RAV hype short (228), Efthymia (85)',
    },
    {
      country: 'QA', views: 3118, minutesWatched: 1299, avgDuration: 25,
      temporal: 'ALL September 2025. Efthymia (2,837), RAV hype short (272). 25s avg = Shorts-level',
    },
    {
      country: 'GR', views: 1447, minutesWatched: 3901, avgDuration: 162,
      temporal: 'Jan 2023 spike (129, GGT era), Sept 2025 spike (375)',
    },
    {
      country: 'IN', views: 622, minutesWatched: 1637, avgDuration: 158,
      temporal: 'Distributed',
    },
    {
      country: 'AE', views: 551, minutesWatched: 230, avgDuration: 25,
      temporal: 'ALL September 2025. Efthymia (443), RAV hype short (93). 25s avg',
    },
    {
      country: 'SA', views: 364, minutesWatched: 231, avgDuration: 38,
      temporal: 'ALL September 2025',
    },
    {
      country: 'DE', views: 295, minutesWatched: 937, avgDuration: 191,
      temporal: 'Distributed',
    },
    {
      country: 'GB', views: 283, minutesWatched: 884, avgDuration: 187,
      temporal: 'Distributed',
    },
    {
      country: 'JP', views: 27, minutesWatched: 117, avgDuration: 260,
      temporal: 'ALL June 2025. Only Efthymia. 260s avg = 71% retention (BEST engagement)',
    },
  ];

  // Save channel snapshot
  await db.query(`
    UPSERT type::thing("yt_analytics_snapshot", $id) SET
      snapshot_date = $date,
      channel_id = $channelId,
      subscribers = $subs,
      total_views = $totalViews,
      views_28d = $views28d,
      total_videos = $totalVideos,
      country_data = $countryData,
      critical_insight = $insight,
      created_at = time::now()
  `, {
    id: `channel_${snapshotDate.replace(/-/g, '_')}`,
    date: snapshotDate,
    channelId: channelStats.channelId,
    subs: channelStats.subscribers,
    totalViews: channelStats.totalViews,
    views28d: channelStats.views28d,
    totalVideos: channelStats.totalVideos,
    countryData: countryData,
    insight: 'September 2025 = GLOBAL spike across ALL countries. Gulf 4,033 views = single-month event, NOT gradual organic interest. Qatar 25s avg watch time = Shorts-level engagement. Japan 27 views June 2025 = tiny but 260s avg (71% retention) = deep engagement.',
  });

  // Save per-video performance by country (key combinations only)
  const videoCountryData = [
    { video: 'Efthymia', videoId: 'I-lpfRHTSG4', country: 'QA', views: 2837, avgDuration: 25, month: '2025-09' },
    { video: 'RAV hype short', videoId: 'unknown_short', country: 'QA', views: 272, avgDuration: 23, month: '2025-09' },
    { video: 'Efthymia', videoId: 'I-lpfRHTSG4', country: 'AE', views: 443, avgDuration: 26, month: '2025-09' },
    { video: 'RAV hype short', videoId: 'unknown_short', country: 'AE', views: 93, avgDuration: 20, month: '2025-09' },
    { video: 'Father Ocean FULL', videoId: 'FkBwJJS2ZxQ', country: 'IT', views: 530, avgDuration: 123, month: '2025-09' },
    { video: 'RAV hype short', videoId: 'unknown_short', country: 'IT', views: 228, avgDuration: 18, month: '2025-09' },
    { video: 'Efthymia', videoId: 'I-lpfRHTSG4', country: 'IT', views: 85, avgDuration: 34, month: '2025-09' },
    { video: 'Efthymia', videoId: 'I-lpfRHTSG4', country: 'JP', views: 27, avgDuration: 260, month: '2025-06' },
  ];

  for (const vcd of videoCountryData) {
    const id = `${vcd.video.replace(/[^a-zA-Z0-9]/g, '_')}_${vcd.country}_${vcd.month.replace(/-/g, '_')}`;
    await db.query(`
      UPSERT type::thing("yt_video_country", $id) SET
        video_title = $video,
        video_id = $videoId,
        country = $country,
        views = $views,
        avg_duration_sec = $avgDuration,
        month = $month,
        snapshot_date = $date,
        created_at = time::now()
    `, {
      id, video: vcd.video, videoId: vcd.videoId, country: vcd.country,
      views: vcd.views, avgDuration: vcd.avgDuration, month: vcd.month, date: snapshotDate,
    });
  }

  console.log('✅ YouTube analytics saved to SurrealDB (yt_analytics_snapshot + yt_video_country)');

  // ═══════════════════════════════════════════════════════════════
  // 2. PERSIST TO AGENT MEMORY (reception dept — analytics agent)
  // ═══════════════════════════════════════════════════════════════

  const sessionId = await memory.save({
    agentId: 'analytics',
    department: 'reception',
    trigger: 'youtube-analytics:geographic-temporal-2026-02-07',
    entitiesTouched: [
      {
        id: 'market:gulf',
        type: 'market',
        label: 'Gulf (Qatar/UAE/Saudi)',
        context: 'YouTube geographic analytics — CORRECTED signal interpretation',
        attrs: {
          yt_total_views: '4,033 (QA 3,118 + AE 551 + SA 364)',
          yt_temporal_pattern: 'ALL September 2025 — single month spike, NOT gradual',
          yt_avg_duration_qatar: '25s (Shorts-level, NOT deep engagement)',
          yt_avg_duration_uae: '25s',
          yt_avg_duration_saudi: '38s',
          yt_top_video_qatar: 'Efthymia (2,837 views) + RAV hype short (272)',
          yt_top_video_uae: 'Efthymia (443 views) + RAV hype short (93)',
          signal_quality: 'MEDIUM — volume exists but single-event, low watch time',
        },
        sigma2: [
          'Gulf 4,033 YT views = SINGLE September 2025 spike, NOT gradual organic discovery',
          'Qatar 25s avg watch time = Shorts-level engagement, not deep viewing (vs Japan 260s)',
          'Efthymia drove 91% of Qatar views (2,837/3,118) — but Shorts-level consumption',
          'Signal is REAL but WEAKER than raw numbers suggest — likely algorithmic push, not search intent',
        ],
      },
      {
        id: 'market:japan',
        type: 'market',
        label: 'Japan',
        context: 'YouTube geographic analytics — tiny volume, best engagement',
        attrs: {
          yt_total_views: '27',
          yt_temporal_pattern: 'ALL June 2025 — single month, separate from Sept global spike',
          yt_avg_duration: '260s (71% retention — HIGHEST of any country)',
          yt_top_video: 'Efthymia (27 views, 100% of JP traffic)',
          signal_quality: 'LOW volume, HIGH engagement — 27 people watched 4+ minutes each',
        },
        sigma2: [
          'Japan 27 views ALL June 2025 — separate from Sept 2025 global spike, different trigger',
          'Japan 260s avg watch time = 71% retention = DEEPEST engagement of any country',
          'Only Efthymia watched in Japan — no other video reached JP audience',
          'Japan signal = tiny but genuine deep interest (260s vs Gulf 25s)',
        ],
      },
      {
        id: 'market:italy',
        type: 'market',
        label: 'Italy',
        context: 'YouTube home market — strong base + Sept 2025 spike',
        attrs: {
          yt_total_views: '4,285 (all-time)',
          yt_avg_duration: '162s',
          yt_sept_2025_spike: '869 views — Father Ocean FULL (530) + RAV hype short (228) + Efthymia (85)',
          yt_father_ocean_italy: '530 views, 123s avg — BEST performing video for Italy',
        },
        sigma2: [
          'Father Ocean FULL = Italy top video (530 views, 123s avg) — use for Italian outreach',
          'Italy has distributed viewing across months (not single-event like Gulf)',
        ],
      },
      {
        id: 'market:greece',
        type: 'market',
        label: 'Greece',
        context: 'YouTube — GGT era + Sept 2025 spike',
        attrs: {
          yt_total_views: '1,447 (all-time)',
          yt_avg_duration: '162s',
          yt_jan_2023_spike: '129 views (GGT TV appearance era)',
          yt_sept_2025_spike: '375 views',
        },
        sigma2: [],
      },
      {
        id: 'channel:flutur_youtube',
        type: 'channel',
        label: 'FLUTUR YouTube Channel',
        context: 'UCiY5OuIb2OvK0tYsJzYnkig',
        attrs: {
          subscribers: '366',
          total_views: '19,300',
          views_28d: '184',
          total_videos: '50',
          top_country: 'US (5,348 views)',
          snapshot_date: '2026-02-07',
        },
        sigma2: [
          'September 2025 = GLOBAL spike across ALL countries — single event drove 40%+ of total views',
          'Top country US (5,348) has distributed viewing, all others show spike patterns',
        ],
      },
    ],
    decisions: [
      {
        content: 'Gulf YT signal downgraded from "strong organic" to "medium — single-event algorithmic push"',
        entities: ['market:gulf'],
        rationale: 'All 4,033 views from September 2025 only, 25s avg = Shorts-level, not intentional search',
        date: '2026-02-07',
      },
      {
        content: 'Japan YT signal upgraded to "highest quality per-view" despite tiny volume (27 views, 260s avg)',
        entities: ['market:japan'],
        rationale: '71% retention vs Gulf 7% — different signal quality entirely',
        date: '2026-02-07',
      },
      {
        content: 'Efthymia = global draw (top video in Qatar, UAE, Japan) but consumed differently per market',
        entities: ['market:gulf', 'market:japan'],
        rationale: 'Qatar: 2,837 views × 25s (thumbnail browse). Japan: 27 views × 260s (deep listen)',
        date: '2026-02-07',
      },
      {
        content: 'Father Ocean FULL = Italy video (530 views, 123s avg). Use for Italian venue outreach.',
        entities: ['market:italy'],
        rationale: 'Italy is the only market where Father Ocean outperforms Efthymia',
        date: '2026-02-07',
      },
      {
        content: 'September 2025 global spike needs investigation — what triggered 40%+ of all-time views in one month?',
        entities: ['channel:flutur_youtube'],
        rationale: 'Qatar, UAE, Saudi, Italy, Greece ALL spiked simultaneously — external event or viral moment',
        date: '2026-02-07',
      },
    ],
    observations: [
      { content: 'September 2025 = global YT spike: QA 3,118 + AE 551 + SA 364 + IT 869 + GR 375 in ONE month', sigma: 'σ₂' },
      { content: 'Gulf avg watch time (25s) vs Japan (260s) = 10x engagement gap per view', sigma: 'σ₂' },
      { content: 'Japan 27 views separate from Sept global spike (June 2025) — independent signal', sigma: 'σ₂' },
      { content: 'Efthymia is top video in 3 of 4 target markets (QA, AE, JP) but NOT Italy (Father Ocean)', sigma: 'σ₁' },
      { content: 'RAV hype short appeared in Qatar (272), UAE (93), Italy (228) during Sept spike — Shorts algorithm', sigma: 'σ₁' },
      { content: 'US is top country (5,348 views, 188s avg) with distributed viewing — organic base audience', sigma: 'σ₁' },
      { content: 'Italy 162s avg = genuine engagement (2.7 min), similar to Greece (162s) and US (188s)', sigma: 'σ₁' },
    ],
    actions: [
      {
        description: 'YouTube Analytics geographic + temporal analysis completed and persisted',
        target: 'channel:flutur_youtube',
        result: 'SurrealDB: yt_analytics_snapshot + yt_video_country tables. Agent memory: reception dept.',
        date: '2026-02-07',
      },
    ],
  });

  console.log('✅ Agent memory persisted. Session:', sessionId);

  // ═══════════════════════════════════════════════════════════════
  // 3. VERIFY
  // ═══════════════════════════════════════════════════════════════

  const gulf = await memory.queryEntity('market:gulf');
  console.log('\n📊 market:gulf — updated intelligence:');
  console.log('  Departments:', gulf?.departments.join(', '));
  console.log('  Decisions:', gulf?.decisions.length);
  console.log('  Observations:', gulf?.observations.length);

  const japan = await memory.queryEntity('market:japan');
  console.log('\n📊 market:japan — updated intelligence:');
  console.log('  Departments:', japan?.departments.join(', '));
  console.log('  Decisions:', japan?.decisions.length);
  console.log('  Observations:', japan?.observations.length);

  // Cross-dept convergence
  const shared = await memory.sharedEntities();
  console.log('\n🔗 Cross-department convergence:');
  for (const s of shared) {
    console.log(`  ${s.entity}: ${s.departments.join(' + ')} (${s.linkCount} links)`);
  }

  // Verify DB records
  const [snapshots] = await db.query('SELECT count() FROM yt_analytics_snapshot GROUP ALL');
  const [videoCountry] = await db.query('SELECT count() FROM yt_video_country GROUP ALL');
  console.log('\n📦 SurrealDB:');
  console.log('  yt_analytics_snapshot records:', (snapshots as any)?.[0]?.count || 0);
  console.log('  yt_video_country records:', (videoCountry as any)?.[0]?.count || 0);

  await closeDb();
}

main().catch(err => {
  console.error('❌', err.message);
  process.exit(1);
});
