'use client';

import { useRef, useState } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { PERFORMANCE_MODES } from '@/lib/artist-config';

gsap.registerPlugin(ScrollTrigger, SplitText);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PerformanceMode {
  id: string;
  name: string;
  duration: string;
  description: string;
  equipment: string[];
  bestFor: string[];
  videoId: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Video overrides per mode — component-level mapping,
 * doesn't touch artist-config.ts
 */
const MODE_VIDEO_MAP: Record<string, { youtubeId: string; title: string }> = {
  'sunset-ambient': { youtubeId: 'I-lpfRHTSG4', title: 'Efthymia — RAV Vast Solo' },
  'the-show': { youtubeId: 'NI23tAP0c8U', title: "Greece's Got Talent — 4 YES" },
  'extended-session': { youtubeId: 'UI7lYdNvSi0', title: 'Extended Session — Rocca Full Set' },
};

/**
 * Distinctive equipment per mode — max 3, inline text, no pill tags.
 */
const MODE_EQUIPMENT_HIGHLIGHTS: Record<string, string[]> = {
  'sunset-ambient': ['RAV Vast', 'Acoustic Guitar', 'Vocals'],
  'the-show': ['RAV Vast', 'Ableton Push 3', 'Gibraltar Rack'],
  'extended-session': ['DJ Controller', 'RAV Vast', 'Alesis Drum Pad'],
};

/**
 * Layout direction per mode — alternating asymmetry.
 * 'video-left': video cols 1-5, text cols 7-12
 * 'video-right': text cols 1-6, video cols 8-12
 */
const MODE_LAYOUTS: ('video-left' | 'video-right')[] = [
  'video-left',
  'video-right',
  'video-left',
];

// ---------------------------------------------------------------------------
// VideoFacade — inline component, facade pattern
// ---------------------------------------------------------------------------

interface VideoFacadeProps {
  youtubeId: string;
  title: string;
  modeName: string;
  videoRef: React.RefObject<HTMLDivElement | null>;
}

function VideoFacade({ youtubeId, title, modeName, videoRef }: VideoFacadeProps) {
  const [playing, setPlaying] = useState(false);

  return (
    <div
      ref={videoRef as React.RefObject<HTMLDivElement>}
      className="mode-video relative w-full aspect-video overflow-hidden bg-bg-medium"
    >
      {playing ? (
        <iframe
          className="absolute inset-0 w-full h-full"
          src={`https://www.youtube-nocookie.com/embed/${youtubeId}?autoplay=1&rel=0&modestbranding=1`}
          title={`${modeName} — ${title}`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      ) : (
        <button
          type="button"
          onClick={() => setPlaying(true)}
          className="absolute inset-0 w-full h-full cursor-pointer bg-bg-medium group"
          aria-label={`Play video: ${modeName}`}
        >
          <img
            src={`https://img.youtube.com/vi/${youtubeId}/maxresdefault.jpg`}
            alt={`${modeName} live performance`}
            className="w-full h-full object-cover transition-opacity duration-200 ease-out group-hover:opacity-80"
            loading="lazy"
          />
          <span className="absolute bottom-phi-sm left-phi-sm font-mono text-micro text-text-primary uppercase tracking-[0.12em] bg-background/70 px-phi-xs py-[4px]">
            &#9654; Play
          </span>
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// PerformanceModes
// ---------------------------------------------------------------------------

export function PerformanceModes() {
  return (
    <section
      id="modes"
      className="px-phi-md lg:px-phi-xl py-phi-2xl"
      aria-label="Performance modes available for booking"
    >
      {/* Stacked rows — each mode gets its own asymmetric layout */}
      <div>
        {PERFORMANCE_MODES.map((mode: PerformanceMode, i: number) => (
          <div key={mode.id}>
            {i > 0 && <div className="rule my-phi-xl" />}
            <ModeRow mode={mode} index={i} layout={MODE_LAYOUTS[i]} />
          </div>
        ))}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// ModeRow
// ---------------------------------------------------------------------------

interface ModeRowProps {
  mode: PerformanceMode;
  index: number;
  layout: 'video-left' | 'video-right';
}

function ModeRow({ mode, index, layout }: ModeRowProps) {
  const modeRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLDivElement>(null);
  const equipment = MODE_EQUIPMENT_HIGHLIGHTS[mode.id] ?? mode.equipment.slice(0, 3);
  const number = `${String(index + 1).padStart(2, '0')}/`;
  const video = MODE_VIDEO_MAP[mode.id];

  useGSAP(
    () => {
      // Respect prefers-reduced-motion
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

      const article = modeRef.current;
      if (!article) return;

      // 1. Index number: fade + slide in from left
      const indexEl = article.querySelector('.mode-index');
      if (indexEl) {
        gsap.from(indexEl, {
          opacity: 0,
          x: -20,
          duration: 0.4,
          scrollTrigger: {
            trigger: article,
            start: 'top 85%',
            toggleActions: 'play none none reverse',
          },
        });
      }

      // 2. Mode name: SplitText line mask reveal
      const nameEl = article.querySelector('.mode-name');
      if (nameEl) {
        const split = new SplitText(nameEl, { type: 'lines', mask: 'lines' });
        gsap.from(split.lines, {
          y: 50,
          opacity: 0,
          stagger: 0.1,
          duration: 0.8,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: article,
            start: 'top 80%',
            toggleActions: 'play none none reverse',
          },
        });
      }

      // 3. Video: clip-path wipe reveal — direction depends on layout
      const videoEl = videoRef.current;
      if (videoEl) {
        const fromClip =
          layout === 'video-left'
            ? 'polygon(0 0, 0 0, 0 100%, 0 100%)'
            : 'polygon(100% 0, 100% 0, 100% 100%, 100% 100%)';

        gsap.from(videoEl, {
          clipPath: fromClip,
          duration: 1.2,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: article,
            start: 'top 70%',
          },
        });

        // Inner image counter-scale: zoomed → settle (gist 53ee4e2b)
        const imgEl = videoEl.querySelector('img');
        if (imgEl) {
          gsap.fromTo(imgEl,
            { scale: 1.3 },
            {
              scale: 1,
              duration: 1.4,
              ease: 'power2.out',
              scrollTrigger: { trigger: article, start: 'top 70%' },
            }
          );
        }
      }

      // 4. Metadata block: fade in, slide up, delayed after name
      const metaEl = article.querySelector('.mode-meta');
      if (metaEl) {
        gsap.from(metaEl, {
          y: 20,
          opacity: 0,
          duration: 0.6,
          ease: 'power2.out',
          delay: 0.3,
          scrollTrigger: {
            trigger: article,
            start: 'top 80%',
            toggleActions: 'play none none reverse',
          },
        });
      }
    },
    { scope: modeRef }
  );

  const videoBlock = video ? (
    <VideoFacade
      youtubeId={video.youtubeId}
      title={video.title}
      modeName={mode.name}
      videoRef={videoRef}
    />
  ) : null;

  const textBlock = (
    <div className="flex flex-col justify-center">
      {/* Gold index number — Brockmann positioning above viewport-filling name */}
      <p
        className="mode-index font-display text-gold uppercase tracking-[0.04em] mb-phi-xs"
        style={{ fontSize: 'clamp(18px, 2.5vw, 28px)' }}
      >
        {number}
      </p>

      {/* Viewport-filling mode name — Ashley Brooke pattern */}
      <h3
        className="mode-name font-display font-bold uppercase text-text-primary mb-phi-md"
        style={{
          fontSize: 'clamp(60px, 10vw, 120px)',
          lineHeight: 0.95,
          fontWeight: 700,
        }}
      >
        {mode.name}
      </h3>

      {/* Metadata wrapper — animated as a unit */}
      <div className="mode-meta flex flex-col gap-phi-sm">
        {/* Duration — mono/gold */}
        <p className="font-mono text-caption text-gold uppercase">
          {mode.duration}
        </p>

        {/* Description */}
        <p className="font-body text-body text-text-secondary leading-[1.6] max-w-prose-narrow">
          {mode.description}
        </p>

        {/* Equipment — inline text, no pill tags */}
        <p className="font-mono text-caption text-text-tertiary uppercase tracking-[0.08em]">
          {equipment.join(' \u00B7 ')}
        </p>

        {/* Best for — no label prefix */}
        <p className="font-body text-body-sm text-text-tertiary">
          {mode.bestFor.join(' \u00B7 ')}
        </p>
      </div>
    </div>
  );

  return (
    <article ref={modeRef}>
      {/* Mobile: stacked (video then text) */}
      <div className="lg:hidden space-y-phi-md">
        {videoBlock}
        {textBlock}
      </div>

      {/* Desktop: 12-col asymmetric grid, alternating */}
      <div className="hidden lg:grid lg:grid-cols-12 lg:gap-phi-lg">
        {layout === 'video-left' ? (
          <>
            <div className="col-span-5 col-start-1">{videoBlock}</div>
            <div className="col-span-6 col-start-7">{textBlock}</div>
          </>
        ) : (
          <>
            <div className="col-span-6 col-start-1">{textBlock}</div>
            <div className="col-span-5 col-start-8">{videoBlock}</div>
          </>
        )}
      </div>
    </article>
  );
}
