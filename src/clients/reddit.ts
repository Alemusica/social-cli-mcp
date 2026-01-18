/**
 * Reddit Client
 * Uses snoowrap for posting
 */

import Snoowrap from 'snoowrap';
import type { PostResult, RedditPostOptions, SocialClient, Config } from '../types.js';

// Type definitions for snoowrap submission
interface RedditSubmission {
  name: string;
  permalink: string;
  selectFlair: (options: { flair_template_id: string }) => Promise<void>;
}

export class RedditClient implements SocialClient {
  platform = 'reddit' as const;
  private client: Snoowrap | null = null;
  private config: Config['reddit'];

  constructor(config?: Config['reddit']) {
    this.config = config;
    if (config) {
      this.client = new Snoowrap({
        userAgent: config.userAgent || 'social-cli-mcp/1.0.0',
        clientId: config.clientId,
        clientSecret: config.clientSecret,
        username: config.username,
        password: config.password,
      });
    }
  }

  isConfigured(): boolean {
    return !!(
      this.config?.clientId &&
      this.config?.clientSecret &&
      this.config?.username &&
      this.config?.password
    );
  }

  async testConnection(): Promise<boolean> {
    if (!this.client) return false;
    try {
      const me = await (this.client.getMe() as Promise<{ name: string }>);
      console.log(`✅ Reddit connected as u/${me.name}`);
      return true;
    } catch (error) {
      console.error('❌ Reddit connection failed:', error);
      return false;
    }
  }

  async post(options: RedditPostOptions): Promise<PostResult> {
    if (!this.client) {
      return {
        success: false,
        platform: 'reddit',
        error: 'Reddit client not configured',
      };
    }

    if (!options.subreddit || !options.title) {
      return {
        success: false,
        platform: 'reddit',
        error: 'Subreddit and title are required for Reddit posts',
      };
    }

    try {
      const subreddit = this.client.getSubreddit(options.subreddit);

      let submission: RedditSubmission;

      // Determine post type
      if (options.link) {
        // Link post
        submission = await (subreddit.submitLink({
          subredditName: options.subreddit,
          title: options.title,
          url: options.link,
          nsfw: options.nsfw,
          spoiler: options.spoiler,
        }) as unknown as Promise<RedditSubmission>);
      } else if (options.mediaUrls?.length) {
        // Image/media post (Reddit handles URLs)
        submission = await (subreddit.submitLink({
          subredditName: options.subreddit,
          title: options.title,
          url: options.mediaUrls[0], // Reddit only supports one media per post
          nsfw: options.nsfw,
          spoiler: options.spoiler,
        }) as unknown as Promise<RedditSubmission>);
      } else {
        // Self/text post
        let text = options.text;

        // Add hashtags as text (Reddit doesn't use hashtags but we can include them)
        if (options.hashtags?.length) {
          text += '\n\n---\n' + options.hashtags.join(' ');
        }

        submission = await (subreddit.submitSelfpost({
          subredditName: options.subreddit,
          title: options.title,
          text: text,
          nsfw: options.nsfw,
          spoiler: options.spoiler,
        }) as unknown as Promise<RedditSubmission>);
      }

      // Apply flair if provided
      if (options.flair && submission) {
        try {
          await submission.selectFlair({ flair_template_id: options.flair });
        } catch {
          // Flair might not be available, ignore error
        }
      }

      return {
        success: true,
        platform: 'reddit',
        postId: submission.name,
        url: `https://reddit.com${submission.permalink}`,
      };
    } catch (error: any) {
      return {
        success: false,
        platform: 'reddit',
        error: error.message || 'Failed to post to Reddit',
      };
    }
  }

  /**
   * Post to multiple subreddits
   */
  async crosspost(
    options: RedditPostOptions,
    subreddits: string[]
  ): Promise<PostResult[]> {
    const results: PostResult[] = [];

    for (const subreddit of subreddits) {
      const result = await this.post({
        ...options,
        subreddit,
      });
      results.push(result);

      // Add delay between posts to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    return results;
  }
}
