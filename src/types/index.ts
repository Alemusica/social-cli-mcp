/**
 * Social CLI MCP - Type Definitions
 * Canonical type source for all services and platform clients.
 */

export interface PostResult {
  success: boolean;
  platform: Platform;
  postId?: string;
  url?: string;
  error?: string;
}

export type Platform = 'twitter' | 'reddit' | 'linkedin' | 'instagram' | 'tiktok' | 'youtube';

export interface PostOptions {
  text: string;
  mediaUrls?: string[];
  link?: string;
  hashtags?: string[];
  scheduledTime?: Date;
}

export interface TwitterPostOptions extends PostOptions {
  replyToId?: string;
  quoteTweetId?: string;
}

export interface RedditPostOptions extends PostOptions {
  subreddit: string;
  title: string;
  flair?: string;
  nsfw?: boolean;
  spoiler?: boolean;
}

export interface LinkedInPostOptions extends PostOptions {
  visibility?: 'PUBLIC' | 'CONNECTIONS';
}

export interface InstagramPostOptions extends PostOptions {
  caption: string;
  mediaUrls: string[];
  location?: string;
  userTags?: string[];
  postType?: 'feed' | 'reels' | 'stories';
  coverUrl?: string;
  shareToFeed?: boolean;
  audioName?: string;
}

export interface TikTokPostOptions extends PostOptions {
  videoUrl: string;
  title: string;
  privacyLevel?: 'PUBLIC_TO_EVERYONE' | 'MUTUAL_FOLLOW_FRIENDS' | 'SELF_ONLY';
  disableDuet?: boolean;
  disableStitch?: boolean;
  disableComment?: boolean;
  coverTimestampMs?: number;
  brandContentToggle?: boolean;
  brandOrganicToggle?: boolean;
}

export interface YouTubePostOptions extends PostOptions {
  videoPath: string;
  title: string;
  description?: string;
  tags?: string[];
  categoryId?: string;
  privacyStatus?: 'public' | 'private' | 'unlisted';
  madeForKids?: boolean;
  playlistId?: string;
  isShort?: boolean;
  thumbnailPath?: string;
}

export interface Config {
  twitter?: {
    apiKey: string;
    apiSecret: string;
    accessToken: string;
    accessSecret: string;
  };
  reddit?: {
    clientId: string;
    clientSecret: string;
    username: string;
    password: string;
    userAgent: string;
  };
  linkedin?: {
    clientId: string;
    clientSecret: string;
    accessToken: string;
  };
  instagram?: {
    accessToken: string;
    businessAccountId: string;
    facebookPageId: string;
  };
  tiktok?: {
    clientKey: string;
    clientSecret: string;
    accessToken: string;
    openId: string;
  };
  youtube?: {
    clientId: string;
    clientSecret: string;
    accessToken: string;
    refreshToken: string;
    channelId: string;
  };
  xai?: {
    apiKey: string;
  };
}

// ─────────────────────────────────────────
// Content Management Types
// ─────────────────────────────────────────

export type Vertical = 'music' | 'software';

export interface ContentItem {
  id: string;
  vertical: Vertical;
  title: string;
  description: string;
  mediaPath?: string;
  platforms: Platform[];
  status: 'draft' | 'scheduled' | 'published' | 'failed';
  scheduledAt?: Date;
  publishedAt?: Date;
  hashtags?: string[];
  mentions?: string[];
  link?: string;
  results?: PostResult[];
  metadata?: {
    duration?: number;
    aspectRatio?: string;
    fileSize?: number;
    thumbnail?: string;
  };
}

export interface EditorialCalendar {
  vertical: Vertical;
  weekStart: Date;
  items: ContentItem[];
  theme?: string;
  goals?: string[];
}

export interface ContentStrategy {
  vertical: Vertical;
  targetAudience: string[];
  contentPillars: string[];
  postingFrequency: {
    platform: Platform;
    postsPerWeek: number;
    bestTimes: string[];
  }[];
  hashtags: {
    primary: string[];
    secondary: string[];
    trending: string[];
  };
  competitors: string[];
  kpis: {
    metric: string;
    target: number;
    current?: number;
  }[];
}

export interface MarketResearch {
  vertical: Vertical;
  date: Date;
  trends: {
    topic: string;
    volume: number;
    sentiment: 'positive' | 'neutral' | 'negative';
    platforms: Platform[];
  }[];
  competitors: {
    handle: string;
    platform: Platform;
    followers: number;
    engagement: number;
    recentPosts: {
      content: string;
      engagement: number;
      url: string;
    }[];
  }[];
  opportunities: string[];
  recommendations: string[];
}

export interface SocialClient {
  platform: Platform;
  isConfigured(): boolean;
  post(options: PostOptions): Promise<PostResult>;
  testConnection(): Promise<boolean>;
}

// ─────────────────────────────────────────
// Instagram Insights Types
// ─────────────────────────────────────────

export interface InstagramAccountInsights {
  followerCount: number;
  mediaCount: number;
  impressions?: number;
  reach?: number;
  profileViews?: number;
  websiteClicks?: number;
  emailContacts?: number;
  followerGrowth?: number;
  period: 'day' | 'week' | 'days_28';
}

export interface InstagramMediaInsights {
  mediaId: string;
  mediaType: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM' | 'REELS' | 'STORY';
  timestamp: string;
  permalink?: string;
  likes?: number;
  comments?: number;
  shares?: number;
  saved?: number;
  impressions?: number;
  reach?: number;
  plays?: number;
  totalInteractions?: number;
  exits?: number;
  replies?: number;
  tapsForward?: number;
  tapsBack?: number;
}

export interface InstagramAudienceInsights {
  ageGender: {
    ageRange: string;
    male: number;
    female: number;
  }[];
  topCities: {
    city: string;
    count: number;
  }[];
  topCountries: {
    country: string;
    count: number;
  }[];
  onlineFollowers?: {
    hour: number;
    day: number;
    count: number;
  }[];
}
