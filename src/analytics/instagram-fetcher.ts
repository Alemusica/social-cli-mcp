/**
 * Instagram Analytics Fetcher
 *
 * Wraps the existing InstagramClient insights methods and structures
 * the data for SurrealDB persistence and cross-platform correlation.
 *
 * Respects the 10 API calls/week budget (self-imposed).
 * Each fetchSnapshot() call uses ~4 API calls:
 *   1. Account info (followers, media count)
 *   2. Account insights (reach, profile views, website clicks)
 *   3. Audience demographics (countries, cities, age/gender)
 *   4. Recent media list + insights (batched)
 */

import { InstagramClient } from '../clients/instagram.js';
import { getFromKeychain } from '../core/credentials.js';
import type { InstagramSnapshot, InstagramMediaSnapshot } from './types.js';

// ═══════════════════════════════════════════════════════════════
// CLIENT SETUP
// ═══════════════════════════════════════════════════════════════

function getClient(): InstagramClient | null {
  const accessToken = getFromKeychain('INSTAGRAM_ACCESS_TOKEN');
  const businessAccountId = getFromKeychain('INSTAGRAM_BUSINESS_ACCOUNT_ID');

  if (!accessToken || !businessAccountId) {
    console.error('❌ Instagram credentials not found in Keychain');
    return null;
  }

  return new InstagramClient({
    accessToken,
    businessAccountId,
    facebookPageId: '', // not needed for insights
  });
}

// ═══════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════

/**
 * Fetch a full Instagram snapshot: account metrics + audience + recent media.
 * Uses ~4 API calls. Budget: 10/week total.
 */
export async function fetchInstagramSnapshot(mediaLimit: number = 10): Promise<InstagramSnapshot | null> {
  const client = getClient();
  if (!client) return null;

  if (!client.isConfigured()) {
    console.error('❌ Instagram client not properly configured');
    return null;
  }

  // Fetch account insights + audience in parallel
  const [accountInsights, audienceInsights, recentMedia] = await Promise.all([
    client.getAccountInsights('days_28'),
    client.getAudienceInsights(),
    client.getRecentMediaInsights(mediaLimit),
  ]);

  if (!accountInsights) {
    console.error('❌ Failed to fetch Instagram account insights');
    return null;
  }

  // Map media insights to our snapshot format
  const mediaSnapshots: InstagramMediaSnapshot[] = recentMedia.map(m => ({
    mediaId: m.mediaId,
    mediaType: m.mediaType,
    timestamp: m.timestamp,
    permalink: m.permalink,
    likes: m.likes || 0,
    comments: m.comments || 0,
    shares: m.shares || 0,
    saved: m.saved || 0,
    reach: m.reach || 0,
    impressions: m.impressions || 0,
    plays: m.plays,
  }));

  return {
    date: new Date().toISOString().split('T')[0],
    followerCount: accountInsights.followerCount,
    mediaCount: accountInsights.mediaCount,
    reach28d: accountInsights.reach || 0,
    profileViews28d: accountInsights.profileViews || 0,
    websiteClicks28d: accountInsights.websiteClicks || 0,
    topCountries: audienceInsights?.topCountries || [],
    topCities: audienceInsights?.topCities || [],
    recentMedia: mediaSnapshots,
    capturedAt: new Date().toISOString(),
  };
}

/**
 * Fetch only the key outreach-relevant metrics (lighter, ~2 API calls).
 * Returns profile views + website clicks — the signals that matter for correlation.
 */
export async function fetchOutreachSignals(): Promise<{
  profileViews: number;
  websiteClicks: number;
  reach: number;
  followerCount: number;
} | null> {
  const client = getClient();
  if (!client) return null;

  const insights = await client.getAccountInsights('days_28');
  if (!insights) return null;

  return {
    profileViews: insights.profileViews || 0,
    websiteClicks: insights.websiteClicks || 0,
    reach: insights.reach || 0,
    followerCount: insights.followerCount,
  };
}

/**
 * Fetch insights for a specific media post.
 * Useful for tracking performance of specific videos shared in outreach.
 */
export async function fetchMediaInsights(mediaId: string): Promise<InstagramMediaSnapshot | null> {
  const client = getClient();
  if (!client) return null;

  const insights = await client.getMediaInsights(mediaId);
  if (!insights) return null;

  return {
    mediaId: insights.mediaId,
    mediaType: insights.mediaType,
    timestamp: insights.timestamp,
    permalink: insights.permalink,
    likes: insights.likes || 0,
    comments: insights.comments || 0,
    shares: insights.shares || 0,
    saved: insights.saved || 0,
    reach: insights.reach || 0,
    impressions: insights.impressions || 0,
    plays: insights.plays,
  };
}

// ═══════════════════════════════════════════════════════════════
// EXPORT NAMESPACE
// ═══════════════════════════════════════════════════════════════

export const instagramFetcher = {
  fetchSnapshot: fetchInstagramSnapshot,
  fetchOutreachSignals,
  fetchMediaInsights,
};
