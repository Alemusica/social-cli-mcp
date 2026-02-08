#!/usr/bin/env npx tsx
/**
 * Run Full Analysis
 * Captures audience snapshot and analyzes hashtags, saving all to SurrealDB
 */

import { loadConfig } from '../utils/config.js';
import { InstagramClient } from '../clients/instagram.js';
import { getDb, closeDb } from '../db/client.js';
import {
  startSession,
  endSession,
  saveHashtagAnalysis,
  saveAudienceSnapshot,
  getDataFreshnessReport
} from '../db/queries/index.js';

// Hashtags to analyze (expanded - ~20 rate limit remaining this week)
const HASHTAGS_TO_ANALYZE = [
  // Core music/busking hashtags
  'flutur', 'busker', 'streetmusic', 'ravvast', 'streetperformer',
  'busking', 'handpan', 'hangdrum', 'steeldrum',
  // Field recording / soundscape
  'fieldrecording', 'binaural', 'sounddesign', 'soundscape', 'ambientmusic',
  // Location/discovery
  'lanzarote', 'greekislands', 'madeira', 'lisbonmusic', 'italymusic',
  // Niche/discovery
  'livemusic', 'musicianlife', 'travelmusician', 'acousticmusic',
  // Visual content
  'sunsetmusic', 'beachvibes', 'goldenhour', 'magichour'
];

async function runAudienceSnapshot(
  instagram: InstagramClient,
  sessionId: string
): Promise<void> {
  console.log('\n📊 Capturing audience snapshot...');

  // Get account info
  const account = await instagram.getAccountInsights('day');
  if (!account) {
    console.error('❌ Could not get account insights');
    return;
  }

  // Get audience demographics
  const audience = await instagram.getAudienceInsights();

  // Save to database
  await saveAudienceSnapshot({
    platform: 'instagram',
    username: 'flutur_8',
    followers: account.followerCount || 0,
    following: 0, // Not provided by API
    posts_count: account.mediaCount || 0,
    reach_28d: account.reach,
    profile_views_28d: account.profileViews,
    website_clicks_28d: account.websiteClicks,
    top_countries: audience?.topCountries || [],
    top_cities: audience?.topCities || [],
    age_gender: (audience?.ageGender || []).map(ag => ({
      age: ag.ageRange,
      male: ag.male,
      female: ag.female,
    })),
    engagement_rate: undefined
  }, sessionId);

  console.log(`✅ Audience snapshot saved: ${account.followerCount} followers`);
}

async function runHashtagAnalysis(
  instagram: InstagramClient,
  sessionId: string,
  maxHashtags: number = 5
): Promise<void> {
  console.log(`\n🔍 Analyzing hashtags (max ${maxHashtags})...`);
  console.log('⚠️  Rate limit: 30 unique hashtags per 7 days\n');

  const hashtagsToTest = HASHTAGS_TO_ANALYZE.slice(0, maxHashtags);
  let analyzed = 0;

  for (const tag of hashtagsToTest) {
    console.log(`   Analyzing #${tag}...`);

    const analysis = await instagram.analyzeHashtag(tag);

    if (analysis) {
      // Determine recommendation
      let recommendation: 'keep' | 'avoid' | 'test' = 'test';
      const score = analysis.avgLikes + analysis.avgComments * 2;

      if (score > 2000) recommendation = 'keep';
      else if (score < 100) recommendation = 'avoid';

      await saveHashtagAnalysis({
        hashtag_name: analysis.name,
        instagram_id: analysis.id,
        avg_likes: analysis.avgLikes,
        avg_comments: analysis.avgComments,
        engagement_score: score,
        top_posts_analyzed: analysis.topMediaCount,
        sample_posts: analysis.topPosts,
        recommendation,
        rate_limit_week: analyzed + 1
      }, sessionId);

      console.log(`   ✅ #${tag}: score ${score} (${recommendation})`);
      analyzed++;
    } else {
      console.log(`   ❌ #${tag}: could not analyze`);
    }

    // Rate limit delay
    await new Promise(r => setTimeout(r, 1000));
  }

  console.log(`\n📈 Analyzed ${analyzed}/${maxHashtags} hashtags`);
}

async function main() {
  const args = process.argv.slice(2);
  const skipHashtags = args.includes('--skip-hashtags');
  const skipAudience = args.includes('--skip-audience');
  const maxHashtags = parseInt(args.find(a => a.startsWith('--max-hashtags='))?.split('=')[1] || '5');

  console.log('═'.repeat(60));
  console.log('📊 SOCIAL CLI MCP - FULL ANALYSIS');
  console.log('═'.repeat(60));

  // Load config
  const config = loadConfig();
  if (!config.instagram) {
    console.error('❌ Instagram not configured');
    process.exit(1);
  }

  const instagram = new InstagramClient(config.instagram);

  // Test connection
  console.log('\n📡 Testing Instagram connection...');
  const connected = await instagram.testConnection();
  if (!connected) {
    console.error('❌ Connection failed');
    process.exit(1);
  }

  // Initialize database
  console.log('🗄️  Connecting to SurrealDB...');
  await getDb();

  // Check current data freshness
  console.log('\n📋 Current data freshness:');
  try {
    const freshness = await getDataFreshnessReport();
    console.log(`   Hashtags: ${freshness.hashtags.count} records, ${freshness.hashtags.latestAge || '?'}h old`);
    console.log(`   Audience: ${freshness.audience.hasData ? 'Yes' : 'No'}, ${freshness.audience.latestAge || '?'}h old`);
    console.log(`   Posts: ${freshness.posts.total} total, ${freshness.posts.ready} ready`);
  } catch (e) {
    console.log('   (No existing data)');
  }

  // Start analysis session
  const sessionName = `full_analysis_${new Date().toISOString().split('T')[0]}`;
  const sessionId = await startSession(
    sessionName,
    'general',
    'Full analysis: audience snapshot + hashtag research'
  );

  console.log(`\n🎯 Started session: ${sessionName}`);

  try {
    // Run audience snapshot
    if (!skipAudience) {
      await runAudienceSnapshot(instagram, sessionId);
    } else {
      console.log('\n⏭️  Skipping audience snapshot');
    }

    // Run hashtag analysis
    if (!skipHashtags) {
      await runHashtagAnalysis(instagram, sessionId, maxHashtags);
    } else {
      console.log('\n⏭️  Skipping hashtag analysis');
    }

    // End session
    await endSession(sessionId, 'Analysis completed successfully');

    // Final report
    console.log('\n' + '═'.repeat(60));
    console.log('✅ ANALYSIS COMPLETE');
    console.log('═'.repeat(60));

    const finalFreshness = await getDataFreshnessReport();
    console.log(`\n📊 Updated data:
   Hashtags: ${finalFreshness.hashtags.count} records
   Audience: ${finalFreshness.audience.hasData ? '✅' : '❌'}
   Posts: ${finalFreshness.posts.total} total`);

  } catch (error) {
    console.error('\n❌ Analysis failed:', error);
    await endSession(sessionId, `Failed: ${error}`);
  } finally {
    await closeDb();
  }
}

main().catch(console.error);
