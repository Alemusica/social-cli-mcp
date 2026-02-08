#!/usr/bin/env npx tsx
/**
 * DIGITAL DEPARTMENT: Real-Time Post Monitor
 *
 * Tracks a single post's performance over time:
 * - First 4 hours: Check every 30 minutes (critical window)
 * - 4-24 hours: Check every 2 hours
 * - After 24h: Final snapshot
 *
 * Stores performance data in SurrealDB for trend analysis
 */

import Surreal from 'surrealdb';
import { InstagramClient } from '../clients/instagram.js';
import { loadCredentialsToEnv, getFromKeychain } from '../core/credentials.js';
import { getDb } from '../db/client.js';

loadCredentialsToEnv();

interface PerformanceSnapshot {
  timestamp: string;
  hoursAfterPost: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  reach: number;
  impressions: number;
  engagementRate: number;
}

interface PostMonitorData {
  mediaId: string;
  permalink: string;
  postedAt: string;
  snapshots: PerformanceSnapshot[];
  status: 'monitoring' | 'completed' | 'flagged';
  alerts: string[];
}

const MEDIA_ID = process.argv[2];
const SINGLE_CHECK = process.argv.includes('--once');

if (!MEDIA_ID) {
  console.log('Usage: npx tsx monitor-post.ts <media_id> [--once]');
  console.log('');
  console.log('Options:');
  console.log('  --once    Single check (for cron jobs)');
  console.log('');
  console.log('To get media_id, use: npx tsx get-recent-posts.ts');
  process.exit(1);
}

async function getPostInsights(client: InstagramClient, mediaId: string) {
  const insights = await client.getMediaInsights(mediaId);
  if (!insights) {
    throw new Error('Failed to get post insights');
  }
  return insights;
}

async function saveSnapshot(db: Surreal, mediaId: string, snapshot: PerformanceSnapshot) {
  // Check if monitor record exists
  const existing = await db.query(`
    SELECT * FROM post_monitor WHERE media_id = $mediaId
  `, { mediaId });

  if ((existing[0] as any[])?.length > 0) {
    // Update existing record
    await db.query(`
      UPDATE post_monitor SET
        snapshots += $snapshot,
        last_checked = time::now()
      WHERE media_id = $mediaId
    `, { mediaId, snapshot });
  } else {
    // Create new record
    await db.query(`
      CREATE post_monitor SET
        media_id = $mediaId,
        started_at = time::now(),
        last_checked = time::now(),
        snapshots = [$snapshot],
        status = 'monitoring',
        alerts = []
    `, { mediaId, snapshot });
  }
}

async function checkAlerts(
  db: Surreal,
  mediaId: string,
  current: PerformanceSnapshot,
  previous?: PerformanceSnapshot
): Promise<string[]> {
  const alerts: string[] = [];

  // First check - baseline alert
  if (!previous) {
    if (current.engagementRate > 5) {
      alerts.push(`🚀 STRONG START: ${current.engagementRate.toFixed(1)}% engagement in first check`);
    } else if (current.engagementRate < 1) {
      alerts.push(`⚠️ SLOW START: Only ${current.engagementRate.toFixed(1)}% engagement - consider boosting with story`);
    }
    return alerts;
  }

  // Growth rate analysis
  const likesGrowth = current.likes - previous.likes;
  const hoursDiff = current.hoursAfterPost - previous.hoursAfterPost;
  const likesPerHour = likesGrowth / hoursDiff;

  if (likesPerHour > 50) {
    alerts.push(`🔥 VIRAL POTENTIAL: +${likesGrowth} likes in ${hoursDiff}h (${likesPerHour.toFixed(0)}/h)`);
  }

  if (current.saves > previous.saves * 1.5 && current.saves > 10) {
    alerts.push(`💾 HIGH SAVES: ${current.saves} saves - strong long-term value signal`);
  }

  if (current.shares > previous.shares * 2 && current.shares > 5) {
    alerts.push(`📤 SHARING SPIKE: ${current.shares} shares - amplify with story repost`);
  }

  // Engagement decay detection
  const prevEngRate = previous.engagementRate || 1;
  if (current.engagementRate < prevEngRate * 0.5 && current.hoursAfterPost > 4) {
    alerts.push(`📉 ENGAGEMENT DROP: ${current.engagementRate.toFixed(1)}% (was ${prevEngRate.toFixed(1)}%)`);
  }

  // Save alerts to DB
  if (alerts.length > 0) {
    await db.query(`
      UPDATE post_monitor SET
        alerts += $alerts
      WHERE media_id = $mediaId
    `, { mediaId, alerts });
  }

  return alerts;
}

