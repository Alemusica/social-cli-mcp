# FLUTUR Link Hub - Custom Landing Page Plan

## Current State Analysis

### Linktree Problems
1. **Generic layout** - Same as millions of other artists
2. **No booking CTA** - Missing clear "Book Me" action (identified in our analysis)
3. **No video preview** - Links are just text, no visual hook
4. **No credibility above fold** - GGT, Villa Porta residency buried
5. **No venue-specific routing** - Same page for beach clubs and jazz clubs
6. **No analytics ownership** - Linktree owns your data
7. **No email capture** - Missing opportunity to build list
8. **Slow** - External redirects, tracking bloat

### Current Funnel (from outreach emails)
```
Cold Email → Linktree → ??? → Booking
```
**Problem:** Venue booker lands on generic page, no clear next step.

---

## Proposed Solution: flutur.live (or subdomain)

### Core Concept
**"One page, multiple entry points"** - Same URL, but content adapts based on:
- UTM parameters from email campaigns
- Time of day (sunset vibes after 4pm)
- Referrer (Instagram vs Email vs Direct)

### Target Audience Mindset
When a venue booker clicks your link, they're thinking:
1. "Is this person legit?" → **Credibility first**
2. "What do they sound like?" → **Video instantly**
3. "Would they fit our venue?" → **Match their vibe**
4. "How do I book them?" → **Clear CTA**

---

## Layout Architecture

### Above the Fold (Mobile-First)
```
┌─────────────────────────────────┐
│  [Background: Rocca sunrise]    │
│                                 │
│         FLUTUR                  │
│   RAV Vast · Live Looping       │
│                                 │
│  ┌─────────────────────────┐    │
│  │  ▶ VIDEO PREVIEW        │    │
│  │  (auto-muted, 10sec)    │    │
│  └─────────────────────────┘    │
│                                 │
│  "Greece's Got Talent (4 YES)   │
│   4-year Villa Porta residency" │
│                                 │
│  [ 🎯 BOOK FOR 2026 ]           │
│                                 │
└─────────────────────────────────┘
```

### Video Selection Logic
```typescript
// Based on UTM or time
const getHeroVideo = (utm_campaign?: string) => {
  if (utm_campaign?.includes('jazz')) return 'transcendence';
  if (utm_campaign?.includes('beach')) return 'father-ocean';
  if (utm_campaign?.includes('wellness')) return 'efthymia';
  if (isGoldenHour()) return 'father-ocean'; // 4-7pm local
  return 'transcendence'; // default
};
```

### Below the Fold - Sections

#### 1. Video Gallery (Swipeable)
```
┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐
│ 🎬  │ │ 🎬  │ │ 🎬  │ │ 🎬  │
│Trans│ │Ocean│ │Chase│ │Efthy│
└─────┘ └─────┘ └─────┘ └─────┘
  ●       ○       ○       ○
```
- Thumbnail previews
- Tap to expand/play
- Labels: "Sunset Sessions" / "Meditation" / "Live Remix"

#### 2. Credibility Bar
```
┌─────────────────────────────────┐
│ 🏆 Greece's Got Talent (4 YES)  │
│ 🏨 4-Year Villa Porta Residency │
│ 🥁 RAV Vast Endorsed Artist     │
└─────────────────────────────────┘
```

#### 3. "Perfect For" Section
```
┌─────────────────────────────────┐
│  PERFECT FOR                    │
│                                 │
│  🌅 Sunset Sessions             │
│  🧘 Sound Healing / Wellness    │
│  🎷 Jazz Clubs & Listening Bars │
│  🏖️ Beach Clubs & Rooftops      │
│  🎪 Festivals & Ceremonies      │
└─────────────────────────────────┘
```

#### 4. Booking CTA (Sticky on scroll)
```
┌─────────────────────────────────┐
│  📅 AVAILABLE 2026 SEASON       │
│  [Book Now] [Send Inquiry]      │
└─────────────────────────────────┘
```

#### 5. Music Links (Collapsed by default)
```
┌─────────────────────────────────┐
│  🎵 LISTEN                   ▼  │
├─────────────────────────────────┤
│  Spotify · Apple · YouTube      │
│  Soundcloud · Bandcamp          │
└─────────────────────────────────┘
```

#### 6. Social Proof (Optional)
```
┌─────────────────────────────────┐
│  "Flutur created magic at our   │
│   sunset ceremony" - Villa Porta│
└─────────────────────────────────┘
```

---

## Technical Stack (Recommendations)

### Option A: Static Site (Fastest)
```
- Astro or Next.js static export
- Vercel/Netlify hosting (free)
- No backend needed
- UTM parsing client-side
```

### Option B: With Analytics
```
- Next.js + Vercel Analytics
- Plausible or Fathom (privacy-focused)
- Simple KV store for click tracking
```

