/**
 * Twitter/X Platform Client
 * Pure API client — no DB writes.
 * Wraps twitter-api-v2 with structured logging.
 *
 * Features:
 * - Duplicate detection before posting (via duplicate-checker)
 * - Automatic post recording for future duplicate checks
 */

import { TwitterApi } from 'twitter-api-v2';
import { createLogger } from '../../lib/logger.js';
import type { PostResult, TwitterPostOptions, SocialClient, Config } from '../../types.js';
import { checkDuplicate, recordPost } from '../content/duplicate-checker.js';

const log = createLogger('twitter');

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
      log.info('connected', { username: me.data.username });
      return true;
    } catch (error: any) {
      log.error('connection failed', { error: error.message });
      return false;
    }
  }

  async post(options: TwitterPostOptions & {
    skipDuplicateCheck?: boolean;
    topic?: string;
    topicKeywords?: string[];
  }): Promise<PostResult> {
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

      // Check for duplicates (unless it's a reply or explicitly skipped)
      if (!options.replyToId && !options.skipDuplicateCheck) {
        const duplicateCheck = await checkDuplicate('twitter', text, {
          topic: options.topic,
        });

        if (duplicateCheck.isDuplicate) {
          return {
            success: false,
            platform: 'twitter',
            error: `Duplicate detected: ${duplicateCheck.reason}`,
          };
        }
      }

      // Handle media uploads
      const mediaIds: string[] = [];
      if (options.mediaUrls?.length) {
        for (const mediaUrl of options.mediaUrls) {
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

      // Record the post for future duplicate checking (unless it's a reply)
      if (!options.replyToId) {
        await recordPost('twitter', {
          id: result.data.id,
          text: text,
          topic: options.topic,
          keywords: options.topicKeywords,
        });
      }

      return {
        success: true,
        platform: 'twitter',
        postId: result.data.id,
        url: `https://twitter.com/i/status/${result.data.id}`,
      };
    } catch (error: any) {
      log.error('post failed', { error: error.message });
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

  /**
   * Get recent tweets from authenticated user
   */
  async getMyRecentTweets(count: number = 10): Promise<{
    success: boolean;
    tweets?: Array<{
      id: string;
      text: string;
      created_at: string;
      metrics?: {
        likes: number;
        retweets: number;
        replies: number;
        impressions: number;
      };
    }>;
    error?: string;
  }> {
    if (!this.client) {
      return { success: false, error: 'Twitter client not configured' };
    }

    try {
      const me = await this.client.v2.me();
      const userId = me.data.id;

      const timeline = await this.client.v2.userTimeline(userId, {
        max_results: count,
        'tweet.fields': ['created_at', 'public_metrics'],
      });

      const tweets = timeline.data.data?.map(tweet => ({
        id: tweet.id,
        text: tweet.text,
        created_at: tweet.created_at || '',
        metrics: tweet.public_metrics ? {
          likes: tweet.public_metrics.like_count,
          retweets: tweet.public_metrics.retweet_count,
          replies: tweet.public_metrics.reply_count,
          impressions: tweet.public_metrics.impression_count || 0,
        } : undefined,
      })) || [];

      return { success: true, tweets };
    } catch (error: any) {
      log.error('getMyRecentTweets failed', { error: error.message });
      return { success: false, error: error.message };
    }
  }

  /**
   * Get user info
   */
  async getMe(): Promise<{ username: string; name: string; followers: number } | null> {
    if (!this.client) return null;
    try {
      const me = await this.client.v2.me({ 'user.fields': ['public_metrics', 'name'] });
      return {
        username: me.data.username,
        name: me.data.name,
        followers: me.data.public_metrics?.followers_count || 0,
      };
    } catch {
      return null;
    }
  }

  /**
   * Delete a tweet
   */
  async deleteTweet(tweetId: string): Promise<{ success: boolean; error?: string }> {
    if (!this.client) {
      return { success: false, error: 'Twitter client not configured' };
    }
    try {
      await this.client.v2.deleteTweet(tweetId);
      return { success: true };
    } catch (error: any) {
      log.error('deleteTweet failed', { tweetId, error: error.message });
      return { success: false, error: error.message };
    }
  }
}
