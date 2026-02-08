/**
 * Analytics Module — Cross-Platform Intelligence
 *
 * Usage:
 *   import { youtubeFetcher, instagramFetcher, correlator } from './analytics/index.js';
 *
 *   const ytSnap = await youtubeFetcher.fetchSnapshot();
 *   const igSnap = await instagramFetcher.fetchSnapshot();
 *   const activity = await correlator.getRecentActivity(7);
 */

// Types
export type {
  YouTubeCredentials,
  YouTubeVideoSnapshot,
  YouTubeTrafficSource,
  YouTubeGeoView,
  YouTubeChannelSnapshot,
  InstagramSnapshot,
  InstagramMediaSnapshot,
  VercelAnalyticsImport,
  CorrelationEvent,
  CorrelationSignal,
  DailyDigest,
  AnalyticsSnapshot,
} from './types.js';

// YouTube
export {
  fetchYouTubeSnapshot,
  fetchTrafficSourcesOnly,
  fetchVideoDailyViews,
  fetchExternalTrafficDetail,
  youtubeFetcher,
} from './youtube-fetcher.js';

// Instagram
export {
  fetchInstagramSnapshot,
  fetchOutreachSignals,
  fetchMediaInsights,
  instagramFetcher,
} from './instagram-fetcher.js';

// Correlator
export {
  buildDailyDigest,
  detectCorrelations,
  getRecentActivity,
  saveCorrelation,
  saveAllCorrelations,
  correlator,
} from './correlator.js';

// Persistence
export {
  saveYouTubeSnapshot,
  saveInstagramSnapshot,
  saveEpkAnalytics,
} from './persistence.js';
