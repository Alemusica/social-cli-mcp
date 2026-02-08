/**
 * Insights Archiver
 *
 * Persists Instagram API insights to SurrealDB for historical tracking.
 * Every API call is archived with timestamp for evolution analysis.
 *
 * Usage:
 *   import { archiveAudienceInsights, getAudienceEvolution } from './core/insights-archiver.js';
 *
 *   // Archive current insights
 *   await archiveAudienceInsights();
 *
 *   // Get evolution over time
 *   const evolution = await getAudienceEvolution(30); // Last 30 days
 */

import { getDb } from '../db/client.js';
import { InstagramClient } from '../clients/instagram.js';
import { loadCredentialsToEnv, getFromKeychain } from './credentials.js';
import type { InstagramAudienceInsights, InstagramAccountInsights } from '../types.js';

export interface AudienceSnapshotRecord {
  id?: string;
  platform: string;
  username: string;
  followers: number;
  following: number;
  posts_count: number;
  reach_28d?: number;
  profile_views_28d?: number;
  website_clicks_28d?: number;
  top_countries: { country: string; count: number }[];
  top_cities: { city: string; count: number }[];
  age_gender: { ageRange: string; male: number; female: number }[];
  engagement_rate?: number;
  captured_at: string;
}

export interface InsightsEvolution {
  period_days: number;
  snapshots: AudienceSnapshotRecord[];
  changes: {
    followers_change: number;
    followers_change_pct: number;
    reach_change?: number;
    top_country_shift?: string;
  };
  insights: string[];
}

/**
 * Get configured Instagram client
 */
function getInstagramClient(): InstagramClient | null {
  loadCredentialsToEnv();

  const accessToken = getFromKeychain('INSTAGRAM_ACCESS_TOKEN');
  const businessAccountId = getFromKeychain('INSTAGRAM_BUSINESS_ACCOUNT_ID');

  if (!accessToken || !businessAccountId) {
    console.error('❌ Missing Instagram credentials');
    return null;
  }

  return new InstagramClient({
    accessToken,
    businessAccountId,
    facebookPageId: getFromKeychain('FACEBOOK_PAGE_ID') || '',
  });
}

/**
 * Archive current audience insights to SurrealDB
 * Creates a point-in-time snapshot for historical tracking
 */
export async function archiveAudienceInsights(sessionName?: string): Promise<AudienceSnapshotRecord | null> {
  const client = getInstagramClient();
  if (!client) return null;

  const db = await getDb();

  console.log('📊 Fetching Instagram audience insights...');

  // Get account info
  const accountInsights = await client.getAccountInsights('days_28');
  if (!accountInsights) {
    console.error('❌ Failed to get account insights');
    return null;
  }

  // Get audience demographics
  const audienceInsights = await client.getAudienceInsights();

  // Build snapshot record
  const snapshot: AudienceSnapshotRecord = {
    platform: 'instagram',
    username: 'flutur', // TODO: Get from API
    followers: accountInsights.followerCount,
    following: 0, // Not available in insights API
    posts_count: accountInsights.mediaCount,
    reach_28d: accountInsights.reach,
    profile_views_28d: accountInsights.profileViews,
    website_clicks_28d: accountInsights.websiteClicks,
    top_countries: audienceInsights?.topCountries || [],
    top_cities: audienceInsights?.topCities || [],
    age_gender: audienceInsights?.ageGender || [],
    captured_at: new Date().toISOString(),
  };

  // Save to SurrealDB
  const result = await db.query<[AudienceSnapshotRecord[]]>(`
    CREATE audience_snapshot SET
      platform = $platform,
      username = $username,
      followers = $followers,
      following = $following,
      posts_count = $posts_count,
      reach_28d = $reach_28d,
      profile_views_28d = $profile_views_28d,
      website_clicks_28d = $website_clicks_28d,
      top_countries = $top_countries,
      top_cities = $top_cities,
      age_gender = $age_gender,
      captured_at = time::now()
  `, {
    platform: snapshot.platform,
    username: snapshot.username,
    followers: snapshot.followers,
    following: snapshot.following,
    posts_count: snapshot.posts_count,
    reach_28d: snapshot.reach_28d,
    profile_views_28d: snapshot.profile_views_28d,
    website_clicks_28d: snapshot.website_clicks_28d,
    top_countries: snapshot.top_countries,
    top_cities: snapshot.top_cities,
    age_gender: snapshot.age_gender,
  });

  const savedSnapshot = (result[0] as any)?.[0];

  // Also save raw API response for debugging
  await db.query(`
    CREATE api_snapshot SET
      api_name = 'instagram_audience',
      endpoint = '/me/insights',
      parameters = { period: 'days_28' },
      response = $response,
      api_version = 'v24.0',
      captured_at = time::now()
  `, { response: { account: accountInsights, audience: audienceInsights } });

  // If session provided, link the snapshot
  if (sessionName) {
    await db.query(`
      LET $session = (SELECT * FROM analysis_session WHERE session_name = $name)[0];
      IF $session THEN
        RELATE $snapshot->snapshot_in->$session.id
      END
    `, { name: sessionName, snapshot: savedSnapshot?.id });
  }

  console.log(`✅ Audience snapshot archived (${snapshot.followers} followers)`);

  return snapshot;
}

/**
 * Get audience evolution over time
 */
