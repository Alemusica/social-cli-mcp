/**
 * YouTube Analytics Fetcher
 *
 * Pulls video-level metrics and traffic sources via YouTube Data API v3
 * + YouTube Analytics API.
 *
 * Auth: OAuth2 with refresh token (youtube-credentials.json + Keychain tokens).
 *
 * Key signals for outreach correlation:
 *   - External traffic sources (someone clicked from 8i8.art or email)
 *   - Channel page views spike (someone browsing your channel)
 *   - Per-video view spikes on days matching email sends
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { getFromKeychain } from '../core/credentials.js';
import type {
  YouTubeCredentials,
  YouTubeChannelSnapshot,
  YouTubeVideoSnapshot,
  YouTubeTrafficSource,
  YouTubeGeoView,
} from './types.js';

const YT_DATA_API = 'https://www.googleapis.com/youtube/v3';
const YT_ANALYTICS_API = 'https://youtubeanalytics.googleapis.com/v2';

// ═══════════════════════════════════════════════════════════════
// CREDENTIALS
// ═══════════════════════════════════════════════════════════════

function loadCredentials(): YouTubeCredentials | null {
  try {
    const credsPath = join(process.cwd(), 'youtube-credentials.json');
    const credsFile = JSON.parse(readFileSync(credsPath, 'utf-8'));
    const installed = credsFile.installed || credsFile.web;

    const accessToken = getFromKeychain('YOUTUBE_ACCESS_TOKEN');
    const refreshToken = getFromKeychain('YOUTUBE_REFRESH_TOKEN');
    const channelId = getFromKeychain('YOUTUBE_CHANNEL_ID');

    if (!refreshToken || !channelId) {
      console.error('❌ YouTube OAuth not configured. Need YOUTUBE_REFRESH_TOKEN and YOUTUBE_CHANNEL_ID in Keychain.');
      return null;
    }

    return {
      clientId: installed.client_id,
      clientSecret: installed.client_secret,
      accessToken: accessToken || '',
      refreshToken,
      channelId,
    };
  } catch (err: any) {
    console.error('❌ Failed to load YouTube credentials:', err.message);
    return null;
  }
}

async function refreshAccessToken(creds: YouTubeCredentials): Promise<string | null> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: creds.clientId,
      client_secret: creds.clientSecret,
      refresh_token: creds.refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  const data = await res.json() as any;
  if (data.error) {
    console.error('❌ YouTube token refresh failed:', data.error_description || data.error);
    return null;
  }

  return data.access_token;
}

// ═══════════════════════════════════════════════════════════════
// API HELPERS
// ═══════════════════════════════════════════════════════════════

async function ytFetch(url: string, token: string): Promise<any> {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if ((data as any).error) {
    throw new Error((data as any).error.message || JSON.stringify((data as any).error));
  }
  return data;
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
}

// ═══════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════

/**
 * Fetch a full channel snapshot: channel stats + per-video metrics + traffic sources.
 * This is the main entry point — call this from the snapshot script.
 */
export async function fetchYouTubeSnapshot(days: number = 28): Promise<YouTubeChannelSnapshot | null> {
  const creds = loadCredentials();
  if (!creds) return null;

  // Refresh access token
  const token = await refreshAccessToken(creds);
  if (!token) return null;

  const startDate = daysAgo(days);
  const endDate = daysAgo(0);

  // Geo data uses 365-day window (small channels need wider range for country dimension)
  const geoStartDate = daysAgo(365);

  // Fetch channel info + video list + analytics + geo + traffic in parallel
  const [channelData, uploadsData, analyticsData, trafficData, geoData] = await Promise.all([
    fetchChannelInfo(token, creds.channelId),
    fetchUploadedVideos(token, creds.channelId),
    fetchChannelAnalytics(token, creds.channelId, startDate, endDate),
    fetchTrafficSources(token, creds.channelId, startDate, endDate),
    fetchViewsByCountry(token, creds.channelId, geoStartDate, endDate),
  ]);

  if (!channelData) return null;

  // Fetch per-video analytics
  const videoIds = uploadsData.map((v: any) => v.id);
  const videoAnalytics = await fetchVideoAnalytics(token, creds.channelId, videoIds, startDate, endDate);

  // Combine uploads metadata with analytics
  const videos: YouTubeVideoSnapshot[] = uploadsData.map((v: any) => {
    const stats = videoAnalytics.get(v.id) || {};
    return {
      videoId: v.id,
      title: v.title,
      publishedAt: v.publishedAt,
      views: stats.views || 0,
      likes: stats.likes || 0,
      comments: stats.comments || 0,
      estimatedMinutesWatched: stats.estimatedMinutesWatched || 0,
      averageViewDuration: stats.averageViewDuration || 0,
      subscribersGained: stats.subscribersGained || 0,
    };
  });

  return {
    channelId: creds.channelId,
    date: new Date().toISOString().split('T')[0],
    totalViews: channelData.totalViews,
    totalSubscribers: channelData.totalSubscribers,
    totalVideos: channelData.totalVideos,
    viewsLast28d: analyticsData.views || 0,
    watchTimeLast28d: analyticsData.estimatedMinutesWatched || 0,
    subscribersGainedLast28d: analyticsData.subscribersGained || 0,
    videos,
    trafficSources: trafficData,
    viewsByCountry: geoData,
    capturedAt: new Date().toISOString(),
  };
}

