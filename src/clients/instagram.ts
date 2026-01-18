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

      // Determine if single image, carousel, or video
      const isVideo = options.mediaUrls.some(url =>
        url.endsWith('.mp4') || url.endsWith('.mov') || url.includes('video')
      );
      const isCarousel = options.mediaUrls.length > 1;

      let containerId: string;

      if (isCarousel) {
        // Create carousel container
        containerId = await this.createCarouselContainer(options.mediaUrls, caption);
      } else if (isVideo) {
        // Create video container
        containerId = await this.createVideoContainer(options.mediaUrls[0], caption);
      } else {
        // Create single image container
        containerId = await this.createImageContainer(options.mediaUrls[0], caption);
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
