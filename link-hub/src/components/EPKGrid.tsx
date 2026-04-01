'use client';

import {
  ARTIST,
  CREDENTIALS,
  VIDEOS,
  PERFORMANCE_MODES,
  PRESS,
  TESTIMONIALS,
  PHOTOS,
  TECH_RIDER,
  SOCIAL_LINKS,
  MUSIC_LINKS,
} from '@/lib/artist-config';

import { NpCard } from './NpCard';
import { NpQuote } from './NpQuote';
import { NpGrid } from './NpGrid';
import { NpLink } from './NpLink';
import { NpVideoCard } from './NpVideoCard';

export function EPKGrid() {
  return (
    <div className="newspaper">
      {/* ═══ Masthead ═══ */}
      <div className="np-head">
        <div className="np-weather">
          <span style={{ fontStyle: 'italic' }}>Live Looping — RAV Vast</span>
          <br />
          One-Man Orchestra
          <br />
          Self-contained — No backline
        </div>
        <header className="np-masthead">FLUTUR</header>
        <div className="np-subhead">
          {ARTIST.tagline} — EPK 2026 — Available Worldwide
        </div>
      </div>

      {/* ═══ Zone 1 — Intro ═══ */}
      <NpGrid>
        <NpCard title="From silence, layer by layer" meta={`by ${ARTIST.fullName.toUpperCase()}`}>
          <p>{ARTIST.shortBio}</p>
          <p>Every performance starts from silence. Voice, guitar, RAV Vast, drum pad, synth — each layer is a clone, built live in real time.</p>
        </NpCard>

        <NpCard
          title="The Sound"
          meta={`${VIDEOS.items[0].duration} — Watch on YouTube`}
          href={`https://youtube.com/watch?v=${VIDEOS.items[0].youtubeId}`}
          image={{ src: PHOTOS[0].src, alt: PHOTOS[0].alt, caption: PHOTOS[0].location }}
        />

        <NpCard title="Credentials">
          {CREDENTIALS.map((cred, i) => (
            <p key={i} className="np-cred-line">
              <strong>{cred.text}</strong>
              <br />
              <small>{cred.year}</small>
            </p>
          ))}
        </NpCard>
      </NpGrid>

      {/* ═══ Quote 1 ═══ */}
      <NpQuote
        quote={TESTIMONIALS[0].quote}
        name={TESTIMONIALS[0].name}
        role={TESTIMONIALS[0].role}
      />

      {/* ═══ Zone 2 — Show + Setup + Press ═══ */}
      <NpGrid>
        <NpCard
          title="The Show"
          meta="Full live — one-man orchestra"
          image={{ src: PHOTOS[1].src, alt: PHOTOS[1].alt, caption: PHOTOS[1].location }}
        >
          <p>{PERFORMANCE_MODES[1].description}</p>
          <div className="np-formats">
            {PERFORMANCE_MODES.map((mode) => (
              <div key={mode.id} className="np-format-line">
                <strong>{mode.name}</strong> — {mode.duration}
                <br />
                <small>{mode.bestFor.join(', ')}</small>
              </div>
            ))}
          </div>
        </NpCard>

        <NpCard
          title="The Setup"
          meta={TECH_RIDER.headline}
          image={{ src: PHOTOS[2].src, alt: PHOTOS[2].alt, caption: PHOTOS[2].location }}
        >
          <p>Signal: {TECH_RIDER.signalFlow}</p>
          <p>Setup {TECH_RIDER.setup} · Soundcheck {TECH_RIDER.soundcheck} · Breakdown {TECH_RIDER.breakdown}</p>
          <NpLink href={TECH_RIDER.downloadUrl} download variant="button">
            Download Tech Rider PDF
          </NpLink>
        </NpCard>

        <NpCard title="Press">
          {PRESS.filter(p => p.hasLink).map((p, i) => (
            <p key={i}>
              <NpLink href={p.url} external variant="press">
                &ldquo;{p.quote}&rdquo;
              </NpLink>
              <br />
              <small>{p.outlet} — {p.date}</small>
            </p>
          ))}
        </NpCard>
      </NpGrid>

      {/* ═══ Quote 2 ═══ */}
      <NpQuote
        quote={TESTIMONIALS[1].quote}
        name={TESTIMONIALS[1].name}
        role={TESTIMONIALS[1].role}
      />

      {/* ═══ Zone 3 — Watch ═══ */}
      <NpGrid>
        {VIDEOS.items.filter(v => v.youtubeId).slice(0, 5).map((v) => (
          <NpVideoCard
            key={v.id}
            youtubeId={v.youtubeId}
            title={v.title}
            subtitle={v.subtitle}
            duration={v.duration}
          />
        ))}
      </NpGrid>

      {/* ═══ Book — full width CTA ═══ */}
      <div className="np-cta">
        <div className="np-headline">
          <span className="np-title">Book Flutur</span>
          <span className="np-meta">2026 — Europe, Mediterranean, USA</span>
        </div>
        <div className="np-cta-grid">
          <div>
            <p>
              <NpLink
                href={`mailto:${ARTIST.bookingEmail}?subject=Booking Inquiry — FLUTUR 2026`}
                variant="press"
              >
                {ARTIST.bookingEmail}
              </NpLink>
            </p>
            <p>
              <NpLink href={ARTIST.whatsapp} external variant="press">
                WhatsApp
              </NpLink>
            </p>
          </div>
          <div>
            <NpLink href={TECH_RIDER.promoUrl} download variant="button">
              Download Promo Sheet
            </NpLink>
          </div>
        </div>
      </div>

      {/* ═══ Footer ═══ */}
      <div className="np-footer">
        {SOCIAL_LINKS.map((link) => (
          <a key={link.name} href={link.url} target="_blank" rel="noopener noreferrer" className="np-footer-link">
            {link.name}
          </a>
        ))}
        <span className="np-footer-sep">·</span>
        {MUSIC_LINKS.map((link) => (
          <a key={link.name} href={link.url} target="_blank" rel="noopener noreferrer" className="np-footer-link">
            {link.name}
          </a>
        ))}
      </div>
    </div>
  );
}
