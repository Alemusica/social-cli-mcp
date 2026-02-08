/**
 * Audience Snapshot Queries
 * Store and retrieve audience demographic data
 */

import { getDb } from '../client.js';

export interface AudienceSnapshot {
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
  age_gender: { age: string; male: number; female: number }[];
  engagement_rate?: number;
  captured_at: string;
}

/**
 * Save audience snapshot
 */
export async function saveAudienceSnapshot(
  snapshot: Omit<AudienceSnapshot, 'id' | 'captured_at'>,
  sessionId?: string
): Promise<string> {
  const db = await getDb();

  const result = await db.query<[{ id: string }[]]>(`
    CREATE audience_snapshot CONTENT {
      platform: $platform,
      username: $username,
      followers: $followers,
      following: $following,
      posts_count: $posts,
      reach_28d: $reach,
      profile_views_28d: $views,
      website_clicks_28d: $clicks,
      top_countries: $countries,
      top_cities: $cities,
      age_gender: $ageGender,
      engagement_rate: $engagement,
      captured_at: time::now()
    }
  `, {
    platform: snapshot.platform,
    username: snapshot.username,
    followers: snapshot.followers,
    following: snapshot.following,
    posts: snapshot.posts_count,
    reach: snapshot.reach_28d,
    views: snapshot.profile_views_28d,
    clicks: snapshot.website_clicks_28d,
    countries: snapshot.top_countries,
    cities: snapshot.top_cities,
    ageGender: snapshot.age_gender,
    engagement: snapshot.engagement_rate
  });

  const id = result[0]?.[0]?.id;

  // Link to session if provided
  if (sessionId && id) {
    await db.query(`
      RELATE $snapshot->snapshot_in->$sess
    `, {
      snapshot: id,
      sess: sessionId
    });
  }

  console.log(`📊 Saved audience snapshot: ${snapshot.followers} followers`);
  return id;
}

/**
 * Get latest audience snapshot for platform
 */
export async function getLatestAudience(
  platform: string = 'instagram'
): Promise<AudienceSnapshot | null> {
  const db = await getDb();

  const result = await db.query<[AudienceSnapshot[]]>(`
    SELECT * FROM audience_snapshot
    WHERE platform = $platform
    ORDER BY captured_at DESC
    LIMIT 1
  `, { platform });

  return result[0]?.[0] || null;
}

/**
 * Get audience history for growth tracking
 */
export async function getAudienceHistory(
  platform: string = 'instagram',
  days: number = 30
): Promise<AudienceSnapshot[]> {
  const db = await getDb();

  const result = await db.query<[AudienceSnapshot[]]>(`
    SELECT * FROM audience_snapshot
    WHERE platform = $platform
      AND captured_at > time::now() - $days * 1d
    ORDER BY captured_at ASC
  `, { platform, days });

  return result[0] || [];
}

/**
 * Calculate growth between snapshots
 */
export async function calculateGrowth(
  platform: string = 'instagram',
  days: number = 7
): Promise<{
  startFollowers: number;
  endFollowers: number;
  growth: number;
  growthPercent: number;
  period: number;
} | null> {
  const history = await getAudienceHistory(platform, days);

  if (history.length < 2) return null;

  const start = history[0];
  const end = history[history.length - 1];
  const growth = end.followers - start.followers;
  const growthPercent = (growth / start.followers) * 100;

  return {
    startFollowers: start.followers,
    endFollowers: end.followers,
    growth,
    growthPercent: Math.round(growthPercent * 100) / 100,
    period: days
  };
}

/**
 * Check if audience data is fresh
 */
export async function isAudienceDataFresh(
  platform: string = 'instagram',
  maxAgeHours: number = 24
): Promise<boolean> {
  const latest = await getLatestAudience(platform);
  if (!latest) return false;

  const capturedAt = new Date(latest.captured_at);
  const ageMs = Date.now() - capturedAt.getTime();
  const ageHours = ageMs / (1000 * 60 * 60);

  return ageHours < maxAgeHours;
}

/**
 * Get audience data freshness info
 */
export async function getAudienceFreshness(
  platform: string = 'instagram'
): Promise<{
  hasDatas: boolean;
  latest?: string;
  ageHours?: number;
  isFresh: boolean;
}> {
  const latest = await getLatestAudience(platform);

  if (!latest) {
    return { hasDatas: false, isFresh: false };
  }

  const capturedAt = new Date(latest.captured_at);
  const ageMs = Date.now() - capturedAt.getTime();
  const ageHours = Math.round(ageMs / (1000 * 60 * 60));

  return {
    hasDatas: true,
    latest: latest.captured_at,
    ageHours,
    isFresh: ageHours < 24
  };
}
