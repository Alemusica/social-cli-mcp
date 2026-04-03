/**
 * Analytics Types — Cross-Platform Intelligence
 *
 * Three data sources:
 *   YouTube Analytics API (OAuth2) → video-level views, traffic sources, watch time
 *   Instagram Insights API (Graph API v24) → account + media metrics, audience
 *   Vercel Web Analytics → NO API available, manual CSV import only
 *
 * The correlator links these to outreach events (email → view → visit → reply).
 */

// ── YouTube Analytics ───────────────────────────────────────────

export interface YouTubeCredentials {
  clientId: string;
  clientSecret: string;
  accessToken: string;
  refreshToken: string;
  channelId: string;
}

export interface YouTubeVideoSnapshot {
  videoId: string;
  title: string;
  publishedAt: string;
  views: number;
  likes: number;
  comments: number;
  estimatedMinutesWatched: number;
  averageViewDuration: number;
  subscribersGained: number;
}

export interface YouTubeTrafficSource {
  videoId: string;
  sourceType: string;
  sourceDetail?: string;
  views: number;
  watchTimeMinutes: number;
}

export interface YouTubeGeoView {
  country: string;
  views: number;
  watchTimeMinutes: number;
}

export interface YouTubeChannelSnapshot {
  channelId: string;
  date: string;
  totalViews: number;
  totalSubscribers: number;
  totalVideos: number;
  viewsLast28d: number;
  watchTimeLast28d: number;
  subscribersGainedLast28d: number;
  videos: YouTubeVideoSnapshot[];
  trafficSources: YouTubeTrafficSource[];
  viewsByCountry: YouTubeGeoView[];
  capturedAt: string;
}

// ── Instagram Insights ──────────────────────────────────────────

export interface InstagramSnapshot {
  date: string;
  followerCount: number;
  mediaCount: number;
  reach28d: number;
  profileViews28d: number;
  websiteClicks28d: number;
  topCountries: { country: string; count: number }[];
  topCities: { city: string; count: number }[];
  recentMedia: InstagramMediaSnapshot[];
  capturedAt: string;
}

export interface InstagramMediaSnapshot {
  mediaId: string;
  mediaType: string;
  timestamp: string;
  permalink?: string;
  likes: number;
  comments: number;
  shares: number;
  saved: number;
  reach: number;
  impressions: number;
  plays?: number;
}

// ── Vercel Web Analytics ────────────────────────────────────────

export interface VercelAnalyticsImport {
  date: string;
  pageViews: number;
  visitors: number;
  topReferrers: { source: string; visits: number }[];
  topPages: { path: string; views: number }[];
  countries: { country: string; visits: number }[];
  importedAt: string;
}

// ── Cross-Platform Correlation ──────────────────────────────────

export interface CorrelationEvent {
  id?: string;
  date: string;
  trigger?: {
    type: 'email' | 'dm' | 'post' | 'unknown';
    targetVenue?: string;
    targetEmail?: string;
    sentAt?: string;
  };
  signals: CorrelationSignal[];
  confidence: 'high' | 'medium' | 'low';
  outcome?: 'reply' | 'booking' | 'decline' | 'silence';
  notes?: string;
  detectedAt: string;
}

export interface CorrelationSignal {
  platform: 'youtube' | 'instagram' | 'epk' | 'email';
  metric: string;
  value: number;
  detail?: string;
  timestamp: string;
}

export interface DailyDigest {
  date: string;
  youtube: {
    totalViews: number;
    externalViews: number;
    channelPageViews: number;
    topExternalSources: { source: string; views: number }[];
  } | null;
  instagram: {
    profileViews: number;
    websiteClicks: number;
    reach: number;
    newFollowers: number;
  } | null;
  epk: {
    pageViews: number;
    visitors: number;
    topReferrers: { source: string; visits: number }[];
  } | null;
  outreach: {
    emailsSent: number;
    recipients: string[];
  };
}

// ── Full Pipeline Output ────────────────────────────────────────

export interface AnalyticsSnapshot {
  capturedAt: string;
  youtube: YouTubeChannelSnapshot | null;
  instagram: InstagramSnapshot | null;
  correlations: CorrelationEvent[];
  insights: string[];
}
