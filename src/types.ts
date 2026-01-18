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

export type Platform = 'twitter' | 'reddit' | 'linkedin' | 'instagram';

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
  xai?: {
    apiKey: string;
  };
}

export interface SocialClient {
  platform: Platform;
  isConfigured(): boolean;
  post(options: PostOptions): Promise<PostResult>;
  testConnection(): Promise<boolean>;
}
