# Social CLI MCP - Agent Guide

> **AGENT-AGNOSTIC DOCUMENTATION** - Complete context for any AI agent working on this project.
> Read this first. No need to ask for background info.

---

## Project Overview

**Owner:** Alessio Ivoy Cazzaniga (34)
**Origin:** Dormelletto / Sesto Calende, Lake Maggiore, Italy
**Grandfather:** From Rhodes, Greece (Greek connection in blood)

**Concept:** "M-Shaped Mind" - Deep expertise in Music + Software connected by creativity

### Two Verticals

| Vertical | Brand | Handles | Focus |
|----------|-------|---------|-------|
| **Music** | Flutur | @flutur_8, @FluturArt | RAV Vast, live looping, Greece's Got Talent, field recording |
| **Software** | jsOM | @AlessioIan | UI Designer for LLM-readable specs, AI tools |

---

## 🦋 The Flutur Story (IMPORTANT CONTEXT)

> **Flutur** = "Butterfly" in Albanian/Romanian - a delicate creature that touches lives momentarily but can create storms elsewhere

### The Journey (2021-2022)
1. **Summer 2021**: Left with only **€30**, guitar, and RAV Vast for what was supposed to be an 8-day trip
2. **5-month odyssey**: Busking across Greek islands (Astypalea, Dodecanese, and more)
3. **Viral moments**: Passersby filmed performances → videos circulated among locals → caught production attention
4. **Got robbed**: Lost everything, but...
5. **Alexandra**: A hostel concierge believed in both his music AND story → connected him with Greece's Got Talent producers
6. **October 2021**: Audition recorded → **4 "Ναί" (yes)** from all judges
7. **2022**: Greece's Got Talent broadcast → VareseNews coverage → national attention

### Key Achievements
- 🏆 **Greece's Got Talent** - 4 yes votes (2022)
- 🏨 **Villa Porta Residency** - 4 years (2022-2025), every Friday July-August, Buddha Bar-style sunset sessions
- 🎸 **Denver Tour** - Multiple venue performances (2023)
- 🎙️ **KU100 Binaural Recording** - Professional Neumann field recording setup
- 📰 **6 VareseNews Articles** - Regional press coverage (2022-2025)

### Press Coverage Links
- [Greece's Got Talent - Dal Lago Maggiore al Mediterraneo](https://www.varesenews.it/2022/02/dal-lago-maggiore-al-mediterraneo-la-musica-flutur-stupisce-giudici-greeces-got-talent/1433491/) (Feb 2022)
- [Dalla musica di strada ai concerti di Denver](https://www.varesenews.it/2023/05/flutur-dalla-musica-di-strada-sul-lago-maggiore-ai-concerti-nelle-venue-di-denver/1607555/) (May 2023)
- [Flutur a Materia - viaggio musicale](https://www.varesenews.it/2025/03/flutur-a-materia-un-sorprendente-viaggio-musicale-tra-suono-e-anima/2180487/) (Mar 2025)

### GGT Strategy (When to Use/Not Use)
| Context | Use GGT? | Why |
|---------|----------|-----|
| Beach clubs, festivals | ✅ YES | Shows crowd appeal, entertainment value |
| Wellness retreats, sound healing | ❌ NO | "Entertainment" undermines healing credibility |
| Boutique hotels | ⚠️ Optional | Mention briefly or skip |
| Developer outreach | ✅ YES | Shows unique multi-disciplinary story |

---

## 💻 Software Background

### Key Projects
- **[jsOM](https://github.com/Alemusica/jsOM)** - UI canvas that exports LLM-readable JSON specs (bridging designers and AI agents)
- **[Rememberance](https://github.com/Alemusica/Rememberance)** - DML plate optimizer for vibroacoustic therapy (genetic algo + JAX FEM + modal analysis)
- **[nico](https://github.com/Alemusica/nico)** - Satellite altimetry + AI causal discovery (PCMCI + LLM interpretation)
- **[hierarchical-cognitive-stack](https://github.com/Alemusica/hierarchical-cognitive-stack)** - 4-layer memory architecture for LLMs
- **MCP tools** - Content automation (this project)
- **121 repos** - Mostly solo deep-dives

### Developer Journey
- Started scripting Ableton with ClyphX Pro
- Brought scripted set to Denver tour
- Building AI-enhanced audio tools
- The two paths (music + code) kept intersecting → stopped treating them as separate

---

## 🎯 Current Outreach Status

### Email Sent (2026-01-20)
**To:** Alperen Sümeroğlu (ai-clips-maker dev, Weekly Rewind podcast)
**Subject:** "M-shaped dev: jsOM + MCP + live looping musician — Weekly Rewind?"
**Status:** ✅ SENT
**Message ID:** `<1a05d13d-4de4-2d9d-ef15-90663b07b658@gmail.com>`

### Venue Emails Sent (2026-01-20)
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

---

## Quick Status

### Working Now
- **Twitter API**: OAuth 1.0a configured and posting works
- **Gmail**: SMTP sending configured (flutur8i8@gmail.com)
- **Gmail OAuth**: Inbox reading configured
- **SurrealDB**: Knowledge graph for content/analytics (71/191 photos categorized)
- **Media Catalog**: 191 photos from travels (Lanzarote, Greece, Morocco, Denver, Italy)
- **Analytics**: Post tracking with stats history
- **ai-clips-maker**: Installed for video processing
- **Venue Database**: 64 venues across 5 regions researched
- **Telegram Bot**: Ready for deploy to Render

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

### 🔑 Essential Context (READ THESE)
1. **[content/m-shaped-mind.json](content/m-shaped-mind.json)** - M-shaped brand concept
2. **[content/music/flutur-links.json](content/music/flutur-links.json)** - ALL Flutur links, videos, press, residencies
3. **[content/outreach/funnel-strategy.md](content/outreach/funnel-strategy.md)** - When to use GGT, video matching
4. **[content/EDITORIAL_PLAN_v3.md](content/EDITORIAL_PLAN_v3.md)** - Current editorial plan with full story

### 📊 Operational Files
5. **[analytics/posts-history.json](analytics/posts-history.json)** - Current campaign stats
6. **[content/outreach/contacts.json](content/outreach/contacts.json)** - People to contact
7. **[.env](.env)** - All credentials (copy from `.env.example`)

### 🎥 Video Assets (use strategically)
| Video | URL | Best For |
|-------|-----|----------|
| **Greece's Got Talent** | https://youtu.be/NI23tAP0c8U | Festivals, unique venues |
| **Efthymia** | https://youtu.be/I-lpfRHTSG4 | Wellness, meditation, hotels |
| **Rocca di Arona** | https://youtu.be/K7oROUjuLGQ | Sunset clubs, organic house |
| **Ben Böhmer style** | https://youtu.be/FkBwJJS2ZxQ | Club venues, beach parties |
| **Who Is Flutur** | https://youtu.be/rmnShcDsBBY | EPK, booking agents (NOT cold outreach) |

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
