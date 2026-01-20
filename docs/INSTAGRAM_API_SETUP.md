# Instagram Graph API Setup

## App Permissions (Enabled)

```
pages_show_list
ads_management
ads_read
business_management
pages_read_engagement
pages_manage_ads
pages_manage_metadata
pages_messaging
catalog_management
instagram_basic
instagram_branded_content_creator
instagram_content_publish
instagram_manage_comments
instagram_manage_contents
instagram_manage_insights
instagram_manage_messages
leads_retrieval
manage_fundraisers
publish_video
threads_business_basic
whatsapp_business_management
whatsapp_business_messaging
```

## Required Permissions for Posting

For this social-cli-mcp bot to work, these are the minimum required:

- `instagram_basic` - Read account info
- `instagram_content_publish` - Publish posts, reels, stories
- `pages_read_engagement` - Access linked Facebook page

## Token Generation

1. Go to [Graph API Explorer](https://developers.facebook.com/tools/explorer/)
2. Select the app
3. Add permissions: `instagram_basic`, `instagram_content_publish`, `pages_read_engagement`
4. Generate Access Token
5. Authorize

## Token Storage (macOS Keychain)

```bash
# Save token
security add-generic-password -s "social-cli-mcp" -a "INSTAGRAM_ACCESS_TOKEN" -w "YOUR_TOKEN" -U

# Save Business Account ID
security add-generic-password -s "social-cli-mcp" -a "INSTAGRAM_BUSINESS_ACCOUNT_ID" -w "YOUR_ACCOUNT_ID" -U

# Verify
security find-generic-password -s "social-cli-mcp" -a "INSTAGRAM_ACCESS_TOKEN" -w
```

## Convert to Long-Lived Token (60 days)

```bash
curl "https://graph.facebook.com/v18.0/oauth/access_token?grant_type=fb_exchange_token&client_id=YOUR_APP_ID&client_secret=YOUR_APP_SECRET&fb_exchange_token=SHORT_TOKEN"
```

## Get Instagram Business Account ID

```bash
# Get pages
curl "https://graph.facebook.com/v18.0/me/accounts?access_token=YOUR_TOKEN"

# Get Instagram account from page
curl "https://graph.facebook.com/v18.0/PAGE_ID?fields=instagram_business_account&access_token=YOUR_TOKEN"
```

## API Endpoints Used

- `POST /{ig-user-id}/media` - Create media container
- `POST /{ig-user-id}/media_publish` - Publish container
- `GET /{media-id}?fields=permalink` - Get post URL

## Troubleshooting

### Error: Session expired
Token expired. Generate new one from Graph API Explorer.

### Error: (#10) Application does not have permission
Permission not enabled. Check App Review → Permissions in Facebook Developers.

### Error: Invalid access token
Token is malformed or was revoked. Regenerate.

---
*Last updated: 2026-01-20*
