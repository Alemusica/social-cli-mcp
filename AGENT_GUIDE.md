# Social CLI MCP - Agent Guide

Quick-start guide for AI agents working on this project.

## Project Overview

**Owner:** Alessio Ivoy Cazzaniga (@FluturArt)
**Concept:** "M-Shaped Mind" - Deep expertise in Music + Software connected by creativity

### Two Verticals

| Vertical | Brand | Focus |
|----------|-------|-------|
| **Music** | Flutur | RAV Vast, live looping, Greece's Got Talent, street performance |
| **Software** | jsOM | UI Designer for LLM-readable specs |

## Quick Status

### Working Now
- **Twitter API**: OAuth 1.0a configured and posting works
- **Gmail**: SMTP sending configured (flutur8i8@gmail.com)
- **Gmail OAuth**: Inbox reading configured
- **Media Catalog**: 19 files cataloged (17 images, 2 videos, 315 MB)
- **Analytics**: Post tracking with stats history
- **ai-clips-maker**: Installed for video processing
- **Venue Database**: 64 venues across 5 regions researched

### Needs Configuration
- **HuggingFace**: Add `HUGGINGFACE_TOKEN` for speaker diarization
- **Instagram/TikTok/YouTube**: API credentials needed

## Project Structure

```
social-cli-mcp/
├── src/
│   ├── clients/           # Platform API clients
│   │   ├── twitter.ts     # Working - OAuth 1.0a
│   │   ├── instagram.ts   # Needs credentials
│   │   ├── tiktok.ts      # Needs credentials
│   │   ├── youtube.ts     # Needs credentials
│   │   ├── email.ts       # Gmail client (needs app password)
│   │   ├── linkedin.ts
│   │   └── reddit.ts
│   ├── services/
│   │   ├── analytics.ts   # Post tracking + stats
│   │   ├── content-manager.ts  # Editorial calendar
│   │   └── research.ts    # Market analysis
│   └── types.ts
├── content/
│   ├── music/             # Flutur content strategy
│   │   └── flutur-links.json  # All Flutur links, videos, residencies
│   ├── software/          # jsOM content strategy
│   ├── outreach/          # Contact tracking + pitches
│   │   ├── venues/        # 64 venues across 5 regions
│   │   │   ├── italy.json       # 16 venues (Sardinia, Puglia, Amalfi, Sicily)
│   │   │   ├── greece.json      # 12 venues (Athens, Rhodes, Crete, Corfu, Paros)
│   │   │   ├── portugal.json    # 12 venues (Comporta, Lisbon, Algarve, Porto)
│   │   │   ├── canary-islands.json  # 12 venues (Tenerife, Gran Canaria, etc)
│   │   │   ├── balearics.json   # 12 venues (Ibiza, Mallorca, Formentera, Menorca)
│   │   │   └── master-index.json    # Unified index
│   │   ├── funnel-strategy.md   # Segmentation + email templates
│   │   ├── new-venues.json      # Pending outreach (8 venues)
│   │   └── venue-followups.json # Sent emails tracking (8 sent)
│   └── m-shaped-mind.json # Brand concept
├── media/
│   ├── music/videos/      # RAV Vast videos + Morocco photos
│   └── catalog.json       # Auto-generated media index
├── analytics/
│   └── posts-history.json # All posts + stats
├── tools/
│   ├── ai-clips-maker/    # Video processing (WhisperX, MediaPipe)
│   ├── make-clips.py      # Wrapper script
│   └── catalog_media.py   # Media cataloger
└── logs/                  # Daily activity logs
```

## Key Files to Read First

1. **[.env](.env)** - All credentials (copy from `.env.example`)
2. **[analytics/posts-history.json](analytics/posts-history.json)** - Current campaign stats
3. **[content/outreach/contacts.json](content/outreach/contacts.json)** - People to contact
4. **[media/catalog.json](media/catalog.json)** - Available media files
5. **[content/m-shaped-mind.json](content/m-shaped-mind.json)** - Brand concept

## Current Campaign Stats (2026-01-20)

| Metric | Value |
|--------|-------|
| Total Posts | 7 |
| Total Impressions | 127 |
| Total Likes | 1 |
| Total Replies | 7 |
| Avg Engagement | 7.98% |

**Best Performer:** Thread 4/4 with GitHub CTA (15.4% engagement, 1 like)

## API Configuration

