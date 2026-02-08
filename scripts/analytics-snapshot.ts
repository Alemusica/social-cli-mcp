#!/usr/bin/env npx tsx
/**
 * Analytics Snapshot — Full Pipeline
 *
 * Fetches YouTube + Instagram data, saves to SurrealDB, runs correlation detection.
 *
 * Usage:
 *   npx tsx scripts/analytics-snapshot.ts              # Full snapshot
 *   npx tsx scripts/analytics-snapshot.ts --youtube     # YouTube only
 *   npx tsx scripts/analytics-snapshot.ts --instagram   # Instagram only
 *   npx tsx scripts/analytics-snapshot.ts --correlate   # Run correlator only (no API calls)
 *   npx tsx scripts/analytics-snapshot.ts --quick       # Quick outreach signals check
 */

import { loadCredentialsToEnv } from '../src/core/credentials.js';
import { fetchYouTubeSnapshot, fetchExternalTrafficDetail } from '../src/analytics/youtube-fetcher.js';
import { fetchInstagramSnapshot, fetchOutreachSignals } from '../src/analytics/instagram-fetcher.js';
import { detectCorrelations, saveAllCorrelations, getRecentActivity } from '../src/analytics/correlator.js';
import { saveYouTubeSnapshot, saveInstagramSnapshot } from '../src/analytics/persistence.js';
import { closeDb } from '../src/db/client.js';

// ═══════════════════════════════════════════════════════════════
// CLI ARGS
// ═══════════════════════════════════════════════════════════════

const args = process.argv.slice(2);
const youtubeOnly = args.includes('--youtube');
const instagramOnly = args.includes('--instagram');
const correlateOnly = args.includes('--correlate');
const quickMode = args.includes('--quick');
const fullMode = !youtubeOnly && !instagramOnly && !correlateOnly && !quickMode;

// ═══════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════

