/**
 * TikTok Client
 * Uses TikTok Content Posting API for video uploads
 *
 * Setup required:
 * 1. Create app at developers.tiktok.com
 * 2. Request Content Posting API access
 * 3. Complete OAuth 2.0 flow to get access token
 *
 * Note: Public videos require audit approval
 * Private/Friends-only videos work immediately
 */

import * as fs from 'fs';
import * as path from 'path';
import type { PostResult, TikTokPostOptions, SocialClient, Config } from '../types.js';

const TIKTOK_API_BASE = 'https://open.tiktokapis.com/v2';

interface TikTokApiResponse {
  data?: {
    publish_id?: string;
    upload_url?: string;
    status?: string;
  };
  error?: {
    code: string;
    message: string;
  };
}

export class TikTokClient implements SocialClient {
  platform = 'tiktok' as const;
  private config: Config['tiktok'];

  constructor(config?: Config['tiktok']) {
    this.config = config;
  }

  isConfigured(): boolean {
    return !!(
      this.config?.clientKey &&
      this.config?.clientSecret &&
      this.config?.accessToken &&
      this.config?.openId
    );
  }

  async testConnection(): Promise<boolean> {
    if (!this.config?.accessToken) {
      return false;
    }

    try {
      const response = await fetch(
        `${TIKTOK_API_BASE}/user/info/?fields=display_name,avatar_url,follower_count`,
        {
          headers: {
            'Authorization': `Bearer ${this.config.accessToken}`,
          },
        }
      );

      const data = await response.json() as any;

      if (data.error) {
        console.error('TikTok connection failed:', data.error.message);
        return false;
      }

      console.log(`TikTok connected as ${data.data?.user?.display_name || 'Unknown'}`);
      return true;
    } catch (error) {
      console.error('TikTok connection failed:', error);
      return false;
    }
  }

  async post(options: TikTokPostOptions): Promise<PostResult> {
    if (!this.config?.accessToken || !this.config?.openId) {
      return {
        success: false,
        platform: 'tiktok',
        error: 'TikTok client not configured',
      };
    }

    try {
      // Step 1: Initialize video upload
      const initResponse = await this.initializeUpload(options);

      if (!initResponse.data?.upload_url) {
        return {
          success: false,
          platform: 'tiktok',
          error: initResponse.error?.message || 'Failed to initialize upload',
        };
      }

      // Step 2: Upload video file
      const uploadSuccess = await this.uploadVideo(
        initResponse.data.upload_url,
        options.videoUrl
      );

      if (!uploadSuccess) {
        return {
          success: false,
          platform: 'tiktok',
          error: 'Failed to upload video',
        };
      }

      // Step 3: Publish the video
      const publishResponse = await this.publishVideo(initResponse.data.publish_id!);

      if (publishResponse.error) {
        return {
          success: false,
          platform: 'tiktok',
          error: publishResponse.error.message,
        };
      }

      return {
        success: true,
        platform: 'tiktok',
        postId: publishResponse.data?.publish_id,
      };
    } catch (error: any) {
      return {
        success: false,
        platform: 'tiktok',
        error: error.message || 'Failed to post to TikTok',
      };
    }
  }

  /**
   * Post a video to TikTok
   * Videos should be 9:16 aspect ratio, max 10 minutes
   */
  async postVideo(
    videoPath: string,
    title: string,
    options?: Partial<TikTokPostOptions>
  ): Promise<PostResult> {
    let description = title;
    if (options?.hashtags?.length) {
      description += ' ' + options.hashtags.map(h => h.startsWith('#') ? h : `#${h}`).join(' ');
    }

    return this.post({
      text: description,
      videoUrl: videoPath,
      title: description,
      privacyLevel: options?.privacyLevel || 'SELF_ONLY', // Start private, then make public
      disableDuet: options?.disableDuet ?? false,
      disableStitch: options?.disableStitch ?? false,
      disableComment: options?.disableComment ?? false,
      ...options,
    });
  }

  private async initializeUpload(options: TikTokPostOptions): Promise<TikTokApiResponse> {
    // Get file size if local file
    let fileSize = 0;
    if (fs.existsSync(options.videoUrl)) {
      const stats = fs.statSync(options.videoUrl);
      fileSize = stats.size;
    }

    const body = {
      post_info: {
        title: options.title,
        privacy_level: options.privacyLevel || 'SELF_ONLY',
        disable_duet: options.disableDuet ?? false,
        disable_stitch: options.disableStitch ?? false,
        disable_comment: options.disableComment ?? false,
        brand_content_toggle: options.brandContentToggle ?? false,
        brand_organic_toggle: options.brandOrganicToggle ?? false,
      },
      source_info: {
        source: 'FILE_UPLOAD',
        video_size: fileSize,
        chunk_size: fileSize, // Single chunk for simplicity
        total_chunk_count: 1,
      },
    };

    const response = await fetch(
      `${TIKTOK_API_BASE}/post/publish/video/init/`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config!.accessToken}`,
          'Content-Type': 'application/json; charset=UTF-8',
        },
        body: JSON.stringify(body),
      }
    );

    return response.json() as Promise<TikTokApiResponse>;
  }

  private async uploadVideo(uploadUrl: string, videoPath: string): Promise<boolean> {
    try {
      let videoData: Buffer;

      if (fs.existsSync(videoPath)) {
        // Local file
        videoData = fs.readFileSync(videoPath);
      } else if (videoPath.startsWith('http')) {
        // Remote URL - fetch and upload
        const response = await fetch(videoPath);
        videoData = Buffer.from(await response.arrayBuffer());
      } else {
        throw new Error('Invalid video path');
      }

      const response = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'video/mp4',
          'Content-Range': `bytes 0-${videoData.length - 1}/${videoData.length}`,
        },
        body: videoData,
      });

      return response.ok;
    } catch (error) {
      console.error('Video upload error:', error);
      return false;
    }
  }

  private async publishVideo(publishId: string): Promise<TikTokApiResponse> {
    const response = await fetch(
      `${TIKTOK_API_BASE}/post/publish/status/fetch/`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config!.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ publish_id: publishId }),
      }
    );

    return response.json() as Promise<TikTokApiResponse>;
  }

  /**
   * Get creator info and stats
   */
  async getCreatorInfo(): Promise<any> {
    if (!this.config?.accessToken) return null;

    const response = await fetch(
      `${TIKTOK_API_BASE}/user/info/?fields=open_id,union_id,display_name,avatar_url,follower_count,following_count,likes_count,video_count`,
      {
        headers: {
          'Authorization': `Bearer ${this.config.accessToken}`,
        },
      }
    );

    return response.json();
  }
}