### Twitter (Working)
```env
TWITTER_API_KEY=PgNclWclEuwGKjm4h6UHFde4h
TWITTER_API_SECRET=RsrrE19qrZa8...
TWITTER_ACCESS_TOKEN=2560117389-4aALeUYv...
TWITTER_ACCESS_SECRET=9iNDQsuKo5b8Qt...
```

### Gmail (Needs Setup)
1. Enable 2FA on Google Account
2. Create App Password: Google Account → Security → App Passwords
3. Add to `.env`:
```env
GMAIL_USER=your@gmail.com
GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx
```

### Instagram (Needs Setup)
1. Create Facebook Developer App
2. Link Instagram Business/Creator account
3. Get long-lived access token
```env
INSTAGRAM_ACCESS_TOKEN=
INSTAGRAM_BUSINESS_ACCOUNT_ID=
FACEBOOK_PAGE_ID=
```

## Common Tasks

### Post to Twitter
```typescript
import { TwitterClient } from './src/clients/twitter.js';
const twitter = new TwitterClient();
await twitter.post({ text: 'Hello world' });
```

### Track a Post
```typescript
import { getAnalytics } from './src/services/analytics.js';
const analytics = getAnalytics();
analytics.trackPost({
  date: '2026-01-20',
  platform: 'twitter',
  vertical: 'software',
  type: 'post',
  content: 'Post text here',
  hashtags: [],
  mentions: []
});
```

### Catalog Media
```bash
python tools/catalog_media.py
```

### Process Video for Shorts
```bash
python tools/make-clips.py input.mp4 --output ./output
```

## Content Strategy Notes

### X Algorithm (2026)
- Links get -30-50% reach penalty
- Multiple hashtags -40% penalty
- Best: Pure text or native media
- Optimal posting: 8-10 AM, 12-2 PM

### Video Formats
| Platform | Aspect | Duration | Resolution |
|----------|--------|----------|------------|
| TikTok | 9:16 | 15-60s | 1080x1920 |
| IG Reels | 9:16 | 15-90s | 1080x1920 |
| YT Shorts | 9:16 | <60s | 1080x1920 |
| IG Stories | 9:16 | <15s | 1080x1920 |

## Venue Outreach Stats

### Emails Sent (2026-01-20)
| Venue | Region | Status |
|-------|--------|--------|
| OKU Kos | Greece | Sent |
| OKU Ibiza | Spain | Sent |
| Domes Resorts | Greece | Sent |
| Casa Cook Rhodes | Greece | Sent |
| Lindian Village | Greece | Sent |
| Nikki Beach Santorini | Greece | Sent |
| SantAnna Mykonos | Greece | Sent |
| Stella Island Crete | Greece | Sent |

### Pending (Test Batch Sent)
- Scorpios Mykonos (beach_club)
- Alemagou Mykonos (beach_club)
- Nammos Mykonos (beach_club)
- Kalua Beach Club (beach_club)
- Principote Mykonos (beach_club)
- Kea Retreat (wellness)
- Euphoria Retreat (wellness)
- Zen Rocks Mani (wellness)

### Key Credentials (Flutur)
- **Villa Porta Residency**: 4 years (2022-2025), every Friday July-August
- **Greece's Got Talent**: 4 yes votes (2022)
- **RAV Vast + Live Looping**: Hybrid sunset format

### Video Selection
| Video | Use For |
|-------|---------|
| Rocca di Arona | Sunset clubs, organic house |
| Ben Böhmer style | Club venues, beach parties |
| Efthymia | Wellness, meditation, hotels |
| GGT | Festivals, unique venues |

## Active Contacts

| Who | What | Status |
|-----|------|--------|
| Alperen Sümeroğlu | Weekly Rewind Podcast | Email draft ready |
| @levelsio | jsOM engagement | Replied to viral post |
| @_mctrinh | Liked jsOM tweet | Monitoring |
| RAV Vast Official | Artist feature | Need highlight reel first |

## Media Context (Morocco 2022)

The photos in `media/music/videos/` are from Morocco trip:
- Travel/landscape shots (beaches, evening)
- Sport activities
- Reflective/meditation moments
- Street scenes

Topics: `#travel #morocco #reflection #beach #nomadlife`

## Build & Run

```bash
npm install          # Install deps
npm run build        # Compile TypeScript
npm run cli          # Run CLI
npm run mcp          # Start MCP server
```

## Important Notes

1. **Never commit `.env`** - Contains real credentials
2. **X link penalty** - Post links in replies, not main tweet
3. **Check stats before posting** - Update tracking after each post
4. **Media catalog** - Run `catalog_media.py` after adding new files
5. **HuggingFace token** - Required for ai-clips-maker speaker diarization