/**
 * Fetch only traffic sources for the last N days.
 * Useful for quick outreach correlation checks.
 */
export async function fetchTrafficSourcesOnly(days: number = 7): Promise<YouTubeTrafficSource[] | null> {
  const creds = loadCredentials();
  if (!creds) return null;

  const token = await refreshAccessToken(creds);
  if (!token) return null;

  return fetchTrafficSources(token, creds.channelId, daysAgo(days), daysAgo(0));
}

/**
 * Fetch daily view breakdown for a specific video.
 * Returns array of { date, views } for the period.
 */
export async function fetchVideoDailyViews(
  videoId: string,
  days: number = 28
): Promise<{ date: string; views: number }[] | null> {
  const creds = loadCredentials();
  if (!creds) return null;

  const token = await refreshAccessToken(creds);
  if (!token) return null;

  const url = `${YT_ANALYTICS_API}/reports?` + new URLSearchParams({
    ids: `channel==${creds.channelId}`,
    startDate: daysAgo(days),
    endDate: daysAgo(0),
    metrics: 'views',
    dimensions: 'day',
    filters: `video==${videoId}`,
    sort: 'day',
  });

  const data = await ytFetch(url, token);
  return (data.rows || []).map((row: any[]) => ({
    date: row[0],
    views: row[1],
  }));
}

// ═══════════════════════════════════════════════════════════════
// INTERNAL FETCHERS
// ═══════════════════════════════════════════════════════════════

async function fetchChannelInfo(token: string, channelId: string) {
  const url = `${YT_DATA_API}/channels?` + new URLSearchParams({
    part: 'statistics',
    id: channelId,
  });

  const data = await ytFetch(url, token);
  const stats = data.items?.[0]?.statistics;
  if (!stats) return null;

  return {
    totalViews: parseInt(stats.viewCount) || 0,
    totalSubscribers: parseInt(stats.subscriberCount) || 0,
    totalVideos: parseInt(stats.videoCount) || 0,
  };
}

async function fetchUploadedVideos(token: string, channelId: string, maxResults = 50) {
  // Get uploads playlist
  const channelUrl = `${YT_DATA_API}/channels?` + new URLSearchParams({
    part: 'contentDetails',
    id: channelId,
  });
  const channelData = await ytFetch(channelUrl, token);
  const uploadsPlaylistId = channelData.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
  if (!uploadsPlaylistId) return [];

  // Get videos from uploads playlist
  const playlistUrl = `${YT_DATA_API}/playlistItems?` + new URLSearchParams({
    part: 'snippet',
    playlistId: uploadsPlaylistId,
    maxResults: String(maxResults),
  });
  const playlistData = await ytFetch(playlistUrl, token);

  return (playlistData.items || []).map((item: any) => ({
    id: item.snippet.resourceId.videoId,
    title: item.snippet.title,
    publishedAt: item.snippet.publishedAt,
  }));
}

async function fetchChannelAnalytics(token: string, channelId: string, startDate: string, endDate: string) {
  const url = `${YT_ANALYTICS_API}/reports?` + new URLSearchParams({
    ids: `channel==${channelId}`,
    startDate,
    endDate,
    metrics: 'views,estimatedMinutesWatched,subscribersGained,likes,comments',
  });

  const data = await ytFetch(url, token);
  const row = data.rows?.[0];
  if (!row) return {};

  return {
    views: row[0],
    estimatedMinutesWatched: row[1],
    subscribersGained: row[2],
    likes: row[3],
    comments: row[4],
  };
}