async function main() {
  console.log('\n📊 FLUTUR Analytics Snapshot');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Load credentials from Keychain
  const loaded = loadCredentialsToEnv();
  console.log(`🔐 ${loaded} credentials loaded from Keychain\n`);

  // Quick mode: just check outreach-relevant signals
  if (quickMode) {
    console.log('⚡ Quick mode: checking outreach signals...\n');
    const signals = await fetchOutreachSignals();
    if (signals) {
      console.log(`  👤 Profile views (28d): ${signals.profileViews}`);
      console.log(`  🔗 Website clicks (28d): ${signals.websiteClicks}`);
      console.log(`  📡 Reach (28d): ${signals.reach}`);
      console.log(`  👥 Followers: ${signals.followerCount}`);
    } else {
      console.log('  ❌ Could not fetch Instagram signals');
    }

    const activity = await getRecentActivity(7);
    console.log(`\n  ${activity.summary}`);
    await closeDb();
    return;
  }

  let ytSaved = false;
  let igSaved = false;

  // ── YouTube ──
  if (fullMode || youtubeOnly) {
    console.log('📺 Fetching YouTube Analytics...');
    const ytSnap = await fetchYouTubeSnapshot(28);
    if (ytSnap) {
      await saveYouTubeSnapshot(ytSnap);
      ytSaved = true;

      console.log(`  📈 Channel: ${ytSnap.totalSubscribers} subs, ${ytSnap.totalViews} total views`);
      console.log(`  📊 Last 28d: ${ytSnap.viewsLast28d} views, ${ytSnap.watchTimeLast28d} min watch time`);
      console.log(`  🎬 ${ytSnap.videos.length} videos tracked`);

      // Show traffic sources
      const external = ytSnap.trafficSources.filter(s => s.sourceType === 'EXT_URL');
      if (external.length > 0) {
        console.log(`  🔗 External traffic: ${external.reduce((sum, s) => sum + s.views, 0)} views`);
        // Fetch external detail (which URLs)
        const extDetail = await fetchExternalTrafficDetail(28);
        if (extDetail && extDetail.length > 0) {
          console.log('  🌐 External sources:');
          for (const src of extDetail.slice(0, 5)) {
            console.log(`     ${src.source}: ${src.views} views`);
          }
        }
      }

      // Show geo data
      if (ytSnap.viewsByCountry.length > 0) {
        const outreachCountries = ['GR', 'IT', 'PT', 'ES', 'ID', 'DE', 'HR', 'FR'];
        const relevant = ytSnap.viewsByCountry.filter(g => outreachCountries.includes(g.country));
        if (relevant.length > 0) {
          console.log('  🌍 Views from outreach countries (90d):');
          for (const g of relevant) {
            console.log(`     ${g.country}: ${g.views} views, ${g.watchTimeMinutes} min`);
          }
        }
      }

      // Show top 3 videos
      const topVideos = [...ytSnap.videos].sort((a, b) => b.views - a.views).slice(0, 3);
      console.log('  🏆 Top videos:');
      for (const v of topVideos) {
        console.log(`     ${v.title}: ${v.views} views, ${v.estimatedMinutesWatched}min watch time`);
      }
    } else {
      console.log('  ⚠️  YouTube fetch failed (check OAuth credentials)');
    }
    console.log('');
  }

  // ── Instagram ──
  if (fullMode || instagramOnly) {
    console.log('📸 Fetching Instagram Insights...');
    const igSnap = await fetchInstagramSnapshot(10);
    if (igSnap) {
      await saveInstagramSnapshot(igSnap);
      igSaved = true;

      console.log(`  👥 ${igSnap.followerCount} followers, ${igSnap.mediaCount} posts`);
      console.log(`  📡 Reach (28d): ${igSnap.reach28d}`);
      console.log(`  👤 Profile views (28d): ${igSnap.profileViews28d}`);
      console.log(`  🔗 Website clicks (28d): ${igSnap.websiteClicks28d}`);

      // Top countries
      if (igSnap.topCountries.length > 0) {
        const top3 = igSnap.topCountries.slice(0, 3);
        console.log(`  🌍 Top: ${top3.map(c => `${c.country} (${c.count})`).join(', ')}`);
      }

      // Top performing media
      const topMedia = [...igSnap.recentMedia]
        .sort((a, b) => (b.likes + b.comments + b.shares) - (a.likes + a.comments + a.shares))
        .slice(0, 3);
      if (topMedia.length > 0) {
        console.log('  🏆 Top recent media:');
        for (const m of topMedia) {
          const engagement = m.likes + m.comments + m.shares;
          console.log(`     ${m.mediaType} (${m.timestamp?.split('T')[0]}): ${engagement} engagements, ${m.reach} reach`);
        }
      }
    } else {
      console.log('  ⚠️  Instagram fetch failed (check access token)');
    }
    console.log('');
  }

  // ── Correlation ──
  if (fullMode || correlateOnly) {
    console.log('🔍 Running cross-platform correlation...');

    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - 14 * 86400000).toISOString().split('T')[0];

    const correlations = await detectCorrelations(startDate, endDate);
    if (correlations.length > 0) {
      const saved = await saveAllCorrelations(correlations);
      console.log(`  📎 ${saved} correlation events detected and saved`);

      const high = correlations.filter(c => c.confidence === 'high');
      const medium = correlations.filter(c => c.confidence === 'medium');
      console.log(`  🎯 Confidence: ${high.length} high, ${medium.length} medium, ${correlations.length - high.length - medium.length} low`);

      // Show high-confidence correlations
      for (const corr of high) {
        console.log(`\n  ⚡ ${corr.date}: ${corr.trigger?.targetVenue || 'unknown venue'}`);
        for (const sig of corr.signals) {
          console.log(`     ${sig.platform}: ${sig.metric} = ${sig.value} ${sig.detail ? `(${sig.detail})` : ''}`);
        }
        if (corr.outcome === 'reply') {
          console.log(`     ✅ REPLY received`);
        }
      }
    } else {
      console.log('  ℹ️  No correlation events found (need more data points)');
    }
    console.log('');
  }

  // ── Summary ──
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  const parts = [];
  if (ytSaved) parts.push('YouTube');
  if (igSaved) parts.push('Instagram');
  if (fullMode || correlateOnly) parts.push('Correlations');
  console.log(`✅ Saved: ${parts.join(' + ') || 'nothing (correlate-only mode)'}`);
  console.log(`📅 ${new Date().toISOString()}\n`);

  await closeDb();
}

main().catch(err => {
  console.error('❌ Analytics snapshot failed:', err.message);
  process.exit(1);
});
