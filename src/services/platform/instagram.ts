/**
 * Instagram Platform Client
 * Pure API client — no DB writes.
 * Wraps Instagram Graph API with structured logging.
 *
 * Setup required:
 * 1. Create Facebook App at developers.facebook.com
 * 2. Add Instagram Graph API product
 * 3. Link Facebook Page to Instagram Business/Creator account
 * 4. Get long-lived access token
 *
 * Features:
 * - Duplicate detection before posting (via duplicate-checker)
 * - Automatic post recording for future duplicate checks
 */

import { createLogger } from '../../lib/logger.js';
import type {
  PostResult,
  InstagramPostOptions,
  SocialClient,
  Config,
  InstagramAccountInsights,
  InstagramMediaInsights,
  InstagramAudienceInsights
} from '../../types.js';
import { checkDuplicate, recordPost } from '../../core/duplicate-checker.js';

const log = createLogger('instagram');

const GRAPH_API_VERSION = 'v24.0';
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

// Instagram API Response types
interface IGApiResponse {
  id?: string;
  username?: string;
  name?: string;
  permalink?: string;
  status_code?: string;
  error?: {
    message: string;
    type?: string;
    code?: number;
  };
}

export class InstagramClient implements SocialClient {
  platform = 'instagram' as const;
  private config: Config['instagram'];

  constructor(config?: Config['instagram']) {
    this.config = config;
  }

  isConfigured(): boolean {
    return !!(
      this.config?.accessToken &&
      this.config?.businessAccountId
    );
  }

  async testConnection(): Promise<boolean> {
    if (!this.config?.accessToken || !this.config?.businessAccountId) {
      return false;
    }

    try {
      const response = await fetch(
        `${GRAPH_API_BASE}/${this.config.businessAccountId}?fields=username,name&access_token=${this.config.accessToken}`
      );
      const data = await response.json() as IGApiResponse;

      if (data.error) {
        log.error('connection failed', { error: data.error.message });
        return false;
      }

      log.info('connected', { username: data.username });
      return true;
    } catch (error: any) {
      log.error('connection failed', { error: error.message });
      return false;
    }
  }

