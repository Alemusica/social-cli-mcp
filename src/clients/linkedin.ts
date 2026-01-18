/**
 * LinkedIn Client
 * Uses LinkedIn Marketing API for posting
 *
 * Setup required:
 * 1. Create app at linkedin.com/developers
 * 2. Request "Share on LinkedIn" permission
 * 3. Get OAuth 2.0 access token
 */

import type { PostResult, LinkedInPostOptions, SocialClient, Config } from '../types.js';

const LINKEDIN_API_BASE = 'https://api.linkedin.com/v2';

// LinkedIn API Response types
interface LinkedInMeResponse {
  id?: string;
  localizedFirstName?: string;
  localizedLastName?: string;
  serviceErrorCode?: number;
  message?: string;
}

interface LinkedInPostResponse {
  id?: string;
  serviceErrorCode?: number;
  message?: string;
}

interface LinkedInUploadResponse {
  value?: {
    uploadMechanism?: {
      'com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest'?: {
        uploadUrl?: string;
      };
    };
    asset?: string;
  };
}

export class LinkedInClient implements SocialClient {
  platform = 'linkedin' as const;
  private config: Config['linkedin'];
  private personUrn: string | null = null;

  constructor(config?: Config['linkedin']) {
    this.config = config;
  }

  isConfigured(): boolean {
    return !!(this.config?.accessToken);
  }

  async testConnection(): Promise<boolean> {
    if (!this.config?.accessToken) {
      return false;
    }

    try {
      const response = await fetch(`${LINKEDIN_API_BASE}/me`, {
        headers: {
          'Authorization': `Bearer ${this.config.accessToken}`,
        },
      });

      const data = await response.json() as LinkedInMeResponse;

      if (data.serviceErrorCode) {
        console.error('❌ LinkedIn connection failed:', data.message);
        return false;
      }

      this.personUrn = `urn:li:person:${data.id}`;
      console.log(`✅ LinkedIn connected as ${data.localizedFirstName} ${data.localizedLastName}`);
      return true;
    } catch (error) {
      console.error('❌ LinkedIn connection failed:', error);
      return false;
    }
  }

  async post(options: LinkedInPostOptions): Promise<PostResult> {
    if (!this.config?.accessToken) {
      return {
        success: false,
        platform: 'linkedin',
        error: 'LinkedIn client not configured',
      };
    }

    // Ensure we have the person URN
    if (!this.personUrn) {
      const connected = await this.testConnection();
      if (!connected) {
        return {
          success: false,
          platform: 'linkedin',
          error: 'Failed to get LinkedIn profile',
        };
      }
    }

    try {
      let text = options.text;

      // Add hashtags
      if (options.hashtags?.length) {
        text += '\n\n' + options.hashtags.map(h => h.startsWith('#') ? h : `#${h}`).join(' ');
      }

      // Build share content
      const shareContent: any = {
        author: this.personUrn,
        lifecycleState: 'PUBLISHED',
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: {
              text: text,
            },
            shareMediaCategory: 'NONE',
          },
        },
        visibility: {
          'com.linkedin.ugc.MemberNetworkVisibility': options.visibility || 'PUBLIC',
        },
      };

      // Add link if provided
      if (options.link) {
        shareContent.specificContent['com.linkedin.ugc.ShareContent'].shareMediaCategory = 'ARTICLE';
        shareContent.specificContent['com.linkedin.ugc.ShareContent'].media = [{
          status: 'READY',
          originalUrl: options.link,
        }];
      }

      // Add image if provided
      if (options.mediaUrls?.length && !options.link) {
        // Upload images first
        const mediaAssets = await this.uploadImages(options.mediaUrls);

        if (mediaAssets.length > 0) {
          shareContent.specificContent['com.linkedin.ugc.ShareContent'].shareMediaCategory = 'IMAGE';
          shareContent.specificContent['com.linkedin.ugc.ShareContent'].media = mediaAssets.map(asset => ({
            status: 'READY',
            media: asset,
          }));
        }
      }

      const response = await fetch(`${LINKEDIN_API_BASE}/ugcPosts`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.accessToken}`,
          'Content-Type': 'application/json',
          'X-Restli-Protocol-Version': '2.0.0',
        },
        body: JSON.stringify(shareContent),
      });

      const data = await response.json() as LinkedInPostResponse;

      if (data.serviceErrorCode) {
        return {
          success: false,
          platform: 'linkedin',
          error: data.message || 'Unknown error',
        };
      }

      // Extract post ID from URN
      const postId = data.id?.split(':').pop() || data.id;

      return {
        success: true,
        platform: 'linkedin',
        postId: postId,
        url: `https://www.linkedin.com/feed/update/${data.id}`,
      };
    } catch (error: any) {
      return {
        success: false,
        platform: 'linkedin',
        error: error.message || 'Failed to post to LinkedIn',
      };
    }
  }

  private async uploadImages(imageUrls: string[]): Promise<string[]> {
    const assets: string[] = [];

    for (const imageUrl of imageUrls) {
      try {
        // Register upload
        const registerResponse = await fetch(`${LINKEDIN_API_BASE}/assets?action=registerUpload`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.config!.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            registerUploadRequest: {
              recipes: ['urn:li:digitalmediaRecipe:feedshare-image'],
              owner: this.personUrn,
              serviceRelationships: [{
                relationshipType: 'OWNER',
                identifier: 'urn:li:userGeneratedContent',
              }],
            },
          }),
        });

        const registerData = await registerResponse.json() as LinkedInUploadResponse;
        const uploadUrl = registerData.value?.uploadMechanism?.['com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest']?.uploadUrl;
        const asset = registerData.value?.asset;

        if (uploadUrl && asset) {
          // Fetch image and upload
          const imageResponse = await fetch(imageUrl);
          const imageBuffer = await imageResponse.arrayBuffer();

          await fetch(uploadUrl, {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${this.config!.accessToken}`,
              'Content-Type': 'image/jpeg',
            },
            body: imageBuffer,
          });

          assets.push(asset);
        }
      } catch (error) {
        console.error('Failed to upload image to LinkedIn:', error);
      }
    }

    return assets;
  }
}
