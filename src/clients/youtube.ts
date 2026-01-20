/**
 * YouTube Client
 * Uses YouTube Data API v3 for video uploads
 *
 * Setup required:
 * 1. Enable YouTube Data API v3 in Google Cloud Console
 * 2. Create OAuth 2.0 credentials
 * 3. Complete OAuth flow to get access/refresh tokens
 *
 * Supports: Regular videos, Shorts, playlists
 */

import * as fs from 'fs';
import * as path from 'path';
import type { PostResult, YouTubePostOptions, SocialClient, Config } from '../types.js';

const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';
const YOUTUBE_UPLOAD_URL = 'https://www.googleapis.com/upload/youtube/v3/videos';

interface YouTubeApiResponse {
  id?: string;
  snippet?: {
    title: string;
    description: string;
    channelTitle: string;
    tags?: string[];
  };
  status?: {
    uploadStatus: string;
    privacyStatus: string;
  };
  error?: {
    code: number;
    message: string;
    errors?: Array<{ reason: string; message: string }>;
  };
}

export class YouTubeClient implements SocialClient {
  platform = 'youtube' as const;
  private config: Config['youtube'];

  constructor(config?: Config['youtube']) {
    this.config = config;
  }

  isConfigured(): boolean {
    return !!(
      this.config?.clientId &&
      this.config?.clientSecret &&
      this.config?.accessToken
    );
  }

  async testConnection(): Promise<boolean> {
    if (!this.config?.accessToken) {
      return false;
    }

    try {
      const response = await fetch(
        `${YOUTUBE_API_BASE}/channels?part=snippet&mine=true`,
        {
          headers: {
            'Authorization': `Bearer ${this.config.accessToken}`,
          },
        }
      );

      const data = await response.json() as any;

      if (data.error) {
        console.error('YouTube connection failed:', data.error.message);
        return false;
      }

      const channel = data.items?.[0]?.snippet;
      console.log(`YouTube connected as ${channel?.title || 'Unknown'}`);
      return true;
    } catch (error) {
      console.error('YouTube connection failed:', error);
      return false;
    }
  }

  async post(options: YouTubePostOptions): Promise<PostResult> {
    if (!this.config?.accessToken) {
      return {
        success: false,
        platform: 'youtube',
        error: 'YouTube client not configured',
      };
    }

    try {
      // Build video metadata
      const metadata = {
        snippet: {
          title: options.title,
          description: this.buildDescription(options),
          tags: options.tags || options.hashtags,
          categoryId: options.categoryId || '22', // People & Blogs
        },
        status: {
          privacyStatus: options.privacyStatus || 'private',
          selfDeclaredMadeForKids: options.madeForKids ?? false,
        },
      };

      // For Shorts, add #Shorts to title if not present
      if (options.isShort && !metadata.snippet.title.includes('#Shorts')) {
        metadata.snippet.title += ' #Shorts';
      }

      // Upload video
      const videoId = await this.uploadVideoFile(options.videoPath, metadata);

      if (!videoId) {
        return {
          success: false,
          platform: 'youtube',
          error: 'Failed to upload video',
        };
      }

      // Upload custom thumbnail if provided
      if (options.thumbnailPath) {
        await this.setThumbnail(videoId, options.thumbnailPath);
      }

      // Add to playlist if specified
      if (options.playlistId) {
        await this.addToPlaylist(videoId, options.playlistId);
      }

      const url = options.isShort
        ? `https://youtube.com/shorts/${videoId}`
        : `https://youtube.com/watch?v=${videoId}`;

      return {
        success: true,
        platform: 'youtube',
        postId: videoId,
        url,
      };
    } catch (error: any) {
      return {
        success: false,
        platform: 'youtube',
        error: error.message || 'Failed to post to YouTube',
      };
    }
  }

  /**
   * Upload a regular video (convenience method)
   */
  async postVideo(
    videoPath: string,
    title: string,
    options?: Partial<YouTubePostOptions>
  ): Promise<PostResult> {
    return this.post({
      text: options?.description || title,
      videoPath,
      title,
      ...options,
    });
  }

