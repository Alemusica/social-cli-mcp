/**
 * Instagram Client
 * Uses Instagram Graph API (requires Business/Creator account)
 *
 * Setup required:
 * 1. Create Facebook App at developers.facebook.com
 * 2. Add Instagram Graph API product
 * 3. Link Facebook Page to Instagram Business/Creator account
 * 4. Get long-lived access token
 */

import type { PostResult, InstagramPostOptions, SocialClient, Config } from '../types.js';

const GRAPH_API_VERSION = 'v18.0';
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
        console.error('❌ Instagram connection failed:', data.error.message);
        return false;
      }

      console.log(`✅ Instagram connected as @${data.username}`);
      return true;
    } catch (error) {
      console.error('❌ Instagram connection failed:', error);
      return false;
    }
  }

  async post(options: InstagramPostOptions): Promise<PostResult> {
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

      const postType = options.postType || 'feed';
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

      return {
        success: true,
        platform: 'instagram',
        postId: publishData.id,
        url: mediaData.permalink,
      };
    } catch (error: any) {
      return {
        success: false,
        platform: 'instagram',
        error: error.message || 'Failed to post to Instagram',
      };
    }
  }

  /**
   * Post a Reel (video up to 90 seconds)
   * Perfect for music clips, live looping snippets
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
   * Great for behind-the-scenes, daily updates
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

    // Optional cover image for the Reel
    if (options?.coverUrl) {
      body.cover_url = options.coverUrl;
    }

    // Optional audio name (for music)
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
  private async createStoriesContainer(mediaUrl: string, caption: string): Promise<string> {
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
    // First, create individual media items
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

      // Wait 2 seconds before checking again
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    throw new Error('Media processing timeout');
  }
}