async function fetchTrafficSources(
  token: string,
  channelId: string,
  startDate: string,
  endDate: string,
): Promise<YouTubeTrafficSource[]> {
  const url = `${YT_ANALYTICS_API}/reports?` + new URLSearchParams({
    ids: `channel==${channelId}`,
    startDate,
    endDate,
    metrics: 'views,estimatedMinutesWatched',
    dimensions: 'insightTrafficSourceType',
    sort: '-views',
  });

  const data = await ytFetch(url, token);
  return (data.rows || []).map((row: any[]) => ({
    videoId: 'channel', // channel-level, not per-video
    sourceType: row[0],
    views: row[1],
    watchTimeMinutes: row[2],
  }));
}

async function fetchViewsByCountry(
  token: string,
  channelId: string,
  startDate: string,
  endDate: string,
): Promise<YouTubeGeoView[]> {
  const url = `${YT_ANALYTICS_API}/reports?` + new URLSearchParams({
    ids: `channel==${channelId}`,
    startDate,
    endDate,
    metrics: 'views,estimatedMinutesWatched',
    dimensions: 'country',
    sort: '-views',
    maxResults: '25',
  });

  try {
    const data = await ytFetch(url, token);
    return (data.rows || []).map((row: any[]) => ({
      country: row[0],
      views: row[1],
      watchTimeMinutes: row[2],
    }));
  } catch (err: any) {
    console.warn('⚠️  Could not fetch geo data:', err.message);
    return [];
  }
}

/**
 * Fetch external traffic source detail (which URLs drive traffic).
 * Dimension: insightTrafficSourceDetail with filter insightTrafficSourceType==EXTERNAL.
 */
export async function fetchExternalTrafficDetail(
  days: number = 28,
): Promise<{ source: string; views: number; watchTimeMinutes: number }[] | null> {
  const creds = loadCredentials();
  if (!creds) return null;

  const token = await refreshAccessToken(creds);
  if (!token) return null;

  const url = `${YT_ANALYTICS_API}/reports?` + new URLSearchParams({
    ids: `channel==${creds.channelId}`,
    startDate: daysAgo(days),
    endDate: daysAgo(0),
    metrics: 'views,estimatedMinutesWatched',
    dimensions: 'insightTrafficSourceDetail',
    filters: 'insightTrafficSourceType==EXT_URL',
    sort: '-views',
    maxResults: '25',
  });

  try {
    const data = await ytFetch(url, token);
    return (data.rows || []).map((row: any[]) => ({
      source: row[0],
      views: row[1],
      watchTimeMinutes: row[2],
    }));
  } catch (err: any) {
    console.warn('⚠️  Could not fetch external detail:', err.message);
    return null;
  }
}

async function fetchVideoAnalytics(
  token: string,
  channelId: string,
  videoIds: string[],
  startDate: string,
  endDate: string,
): Promise<Map<string, any>> {
  const result = new Map<string, any>();
  if (videoIds.length === 0) return result;

  // YouTube Analytics API supports filtering by video (comma-separated)
  const url = `${YT_ANALYTICS_API}/reports?` + new URLSearchParams({
    ids: `channel==${channelId}`,
    startDate,
    endDate,
    metrics: 'views,likes,comments,estimatedMinutesWatched,averageViewDuration,subscribersGained',
    dimensions: 'video',
    filters: `video==${videoIds.join(',')}`,
    sort: '-views',
  });

  const data = await ytFetch(url, token);
  for (const row of data.rows || []) {
    result.set(row[0], {
      views: row[1],
      likes: row[2],
      comments: row[3],
      estimatedMinutesWatched: row[4],
      averageViewDuration: row[5],
      subscribersGained: row[6],
    });
  }

  return result;
}

// ═══════════════════════════════════════════════════════════════
// EXPORT NAMESPACE
// ═══════════════════════════════════════════════════════════════

export const youtubeFetcher = {
  fetchSnapshot: fetchYouTubeSnapshot,
  fetchTrafficSources: fetchTrafficSourcesOnly,
  fetchVideoDailyViews,
  fetchExternalTrafficDetail,
};