  /**
   * Upload a YouTube Short (vertical video, max 60 seconds)
   */
  async uploadShort(
    videoPath: string,
    title: string,
    options?: Partial<YouTubePostOptions>
  ): Promise<PostResult> {
    return this.post({
      text: options?.description || title,
      videoPath,
      title,
      isShort: true,
      ...options,
    });
  }

  private buildDescription(options: YouTubePostOptions): string {
    let description = options.description || options.text || '';

    // Add hashtags
    if (options.hashtags?.length) {
      description += '\n\n' + options.hashtags.map(h => h.startsWith('#') ? h : `#${h}`).join(' ');
    }

    // Add link
    if (options.link) {
      description += '\n\n' + options.link;
    }

    return description;
  }

  private async uploadVideoFile(videoPath: string, metadata: any): Promise<string | null> {
    if (!fs.existsSync(videoPath)) {
      throw new Error(`Video file not found: ${videoPath}`);
    }

    const videoData = fs.readFileSync(videoPath);
    const boundary = '-------314159265358979323846';

    // Create multipart request body
    const metadataString = JSON.stringify(metadata);
    const requestBody = Buffer.concat([
      Buffer.from(
        `--${boundary}\r\n` +
        'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
        metadataString + '\r\n' +
        `--${boundary}\r\n` +
        'Content-Type: video/*\r\n\r\n'
      ),
      videoData,
      Buffer.from(`\r\n--${boundary}--`),
    ]);

    const response = await fetch(
      `${YOUTUBE_UPLOAD_URL}?uploadType=multipart&part=snippet,status`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config!.accessToken}`,
          'Content-Type': `multipart/related; boundary=${boundary}`,
          'Content-Length': String(requestBody.length),
        },
        body: requestBody,
      }
    );

    const data = await response.json() as YouTubeApiResponse;

    if (data.error) {
      throw new Error(data.error.message);
    }

    return data.id || null;
  }

  private async setThumbnail(videoId: string, thumbnailPath: string): Promise<boolean> {
    if (!fs.existsSync(thumbnailPath)) {
      return false;
    }

    const thumbnailData = fs.readFileSync(thumbnailPath);

    const response = await fetch(
      `${YOUTUBE_API_BASE}/thumbnails/set?videoId=${videoId}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config!.accessToken}`,
          'Content-Type': 'image/jpeg',
        },
        body: thumbnailData,
      }
    );

    return response.ok;
  }

  private async addToPlaylist(videoId: string, playlistId: string): Promise<boolean> {
    const response = await fetch(
      `${YOUTUBE_API_BASE}/playlistItems?part=snippet`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config!.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          snippet: {
            playlistId,
            resourceId: {
              kind: 'youtube#video',
              videoId,
            },
          },
        }),
      }
    );

    return response.ok;
  }

  /**
   * Create a new playlist
   */
  async createPlaylist(
    title: string,
    description: string,
    privacyStatus: 'public' | 'private' | 'unlisted' = 'public'
  ): Promise<string | null> {
    const response = await fetch(
      `${YOUTUBE_API_BASE}/playlists?part=snippet,status`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config!.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          snippet: { title, description },
          status: { privacyStatus },
        }),
      }
    );

    const data = await response.json() as YouTubeApiResponse;
    return data.id || null;
  }

  /**
   * Get channel analytics (basic)
   */
  async getChannelStats(): Promise<any> {
    const response = await fetch(
      `${YOUTUBE_API_BASE}/channels?part=statistics,snippet&mine=true`,
      {
        headers: {
          'Authorization': `Bearer ${this.config!.accessToken}`,
        },
      }
    );

    return response.json();
  }

  /**
   * Get recent video performance
   */
  async getRecentVideos(maxResults: number = 10): Promise<any> {
    const response = await fetch(
      `${YOUTUBE_API_BASE}/search?part=snippet&forMine=true&maxResults=${maxResults}&order=date&type=video`,
      {
        headers: {
          'Authorization': `Bearer ${this.config!.accessToken}`,
        },
      }
    );

    return response.json();
  }
}