  async post(options: InstagramPostOptions & {
    skipDuplicateCheck?: boolean;
    topic?: string;
    topicKeywords?: string[];
  }): Promise<PostResult> {
    if (!this.config?.accessToken || !this.config?.businessAccountId) {
      return {
        success: false,
        platform: 'instagram',
        error: 'Instagram client not configured',
      };
    }

    if (!options.mediaUrls?.length) {
      return {
        success: false,
        platform: 'instagram',
        error: 'Instagram requires at least one image or video',
      };
    }

    try {
      // Build caption
      let caption = options.caption || options.text;
      if (options.hashtags?.length) {
        caption += '\n\n' + options.hashtags.map(h => h.startsWith('#') ? h : `#${h}`).join(' ');
      }

      // Check for duplicates (unless explicitly skipped or it's a story)
      const postType = options.postType || 'feed';
      if (!options.skipDuplicateCheck && postType !== 'stories') {
        const duplicateCheck = await checkDuplicate('instagram', caption, {
          topic: options.topic,
        });

        if (duplicateCheck.isDuplicate) {
          return {
            success: false,
            platform: 'instagram',
            error: `Duplicate detected: ${duplicateCheck.reason}`,
          };
        }
      }

      let containerId: string;

      // Handle different post types
      if (postType === 'reels') {
        containerId = await this.createReelsContainer(options.mediaUrls[0], caption, options);
      } else if (postType === 'stories') {
        containerId = await this.createStoriesContainer(options.mediaUrls[0], caption);
      } else {
        // Regular feed post
        const isVideo = options.mediaUrls.some(url =>
          url.endsWith('.mp4') || url.endsWith('.mov') || url.includes('video')
        );
        const isCarousel = options.mediaUrls.length > 1;

        if (isCarousel) {
          containerId = await this.createCarouselContainer(options.mediaUrls, caption);
        } else if (isVideo) {
          containerId = await this.createVideoContainer(options.mediaUrls[0], caption);
        } else {
          containerId = await this.createImageContainer(options.mediaUrls[0], caption);
        }
      }

      // Publish the container
      const publishResponse = await fetch(
        `${GRAPH_API_BASE}/${this.config.businessAccountId}/media_publish`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            creation_id: containerId,
            access_token: this.config.accessToken,
          }),
        }
      );

      const publishData = await publishResponse.json() as IGApiResponse;

      if (publishData.error) {
        return {
          success: false,
          platform: 'instagram',
          error: publishData.error.message,
        };
      }

      // Get permalink
      const mediaResponse = await fetch(
        `${GRAPH_API_BASE}/${publishData.id}?fields=permalink&access_token=${this.config.accessToken}`
      );
      const mediaData = await mediaResponse.json() as IGApiResponse;

      // Record the post for future duplicate checking (unless it's a story)
      if (postType !== 'stories') {
        await recordPost('instagram', {
          id: publishData.id!,
          text: caption,
          topic: options.topic,
          keywords: options.topicKeywords,
        });
      }

      return {
        success: true,
        platform: 'instagram',
        postId: publishData.id,
        url: mediaData.permalink,
      };
    } catch (error: any) {
      log.error('post failed', { error: error.message });
      return {
        success: false,
        platform: 'instagram',
        error: error.message || 'Failed to post to Instagram',
      };
    }
  }

  /**
   * Post a Reel (video up to 90 seconds)
   */
  async postReel(videoUrl: string, caption: string, options?: {
    coverUrl?: string;
    shareToFeed?: boolean;
    audioName?: string;
    hashtags?: string[];
  }): Promise<PostResult> {
    let fullCaption = caption;
    if (options?.hashtags?.length) {
      fullCaption += '\n\n' + options.hashtags.map(h => h.startsWith('#') ? h : `#${h}`).join(' ');
    }

    return this.post({
      text: caption,
      caption: fullCaption,
      mediaUrls: [videoUrl],
      postType: 'reels',
      coverUrl: options?.coverUrl,
      shareToFeed: options?.shareToFeed ?? true,
      audioName: options?.audioName,
    });
  }

  /**
   * Post a Story (image or video up to 60 seconds)
   */
  async postStory(mediaUrl: string, caption?: string): Promise<PostResult> {
    return this.post({
      text: caption || '',
      caption: caption || '',
      mediaUrls: [mediaUrl],
      postType: 'stories',
    });
  }

  private async createImageContainer(imageUrl: string, caption: string): Promise<string> {
    const response = await fetch(
      `${GRAPH_API_BASE}/${this.config!.businessAccountId}/media`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_url: imageUrl,
          caption: caption,
          access_token: this.config!.accessToken,
        }),
      }
    );

    const data = await response.json() as IGApiResponse;
    if (data.error) throw new Error(data.error.message);
    return data.id!;
  }

  private async createVideoContainer(videoUrl: string, caption: string): Promise<string> {
    const response = await fetch(
      `${GRAPH_API_BASE}/${this.config!.businessAccountId}/media`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          media_type: 'VIDEO',
          video_url: videoUrl,
          caption: caption,
          access_token: this.config!.accessToken,
        }),
      }
    );

    const data = await response.json() as IGApiResponse;
    if (data.error) throw new Error(data.error.message);

    // Wait for video processing
    await this.waitForMediaProcessing(data.id!);

    return data.id!;
  }

  /**
   * Create a Reels container
   * Reels support videos up to 90 seconds, 9:16 aspect ratio recommended
   */
  private async createReelsContainer(
    videoUrl: string,
    caption: string,
    options?: InstagramPostOptions
  ): Promise<string> {
    const body: Record<string, any> = {
      media_type: 'REELS',
      video_url: videoUrl,
      caption: caption,
      access_token: this.config!.accessToken,
      share_to_feed: options?.shareToFeed ?? true,
    };

    if (options?.coverUrl) {
      body.cover_url = options.coverUrl;
    }

    if (options?.audioName) {
      body.audio_name = options.audioName;
    }

    const response = await fetch(
      `${GRAPH_API_BASE}/${this.config!.businessAccountId}/media`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }
    );

    const data = await response.json() as IGApiResponse;
    if (data.error) throw new Error(data.error.message);

    // Wait for video processing (Reels can take longer)
    await this.waitForMediaProcessing(data.id!, 60);

    return data.id!;
  }

  /**
   * Create a Stories container
   * Stories support images and videos up to 60 seconds
   */
  private async createStoriesContainer(mediaUrl: string, _caption: string): Promise<string> {
    const isVideo = mediaUrl.endsWith('.mp4') || mediaUrl.endsWith('.mov') || mediaUrl.includes('video');

    const body: Record<string, any> = {
      media_type: 'STORIES',
      access_token: this.config!.accessToken,
    };

    if (isVideo) {
      body.video_url = mediaUrl;
    } else {
      body.image_url = mediaUrl;
    }

    const response = await fetch(
      `${GRAPH_API_BASE}/${this.config!.businessAccountId}/media`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }
    );

    const data = await response.json() as IGApiResponse;
    if (data.error) throw new Error(data.error.message);

    if (isVideo) {
      await this.waitForMediaProcessing(data.id!, 30);
    }

    return data.id!;
  }

  private async createCarouselContainer(mediaUrls: string[], caption: string): Promise<string> {
    const childIds: string[] = [];

    for (const url of mediaUrls) {
      const isVideo = url.endsWith('.mp4') || url.endsWith('.mov');

      const response = await fetch(
        `${GRAPH_API_BASE}/${this.config!.businessAccountId}/media`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            is_carousel_item: true,
            ...(isVideo ? { media_type: 'VIDEO', video_url: url } : { image_url: url }),
            access_token: this.config!.accessToken,
          }),
        }
      );

      const data = await response.json() as IGApiResponse;
      if (data.error) throw new Error(data.error.message);

      if (isVideo) {
        await this.waitForMediaProcessing(data.id!);
      }

      childIds.push(data.id!);
    }

    // Create carousel container
    const carouselResponse = await fetch(
      `${GRAPH_API_BASE}/${this.config!.businessAccountId}/media`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          media_type: 'CAROUSEL',
          children: childIds.join(','),
          caption: caption,
          access_token: this.config!.accessToken,
        }),
      }
    );

    const carouselData = await carouselResponse.json() as IGApiResponse;
    if (carouselData.error) throw new Error(carouselData.error.message);
    return carouselData.id!;
  }

  private async waitForMediaProcessing(containerId: string, maxAttempts = 30): Promise<void> {
    for (let i = 0; i < maxAttempts; i++) {
      const response = await fetch(
        `${GRAPH_API_BASE}/${containerId}?fields=status_code&access_token=${this.config!.accessToken}`
      );
      const data = await response.json() as IGApiResponse;

      if (data.status_code === 'FINISHED') {
        return;
      }

      if (data.status_code === 'ERROR') {
        throw new Error('Media processing failed');
      }

      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    throw new Error('Media processing timeout');
  }

  // ─────────────────────────────────────────
  // Instagram Insights API
  // ─────────────────────────────────────────

  /**
   * Get account-level insights
   * Requires: instagram_manage_insights permission
   */
  async getAccountInsights(period: 'day' | 'week' | 'days_28' = 'days_28'): Promise<InstagramAccountInsights | null> {
    if (!this.config?.accessToken || !this.config?.businessAccountId) {
      log.error('client not configured');
      return null;
    }

    try {
      const accountResponse = await fetch(
        `${GRAPH_API_BASE}/${this.config.businessAccountId}?fields=followers_count,media_count,username&access_token=${this.config.accessToken}`
      );
      const accountData = await accountResponse.json() as any;

      if (accountData.error) {
        log.error('getAccountInsights failed', { error: accountData.error.message });
        return null;
      }

      const insights: InstagramAccountInsights = {
        followerCount: accountData.followers_count || 0,
        mediaCount: accountData.media_count || 0,
        period,
      };

      const fetchMetric = async (metric: string, needsTotalValue: boolean = true) => {
        const url = needsTotalValue
          ? `${GRAPH_API_BASE}/${this.config!.businessAccountId}/insights?metric=${metric}&period=${period}&metric_type=total_value&access_token=${this.config!.accessToken}`
          : `${GRAPH_API_BASE}/${this.config!.businessAccountId}/insights?metric=${metric}&period=${period}&access_token=${this.config!.accessToken}`;
        const res = await fetch(url);
        const data = await res.json() as any;
        if (data.data?.[0]) {
          return data.data[0].total_value?.value ?? data.data[0].values?.[0]?.value ?? 0;
        }
        return 0;
      };

      insights.reach = await fetchMetric('reach');
      insights.profileViews = await fetchMetric('profile_views');
      insights.websiteClicks = await fetchMetric('website_clicks');

      return insights;
    } catch (error: any) {
      log.error('getAccountInsights failed', { error: error.message });
      return null;
    }
  }

  /**
   * Get insights for a specific media post
   * Requires: instagram_manage_insights permission
   */
  async getMediaInsights(mediaId: string): Promise<InstagramMediaInsights | null> {
    if (!this.config?.accessToken) {
      log.error('client not configured');
      return null;
    }

    try {
      const response = await fetch(
        `${GRAPH_API_BASE}/${mediaId}?fields=id,media_type,timestamp,permalink,like_count,comments_count,insights.metric(impressions,reach,saved,shares,plays,total_interactions)&access_token=${this.config.accessToken}`
      );
      const data = await response.json() as any;

      if (data.error) {
        log.error('getMediaInsights failed', { mediaId, error: data.error.message });
        return null;
      }

      const insights: InstagramMediaInsights = {
        mediaId: data.id,
        mediaType: data.media_type,
        timestamp: data.timestamp,
        permalink: data.permalink,
        likes: data.like_count,
        comments: data.comments_count,
      };

      if (data.insights?.data) {
        for (const metric of data.insights.data) {
          const value = metric.values?.[0]?.value || 0;
          switch (metric.name) {
            case 'impressions':
              insights.impressions = value;
              break;
            case 'reach':
              insights.reach = value;
              break;
            case 'saved':
              insights.saved = value;
              break;
            case 'shares':
              insights.shares = value;
              break;
            case 'plays':
              insights.plays = value;
              break;
            case 'total_interactions':
              insights.totalInteractions = value;
              break;
          }
        }
      }

      return insights;
    } catch (error: any) {
      log.error('getMediaInsights failed', { mediaId, error: error.message });
      return null;
    }
  }

  /**
   * Get insights for all recent media posts
   * Returns array sorted by most recent first
   */
  async getRecentMediaInsights(limit: number = 10): Promise<InstagramMediaInsights[]> {
    if (!this.config?.accessToken || !this.config?.businessAccountId) {
      log.error('client not configured');
      return [];
    }

    try {
      const mediaResponse = await fetch(
        `${GRAPH_API_BASE}/${this.config.businessAccountId}/media?fields=id&limit=${limit}&access_token=${this.config.accessToken}`
      );
      const mediaData = await mediaResponse.json() as any;

      if (mediaData.error || !mediaData.data) {
        log.error('getRecentMediaInsights failed', { error: mediaData.error?.message });
        return [];
      }

      const insights: InstagramMediaInsights[] = [];
      for (const media of mediaData.data) {
        const mediaInsight = await this.getMediaInsights(media.id);
        if (mediaInsight) {
          insights.push(mediaInsight);
        }
      }

      return insights;
    } catch (error: any) {
      log.error('getRecentMediaInsights failed', { error: error.message });
      return [];
    }
  }

  /**
   * Get audience demographics insights
   * Requires: instagram_manage_insights permission
   * Note: Only available for accounts with 100+ followers
   */
  async getAudienceInsights(): Promise<InstagramAudienceInsights | null> {
    if (!this.config?.accessToken || !this.config?.businessAccountId) {
      log.error('client not configured');
      return null;
    }

    try {
      const insights: InstagramAudienceInsights = {
        ageGender: [],
        topCities: [],
        topCountries: [],
      };

      const demographicsResponse = await fetch(
        `${GRAPH_API_BASE}/${this.config.businessAccountId}/insights?metric=follower_demographics&period=lifetime&metric_type=total_value&breakdown=age,gender&access_token=${this.config.accessToken}`
      );
      const demographicsData = await demographicsResponse.json() as any;

      if (demographicsData.data?.[0]?.total_value?.breakdowns?.[0]?.results) {
        const results = demographicsData.data[0].total_value.breakdowns[0].results;
        const ageGroups: { [key: string]: { male: number; female: number } } = {};

        for (const item of results) {
          const dims = item.dimension_values || [];
          const age = dims[0];
          const gender = dims[1];
          const value = item.value || 0;

          if (age && gender) {
            if (!ageGroups[age]) {
              ageGroups[age] = { male: 0, female: 0 };
            }
            if (gender === 'M') {
              ageGroups[age].male = value;
            } else if (gender === 'F') {
              ageGroups[age].female = value;
            }
          }
        }

        insights.ageGender = Object.entries(ageGroups)
          .map(([ageRange, counts]) => ({ ageRange, ...counts }))
          .sort((a, b) => a.ageRange.localeCompare(b.ageRange));
      }

      const cityResponse = await fetch(
        `${GRAPH_API_BASE}/${this.config.businessAccountId}/insights?metric=follower_demographics&period=lifetime&metric_type=total_value&breakdown=city&access_token=${this.config.accessToken}`
      );
      const cityData = await cityResponse.json() as any;

      if (cityData.data?.[0]?.total_value?.breakdowns?.[0]?.results) {
        insights.topCities = cityData.data[0].total_value.breakdowns[0].results
          .map((item: any) => ({
            city: item.dimension_values?.[0] || 'Unknown',
            count: item.value || 0,
          }))
          .sort((a: any, b: any) => b.count - a.count)
          .slice(0, 10);
      }

      const countryResponse = await fetch(
        `${GRAPH_API_BASE}/${this.config.businessAccountId}/insights?metric=follower_demographics&period=lifetime&metric_type=total_value&breakdown=country&access_token=${this.config.accessToken}`
      );
      const countryData = await countryResponse.json() as any;

      if (countryData.data?.[0]?.total_value?.breakdowns?.[0]?.results) {
        insights.topCountries = countryData.data[0].total_value.breakdowns[0].results
          .map((item: any) => ({
            country: item.dimension_values?.[0] || 'Unknown',
            count: item.value || 0,
          }))
          .sort((a: any, b: any) => b.count - a.count)
          .slice(0, 10);
      }

      const onlineResponse = await fetch(
        `${GRAPH_API_BASE}/${this.config.businessAccountId}/insights?metric=online_followers&period=lifetime&access_token=${this.config.accessToken}`
      );
      const onlineData = await onlineResponse.json() as any;

      if (onlineData.data?.[0]?.values?.[0]?.value) {
        const value = onlineData.data[0].values[0].value;
        insights.onlineFollowers = [];
        for (const [day, hours] of Object.entries(value)) {
          const dayNum = parseInt(day);
          for (const [hour, count] of Object.entries(hours as object)) {
            insights.onlineFollowers.push({
              day: dayNum,
              hour: parseInt(hour),
              count: count as number,
            });
          }
        }
        insights.onlineFollowers.sort((a, b) => b.count - a.count);
      }

      return insights;
    } catch (error: any) {
      log.error('getAudienceInsights failed', { error: error.message });
      return null;
    }
  }

  /**
   * Get best times to post based on when followers are online
   * Returns top 5 time slots
   */
  async getBestPostingTimes(): Promise<{ day: string; hour: string; followers: number }[]> {
    const audience = await this.getAudienceInsights();
    if (!audience?.onlineFollowers?.length) {
      return [];
    }

    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    return audience.onlineFollowers
      .slice(0, 5)
      .map(slot => ({
        day: days[slot.day],
        hour: `${slot.hour.toString().padStart(2, '0')}:00`,
        followers: slot.count,
      }));
  }

  /**
   * Search for hashtag ID by name
   * Note: Rate limited to 30 unique hashtags per 7-day period
   */
  async searchHashtag(hashtagName: string): Promise<{ id: string; name: string } | null> {
    if (!this.config?.accessToken || !this.config?.businessAccountId) {
      log.error('client not configured');
      return null;
    }

    try {
      const cleanTag = hashtagName.replace(/^#/, '');

      const response = await fetch(
        `${GRAPH_API_BASE}/ig_hashtag_search?user_id=${this.config.businessAccountId}&q=${encodeURIComponent(cleanTag)}&access_token=${this.config.accessToken}`
      );
      const data = await response.json() as any;

      if (data.error) {
        log.error('searchHashtag failed', { hashtag: cleanTag, error: data.error.message });
        return null;
      }

      if (data.data?.[0]) {
        return {
          id: data.data[0].id,
          name: cleanTag,
        };
      }

      return null;
    } catch (error: any) {
      log.error('searchHashtag failed', { hashtag: hashtagName, error: error.message });
      return null;
    }
  }

  /**
   * Get top media for a hashtag
   * Returns top posts (most engagement) for the hashtag
   */
  async getHashtagTopMedia(hashtagId: string, limit: number = 10): Promise<any[]> {
    if (!this.config?.accessToken || !this.config?.businessAccountId) {
      log.error('client not configured');
      return [];
    }

    try {
      const response = await fetch(
        `${GRAPH_API_BASE}/${hashtagId}/top_media?user_id=${this.config.businessAccountId}&fields=id,caption,media_type,permalink,like_count,comments_count,timestamp&limit=${limit}&access_token=${this.config.accessToken}`
      );
      const data = await response.json() as any;

      if (data.error) {
        log.error('getHashtagTopMedia failed', { hashtagId, error: data.error.message });
        return [];
      }

      return data.data || [];
    } catch (error: any) {
      log.error('getHashtagTopMedia failed', { hashtagId, error: error.message });
      return [];
    }
  }

  /**
   * Get recent media for a hashtag
   * Returns most recent posts using the hashtag
   */
  async getHashtagRecentMedia(hashtagId: string, limit: number = 10): Promise<any[]> {
    if (!this.config?.accessToken || !this.config?.businessAccountId) {
      log.error('client not configured');
      return [];
    }

    try {
      const response = await fetch(
        `${GRAPH_API_BASE}/${hashtagId}/recent_media?user_id=${this.config.businessAccountId}&fields=id,caption,media_type,permalink,like_count,comments_count,timestamp&limit=${limit}&access_token=${this.config.accessToken}`
      );
      const data = await response.json() as any;

      if (data.error) {
        log.error('getHashtagRecentMedia failed', { hashtagId, error: data.error.message });
        return [];
      }

      return data.data || [];
    } catch (error: any) {
      log.error('getHashtagRecentMedia failed', { hashtagId, error: error.message });
      return [];
    }
  }

  /**
   * Analyze hashtag performance
   * Searches for hashtag and gets engagement stats from top media
   */
  async analyzeHashtag(hashtagName: string): Promise<{
    name: string;
    id: string;
    topMediaCount: number;
    avgLikes: number;
    avgComments: number;
    topPosts: { permalink: string; likes: number; comments: number }[];
  } | null> {
    const hashtag = await this.searchHashtag(hashtagName);
    if (!hashtag) {
      return null;
    }

    const topMedia = await this.getHashtagTopMedia(hashtag.id, 25);

    if (!topMedia.length) {
      return {
        name: hashtag.name,
        id: hashtag.id,
        topMediaCount: 0,
        avgLikes: 0,
        avgComments: 0,
        topPosts: [],
      };
    }

    const totalLikes = topMedia.reduce((sum, m) => sum + (m.like_count || 0), 0);
    const totalComments = topMedia.reduce((sum, m) => sum + (m.comments_count || 0), 0);

    return {
      name: hashtag.name,
      id: hashtag.id,
      topMediaCount: topMedia.length,
      avgLikes: Math.round(totalLikes / topMedia.length),
      avgComments: Math.round(totalComments / topMedia.length),
      topPosts: topMedia.slice(0, 5).map(m => ({
        permalink: m.permalink,
        likes: m.like_count || 0,
        comments: m.comments_count || 0,
      })),
    };
  }
}
