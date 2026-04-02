# FLUTUR EPK — Design Specification v3

> 8i8.art | Typographic Cinema | GSAP-driven scroll narrative

**Version:** 3.0
**Date:** 2026-04-01
**Status:** Draft — awaiting approval
**Supersedes:** design.md v1.0 (Swiss Typography static)

---

## 0. What Changed from v1/v2

v1/v2 was Swiss Typography applied statically — correct foundations but inert. v3 keeps the Swiss DNA (fonts, colors, phi spacing, sharp edges) and adds **motion as a design element**. The page becomes a scroll-driven narrative, not a document.

### Reference Sites (approved by Alessio)
- **Ashley Brooke CS** — text IS the layout, words fill the viewport, images float inside typography
- **Melvin Winkeler** — numbered nav, scattered parallax photo grid, massive marquee footer
- **Rhye theme** (local) — GSAP + ScrollTrigger + SplitText + Lenis architecture

### What v1 Avoided, v3 Embraces

| v1 explicit "avoid" | v3 reversal | Why |
|---------------------|-------------|-----|
| Parallax scrolling | ScrollTrigger parallax on photos | Creates depth, reference sites prove it works for creative portfolios |
| Animated text reveal on scroll | SplitText line/char reveal | The #1 pattern that separates premium from generic |
| Gradient backgrounds | Subtle gradient overlays on hero video | Needed for text legibility over video |

### What Stays from v1

- Colors: navy #000427, gold #d4a574, warm white #f5f0eb
- Fonts: Space Grotesk / Inter / IBM Plex Mono
- PHI spacing: 8, 13, 21, 34, 55, 89
- border-radius: 0 everywhere
- Gold is surgical — CTAs, active states, key data only
- WCAG 2.1 AA accessibility
- Static export on Vercel
- YouTube facade pattern

---

## 1. Design Philosophy

Swiss rigor as the *skeleton*. Motion as the *muscle*. The grid loops, the typography breathes, the scroll reveals.

### 5 Principles

1. **Typography IS the layout.** Headings fill the viewport. Words are spatial elements, not labels on containers.
2. **Scroll reveals, never decorates.** Every animation serves information hierarchy. Nothing moves for its own sake.
3. **Asymmetry creates tension.** Photos, text blocks, and CTAs never center. They occupy deliberate grid positions.
4. **Gold marks decisions.** `#d4a574` appears only where the viewer must act or notice. Accent, never texture.
5. **Motion respects the visitor.** `prefers-reduced-motion` disables all animation. The static fallback is v2 — still works.

---

## 2. Technical Stack

### Dependencies

```bash
# Core (already installed)
next@14.2   react@18   tailwindcss

# New — animation layer
bun add gsap @gsap/react lenis
```

**GSAP is 100% free** (Webflow acquisition, April 2025). All plugins included:
- `gsap/ScrollTrigger` — scroll-driven animations
- `gsap/SplitText` — character/word/line splitting with mask reveal
- Core tweening engine

**Lenis** — smooth scroll (replaces @studio-freight/react-lenis, now just `lenis`)

### Architecture Pattern

```
layout.tsx
  └─ <LenisProvider>          ← smooth scroll wrapper
       └─ page.tsx
            ├─ <HeroSection />      'use client' — GSAP animations
            ├─ <CredentialsTicker /> 'use client' — infinite marquee
            ├─ <PerformanceModes /> 'use client' — ScrollTrigger reveals
            ├─ <PressSection />     'use client' — text reveal
            ├─ <ArtistBio />        'use client' — line reveal
            ├─ <PhotoGallery />     'use client' — parallax grid
            ├─ <TechnicalRider />   'use client' — expand/collapse
            ├─ <BookingSection />   'use client' — massive type + CTA
            └─ <Footer />          'use client' — marquee contact
```

### GSAP + React Pattern

