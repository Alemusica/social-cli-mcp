/**
 * Configuration loader
 */

import { config as dotenvConfig } from 'dotenv';
import type { Config } from '../types.js';

// Load .env file
dotenvConfig();

export function loadConfig(): Config {
  return {
    twitter: process.env.TWITTER_API_KEY ? {
      apiKey: process.env.TWITTER_API_KEY,
      apiSecret: process.env.TWITTER_API_SECRET || '',
      accessToken: process.env.TWITTER_ACCESS_TOKEN || '',
      accessSecret: process.env.TWITTER_ACCESS_SECRET || '',
    } : undefined,

    reddit: process.env.REDDIT_CLIENT_ID ? {
      clientId: process.env.REDDIT_CLIENT_ID,
      clientSecret: process.env.REDDIT_CLIENT_SECRET || '',
      username: process.env.REDDIT_USERNAME || '',
      password: process.env.REDDIT_PASSWORD || '',
      userAgent: process.env.REDDIT_USER_AGENT || 'social-cli-mcp/1.0.0',
    } : undefined,

    linkedin: process.env.LINKEDIN_ACCESS_TOKEN ? {
      clientId: process.env.LINKEDIN_CLIENT_ID || '',
      clientSecret: process.env.LINKEDIN_CLIENT_SECRET || '',
      accessToken: process.env.LINKEDIN_ACCESS_TOKEN,
    } : undefined,

    instagram: process.env.INSTAGRAM_ACCESS_TOKEN ? {
      accessToken: process.env.INSTAGRAM_ACCESS_TOKEN,
      businessAccountId: process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID || '',
      facebookPageId: process.env.FACEBOOK_PAGE_ID || '',
    } : undefined,

    tiktok: process.env.TIKTOK_ACCESS_TOKEN ? {
      clientKey: process.env.TIKTOK_CLIENT_KEY || '',
      clientSecret: process.env.TIKTOK_CLIENT_SECRET || '',
      accessToken: process.env.TIKTOK_ACCESS_TOKEN,
      openId: process.env.TIKTOK_OPEN_ID || '',
    } : undefined,

    youtube: process.env.YOUTUBE_ACCESS_TOKEN ? {
      clientId: process.env.YOUTUBE_CLIENT_ID || '',
      clientSecret: process.env.YOUTUBE_CLIENT_SECRET || '',
      accessToken: process.env.YOUTUBE_ACCESS_TOKEN,
      refreshToken: process.env.YOUTUBE_REFRESH_TOKEN || '',
      channelId: process.env.YOUTUBE_CHANNEL_ID || '',
    } : undefined,

    xai: process.env.XAI_API_KEY ? {
      apiKey: process.env.XAI_API_KEY,
    } : undefined,
  };
}

export function getConfiguredPlatforms(config: Config): string[] {
  const platforms: string[] = [];

  if (config.twitter?.apiKey) platforms.push('twitter');
  if (config.reddit?.clientId) platforms.push('reddit');
  if (config.linkedin?.accessToken) platforms.push('linkedin');
  if (config.instagram?.accessToken) platforms.push('instagram');
  if (config.tiktok?.accessToken) platforms.push('tiktok');
  if (config.youtube?.accessToken) platforms.push('youtube');

  return platforms;
}