export async function getAudienceEvolution(days: number = 30): Promise<InsightsEvolution | null> {
  const db = await getDb();

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  const result = await db.query(`
    SELECT *
    FROM audience_snapshot
    WHERE platform = 'instagram'
      AND captured_at >= $cutoff
    ORDER BY captured_at ASC
  `, { cutoff: cutoffDate.toISOString() });

  const snapshots = (result[0] as AudienceSnapshotRecord[]) || [];

  if (snapshots.length === 0) {
    return null;
  }

  const oldest = snapshots[0];
  const latest = snapshots[snapshots.length - 1];

  const followerChange = latest.followers - oldest.followers;
  const followerChangePct = oldest.followers > 0
    ? (followerChange / oldest.followers) * 100
    : 0;

  // Generate insights
  const insights: string[] = [];

  if (followerChangePct > 5) {
    insights.push(`📈 Strong growth: +${followerChange} followers (+${followerChangePct.toFixed(1)}%)`);
  } else if (followerChangePct < -2) {
    insights.push(`📉 Follower decline: ${followerChange} (${followerChangePct.toFixed(1)}%)`);
  } else {
    insights.push(`➡️ Stable follower count: ${followerChange > 0 ? '+' : ''}${followerChange}`);
  }

  // Country corridor analysis
  if (latest.top_countries.length >= 2) {
    const italians = latest.top_countries.find(c => c.country === 'IT')?.count || 0;
    const greeks = latest.top_countries.find(c => c.country === 'GR')?.count || 0;
    const corridorPct = ((italians + greeks) / latest.followers) * 100;

    if (corridorPct > 60) {
      insights.push(`🇮🇹🇬🇷 IT↔GR corridor strong: ${corridorPct.toFixed(0)}% of audience`);
    }
  }

  // Age analysis
  if (latest.age_gender.length > 0) {
    const primaryAge = latest.age_gender
      .sort((a, b) => (b.male + b.female) - (a.male + a.female))[0];
    insights.push(`👥 Primary age group: ${primaryAge.ageRange}`);
  }

  return {
    period_days: days,
    snapshots,
    changes: {
      followers_change: followerChange,
      followers_change_pct: followerChangePct,
      reach_change: (latest.reach_28d || 0) - (oldest.reach_28d || 0),
    },
    insights,
  };
}

/**
 * Get latest audience snapshot
 */
export async function getLatestAudienceSnapshot(): Promise<AudienceSnapshotRecord | null> {
  const db = await getDb();

  const result = await db.query(`
    SELECT *
    FROM audience_snapshot
    WHERE platform = 'instagram'
    ORDER BY captured_at DESC
    LIMIT 1
  `);

  return (result[0] as any)?.[0] || null;
}

/**
 * Check if we need fresh insights (older than X hours)
 */
export async function needsFreshInsights(maxAgeHours: number = 24): Promise<boolean> {
  const latest = await getLatestAudienceSnapshot();
  if (!latest) return true;

  const capturedAt = new Date(latest.captured_at);
  const hoursSince = (Date.now() - capturedAt.getTime()) / (1000 * 60 * 60);

  return hoursSince > maxAgeHours;
}

/**
 * Archive and analyze - full workflow
 */
export async function archiveAndAnalyze(): Promise<{
  snapshot: AudienceSnapshotRecord | null;
  evolution: InsightsEvolution | null;
  recommendations: string[];
}> {
  // Archive current state
  const snapshot = await archiveAudienceInsights();

  // Get evolution
  const evolution = await getAudienceEvolution(30);

  // Generate recommendations
  const recommendations: string[] = [];

  if (snapshot && evolution) {
    // Based on IT-GR corridor
    const italians = snapshot.top_countries.find(c => c.country === 'IT')?.count || 0;
    const greeks = snapshot.top_countries.find(c => c.country === 'GR')?.count || 0;

    if (italians > greeks * 3) {
      recommendations.push('🎯 Crea contenuti che risuonano con il pubblico italiano');
      recommendations.push('🇬🇷 Considera più contenuti in greco per bilanciare');
    }

    if (greeks > 100) {
      recommendations.push('🌊 La community greca è significativa - racconta storie della Grecia');
    }

    // Time-based recommendations
    const bestTimes = await getInstagramClient()?.getBestPostingTimes();
    if (bestTimes && bestTimes.length > 0) {
      recommendations.push(`⏰ Orari migliori: ${bestTimes.slice(0, 3).map(t => `${t.day} ${t.hour}`).join(', ')}`);
    }
  }

  return { snapshot, evolution, recommendations };
}

/**
 * Get corridor analysis (IT-GR specific)
 */
export async function getCorridorAnalysis(): Promise<{
  italians: number;
  greeks: number;
  corridorPct: number;
  otherCountries: { country: string; count: number }[];
  insight: string;
} | null> {
  const latest = await getLatestAudienceSnapshot();
  if (!latest) return null;

  const italians = latest.top_countries.find(c => c.country === 'IT')?.count || 0;
  const greeks = latest.top_countries.find(c => c.country === 'GR')?.count || 0;
  const corridorPct = latest.followers > 0
    ? ((italians + greeks) / latest.followers) * 100
    : 0;

  const otherCountries = latest.top_countries.filter(
    c => c.country !== 'IT' && c.country !== 'GR'
  );

  let insight = '';
  if (corridorPct > 70) {
    insight = 'Il tuo pubblico è fortemente IT↔GR. Contenuti che collegano le due culture avranno massimo impatto.';
  } else if (corridorPct > 50) {
    insight = 'Buona base IT↔GR. Continua a coltivare questo ponte culturale.';
  } else {
    insight = 'Pubblico diversificato. Considera se vuoi rafforzare il corridoio IT↔GR.';
  }

  return {
    italians,
    greeks,
    corridorPct,
    otherCountries,
    insight,
  };
}

// Export for direct use
export const insightsArchiver = {
  archiveAudience: archiveAudienceInsights,
  getEvolution: getAudienceEvolution,
  getLatest: getLatestAudienceSnapshot,
  needsFresh: needsFreshInsights,
  archiveAndAnalyze,
  getCorridorAnalysis,
};
