/**
 * Social CLI MCP - Type Definitions
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
  mediaUrls?: string[];      // URLs or local paths to images/videos
  link?: string;             // Link to include
  hashtags?: string[];       // Auto-appended hashtags
  scheduledTime?: Date;      // For scheduling (if supported)
}

export interface TwitterPostOptions extends PostOptions {
  replyToId?: string;        // Tweet to reply to
  quoteTweetId?: string;     // Tweet to quote
}

export interface RedditPostOptions extends PostOptions {
  subreddit: string;         // Target subreddit (without r/)
  title: string;             // Post title (required for Reddit)
  flair?: string;            // Post flair
  nsfw?: boolean;
  spoiler?: boolean;
}

export interface LinkedInPostOptions extends PostOptions {
  visibility?: 'PUBLIC' | 'CONNECTIONS';
}

export interface InstagramPostOptions extends PostOptions {
  caption: string;           // Instagram caption
  mediaUrls: string[];       // Required for Instagram (image/video)
  location?: string;         // Location tag
  userTags?: string[];       // Users to tag
  postType?: 'feed' | 'reels' | 'stories';  // Type of post (default: feed)
  coverUrl?: string;         // Cover image for Reels
  shareToFeed?: boolean;     // Share Reel to feed (default: true)
  audioName?: string;        // Audio track name for Reels
}

export interface TikTokPostOptions extends PostOptions {
  videoUrl: string;          // Video URL or local path
  title: string;             // Video title (required)
  privacyLevel?: 'PUBLIC_TO_EVERYONE' | 'MUTUAL_FOLLOW_FRIENDS' | 'SELF_ONLY';
  disableDuet?: boolean;
  disableStitch?: boolean;
  disableComment?: boolean;
  coverTimestampMs?: number; // Timestamp for cover frame
  brandContentToggle?: boolean;
  brandOrganicToggle?: boolean;
}

export interface YouTubePostOptions extends PostOptions {
  videoPath: string;         // Local path to video file
  title: string;             // Video title
  description?: string;      // Video description
  tags?: string[];           // Video tags
  categoryId?: string;       // YouTube category ID
  privacyStatus?: 'public' | 'private' | 'unlisted';
  madeForKids?: boolean;
  playlistId?: string;       // Add to playlist after upload
  isShort?: boolean;         // Upload as YouTube Short
  thumbnailPath?: string;    // Custom thumbnail
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
  mediaPath?: string;          // Path to video/image
  platforms: Platform[];       // Target platforms
  status: 'draft' | 'scheduled' | 'published' | 'failed';
  scheduledAt?: Date;
  publishedAt?: Date;
  hashtags?: string[];
  mentions?: string[];
  link?: string;
  results?: PostResult[];
  metadata?: {
    duration?: number;         // Video duration in seconds
    aspectRatio?: string;      // e.g., "9:16", "16:9", "1:1"
    fileSize?: number;
    thumbnail?: string;
  };
}

export interface EditorialCalendar {
  vertical: Vertical;
  weekStart: Date;
  items: ContentItem[];
  theme?: string;              // Weekly theme
  goals?: string[];            // Weekly goals
}

export interface ContentStrategy {
  vertical: Vertical;
  targetAudience: string[];
  contentPillars: string[];    // Main topics/themes
  postingFrequency: {
    platform: Platform;
    postsPerWeek: number;
    bestTimes: string[];       // e.g., ["09:00", "18:00"]
  }[];
  hashtags: {
    primary: string[];         // Always use
    secondary: string[];       // Rotate
    trending: string[];        // Current trends
  };
  competitors: string[];       // Accounts to monitor
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
