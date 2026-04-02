# FLUTUR EPK — Design Specification

> 8i8.art | Swiss Typography + Golden Ratio | Credibility-first for promoters

**Version:** 1.0
**Date:** 2026-04-01
**Status:** Approved for implementation

---

## 1. Design Philosophy

Swiss rigor as the *container* for artistic expression. The grid becomes the loop structure. The typography becomes the voice.

### 5 Principles

1. **Typography does the heavy lifting.** No decorative elements. Weight, size, spacing, and case are the entire design vocabulary.
2. **The grid is visible.** Ruled lines, column edges, and alignment points are design elements, not hidden infrastructure.
3. **Gold is surgical.** `#d4a574` appears only at decision points — CTAs, key data, active states. Never decorative.
4. **Negative space is the luxury signal.** A promoter sees hundreds of EPKs. The one with breathing room signals confidence.
5. **Sharp edges communicate precision.** Every `border-radius: 0`. The artist controls the sound; the design controls the space.

### What This Design Avoids

- Rounded corners (border-radius > 0)
- Parallax scrolling
- Animated text reveal on scroll
- Gradient backgrounds
- Icon libraries for navigation (text labels only)
- Card components with shadows
- Auto-playing video or audio
- Decorative elements that don't serve information hierarchy

### Reference Frame

- Josef Muller-Brockmann's concert posters (typography IS the music)
- Experimental Jetset / Stedelijk Museum (restraint as radical statement)
- Studio Feixen (geometric play within strict constraints)
- Armin Hofmann's Musica Viva series

---

## 2. Typography

### Font Stack

| Role | Font | Weights | Use |
|------|------|---------|-----|
| Display | Space Grotesk | 600, 700 | Artist name, section headers |
| Body | Inter | 300, 400, 500 | Paragraphs, descriptions |
| Mono | IBM Plex Mono | 400, 500 | Labels, metadata, tags, tech specs |

### Scale (phi-based, base 16px)

Each step is derived from division by phi (1.618).

| Token | Size | Weight | Font | Use |
|-------|------|--------|------|-----|
| `display-xl` | 68px | 700 | Space Grotesk | Hero artist name |
| `display` | 42px | 700 | Space Grotesk | Section headers |
| `heading-1` | 26px | 600 | Space Grotesk | Sub-headers |
| `heading-2` | 20px | 500 | Space Grotesk | Card titles |
| `body-lg` | 18px | 400 | Inter | Lead paragraphs |
| `body` | 16px | 400 | Inter | Standard text |
| `body-sm` | 14px | 400 | Inter | Secondary info |
| `caption` | 12px | 500 | IBM Plex Mono | Labels, metadata |
| `micro` | 10px | 500 | IBM Plex Mono | Overlines, counters |

### Letter Spacing