Every animated component follows this pattern (from Alessio's gist `b12e58e6`):

```typescript
'use client';

import { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';

gsap.registerPlugin(ScrollTrigger, SplitText);

export function Section() {
  const container = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    // All animations auto-cleanup on unmount (React 18 strict mode safe)
    const split = new SplitText('.heading', { type: 'lines', mask: 'lines' });

    gsap.from(split.lines, {
      y: 40,
      opacity: 0,
      stagger: 0.15,
      duration: 0.8,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: container.current,
        start: 'top 80%',
        toggleActions: 'play none none reverse',
      },
    });
  }, { scope: container });

  return <section ref={container}>...</section>;
}
```

### Lenis Setup

```typescript
// src/providers/LenisProvider.tsx
'use client';

import { ReactLenis } from 'lenis/react';
import { useEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export function LenisProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Sync Lenis with GSAP ScrollTrigger
    const lenis = new (require('lenis'))();
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((time: number) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);

    return () => {
      lenis.destroy();
    };
  }, []);

  return <ReactLenis root>{children}</ReactLenis>;
}
```

### prefers-reduced-motion

```typescript
// In useGSAP callback:
const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if (prefersReduced) return; // Skip all animations — static fallback
```

---

## 3. Section Architecture — Scroll Narrative

The page is a **vertical film**. Each section is a "scene" revealed through scroll.

| # | Section | Animation Pattern | Source Gist/Reference |
|---|---------|-------------------|----------------------|
| 1 | **Hero** | SplitText char reveal on "FLUTUR" + video clip-path expand | Gist `53ee4e2b` (clip-path reveal) |
| 2 | **Credentials Ticker** | Infinite horizontal marquee, gold text | Ashley Brooke services list |
| 3 | **Performance Modes** | Viewport-filling mode names + image parallax from alternating sides | Ashley Brooke "NINE YEARS" + Melvin photo scatter |
| 4 | **Press** | SplitText line reveal on quotes, staggered | Gist `b12e58e6` (SplitText lines mask) |
| 5 | **Bio** | Line-by-line reveal on first paragraph | Same pattern, slower |
| 6 | **Gallery** | Parallax scattered grid, images at different scroll speeds | Melvin Winkeler photo layout |
| 7 | **Tech Rider** | Expand/collapse with height tween | Existing (keep) |
| 8 | **Booking** | Massive type scales up from 80% → 100% on scroll | Ashley Brooke statement text |
| 9 | **Footer** | Marquee with email/WhatsApp scrolling infinitely | Melvin Winkeler footer |

---

## 4. Hero — Cinematic Entry

### Layout

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│  [overline, gold, mono, fades in first]                 │
│  LIVE LOOPING ARTIST                                    │
│                                                         │
│  [SplitText char reveal, stagger 0.03s]                 │
│  F L U T U R                                            │
│  (clamp 100px, 14vw, 180px) — fills viewport width      │
│                                                         │
│  [line reveal, Inter light]                             │
│  From silence, layer by layer                           │
│                                                         │
│  ┌───────────────────────────────────────────────┐      │
│  │                                               │      │
│  │   VIDEO — clip-path reveal from center        │      │
│  │   (circle expanding on scroll)                │      │
│  │                                               │      │
│  └───────────────────────────────────────────────┘      │
│                                                         │
│  [ruled line]                                           │
│  AVAILABLE FOR FALL/WINTER 2026                         │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Animations (timeline)

1. **t=0** — Page load. Overline "LIVE LOOPING ARTIST" fades in (opacity 0→1, y 20→0, 0.5s)
2. **t=0.3** — "FLUTUR" SplitText char reveal (y 60→0, opacity 0→1, stagger 0.04s, mask: 'chars')
3. **t=0.8** — Tagline line reveal (y 30→0, opacity 0→1, 0.6s)
4. **t=1.2** — Availability badge slides in from left (x -40→0, 0.4s)
5. **Scroll** — Video container clip-path: `circle(0% at 50% 50%)` → `circle(75% at 50% 50%)` via ScrollTrigger scrub

### Hero Name Size

```css
font-size: clamp(100px, 14vw, 180px);
line-height: 0.85;
letter-spacing: -0.02em;
font-weight: 700;
```

Bigger than v2's `clamp(80px, 12vw, 140px)`. The name must **dominate** the viewport.

---

## 5. Credentials Ticker (was CredentialsBar)

Infinite horizontal marquee. No start, no end. Always moving.

### Implementation

```typescript
// Duplicate content for seamless loop
<div className="overflow-hidden">
  <div className="flex animate-marquee">
    {[...items, ...items].map((item, i) => (
      <span key={i} className="shrink-0 px-phi-lg font-display text-display text-gold whitespace-nowrap">
        {item.label}
      </span>
    ))}
  </div>
</div>
```

### CSS Animation (no GSAP needed — CSS is more performant for infinite loops)

```css
@keyframes marquee {
  0% { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}
.animate-marquee {
  animation: marquee 40s linear infinite;
}
```

### Content

Festival/venue names in display font, gold. Separator: ` — `

```
DRISHTI BEATS FESTIVAL — GREEK ISLANDS — CASTELLO SFORZESCO — ...
```

`prefers-reduced-motion`: stops animation, shows static row.

---

## 6. Performance Modes — Viewport Typography

This is the biggest departure from v2. Each mode gets its name as a **viewport-filling statement** (Ashley Brooke pattern), with a photo entering from the side via parallax.

### Layout per Mode

```
┌──────────────────────────────────────────────┐
│                                              │
│  01/                                         │
│                                              │
│  SUNSET                                      │
│  AMBIENT         ┌──────────┐                │
│                  │ photo    │                │
│  [clamp 60px,    │ parallax │                │
│   10vw, 120px]   │ from     │                │
│                  │ right    │                │
│                  └──────────┘                │
│  60–90 MIN · RAV VAST · ABLETON             │
│                                              │
│  [body-lg, max-w-prose]                      │
│  description text...                         │
│                                              │
│  ─────────────────────────────────────────── │
│                                              │
│  02/                                         │
│                                              │
│       THE SHOW                               │
│  ┌──────────┐  (FULL                         │
│  │ photo    │   LIVE)                        │
│  │ parallax │                                │
│  │ from     │  60–90 MIN · RAV VAST · GUITAR │
│  │ left     │                                │
│  └──────────┘  description text...           │
│                                              │
└──────────────────────────────────────────────┘
```

### Animations

- **Mode name**: SplitText line reveal (y 50→0, stagger 0.1, mask: 'lines')
- **Index number** ("01/"): opacity 0→1, x -20→0, 0.4s — appears before the name
- **Photo**: ScrollTrigger parallax. `y: -100` to `y: 100` relative to scroll. Alternating sides:
  - Mode 1: photo enters from right (start x: 80, end x: 0)
  - Mode 2: photo enters from left (start x: -80, end x: 0)
  - Mode 3: photo enters from right
- **Metadata line**: fade in after name (delay 0.3s)

### Photo Treatment

Photos use clip-path reveal (from gist `53ee4e2b`):

```typescript
gsap.from(photoEl, {
  clipPath: 'polygon(0 0, 0 0, 0 100%, 0 100%)',  // wipe from left
  duration: 1.2,
  ease: 'power2.out',
  scrollTrigger: {
    trigger: modeContainer,
    start: 'top 70%',
    toggleActions: 'play none none reverse',
  },
});
```

---

## 7. Press Section — Quote Reveal

### Layout

Pull quotes in large italic type (heading-1), revealed line by line via SplitText.

```
┌──────────────────────────────────────────────┐
│                                              │
│  [SplitText line reveal, italic, heading-1]  │
│  "Flutur doesn't perform music.              │
│   He grows it — in real time,                │
│   from nothing."                             │
│                                              │
│              — DRISHTI BEATS ORGANIZER       │
│                                              │
│  ─────────────────────────────────────────── │
│                                              │
│  [Press outlet, display font, cols 1-4]      │
│  ELECTRONIC         [quote + context,        │
│  BEATS              cols 6-12]               │
│                                              │
└──────────────────────────────────────────────┘
```

### Animations

- **Quote text**: SplitText `type: 'lines', mask: 'lines'`, stagger 0.15s, y 30→0
- **Attribution**: fade in after quote completes (delay tied to line count × stagger)
- **Press items**: stagger reveal, 0.2s between items

---

## 8. Photo Gallery — Scattered Parallax

Melvin Winkeler-inspired layout. Photos at **different sizes and positions**, each scrolling at a different speed.

### Layout (12-col grid, but positions are deliberate chaos)

```
┌──────────────────────────────────────────────┐
│                                              │
│  ┌──────────┐                                │
│  │ Photo 1  │           ┌─────────────────┐  │
│  │ cols 1-5 │           │    Photo 2      │  │
│  │ aspect   │           │    cols 7-12    │  │
│  │ 3:2      │           │    aspect 4:5   │  │
│  └──────────┘           │                 │  │
│                         └─────────────────┘  │
│        ┌─────────────────┐                   │
│        │    Photo 3      │                   │
│        │    cols 3-8     │   ┌──────────┐    │
│        │    aspect 16:9  │   │ Photo 4  │    │
│        └─────────────────┘   │ cols 9-11│    │
│                              │ square   │    │
│                              └──────────┘    │
│                                              │
└──────────────────────────────────────────────┘
```

### Parallax Speeds

```typescript
const photos = [
  { speed: -40, cols: 'col-span-5', aspect: 'aspect-[3/2]' },
  { speed: 60, cols: 'col-start-7 col-span-6', aspect: 'aspect-[4/5]' },
  { speed: -20, cols: 'col-start-3 col-span-6', aspect: 'aspect-video' },
  { speed: 40, cols: 'col-start-9 col-span-3', aspect: 'aspect-square' },
];

photos.forEach(({ speed }, i) => {
  gsap.to(photoRefs[i], {
    y: speed,
    ease: 'none',
    scrollTrigger: {
      trigger: galleryRef.current,
      start: 'top bottom',
      end: 'bottom top',
      scrub: true,
    },
  });
});
```

### Image Reveal

Each photo uses the clip-path wipe from gist `53ee4e2b`:
- Photo 1, 3: wipe from left
- Photo 2, 4: wipe from right

---

## 9. Booking — Statement Typography

The booking CTA becomes a **typographic statement** that scales on scroll. Inspired by Ashley Brooke's massive text + Melvin's footer.

### Layout

```
┌──────────────────────────────────────────────┐
│                                              │
│  [scales from 90% → 100% on scroll]         │
│  [clamp(60px, 10vw, 100px)]                 │
│                                              │
│  FALL/WINTER                                 │
│  2026                                        │
│                                              │
│  [body-lg, max-w-prose]                      │
│  Most summer festivals finalize acts by...   │
│                                              │
│           [ WHATSAPP — SECURE A DATE ]       │
│             Telegram · Email                 │
│                                              │
│  EUROPE · MEDITERRANEAN · USA · WORLDWIDE    │
│                                              │
└──────────────────────────────────────────────┘
```

### Animation

```typescript
gsap.from('.booking-headline', {
  scale: 0.9,
  opacity: 0.5,
  ease: 'none',
  scrollTrigger: {
    trigger: bookingRef.current,
    start: 'top 80%',
    end: 'top 30%',
    scrub: true,
  },
});
```

CTA buttons: stagger fade-in after headline settles.

---

## 10. Footer — Marquee Contact

Melvin Winkeler's footer pattern: contact info as a massive, infinitely scrolling marquee.

### Layout

```
┌──────────────────────────────────────────────┐
│  [dark bg, bg-deep #000320]                  │
│                                              │
│  [social icons row — existing v2 pattern]    │
│                                              │
│  [marquee, font-display, ~80px]              │
│  ← 8i8.art ★ booking@flutur.art ★ WhatsApp →│
│                                              │
│  © 2026 FLUTUR · 8i8.art                     │
│                                              │
└──────────────────────────────────────────────┘
```

### Implementation

Same CSS marquee as Credentials Ticker. Content:
```
8i8.art ★ booking@flutur.art ★ +39 351 698 6198 ★
```

The ★ separator is a small gold star (or middot). Text color: text-secondary. On hover: text-primary.

---

## 11. Nav — Numbered (Melvin Pattern)

Hybrid of v2's sticky nav + Melvin's numbered labels.

### Desktop

```
01/ Shows    02/ Press    03/ Tech    04/ Book
```

Equidistributed across the full nav width. FLUTUR brand top-left, numbers in text-tertiary, labels in text-secondary. Active: gold.

### Mobile

Same as v2: hamburger + "Book" CTA. No change needed.

### Animation

Nav fades in on page load (y -20→0, opacity 0→1, 0.3s, stagger on items).

---

## 12. Motion Timing Reference

All durations and easings for consistency:

| Element | Duration | Easing | Trigger |
|---------|----------|--------|---------|
| SplitText chars (hero) | 0.6s per char, stagger 0.04 | power3.out | Page load |
| SplitText lines (sections) | 0.8s per line, stagger 0.15 | power3.out | ScrollTrigger top 80% |
| Photo clip-path reveal | 1.2s | power2.out | ScrollTrigger top 70% |
| Photo parallax | scrub | none (linear) | ScrollTrigger top-bottom |
| Marquee ticker | 40s loop | linear | CSS animation (infinite) |
| Scale-on-scroll (booking) | scrub | none | ScrollTrigger 80%→30% |
| Nav entrance | 0.3s, stagger 0.05 | power2.out | Page load |
| Hover transitions | 200ms | ease-out | CSS (no GSAP) |

### prefers-reduced-motion Fallback

```css
@media (prefers-reduced-motion: reduce) {
  .animate-marquee { animation: none; }
  /* All GSAP animations skipped via JS check */
}
```

---

## 13. File Structure (new/modified)

```
src/
├── providers/
│   └── LenisProvider.tsx          ← NEW: smooth scroll wrapper
├── hooks/
│   └── useScrollReveal.ts         ← NEW: reusable SplitText + ScrollTrigger
├── components/
│   ├── HeroSection.tsx            ← REWRITE: GSAP timeline + SplitText + clip-path
│   ├── CredentialsTicker.tsx      ← RENAME from CredentialsBar, marquee
│   ├── PerformanceModes.tsx       ← REWRITE: viewport typography + parallax
│   ├── PressSection.tsx           ← UPDATE: add SplitText reveal
│   ├── ArtistBio.tsx              ← UPDATE: add line reveal
│   ├── PhotoGallery.tsx           ← REWRITE: scattered parallax layout
│   ├── BookingSection.tsx         ← UPDATE: add scale animation
│   ├── Footer.tsx                 ← UPDATE: add marquee
│   ├── StickyNav.tsx              ← UPDATE: numbered nav + entrance anim
│   └── TechRiderSection.tsx       ← KEEP: minimal changes
├── app/
│   ├── layout.tsx                 ← UPDATE: wrap with LenisProvider
│   └── page.tsx                   ← KEEP: same section order
└── styles/
    └── globals.css                ← UPDATE: marquee keyframes + motion queries
```

---

## 14. Performance Considerations

### Bundle Impact

| Package | Size (gzipped) |
|---------|----------------|
| gsap core | ~24KB |
| ScrollTrigger | ~10KB |
| SplitText | ~6KB |
| lenis | ~5KB |
| **Total new JS** | **~45KB** |

Current page JS: 11.7KB. After v3: ~57KB. Still well under performance budget.

### Optimization

- All GSAP components are `'use client'` — no SSR overhead
- ScrollTrigger `limitCallbacks: true` + `ignoreMobileResize: true`
- `will-change: transform` only on actively animated elements
- Marquee uses CSS animation (GPU-composited, not GSAP)
- Photos lazy-loaded (existing), parallax only activates in viewport
- SplitText `mask: 'lines'` avoids layout shift

### LCP Impact

Hero SplitText animation **starts immediately** on load — not scroll-triggered. The text is in the DOM (SSG), animation is cosmetic. LCP measures the largest content paint, which happens before animation completes.

---

## 15. Gist Reference (Alessio's GitHub)

| Gist ID | Pattern | Use in v3 |
|---------|---------|-----------|
| `b12e58e6` | 3D scroll reveal + SplitText + Lenis | Base architecture pattern |
| `53ee4e2b` | ScrollTrigger image clip-path reveal | Photo reveal in gallery + modes |
| `ddb8b58c` | Scroll-synced slideshow + keyhole | Future: hero video sequence |
| `17fa5ffc` | Image reveal variations | CSS fallback reveals |
| `877c9d5d` | CSS clip-path + filter reveal | Lightweight alternative |
| `fe0f9a1c` | CSS scroll reveal v2 | prefers-reduced-motion fallback |

---

## 16. Implementation Order

1. **Foundation**: Install deps, create LenisProvider, create useScrollReveal hook
2. **Hero**: SplitText char reveal + video clip-path
3. **Credentials Ticker**: CSS marquee (simplest, validates visual direction)
4. **Performance Modes**: Viewport typography + photo parallax (highest impact)
5. **Press + Bio**: SplitText line reveals (same pattern, quick)
6. **Photo Gallery**: Scattered parallax layout
7. **Booking + Footer**: Scale animation + marquee
8. **Nav**: Numbered pattern + entrance animation
9. **Polish**: timing, easing, mobile testing, reduced-motion

---

## 17. Open Questions (carried from v1)

1. **Photo selection** — which 4 for the scattered gallery? Need varied aspect ratios
2. **Video selection** — which for hero clip-path reveal? Efthymia still best?
3. **Italian bio text** — needed for bilingual
4. **Marquee speed** — 40s feels right on desktop, may need 25s on mobile
5. **Gallery on mobile** — scattered parallax becomes stacked single-column? Or 2-col masonry?
6. **Hero video** — facade (thumbnail → click) or autoplay muted loop? Autoplay is more cinematic but heavier