async function main() {
  console.log('📊 DIGITAL DEPARTMENT: Post Monitor\n');

  // Initialize Instagram client
  const accessToken = getFromKeychain('INSTAGRAM_ACCESS_TOKEN');
  const businessAccountId = getFromKeychain('INSTAGRAM_BUSINESS_ACCOUNT_ID');
  const facebookPageId = getFromKeychain('FACEBOOK_PAGE_ID');

  if (!accessToken || !businessAccountId) {
    console.error('❌ Missing Instagram credentials in Keychain');
    console.log('   Required: INSTAGRAM_ACCESS_TOKEN, INSTAGRAM_BUSINESS_ACCOUNT_ID');
    process.exit(1);
  }

  const instagram = new InstagramClient({
    accessToken,
    businessAccountId,
    facebookPageId: facebookPageId || '',
  });

  // Connect to SurrealDB (uses centralized client with env vars)
  const db = await getDb();

  // Ensure table exists
  await db.query(`
    DEFINE TABLE IF NOT EXISTS post_monitor SCHEMAFULL;
    DEFINE FIELD media_id ON post_monitor TYPE string;
    DEFINE FIELD started_at ON post_monitor TYPE datetime;
    DEFINE FIELD last_checked ON post_monitor TYPE datetime;
    DEFINE FIELD snapshots ON post_monitor TYPE array;
    DEFINE FIELD status ON post_monitor TYPE string;
    DEFINE FIELD alerts ON post_monitor TYPE array;
    DEFINE INDEX post_monitor_media ON post_monitor FIELDS media_id UNIQUE;
  `);

  // Get current insights
  console.log(`📍 Checking post: ${MEDIA_ID}\n`);
  const insights = await getPostInsights(instagram, MEDIA_ID);

  // Calculate hours since post
  const postedAt = new Date(insights.timestamp);
  const now = new Date();
  const hoursAfterPost = (now.getTime() - postedAt.getTime()) / (1000 * 60 * 60);

  // Calculate engagement rate (engagement / reach * 100)
  const totalEngagement = (insights.likes || 0) + (insights.comments || 0) +
                          (insights.shares || 0) + (insights.saved || 0);
  const engagementRate = insights.reach ? (totalEngagement / insights.reach) * 100 : 0;

  const snapshot: PerformanceSnapshot = {
    timestamp: now.toISOString(),
    hoursAfterPost: Math.round(hoursAfterPost * 10) / 10,
    likes: insights.likes || 0,
    comments: insights.comments || 0,
    shares: insights.shares || 0,
    saves: insights.saved || 0,
    reach: insights.reach || 0,
    impressions: insights.impressions || 0,
    engagementRate: Math.round(engagementRate * 100) / 100,
  };

  // Get previous snapshot for comparison
  const prevData = await db.query(`
    SELECT snapshots FROM post_monitor WHERE media_id = $mediaId
  `, { mediaId: MEDIA_ID });
  const prevSnapshots = (prevData[0] as any)?.[0]?.snapshots || [];
  const prevSnapshot = prevSnapshots[prevSnapshots.length - 1];

  // Display current stats
  console.log('┌──────────────────────────────────────────┐');
  console.log('│           CURRENT PERFORMANCE            │');
  console.log('├──────────────────────────────────────────┤');
  console.log(`│  ⏱️  Hours since post:  ${snapshot.hoursAfterPost.toFixed(1).padStart(8)}h     │`);
  console.log(`│  ❤️  Likes:             ${snapshot.likes.toString().padStart(8)}       │`);
  console.log(`│  💬  Comments:          ${snapshot.comments.toString().padStart(8)}       │`);
  console.log(`│  📤  Shares:            ${snapshot.shares.toString().padStart(8)}       │`);
  console.log(`│  💾  Saves:             ${snapshot.saves.toString().padStart(8)}       │`);
  console.log(`│  👁️  Reach:             ${snapshot.reach.toString().padStart(8)}       │`);
  console.log(`│  📊  Engagement:        ${snapshot.engagementRate.toFixed(2).padStart(7)}%      │`);
  console.log('└──────────────────────────────────────────┘');

  // Show growth if previous snapshot exists
  if (prevSnapshot) {
    console.log('\n📈 GROWTH SINCE LAST CHECK:');
    console.log(`   Likes:    +${snapshot.likes - prevSnapshot.likes}`);
    console.log(`   Comments: +${snapshot.comments - prevSnapshot.comments}`);
    console.log(`   Reach:    +${snapshot.reach - prevSnapshot.reach}`);
  }

  // Check for alerts
  const alerts = await checkAlerts(db, MEDIA_ID, snapshot, prevSnapshot);
  if (alerts.length > 0) {
    console.log('\n🚨 ALERTS:');
    for (const alert of alerts) {
      console.log(`   ${alert}`);
    }
  }

  // Save snapshot
  await saveSnapshot(db, MEDIA_ID, snapshot);
  console.log('\n✅ Snapshot saved to database');

  // Recommendations based on time window
  console.log('\n💡 RECOMMENDATIONS:');
  if (hoursAfterPost < 1) {
    console.log('   • Post a story about this post NOW (boost algorithm)');
    console.log('   • Reply to any comments immediately');
  } else if (hoursAfterPost < 4) {
    console.log('   • CRITICAL WINDOW: Engage with comments');
    console.log('   • Share to story if not done yet');
    if (snapshot.engagementRate < 2) {
      console.log('   • Consider: Ask a question in story to drive engagement');
    }
  } else if (hoursAfterPost < 24) {
    console.log('   • Monitor saves - high saves = evergreen content');
    console.log('   • Plan similar content if performing well');
  } else {
    console.log('   • Post analysis complete - use insights for next post');
  }

  await db.close();

  if (!SINGLE_CHECK && hoursAfterPost < 24) {
    // Calculate next check time
    let nextCheckMinutes: number;
    if (hoursAfterPost < 4) {
      nextCheckMinutes = 30;
    } else {
      nextCheckMinutes = 120;
    }
    console.log(`\n⏰ Next check in ${nextCheckMinutes} minutes`);
  }

  console.log(`\n🔗 Post: ${insights.permalink}`);
}

main().catch(console.error);