- Display text: 0.02em to 0.05em
- Mono labels/overlines: 0.08em to 0.12em
- Body text: 0 (Inter's default is well-tuned)
- **Never** over-track body text — hurts readability

### Line Height

- Display: 1.1
- Headings: 1.2 - 1.3
- Body: 1.6
- Mono: 1.4

### Font Loading Strategy

1. Preload Space Grotesk 700 WOFF2 (~15KB subset, Latin only)
2. Preload Inter 400 WOFF2
3. IBM Plex Mono loads async (not above fold)
4. `font-display: swap` with system font fallback matching metrics
5. Use `next/font` — NOT Google CDN `@import`

---

## 3. Color System

### Unified Palette (ONE gold, not three)

```css
:root {
  /* Backgrounds */
  --epk-bg-primary: #000427;
  --epk-bg-deep: #000320;
  --epk-bg-medium: #0c1033;
  --epk-bg-elevated: #161a3d;

  /* Accent — single gold token */
  --epk-gold: #d4a574;
  --epk-gold-dim: rgba(212, 165, 116, 0.30);
  --epk-gold-faint: rgba(212, 165, 116, 0.15);
  --epk-gold-ghost: rgba(212, 165, 116, 0.05);

  /* Text — warm white, not pure */
  --epk-text-primary: #f5f0eb;
  --epk-text-secondary: rgba(245, 240, 235, 0.7);
  --epk-text-tertiary: rgba(245, 240, 235, 0.4);

  /* Rules (lines) */
  --epk-rule: rgba(212, 165, 116, 0.15);
  --epk-rule-weight: 1px;

  /* Borders */
  --epk-border-subtle: rgba(255, 255, 255, 0.08);
  --epk-border-medium: rgba(255, 255, 255, 0.12);

  /* Selection */
  --epk-selection: rgba(212, 165, 116, 0.3);
}
```

### Rules

- Warm white `#f5f0eb` instead of pure white — less eye fatigue, cream paper feel
- Ruled lines use gold at 15% opacity — warm, connected to palette, not generic gray
- **No box-shadow anywhere.** Depth via layered opacity and spatial relationships
- **No gradients.** Clean navy field.

### Dynamic CTA Accent Tokens

```css
:root {
  --cta-accent-golden: #d4a574;   /* golden hour */
  --cta-accent-warm: #c9a87c;     /* evening standard */
  --cta-accent-neutral: #d4a574;  /* day standard */
  --cta-accent-cool: #a8b4c4;     /* late night */
}
```

---

## 4. Grid System

12-column grid. Strong vertical rhythm on phi-sm (13px) baseline.

| Breakpoint | Width | Columns | Outer Margins |
|------------|-------|---------|---------------|
| Compact | < 640px | 4 | phi-md (21px) |
| Medium | 640-1024px | 8 | phi-lg (34px) |
| Wide | > 1024px | 12 | phi-xl (55px) |

Gutter: phi-sm (13px).

### Grid Manifestation

The grid is visible through:
- **Ruled lines** (1px gold 15%) as section dividers
- **Column bleed** — certain elements break column but align to next column edge
- **Asymmetric layouts** — content occupies columns 1-7 or 5-12, not centered. Empty columns ARE the design.

---

## 5. Spacing System (PHI / Golden Ratio)

Already implemented in Tailwind. Preserved and extended.

| Token | Value | Use |
|-------|-------|-----|
| `phi-xs` | 8px | Tight gaps, icon spacing |
| `phi-sm` | 13px | Grid gutter, baseline, inline spacing |
| `phi-md` | 21px | Paragraph spacing, component gaps |
| `phi-lg` | 34px | Section sub-spacing |
| `phi-xl` | 55px | Section padding, major gaps |
| `phi-2xl` | 89px | Between major sections |

### On-grid Target

Current: 68%. Target: > 90%. All spacing values must be phi tokens or multiples of 4px.

---

## 6. Section Architecture

Promoters spend < 60 seconds on an EPK. Section order optimized for scan priority.

| # | Section | Component | Purpose | Scan Time |
|---|---------|-----------|---------|-----------|
| 1 | **Hero Index + Video** | `<HeroSection />` | Identity + live proof in one viewport | 15-20s |
| 2 | **Credibility Bar** | `<CredentialBar />` | Venues/festivals — instant social proof | 3-5s |
| 3 | **Performance Modes** | `<PerformanceModes />` | What you can book + secondary videos | 5-10s |
| 4 | **Press & Endorsements** | `<PressSection />` | Third-party validation + peer review | 3-5s |
| 5 | **Bio** | `<ArtistBio />` | 150 words max, ragged right | 3-5s |
| 6 | **Gallery** | `<PhotoGallery />` | 3-5 editorial photos, sharp grid | 2-3s |
| 7 | **Technical Rider** | `<TechnicalRider />` | Collapsible, PDF download | On-demand |
| 8 | **Booking** | `<BookingSection />` | Dynamic CTA, WhatsApp primary | Immediate |
| 9 | **Footer** | `<Footer />` | Colophon, social icons, copyright | — |

### Sections removed from current site

- **Testimonials** — merged into Press & Endorsements (endorsements from festival organizers = peer validation + venue proof combined)
- **Journey/Timeline** — removed (promoters don't read timelines in 60s)
- **TechniqueSection** — merged into Bio or removed
- **SocialLinksSection** — merged into Footer

### Orphaned components to delete

- `MusicLinksSection.tsx`
- `FormatsSection.tsx`
- `VenueTypesSection.tsx`

---

## 7. Hero Design — Hybrid Index + Video

The hero combines the Swiss "Index" data-forward approach with an embedded video element.

```
 ─────────────────────────────────────────────────────────────
 [Mono Micro, gold]           [Mono Micro]
 LIVE LOOPING ARTIST          EST. 2019
 ─────────────────────        ──────────

 [Display XL, 68px, Space Grotesk 700]
 FLUTUR

 [Body Large, Inter]          ┌─────────────────────────┐
 From silence,                │                         │
 layer by layer               │   [video thumbnail]     │
                              │       ▶ PLAY            │
 [Mono Micro, gold]           │                         │
 AVAILABLE FOR                └─────────────────────────┘
 FALL/WINTER 2026             [Mono Micro] Efthymia — RAV Solo

 ─────────────────────────────────────────────────────────────
                     SCROLL TO EXPLORE  |
```

### Key decisions

- **Hero height: 70vh max**, not 100vh — content below must be visible
- **Video is a datum in the grid**, not decoration above it
- **Video uses facade pattern**: static thumbnail, loads YouTube on click (saves ~500KB)
- **Seasonal availability badge** in gold mono — dynamic from CTA system
- **Scroll indicator**: simple pipe `|` or thin line, not chevron
- **No background image** — text-first for LCP < 1500ms

---

## 8. Navigation

### Desktop

- Left: "FLUTUR" in Space Grotesk 600, heading-2 size
- Right: section names in IBM Plex Mono caption, uppercase, letter-spaced 0.1em
- Labels: `SHOWS · VIDEOS · PRESS · TECH · BOOKING`
- Maximum 5 items (cognitive load threshold: 4±1)
- Separator: 1px bottom border at gold 15%
- Active section: gold text, no underline
- On scroll: transparent → navy `#000427` at 90% opacity. No blur.

### Mobile

- Left: "FLUTUR"
- Right: "Book" CTA button (gold border, always visible)
- Hamburger: three horizontal ruled lines (literally three `<hr>`)
- Menu: slides from right, full-height, navy. Links stacked with phi-md spacing.

### Implementation

- `position: sticky` with `backdrop-filter: none`
- IntersectionObserver for scroll spy (active state)
- No scroll event listeners

---

## 9. Interactive Elements

### Buttons

Two styles only:

**Primary (booking CTA):**
```css
border: 1px solid var(--epk-gold);
background: transparent;
color: var(--epk-gold);
font-family: var(--epk-font-mono);
font-size: 12px;
letter-spacing: 0.1em;
text-transform: uppercase;
padding: var(--phi-sm) var(--phi-lg);
min-height: 44px;
transition: background 200ms ease-out;
```
Hover: `background: var(--epk-gold-faint);`

**Secondary (text links):**
```css
color: var(--epk-gold);
font-family: var(--epk-font-mono);
font-size: 12px;
text-decoration: none;
letter-spacing: 0.08em;
```
Hover: `color: var(--epk-text-primary);`

### Focus States

```css
:focus-visible {
  outline: 2px solid var(--epk-gold);
  outline-offset: 2px;
}
```

Applied to ALL interactive elements. Non-negotiable.

### Touch Targets

Minimum 44x44px on all interactive elements. Use padding, not size changes.

### Transitions

- Duration: 200ms
- Easing: ease-out only
- No springy, bouncy, or elastic animations. Swiss motion is direct.

---

## 10. Social Links

### Decision: Monochrome icons (research-backed)

Based on NNGroup, cognitive science (pre-attentive processing), WCAG, and industry practice:

- **Social/streaming platforms**: monochrome icons (Lucide or Simple Icons SVG)
- **Site navigation**: text labels only

### Specification

```
Icon size: 20-24px
Touch target: 44px minimum (padding achieves this)
Spacing: phi-sm (13px) between icons
Color: var(--epk-text-tertiary)
Hover: var(--epk-text-primary), 200ms ease-out
Order: streaming first (Spotify, YouTube, SoundCloud, Bandcamp, Apple Music),
       then social (Instagram, Facebook)
```

### Accessibility

Every icon link MUST have:
```html
<a href="..." aria-label="Listen on Spotify">
  <SpotifyIcon aria-hidden="true" />
</a>
```

---

## 11. Dynamic CTA System

### Overview

Client-side engine that personalizes CTA based on visitor context. Zero API calls for 90%+ of visitors.

### Signal Resolution

1. **Hemisphere**: `Intl.DateTimeFormat().resolvedOptions().timeZone` → timezone map (~40 entries)
2. **Season**: month + hemisphere offset (south = +6 months) → 6 booking seasons
3. **Time of day**: `Date.now()` → morning/afternoon/evening/night
4. **Golden hour**: existing `isGoldenHour()` function
5. **Locale**: `navigator.language` + timezone → `it` | `en`
6. Fallback: IP API (`ipapi.co`) only if timezone ambiguous

### 6 Seasons × 2 Hemispheres × 2 Languages = 24 Copy Variants

| Season | NH Months | Urgency | Example Headline (EN) |
|--------|-----------|---------|----------------------|
| `summer-festival-open` | Jan-Feb | medium | "Summer festival submissions are open now" |
| `summer-lineup-final` | Mar-Apr | critical | "Festival lineups are closing" |
| `fall-winter-club` | May-Jun | medium | "Fall and winter club season — book early" |
| `next-year-festival` | Jul-Aug | low | "Next year's festivals start here" |
| `nye-winter-holiday` | Sep-Oct | high | "NYE and holiday dates are going fast" |
| `q1-spring-submission` | Nov-Dec | medium | "Q1 dates and spring festivals — submit now" |

Southern hemisphere: 6-month offset. Same structure, hemisphere-aware copy.

### Urgency Bump

Last 10 days of each 2-month window: urgency +1 level. Creates natural end-of-window pressure.

### Mood Modifiers

| Condition | Effect |
|-----------|--------|
| Golden hour | Prepend: "The light's perfect right now, and so is the timing." |
| Late night (23:00-04:00) | Button suffix: "— we reply by morning" |
| Standard | Base copy |

### Booking CTA Layout

```
───── BOOKING ──────────────────────────────────────

[Display, gold]
FALL/WINTER 2026

[Body Large]
Most summer festivals finalize acts by end of April.
Remaining slots go to artists who move now.

[ WhatsApp — Secure a Date ]     ← primary, gold border
  or
  Telegram · Email               ← secondary, mono text links
```

### WhatsApp Pre-filled Message

```
wa.me/39XXXXXXXXX?text=Hi, I'm interested in booking FLUTUR
for [season]. I'm [name] from [venue/festival].
```

Season inserted dynamically from CTA variant.

### Analytics

- Variant ID: `{season}_{hemisphere}_{urgency}_{mood}_{locale}`
- Events: `cta_impression`, `cta_click`, `cta_hover`, `geo_resolved`
- Platform: Vercel Analytics Plus (already active)

### File Structure

```
src/lib/cta/
  types.ts, seasons.ts, copy.ts, resolve.ts, geo.ts, analytics.ts
src/hooks/useDynamicCTA.ts
src/components/DynamicCTA.tsx
```

---

## 12. Localization

### Auto-detection

```typescript
type Locale = 'it' | 'en';

function resolveLocale(): Locale {
  const lang = navigator.language?.slice(0, 2);
  if (lang === 'it') return 'it';
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  if (tz === 'Europe/Rome') return 'it';
  return 'en';
}
```

### Scope

- All CTA copy: 24 variants (12 × 2 languages)
- Section headings
- Navigation labels
- Booking form labels
- Bio text (two versions in artist-config.ts)

### Implementation

- Static copy tables in TypeScript (no i18n library needed for 2 languages)
- `useLocale()` hook consumes the same geo resolution as `useDynamicCTA()`

---

## 13. Performance Targets

| Metric | Current | Target |
|--------|---------|--------|
| LCP | 9072ms | < 1500ms |
| FCP | 912ms | < 800ms |
| CLS | 0.000 | < 0.1 |
| TBT | 0ms | < 200ms |
| Page weight | ~5MB+ | < 500KB initial |

### Critical Render Path

1. HTML arrives (pre-rendered, static)
2. Critical CSS inlined in `<head>` (~2KB, hero styles only)
3. Space Grotesk 700 WOFF2 preloaded (~15KB subset)
4. Hero paints → LCP fires (< 1500ms)
5. Remaining CSS loads
6. Inter 400, IBM Plex Mono load async
7. Images lazy-load on scroll
8. JavaScript hydrates (nav, audio players, CTA system)

### Key Optimizations

- YouTube facade pattern (thumbnail + load on click)
- `next/font` for self-hosted font loading
- Remove `images.unoptimized: true` from next.config
- Use Next.js `<Image>` component with WebP/AVIF
- Delete raw images from `/public/images/` (keep only `/optimized/`)
- Remove `maximum-scale=1` from viewport (blocks pinch-to-zoom)

---

## 14. Accessibility Requirements (WCAG 2.1 AA)

### Non-negotiable

- [ ] All interactive elements: `:focus-visible` with gold outline
- [ ] Touch targets: min 44x44px
- [ ] Contrast: all text/bg pairs > 4.5:1 (normal), > 3:1 (large)
- [ ] All images: descriptive `alt` text
- [ ] Social icons: `aria-label` on every link
- [ ] Heading hierarchy: h1 > h2 > h3, sizes decrease predictably
- [ ] Skip link: present and functional
- [ ] Lang attribute: dynamic (`it` or `en`) from locale detection
- [ ] `prefers-reduced-motion`: respect with `@media` query
- [ ] Remove `maximum-scale=1` (allow pinch-to-zoom)
- [ ] Landmark roles: `<nav>`, `<main>`, `<footer>`

---

## 15. Component Tree

```
<EPKLayout>
  <Navigation />
  <main>
    <HeroSection />           ← Index + Video hybrid, 70vh
    <CredentialBar />         ← Horizontal credential pills
    <PerformanceModes />      ← 3 bookable formats + video thumbnails
    <PressSection />          ← Pull quotes + endorsements + press links
    <ArtistBio />             ← 150 words, asymmetric layout
    <PhotoGallery />          ← 3-5 editorial photos, sharp grid
    <TechnicalRider />        ← Collapsible, equipment table, PDF download
    <BookingSection />        ← Dynamic CTA + WhatsApp + Telegram + Email
  </main>
  <Footer />                  ← Monochrome social icons + copyright
</EPKLayout>
```

Data flows from `artist-config.ts` through a `useArtistConfig()` hook. No component fetches its own data.

---

## 16. Dead Code Removal

### Delete

- `src/components/MusicLinksSection.tsx`
- `src/components/FormatsSection.tsx`
- `src/components/VenueTypesSection.tsx`
- `src/components/TestimonialsSection.tsx` (merged into PressSection)
- `src/components/TechniqueSection.tsx` (merged into Bio)
- `src/components/JourneySection.tsx` (removed)
- Unused exports in `artist-config.ts`: `FORMATS`, `VENUE_TYPES`

### Connect (currently dead)

- `getVideoForCampaign()` → connect to hero video selection
- `isGoldenHour()` → connect to Dynamic CTA mood system
- `trackBookingStart()` → connect to booking form
- `trackExternalClick()` → connect to outbound links
- `trackVideoPlay()` → connect to video facade click

---

## 17. Open Questions

1. ~~Hero approach~~ → Hybrid Index + Video (decided)
2. ~~Icons vs text~~ → Monochrome icons for social, text for nav (decided)
3. ~~Warm white~~ → #f5f0eb (decided)
4. ~~Section order~~ → Research-backed order (decided)
5. ~~Dynamic CTA~~ → Full system spec (decided)
6. **Telegram bot** — what should it do? Auto-reply with rider PDF, available dates, portfolio audio?
7. **Photo selection** — which 3-5 from current set? Need editorial quality, high contrast, B&W or desaturated
8. **Video selection** — which 2-3 from current 8? Best live performance clips
9. **Italian bio text** — needs writing/translation
10. **WhatsApp number** — confirm the number for wa.me link
