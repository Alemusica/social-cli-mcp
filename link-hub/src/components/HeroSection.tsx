'use client';

import { useSearchParams } from 'next/navigation';
import {
  ARTIST,
  CREDENTIALS,
  TECH_RIDER,
  VIDEOS,
} from '@/lib/artist-config';
import { trackDownload, trackVideoPlay } from '@/lib/tracking';

export default function HeroSection() {
  const searchParams = useSearchParams();
  const utmCampaign = searchParams.get('utm_campaign');

  // Two hero videos: Efthymia (best converter) + GGT (Greek market proof)
  const efthymia = VIDEOS.items.find(v => v.id === 'efthymia')!;
  const ggt = VIDEOS.items.find(v => v.id === 'ggt')!;

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center px-6">
      {/* Background image */}
      <div className="absolute inset-0">
        <img
          src="/images/optimized/rocca-rav-devotional.webp"
          alt=""
          fetchPriority="high"
          decoding="async"
          className="absolute inset-0 w-full h-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#000427]/70 via-[#000427]/50 to-[#000427]" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center text-center max-w-4xl">
        <h1 className="text-5xl md:text-7xl font-display font-light tracking-tight mb-3 animate-fade-in">
          {ARTIST.name}
        </h1>

        <p className="text-lg md:text-xl text-white/70 font-light tracking-wide mb-8 animate-fade-in delay-1">
          {ARTIST.tagline}
        </p>

        {/* Top credentials as pills */}
        <div className="flex flex-wrap justify-center gap-2 mb-10 animate-fade-in delay-2">
          {CREDENTIALS.filter(c => c.highlight).slice(0, 4).map((cred, i) => (
            <span
              key={i}
              className="px-3 py-1.5 rounded-full border border-accent-gold/30 bg-black/40 text-xs text-text-primary backdrop-blur-sm"
            >
              {cred.text}
            </span>
          ))}
        </div>

        {/* Two hero videos side by side */}
        <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4 mb-10 animate-fade-in delay-3">
          <div>
            <div className="video-container rounded-lg overflow-hidden shadow-2xl">
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${efthymia.youtubeId}?rel=0&modestbranding=1&color=white`}
                title={efthymia.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
            <p className="text-xs text-text-muted mt-2">{efthymia.title}</p>
          </div>
          <div>
            <div className="video-container rounded-lg overflow-hidden shadow-2xl">
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${ggt.youtubeId}?rel=0&modestbranding=1&color=white`}
                title={ggt.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
            <p className="text-xs text-text-muted mt-2">{ggt.title}</p>
          </div>
        </div>

        {/* Dual CTA: Book + Download */}
        <div className="flex flex-col sm:flex-row gap-3 animate-fade-in delay-4">
          <a
            href="#booking"
            className="btn-primary px-8 py-3 rounded-lg text-base font-medium tracking-wide"
          >
            Book for 2026
          </a>
          <div className="flex gap-2">
            <a
              href={TECH_RIDER.promoUrl}
              download
              onClick={() => trackDownload('flutur-promo-2026.pdf')}
              className="px-5 py-3 rounded-lg border border-white/20 hover:border-white/40 transition-colors text-sm flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 10v6m0 0l-3-3m3 3l3-3M6 20h12" />
              </svg>
              Promo Sheet
            </a>
            <a
              href={TECH_RIDER.downloadUrl}
              download
              onClick={() => trackDownload('flutur-tech-rider-2026.pdf')}
              className="px-5 py-3 rounded-lg border border-white/20 hover:border-white/40 transition-colors text-sm flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 10v6m0 0l-3-3m3 3l3-3M6 20h12" />
              </svg>
              Tech Rider
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
