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

// ═══════════════════════════════════════════════════════════════
// YOUTUBE ANALYTICS
// ═══════════════════════════════════════════════════════════════

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
  averageViewDuration: number; // seconds
  subscribersGained: number;
}

export interface YouTubeTrafficSource {
  videoId: string;
  sourceType: string;       // EXTERNAL, YT_SEARCH, SUGGESTED, CHANNEL, etc.
  sourceDetail?: string;    // e.g. "8i8.art", "google.com"
  views: number;
  watchTimeMinutes: number;
}

export interface YouTubeGeoView {
  country: string;          // ISO 3166-1 alpha-2 (GR, IT, PT, US, etc.)
  views: number;
  watchTimeMinutes: number;
}

export interface YouTubeChannelSnapshot {
  channelId: string;
  date: string;             // ISO date of snapshot
  totalViews: number;
  totalSubscribers: number;
  totalVideos: number;
  viewsLast28d: number;
  watchTimeLast28d: number; // minutes
  subscribersGainedLast28d: number;
  videos: YouTubeVideoSnapshot[];
  trafficSources: YouTubeTrafficSource[];
  viewsByCountry: YouTubeGeoView[];
  capturedAt: string;       // ISO timestamp
}

// ═══════════════════════════════════════════════════════════════
// INSTAGRAM INSIGHTS (extends existing types in src/types.ts)
// ═══════════════════════════════════════════════════════════════

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
  plays?: number;           // video/reel only
}

// ═══════════════════════════════════════════════════════════════
// VERCEL WEB ANALYTICS (manual CSV import — no API)
// ═══════════════════════════════════════════════════════════════

export interface VercelAnalyticsImport {
  date: string;
  pageViews: number;
  visitors: number;
  topReferrers: { source: string; visits: number }[];
  topPages: { path: string; views: number }[];
  countries: { country: string; visits: number }[];
  importedAt: string;       // when we parsed the CSV
}

// ═══════════════════════════════════════════════════════════════
// CROSS-PLATFORM CORRELATION
// ═══════════════════════════════════════════════════════════════

/**
 * A correlation event links an outreach action to observable signals
 * across YouTube, Instagram, and the EPK site.
 *
 * Example: Email sent Feb 6 → 4 External YT views Feb 6 → site visit Feb 6 → reply Feb 7
 */
export interface CorrelationEvent {
  id?: string;
  date: string;               // the day the signals cluster around
  trigger?: {
    type: 'email' | 'dm' | 'post' | 'unknown';
    targetVenue?: string;     // venue name
    targetEmail?: string;     // email address
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
  metric: string;           // "external_views", "profile_views", "website_clicks", "page_views"
  value: number;
  detail?: string;          // "8i8.art referrer", "channel page views spike"
  timestamp: string;
}

/**
 * Daily analytics digest — snapshot of all platforms for one day.
 * This is what the correlator builds before looking for patterns.
 */
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
    recipients: string[];   // venue names
  };
}

// ═══════════════════════════════════════════════════════════════
// ANALYTICS SNAPSHOT (full pipeline output)
// ═══════════════════════════════════════════════════════════════

export interface AnalyticsSnapshot {
  capturedAt: string;
  youtube: YouTubeChannelSnapshot | null;
  instagram: InstagramSnapshot | null;
  correlations: CorrelationEvent[];
  insights: string[];         // human-readable findings
}
