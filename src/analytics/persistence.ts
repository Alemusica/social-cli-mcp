/**
 * Analytics Persistence — Save snapshots to SurrealDB
 *
 * Tables:
 *   youtube_snapshot — Channel-level + per-video metrics
 *   youtube_video_snapshot — Individual video metrics (relation to youtube_snapshot)
 *   audience_snapshot — Instagram (already exists in schema)
 *   epk_analytics — Vercel Web Analytics (manual CSV import)
 *   analytics_correlation — Cross-platform correlation events
 */

import { getDb } from '../db/client.js';
import type {
  YouTubeChannelSnapshot,
  InstagramSnapshot,
  VercelAnalyticsImport,
} from './types.js';

// ═══════════════════════════════════════════════════════════════
// YOUTUBE
// ═══════════════════════════════════════════════════════════════

export async function saveYouTubeSnapshot(snap: YouTubeChannelSnapshot): Promise<string> {
  const db = await getDb();
  const id = `yt_${snap.date.replace(/-/g, '_')}`;

  await db.query(`
    UPSERT type::thing("youtube_snapshot", $id) SET
      channel_id = $channelId,
      date = $date,
      total_views = $totalViews,
      total_subscribers = $totalSubscribers,
      total_videos = $totalVideos,
      views_last_28d = $viewsLast28d,
      watch_time_last_28d = $watchTimeLast28d,
      subscribers_gained_last_28d = $subscribersGainedLast28d,
      traffic_sources = $trafficSources,
      views_by_country = $viewsByCountry,
      captured_at = type::datetime($capturedAt)
  `, {
    id,
    channelId: snap.channelId,
    date: snap.date,
    totalViews: snap.totalViews,
    totalSubscribers: snap.totalSubscribers,
    totalVideos: snap.totalVideos,
    viewsLast28d: snap.viewsLast28d,
    watchTimeLast28d: snap.watchTimeLast28d,
    subscribersGainedLast28d: snap.subscribersGainedLast28d,
    trafficSources: snap.trafficSources,
    viewsByCountry: snap.viewsByCountry,
    capturedAt: snap.capturedAt,
  });

  // Save per-video snapshots
  for (const video of snap.videos) {
    const videoId = video.videoId.replace(/[^a-zA-Z0-9]/g, '_');
    await db.query(`
      UPSERT type::thing("youtube_video_snapshot", $vid) SET
        video_id = $videoId,
        title = $title,
        published_at = $publishedAt,
        views = $views,
        likes = $likes,
        comments = $comments,
        watch_time_minutes = $watchTime,
        avg_view_duration = $avgDuration,
        subscribers_gained = $subsGained,
        snapshot_date = $date,
        captured_at = type::datetime($capturedAt)
    `, {
      vid: `${videoId}_${snap.date.replace(/-/g, '_')}`,
      videoId: video.videoId,
      title: video.title,
      publishedAt: video.publishedAt,
      views: video.views,
      likes: video.likes,
      comments: video.comments,
      watchTime: video.estimatedMinutesWatched,
      avgDuration: video.averageViewDuration,
      subsGained: video.subscribersGained,
      date: snap.date,
      capturedAt: snap.capturedAt,
    });
  }

  console.log(`✅ YouTube snapshot saved: ${snap.videos.length} videos, ${snap.viewsLast28d} views (28d)`);
  return id;
}

// ═══════════════════════════════════════════════════════════════
// INSTAGRAM (uses existing audience_snapshot table)
// ═══════════════════════════════════════════════════════════════

export async function saveInstagramSnapshot(snap: InstagramSnapshot): Promise<string> {
  const db = await getDb();
  const id = `ig_${snap.date.replace(/-/g, '_')}`;

  await db.query(`
    UPSERT type::thing("audience_snapshot", $id) SET
      platform = "instagram",
      username = "flutur_8",
      followers = $followers,
      posts_count = $mediaCount,
      reach_28d = $reach,
      profile_views_28d = $profileViews,
      website_clicks_28d = $websiteClicks,
      top_countries = $topCountries,
      top_cities = $topCities,
      captured_at = type::datetime($capturedAt)
  `, {
    id,
    followers: snap.followerCount,
    mediaCount: snap.mediaCount,
    reach: snap.reach28d,
    profileViews: snap.profileViews28d,
    websiteClicks: snap.websiteClicks28d,
    topCountries: snap.topCountries,
    topCities: snap.topCities,
    capturedAt: snap.capturedAt,
  });

  // Save individual media insights
  for (const media of snap.recentMedia) {
    const mediaId = media.mediaId.replace(/[^a-zA-Z0-9]/g, '_');
    await db.query(`
      UPSERT type::thing("instagram_media_snapshot", $mid) SET
        media_id = $mediaId,
        media_type = $mediaType,
        timestamp = $timestamp,
        permalink = $permalink,
        likes = $likes,
        comments = $comments,
        shares = $shares,
        saved = $saved,
        reach = $reach,
        impressions = $impressions,
        plays = $plays,
        snapshot_date = $date,
        captured_at = type::datetime($capturedAt)
    `, {
      mid: `${mediaId}_${snap.date.replace(/-/g, '_')}`,
      mediaId: media.mediaId,
      mediaType: media.mediaType,
      timestamp: media.timestamp,
      permalink: media.permalink,
      likes: media.likes,
      comments: media.comments,
      shares: media.shares,
      saved: media.saved,
      reach: media.reach,
      impressions: media.impressions,
      plays: media.plays || 0,
      date: snap.date,
      capturedAt: snap.capturedAt,
    });
  }

  console.log(`✅ Instagram snapshot saved: ${snap.followerCount} followers, ${snap.recentMedia.length} media`);
  return id;
}

// ═══════════════════════════════════════════════════════════════
// VERCEL EPK ANALYTICS (manual CSV import)
// ═══════════════════════════════════════════════════════════════

export async function saveEpkAnalytics(data: VercelAnalyticsImport): Promise<string> {
  const db = await getDb();
  const id = `epk_${data.date.replace(/-/g, '_')}`;

  await db.query(`
    UPSERT type::thing("epk_analytics", $id) SET
      date = $date,
      page_views = $pageViews,
      visitors = $visitors,
      top_referrers = $topReferrers,
      top_pages = $topPages,
      countries = $countries,
      imported_at = type::datetime($importedAt)
  `, {
    id,
    date: data.date,
    pageViews: data.pageViews,
    visitors: data.visitors,
    topReferrers: data.topReferrers,
    topPages: data.topPages,
    countries: data.countries,
    importedAt: data.importedAt,
  });

  console.log(`✅ EPK analytics saved: ${data.pageViews} views, ${data.visitors} visitors`);
  return id;
}
