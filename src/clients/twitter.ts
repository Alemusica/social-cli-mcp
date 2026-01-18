/**
 * Twitter/X Client
 * Uses twitter-api-v2 for posting
 */

import { TwitterApi } from 'twitter-api-v2';
import type { PostResult, TwitterPostOptions, SocialClient, Config } from '../types.js';

export class TwitterClient implements SocialClient {
  platform = 'twitter' as const;
  private client: TwitterApi | null = null;
  private config: Config['twitter'];

  constructor(config?: Config['twitter']) {
    this.config = config;
    if (config) {
      this.client = new TwitterApi({
        appKey: config.apiKey,
        appSecret: config.apiSecret,
        accessToken: config.accessToken,
        accessSecret: config.accessSecret,
      });
    }
  }

  isConfigured(): boolean {
    return !!(
      this.config?.apiKey &&
      this.config?.apiSecret &&
      this.config?.accessToken &&
      this.config?.accessSecret
    );
  }

  async testConnection(): Promise<boolean> {
    if (!this.client) return false;
    try {
      const me = await this.client.v2.me();
      console.log(`✅ Twitter connected as @${me.data.username}`);
      return true;
    } catch (error) {
      console.error('❌ Twitter connection failed:', error);
      return false;
    }
  }

  async post(options: TwitterPostOptions): Promise<PostResult> {
    if (!this.client) {
      return {
        success: false,
        platform: 'twitter',
        error: 'Twitter client not configured',
      };
    }

    try {
      let text = options.text;

      // Add hashtags if provided
      if (options.hashtags?.length) {
        text += '\n\n' + options.hashtags.map(h => h.startsWith('#') ? h : `#${h}`).join(' ');
      }

      // Add link if provided
      if (options.link) {
        text += '\n\n' + options.link;
      }

      // Handle media uploads
      let mediaIds: string[] = [];
      if (options.mediaUrls?.length) {
        for (const mediaUrl of options.mediaUrls) {
          // For local files or URLs
          const mediaId = await this.client.v1.uploadMedia(mediaUrl);
          mediaIds.push(mediaId);
        }
      }

      // Create tweet
      const tweetOptions: any = {};
      if (mediaIds.length > 0) {
        tweetOptions.media = { media_ids: mediaIds };
      }
      if (options.replyToId) {
        tweetOptions.reply = { in_reply_to_tweet_id: options.replyToId };
      }
      if (options.quoteTweetId) {
        tweetOptions.quote_tweet_id = options.quoteTweetId;
      }

      const result = await this.client.v2.tweet(text, tweetOptions);

      return {
        success: true,
        platform: 'twitter',
        postId: result.data.id,
        url: `https://twitter.com/i/status/${result.data.id}`,
      };
    } catch (error: any) {
      return {
        success: false,
        platform: 'twitter',
        error: error.message || 'Failed to post tweet',
      };
    }
  }

  /**
   * Post a thread (multiple tweets)
   */
  async postThread(tweets: string[]): Promise<PostResult[]> {
    const results: PostResult[] = [];
    let replyToId: string | undefined;

    for (const text of tweets) {
      const result = await this.post({
        text,
        replyToId,
      });
      results.push(result);

      if (result.success && result.postId) {
        replyToId = result.postId;
      } else {
        break; // Stop thread if a tweet fails
      }
    }

    return results;
  }
}