### Option C: Full Control
```
- Next.js + Supabase
- Email capture
- A/B testing
- Detailed analytics
```

**Recommendation:** Start with **Option A**, add analytics later.

---

## UTM Strategy for Emails

### Campaign Tracking
```
https://flutur.live?utm_source=email&utm_campaign=jazz-clubs-jan26
https://flutur.live?utm_source=email&utm_campaign=beach-clubs-jan26
https://flutur.live?utm_source=instagram&utm_campaign=bio
```

### Dynamic Content
| utm_campaign contains | Hero Video | "Perfect For" highlight |
|-----------------------|------------|-------------------------|
| `jazz` | Transcendence | Jazz Clubs |
| `beach` | Father Ocean | Beach Clubs |
| `wellness` | Efthymia | Sound Healing |
| `festival` | Who Is Flutur | Festivals |

---

## Booking Flow Options

### Option 1: Email Form
```
[Name] [Venue] [Date Range]
[Message]
[Send Inquiry]
```
→ Sends to your email + saves to database

### Option 2: Calendly/Cal.com Embed
```
[Book a 15-min Call]
```
→ Direct scheduling

### Option 3: WhatsApp/Telegram
```
[💬 Message on WhatsApp]
```
→ Direct chat (good for international)

**Recommendation:** Start with simple email form, add Calendly for serious inquiries.

---

## Mobile-First Design Principles

1. **Thumb-zone CTAs** - Booking button reachable with one hand
2. **Video loads fast** - Use WebM/MP4, not YouTube embed initially
3. **Dark mode default** - Sunset vibes, easier on eyes
4. **Minimal text** - Icons + short labels
5. **No hamburger menu** - Everything scrollable

---

## Color Palette (Sunset Inspired)

```css
:root {
  --bg-dark: #0a0a0f;        /* Night sky */
  --bg-gradient: linear-gradient(180deg, #1a1a2e 0%, #16213e 100%);
  --accent-gold: #d4a574;     /* Golden hour */
  --accent-coral: #e07a5f;    /* Sunset */
  --text-primary: #f5f5f5;
  --text-muted: #a0a0a0;
}
```

---

## Implementation Phases

### Phase 1: MVP (1-2 days)
- [ ] Single page with hero video
- [ ] Credibility section
- [ ] Booking email form
- [ ] Music links
- [ ] Deploy to Vercel

### Phase 2: Polish (1 day)
- [ ] Video gallery
- [ ] UTM-based video switching
- [ ] Analytics (Plausible)
- [ ] Mobile optimization

### Phase 3: Advanced (Later)
- [ ] Email capture popup
- [ ] Testimonials section
- [ ] Press kit PDF download
- [ ] Multi-language (IT/EN)

---

## Files to Create

```
flutur-link-hub/
├── src/
│   ├── app/
│   │   ├── page.tsx          # Main landing
│   │   └── layout.tsx        # Meta, fonts
│   ├── components/
│   │   ├── HeroVideo.tsx     # Auto-playing preview
│   │   ├── VideoGallery.tsx  # Swipeable cards
│   │   ├── BookingForm.tsx   # Email capture
│   │   ├── CredibilityBar.tsx
│   │   └── MusicLinks.tsx
│   └── lib/
│       ├── videos.ts         # Video data
│       └── utm.ts            # UTM parsing
├── public/
│   ├── videos/               # Self-hosted clips
│   └── images/
└── package.json
```

---

## Key Metrics to Track

1. **Click-through to video** - Are they watching?
2. **Booking form submissions** - Conversion rate
3. **Time on page** - Engagement
4. **UTM performance** - Which campaigns work?
5. **Device split** - Mobile vs Desktop

---

## Domain Options

- `flutur.live` - Clean, available
- `flutur.art` - Artistic
- `book.flutur.com` - If you own flutur.com
- `links.flutur.it` - Italian domain

---

## Next Steps for New Chat

1. **Share this document** with new Claude session
2. **Decide on stack** (recommend: Next.js + Vercel)
3. **Gather assets:**
   - Hero video clips (10-15 sec each)
   - Profile photo
   - Logo if any
4. **Start with Phase 1 MVP**

---

## Quick Copy-Paste for New Chat

```
I'm building a custom link-in-bio page for FLUTUR, a RAV Vast + live looping artist.

Key requirements:
- Replace Linktree with custom solution
- Hero video that changes based on UTM params
- Clear booking CTA
- Mobile-first, dark theme, sunset vibes
- Credibility: Greece's Got Talent (4 YES), 4-year Villa Porta residency

Target: Venue bookers (beach clubs, jazz clubs, hotels, festivals)

See attached planning doc for full specs.

Start with Next.js + Tailwind, deploy to Vercel.
```
