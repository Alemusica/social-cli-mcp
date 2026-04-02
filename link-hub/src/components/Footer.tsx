'use client';

import { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ARTIST, MUSIC_LINKS } from '@/lib/artist-config';

gsap.registerPlugin(ScrollTrigger);

/* ---------- Inline SVG icons — 24x24 viewBox ---------- */

function SpotifyIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
    </svg>
  );
}

function YouTubeIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
    </svg>
  );
}

function SoundCloudIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M1.175 12.225c-.051 0-.094.046-.101.1l-.233 2.154.233 2.105c.007.058.05.098.101.098.05 0 .09-.04.099-.098l.255-2.105-.27-2.154c-.009-.057-.05-.1-.1-.1m-.899.828c-.06 0-.091.037-.104.094L0 14.479l.172 1.282c.013.06.045.094.104.094.057 0 .09-.037.104-.094l.199-1.282-.2-1.332c-.014-.057-.046-.094-.104-.094m1.8-1.16c-.066 0-.114.05-.12.116l-.217 2.47.217 2.373c.006.066.054.116.12.116.063 0 .114-.05.12-.116l.244-2.373-.244-2.47c-.006-.066-.057-.116-.12-.116m.899-.494c-.072 0-.129.06-.135.13l-.2 2.794.2 2.693c.006.073.063.131.135.131.07 0 .126-.058.134-.13l.226-2.694-.226-2.793c-.008-.073-.064-.131-.134-.131m.9-.441c-.078 0-.14.064-.148.143l-.186 3.106.186 2.983c.008.08.07.144.148.144.076 0 .138-.064.148-.144l.208-2.983-.208-3.106c-.01-.08-.072-.143-.148-.143m.9-.322c-.087 0-.155.072-.16.158l-.171 3.37.171 3.24c.005.088.073.157.16.157.085 0 .152-.07.16-.157l.192-3.24-.192-3.37c-.008-.086-.075-.158-.16-.158m.9-.178c-.093 0-.166.079-.173.172l-.156 3.492.156 3.444c.007.094.08.172.173.172.09 0 .164-.078.172-.172l.176-3.444-.176-3.492c-.008-.093-.082-.172-.172-.172m.9-.093c-.1 0-.18.085-.186.187l-.14 3.527.14 3.6c.006.1.086.186.186.186.098 0 .177-.086.186-.186l.16-3.6-.16-3.527c-.009-.102-.088-.187-.186-.187m.9.009c-.107 0-.19.093-.198.2l-.126 3.46.126 3.716c.008.108.09.2.198.2.105 0 .188-.092.198-.2l.14-3.716-.14-3.46c-.01-.107-.093-.2-.198-.2m.9-.18c-.113 0-.202.1-.21.215l-.112 3.597.112 3.87c.008.115.097.214.21.214.11 0 .2-.1.21-.214l.127-3.87-.127-3.597c-.01-.115-.1-.215-.21-.215m.9-.255c-.12 0-.214.107-.222.228l-.098 3.795.098 4c.008.122.102.229.222.229.118 0 .212-.107.222-.229l.11-4-.11-3.795c-.01-.121-.104-.228-.222-.228m1.406-.497c-.053-.02-.109-.03-.165-.03-.12 0-.232.048-.315.13-.083.085-.128.2-.13.315l-.084 4.235.084 3.937c.002.116.05.228.13.31.084.087.197.134.315.134.114 0 .226-.047.31-.13.086-.084.131-.198.134-.314l.095-3.937-.095-4.237c-.003-.115-.048-.228-.13-.313-.084-.085-.196-.13-.314-.13-.054 0-.11.01-.165.03m1.23.13c-.18 0-.338.15-.344.33l-.074 4.3.074 3.91c.006.18.164.33.344.33.177 0 .334-.15.343-.33l.084-3.91-.084-4.3c-.009-.18-.166-.33-.343-.33m.899-.122c-.19 0-.348.158-.354.348l-.062 4.364.062 3.882c.006.19.164.348.354.348.187 0 .346-.158.354-.348l.07-3.882-.07-4.364c-.008-.19-.167-.348-.354-.348m1.548.27c-.18 0-.348.085-.468.227-.12.143-.183.328-.176.52l.055 4.176-.055 3.843c-.007.19.056.377.176.518.12.143.287.228.468.228.177 0 .344-.085.464-.228.12-.14.183-.327.176-.518l.002-.037-.062-3.806.062-4.139-.002-.038c-.007-.19-.056-.377-.176-.519-.12-.143-.287-.227-.464-.227m1.282.452c-.008-.19-.07-.374-.196-.512-.127-.14-.3-.218-.483-.218-.18 0-.353.078-.482.218-.127.138-.19.323-.196.512l-.049 3.907.049 3.81c.006.19.069.373.196.512.129.14.302.218.482.218.183 0 .356-.078.483-.218.127-.139.188-.323.196-.512v-.02l.056-3.79-.056-3.888v-.019m.85 1.32c-.445-2.12-2.332-3.716-4.584-3.716-.51 0-1.01.084-1.478.234C21.18 7.62 19.2 6.4 16.956 6.4c-.6 0-1.187.103-1.74.295-.221.076-.28.153-.283.3v10.723c.003.157.131.286.286.3h8.332c1.952 0 3.533-1.594 3.533-3.562 0-1.355-.756-2.532-1.867-3.13"/>
    </svg>
  );
}

function BandcampIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M0 18.75l7.437-13.5H24l-7.438 13.5H0z"/>
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/>
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  );
}

/* ---------- Icon map for iteration ---------- */

interface SocialIconLink {
  name: string;
  url: string;
  ariaLabel: string;
  icon: () => JSX.Element;
}

function getMusicUrl(name: string): string {
  const link = MUSIC_LINKS.find((l) => l.name === name);
  return link?.url ?? '#';
}

const ICON_LINKS: SocialIconLink[] = [
  { name: 'Spotify', url: getMusicUrl('Spotify'), ariaLabel: 'Listen on Spotify', icon: SpotifyIcon },
  { name: 'YouTube', url: getMusicUrl('YouTube'), ariaLabel: 'Watch on YouTube', icon: YouTubeIcon },
  { name: 'SoundCloud', url: getMusicUrl('SoundCloud'), ariaLabel: 'Listen on SoundCloud', icon: SoundCloudIcon },
  { name: 'Bandcamp', url: getMusicUrl('Bandcamp'), ariaLabel: 'Buy on Bandcamp', icon: BandcampIcon },
  { name: 'Instagram', url: ARTIST.instagram, ariaLabel: 'Follow on Instagram', icon: InstagramIcon },
  { name: 'Facebook', url: ARTIST.facebook, ariaLabel: 'Follow on Facebook', icon: FacebookIcon },
];

export function Footer() {
  const container = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (prefersReduced) return;

      // Social icons — stagger fade in on scroll
      gsap.from('.footer-icon', {
        opacity: 0,
        y: 10,
        stagger: 0.05,
        duration: 0.3,
        scrollTrigger: {
          trigger: container.current,
          start: 'top 90%',
          toggleActions: 'play none none reverse',
        },
      });
    },
    { scope: container }
  );

  return (
    <footer ref={container} className="bg-bg-deep px-phi-md lg:px-phi-xl pt-phi-xl pb-phi-2xl" role="contentinfo">

      {/* Marquee contact bar */}
      <div className="overflow-hidden py-phi-lg">
        <div className="flex animate-marquee">
          {[0, 1].map((copy) => (
            <div key={copy} className="flex shrink-0 items-center gap-phi-xl">
              <span className="font-display text-text-secondary whitespace-nowrap" style={{ fontSize: 'clamp(48px, 8vw, 80px)' }}>
                8i8.art
              </span>
              <span className="text-gold text-heading-2">&#9733;</span>
              <span className="font-display text-text-secondary whitespace-nowrap" style={{ fontSize: 'clamp(48px, 8vw, 80px)' }}>
                booking@flutur.art
              </span>
              <span className="text-gold text-heading-2">&#9733;</span>
              <span className="font-display text-text-secondary whitespace-nowrap" style={{ fontSize: 'clamp(48px, 8vw, 80px)' }}>
                WhatsApp
              </span>
              <span className="text-gold text-heading-2">&#9733;</span>
            </div>
          ))}
        </div>
      </div>

      <div className="rule mb-phi-xl" />

      {/* Asymmetric 12-col: icons left, colophon right */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-phi-sm items-center">
        {/* Icons — left-aligned */}
        <div className="md:col-span-6 flex items-center gap-phi-sm">
          {ICON_LINKS.map(({ name, url, ariaLabel, icon: Icon }) => (
            <a
              key={name}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={ariaLabel}
              className="footer-icon p-[11px] text-text-tertiary hover:text-text-primary transition-colors duration-200 ease-out"
            >
              <Icon />
            </a>
          ))}
        </div>

        {/* Colophon — right-aligned */}
        <div className="md:col-start-10 md:col-span-3 flex items-center gap-phi-sm md:justify-end">
          <span className="font-body text-caption text-text-tertiary">
            &copy; 2026 FLUTUR
          </span>
          <span className="font-body text-caption text-text-tertiary" aria-hidden="true">&middot;</span>
          <span className="font-body text-caption text-text-tertiary">
            8i8.art
          </span>
        </div>
      </div>
    </footer>
  );
}
