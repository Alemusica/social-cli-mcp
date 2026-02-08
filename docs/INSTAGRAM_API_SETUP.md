# Instagram Graph API v24 Setup Guide

> Complete guide for setting up Instagram Graph API for posting, insights, and analytics.
> Updated for Graph API v24.0 (January 2026)

## Table of Contents

1. [Quick Start](#quick-start)
2. [Prerequisites](#prerequisites)
3. [Step-by-Step Setup](#step-by-step-setup)
4. [Token Management](#token-management)
5. [API Capabilities](#api-capabilities)
6. [Rate Limits](#rate-limits)
7. [Troubleshooting](#troubleshooting)

---

## Quick Start

If you already have credentials, store them in macOS Keychain:

```bash
# Required credentials
security add-generic-password -s "social-cli-mcp" -a "INSTAGRAM_ACCESS_TOKEN" -w "YOUR_LONG_LIVED_TOKEN" -U
security add-generic-password -s "social-cli-mcp" -a "INSTAGRAM_BUSINESS_ACCOUNT_ID" -w "YOUR_IG_ACCOUNT_ID" -U
security add-generic-password -s "social-cli-mcp" -a "FACEBOOK_PAGE_ID" -w "YOUR_FB_PAGE_ID" -U

# Verify
security find-generic-password -s "social-cli-mcp" -a "INSTAGRAM_ACCESS_TOKEN" -w
```

---

## Prerequisites

### Account Requirements

- **Instagram Business** or **Creator** account (not Personal)
- **Facebook Page** linked to the Instagram account
- **Facebook Developer Account** at [developers.facebook.com](https://developers.facebook.com)

### Linking Instagram to Facebook Page

1. Open Instagram app → Settings → Account → Linked Accounts
2. Select Facebook → Choose the Page to link
3. Or: Facebook Page Settings → Instagram → Connect Account

---

## Step-by-Step Setup

### 1. Create Facebook App

1. Go to [developers.facebook.com/apps](https://developers.facebook.com/apps)
2. Click **Create App**
3. Select **Business** type
4. Enter app name (e.g., "FLUTUR Social CLI")
5. Link to your Business Portfolio (or create one)

### 2. Add Instagram Graph API Product

1. In your app dashboard, click **Add Product**
2. Find **Instagram Graph API** → Click **Set Up**
3. This enables the Instagram API endpoints

### 3. Configure App Permissions

Go to **App Review** → **Permissions and Features**. Request these permissions:

#### Required Permissions (Minimum)

| Permission | Purpose |
|------------|---------|
| `instagram_basic` | Read account info, followers, media |
| `instagram_content_publish` | Publish posts, reels, stories, carousels |
| `pages_read_engagement` | Access linked Facebook Page |

#### Recommended Permissions (Full Features)

| Permission | Purpose |
|------------|---------|
| `instagram_manage_insights` | Access analytics and audience data |
| `instagram_manage_comments` | Read/reply to comments |
| `instagram_manage_messages` | DMs (if needed) |
| `pages_show_list` | List all pages you manage |
| `business_management` | Business account features |

#### Currently Enabled (FLUTUR)

```
pages_show_list, ads_management, ads_read, business_management,
pages_read_engagement, pages_manage_ads, pages_manage_metadata,
pages_messaging, catalog_management, instagram_basic,
instagram_branded_content_creator, instagram_content_publish,
instagram_manage_comments, instagram_manage_contents,
instagram_manage_insights, instagram_manage_messages, leads_retrieval,
manage_fundraisers, publish_video, threads_business_basic,
whatsapp_business_management, whatsapp_business_messaging
```

### 4. Generate Access Token

#### Method A: Graph API Explorer (Development)

1. Go to [Graph API Explorer](https://developers.facebook.com/tools/explorer/)
2. Select your app from dropdown
3. Click **Generate Access Token**
4. Select permissions: `instagram_basic`, `instagram_content_publish`, `pages_read_engagement`
5. Authorize when prompted
6. Copy the generated token (this is short-lived, ~1 hour)

#### Method B: System User Token (Production)

For long-term automation, use System User tokens:

1. Go to Business Settings → System Users
2. Create a System User with Admin role
3. Assign your app to this user
4. Generate token with needed permissions
5. This token never expires unless revoked

### 5. Convert to Long-Lived Token

Short-lived tokens expire in ~1 hour. Convert to 60-day token:

```bash
# Get your App ID and App Secret from App Dashboard → Settings → Basic
APP_ID="your_app_id"
APP_SECRET="your_app_secret"
SHORT_TOKEN="your_short_lived_token"

curl "https://graph.facebook.com/v24.0/oauth/access_token?\
grant_type=fb_exchange_token&\
client_id=${APP_ID}&\
client_secret=${APP_SECRET}&\
fb_exchange_token=${SHORT_TOKEN}"
```

Response:
```json
{
  "access_token": "EAAG...long_token...",
  "token_type": "bearer",
  "expires_in": 5183944
}
```

### 6. Get Instagram Business Account ID

```bash
TOKEN="your_long_lived_token"

# Step 1: Get your Facebook Pages
curl "https://graph.facebook.com/v24.0/me/accounts?access_token=${TOKEN}"

# Response shows your pages with IDs
# { "data": [{ "id": "PAGE_ID", "name": "Your Page" }] }

# Step 2: Get Instagram account linked to page
PAGE_ID="your_page_id"
curl "https://graph.facebook.com/v24.0/${PAGE_ID}?fields=instagram_business_account&access_token=${TOKEN}"

# Response:
# { "instagram_business_account": { "id": "17841400123456789" } }
```

### 7. Store Credentials

```bash
# Store in macOS Keychain
security add-generic-password -s "social-cli-mcp" -a "INSTAGRAM_ACCESS_TOKEN" -w "YOUR_LONG_LIVED_TOKEN" -U
security add-generic-password -s "social-cli-mcp" -a "INSTAGRAM_BUSINESS_ACCOUNT_ID" -w "17841400123456789" -U
security add-generic-password -s "social-cli-mcp" -a "FACEBOOK_PAGE_ID" -w "YOUR_PAGE_ID" -U

# Store App credentials for token refresh
security add-generic-password -s "social-cli-mcp" -a "FACEBOOK_APP_ID" -w "YOUR_APP_ID" -U
security add-generic-password -s "social-cli-mcp" -a "FACEBOOK_APP_SECRET" -w "YOUR_APP_SECRET" -U
```

---

## Token Management

### Token Expiration

| Token Type | Lifespan | Notes |
|------------|----------|-------|
| Short-lived | ~1 hour | From Graph API Explorer |
| Long-lived User | 60 days | Exchanged from short-lived |
| Page Token | Never* | Derived from long-lived user token |
| System User | Never | Until revoked |

*Page tokens derived from long-lived user tokens don't expire.

### Refresh Long-Lived Token

Long-lived tokens can be refreshed if:
- Token is at least 24 hours old
- Token hasn't expired yet
- User granted `instagram_graph_user_profile` permission

```bash
# Refresh token (extends by another 60 days)
npx tsx scripts/refresh-instagram-token.ts

# Or manually:
curl "https://graph.facebook.com/v24.0/oauth/access_token?\
grant_type=fb_exchange_token&\
client_id=${APP_ID}&\
client_secret=${APP_SECRET}&\
fb_exchange_token=${CURRENT_TOKEN}"
```

### Get Never-Expiring Page Token

```bash
# After getting long-lived user token, get page token
USER_ID="your_user_id"
curl "https://graph.facebook.com/v24.0/${USER_ID}/accounts?access_token=${LONG_LIVED_TOKEN}"

# The page token returned will be permanent
```

### Check Token Status

```bash
# Debug token
curl "https://graph.facebook.com/debug_token?input_token=${YOUR_TOKEN}&access_token=${YOUR_TOKEN}"
```

---

## API Capabilities

### Implemented in this Client

| Feature | Status | Method |
|---------|--------|--------|
| Single Image Post | ✅ | `client.post({ mediaUrls: [...] })` |
| Single Video Post | ✅ | `client.post({ mediaUrls: ['video.mp4'] })` |
| Carousel (2-10 items) | ✅ | `client.post({ mediaUrls: [...multiple] })` |
| Reels (up to 90s) | ✅ | `client.postReel(videoUrl, caption)` |
| Stories (up to 60s) | ✅ | `client.postStory(mediaUrl)` |
| Account Insights | ✅ | `client.getAccountInsights()` |
| Media Insights | ✅ | `client.getMediaInsights(mediaId)` |
| Audience Demographics | ✅ | `client.getAudienceInsights()` |
| Best Posting Times | ✅ | `client.getBestPostingTimes()` |
| Hashtag Search | ✅ | `client.searchHashtag(name)` |
| Hashtag Analysis | ✅ | `client.analyzeHashtag(name)` |

### Media Requirements

| Type | Format | Max Size | Aspect Ratio |
|------|--------|----------|--------------|
| Image | JPEG, PNG | 8MB | 1.91:1 to 4:5 |
| Video | MP4, MOV | 1GB | 1.91:1 to 9:16 |
| Reels | MP4, MOV | 1GB | 9:16 recommended |
| Stories | JPEG, PNG, MP4 | 100MB | 9:16 |
| Carousel | Mixed | Per item | 1:1 recommended |

### Video Specifications

| Parameter | Feed Video | Reels | Stories |
|-----------|-----------|-------|---------|
| Duration | 3s - 60min | 3s - 90s | 1s - 60s |
| Resolution | 1080p min | 1080x1920 | 1080x1920 |
| Frame Rate | 24-60fps | 24-60fps | 24-30fps |
| Codec | H.264 | H.264 | H.264 |

---

## Rate Limits

### Publishing Limits

| Action | Limit | Period |
|--------|-------|--------|
| **Posts** | 100 | per 24 hours |
| **Stories** | 100 | per 24 hours |
| **Reels** | 100 | per 24 hours |
| **Total API-published** | 100 | per 24 hours per account |

### Hashtag Search Limits

| Limit | Value |
|-------|-------|
| Unique hashtags | 30 per 7 days |
| Top media per hashtag | 50 posts |
| Recent media per hashtag | 50 posts |

### Insights API Limits

| Endpoint | Calls | Period |
|----------|-------|--------|
| Account insights | 200 | per hour |
| Media insights | 200 | per hour |
| Audience insights | 200 | per hour |

### General Rate Limits

```
App-level: 200 calls per user per hour
Business accounts: Higher limits available with verified business
```

---

## Troubleshooting

### Common Errors

#### `(#10) Application does not have permission`
**Cause:** Missing permission
**Fix:** Add permission in App Review → Permissions

#### `Invalid access token`
**Cause:** Token expired or revoked
**Fix:** Generate new token via Graph API Explorer

#### `Session has expired`
**Cause:** Short-lived token expired
**Fix:** Convert to long-lived token

#### `(#36000) The image or video could not be processed`
**Cause:** Media doesn't meet requirements
**Fix:** Check format, size, and aspect ratio

#### `Media not yet ready for publishing`
**Cause:** Video still processing
**Fix:** Wait longer (Reels can take 60+ seconds)

#### `Error while fetching container status`
**Cause:** Network timeout during video upload
**Fix:** Increase timeout, check internet connection

### Debug Commands

```bash
# Test connection
npx tsx -e "import {InstagramClient} from './src/clients/instagram.js'; const c = new InstagramClient({accessToken: process.env.INSTAGRAM_ACCESS_TOKEN, businessAccountId: process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID}); c.testConnection()"

# Check token validity
curl "https://graph.facebook.com/debug_token?input_token=TOKEN&access_token=TOKEN"

# Get account info
curl "https://graph.facebook.com/v24.0/ACCOUNT_ID?fields=username,name,followers_count&access_token=TOKEN"
```

---

## Code Examples

### Basic Post

```typescript
import { InstagramClient } from './src/clients/instagram.js';
import { loadCredentialsToEnv } from './src/core/credentials.js';

await loadCredentialsToEnv();

const client = new InstagramClient({
  accessToken: process.env.INSTAGRAM_ACCESS_TOKEN!,
  businessAccountId: process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID!,
});

// Single image
const result = await client.post({
  text: 'Hello Instagram!',
  caption: 'Hello Instagram!',
  mediaUrls: ['https://example.com/image.jpg'],
  hashtags: ['flutur', 'music'],
});

// Carousel
const carousel = await client.post({
  text: 'Check out these moments',
  caption: 'Check out these moments',
  mediaUrls: [
    'https://example.com/img1.jpg',
    'https://example.com/img2.jpg',
    'https://example.com/img3.jpg',
  ],
});

// Reel
const reel = await client.postReel(
  'https://example.com/video.mp4',
  'Watch this!',
  {
    hashtags: ['music', 'performance'],
    shareToFeed: true
  }
);
```

### Get Insights

```typescript
// Account insights
const account = await client.getAccountInsights('days_28');
console.log(`Reach: ${account?.reach}`);
console.log(`Profile views: ${account?.profileViews}`);

// Media insights
const media = await client.getMediaInsights('MEDIA_ID');
console.log(`Likes: ${media?.likes}, Shares: ${media?.shares}`);

// Audience demographics (requires 100+ followers)
const audience = await client.getAudienceInsights();
console.log('Top cities:', audience?.topCities);

// Best posting times
const bestTimes = await client.getBestPostingTimes();
console.log('Best times to post:', bestTimes);
```

### Hashtag Research

```typescript
// Analyze a hashtag (counts toward 30/week limit)
const analysis = await client.analyzeHashtag('handpan');
console.log(`Avg likes: ${analysis?.avgLikes}`);
console.log(`Avg comments: ${analysis?.avgComments}`);
```

---

## Related Files

- [src/clients/instagram.ts](../src/clients/instagram.ts) - Client implementation
- [src/types.ts](../src/types.ts) - Type definitions
- [scripts/refresh-instagram-token.ts](../scripts/refresh-instagram-token.ts) - Token refresh utility

---

## Sources

- [Instagram Graph API Guide 2026](https://getlate.dev/blog/instagram-graph-api)
- [Meta Developer Documentation](https://developers.facebook.com/docs/instagram-api)
- [Graph API v24 Changelog](https://developers.facebook.com/docs/graph-api/changelog)

---

*Last updated: 2026-01-22*
