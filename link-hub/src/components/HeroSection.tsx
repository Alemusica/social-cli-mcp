'use client';

import { useRef, useState } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { ARTIST, VIDEOS } from '@/lib/artist-config';
import { trackVideoPlay } from '@/lib/tracking';

gsap.registerPlugin(ScrollTrigger, SplitText);

interface VideoFacadeProps {
  youtubeId: string;
  title: string;
}

function VideoFacade({ youtubeId, title }: VideoFacadeProps) {
  const [playing, setPlaying] = useState(false);

  function handlePlay() {
    setPlaying(true);
    trackVideoPlay(youtubeId, title);
  }

  if (playing) {
    return (
      <div className="video-facade">
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${youtubeId}?autoplay=1&rel=0&modestbranding=1`}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={handlePlay}
      aria-label={`Play video: ${title}`}
      className="video-facade w-full cursor-pointer group"
    >
      <img
        src={`https://img.youtube.com/vi/${youtubeId}/maxresdefault.jpg`}
        alt={`Video thumbnail: ${title}`}
        className="absolute inset-0 w-full h-full object-cover"
        loading="lazy"
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="flex items-center gap-phi-xs border border-gold bg-background/80 px-phi-md py-phi-sm transition-[background] duration-200 ease-out group-hover:bg-gold-faint">
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            aria-hidden="true"
            className="text-gold"
          >
            <path d="M4 2L14 8L4 14V2Z" fill="currentColor" />
          </svg>
          <span className="font-mono text-micro uppercase text-gold tracking-[0.12em]">
            Play
          </span>
        </div>
      </div>
    </button>
  );
}

export function HeroSection() {
  const heroVideo = VIDEOS.items.find(v => v.id === 'efthymia')!;
  const container = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (prefersReduced) return;

      gsap.from('.hero-overline', {
        opacity: 0,
        y: 20,
        duration: 0.5,
        ease: 'power3.out',
      });

      const split = new SplitText('.hero-name', { type: 'chars', mask: 'chars' });
      gsap.from(split.chars, {
        y: 60,
        opacity: 0,
        stagger: 0.04,
        duration: 0.6,
        delay: 0.3,
        ease: 'power3.out',
      });

      gsap.from('.hero-tagline', {
        y: 30,
        opacity: 0,
        duration: 0.6,
        delay: 0.8,
        ease: 'power3.out',
      });

      gsap.from('.hero-availability', {
        x: -40,
        opacity: 0,
        duration: 0.4,
        delay: 1.2,
        ease: 'power3.out',
      });

      gsap.fromTo(
        '.hero-video-reveal',
        { clipPath: 'circle(0% at 50% 50%)' },
        {
          clipPath: 'circle(75% at 50% 50%)',
          ease: 'none',
          scrollTrigger: {
            trigger: '.hero-video-reveal',
            start: 'top 80%',
            end: 'bottom 20%',
            scrub: true,
          },
        }
      );

      // Filter reveal — brightness settles as video comes into view (gist 877c9d5d)
      gsap.fromTo(
        '.hero-video-reveal',
        { filter: 'brightness(1.4) contrast(0.7)' },
        {
          filter: 'brightness(1) contrast(1)',
          ease: 'none',
          scrollTrigger: {
            trigger: '.hero-video-reveal',
            start: 'top 80%',
            end: 'bottom 40%',
            scrub: true,
          },
        }
      );
    },
    { scope: container }
  );

  return (
    <section
      ref={container}
      id="hero"
      className="relative min-h-[80vh] flex flex-col justify-center border-b border-rule overflow-hidden"
    >
      <div className="mx-auto w-full max-w-[1200px] px-phi-md lg:px-phi-xl py-phi-2xl">
        <div className="grid grid-cols-1 lg:grid-cols-12 items-center">
          <div className="lg:col-span-7 flex flex-col gap-phi-md">
            <span className="hero-overline font-mono text-micro uppercase text-gold tracking-[0.12em]">
              Live Looping Artist
            </span>

            <h1
              className="hero-name font-display font-bold uppercase text-text-primary"
              style={{
                fontSize: 'clamp(100px, 14vw, 180px)',
                lineHeight: '0.85',
                letterSpacing: '-0.02em',
              }}
            >
              {ARTIST.name}
            </h1>

            <p className="hero-tagline font-body text-heading-1 font-light text-text-secondary max-w-prose-narrow">
              {ARTIST.tagline}
            </p>

            <div className="hero-availability mt-phi-md pt-phi-sm border-t border-rule">
              <span className="font-mono text-micro uppercase text-gold tracking-[0.12em]">
                Available for Fall/Winter 2026
              </span>
            </div>
          </div>

          <div className="hidden lg:block lg:col-span-1" aria-hidden="true" />

          <div className="hero-video-reveal lg:col-span-4 flex flex-col gap-phi-xs mt-phi-lg lg:mt-0">
            <VideoFacade
              youtubeId={heroVideo.youtubeId}
              title={heroVideo.title}
            />
            <span className="font-mono text-micro text-text-tertiary tracking-[0.08em]">
              {heroVideo.title} — {heroVideo.subtitle}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
