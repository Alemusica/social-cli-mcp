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

import { NpGrid } from './shared';
import { NpLink } from './NpLink';
import {
  ArticleCard,
  VideoCard,
  QuoteCard,
  CredentialCard,
  PressCard,
  TechCard,
  GalleryCard,
  CTACard,
  FooterCard,
} from './cards';

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
        <ArticleCard
          title="From silence, layer by layer"
          meta={`by ${ARTIST.fullName.toUpperCase()}`}
        >
          <p>{ARTIST.shortBio}</p>
          <p>Every performance starts from silence. Voice, guitar, RAV Vast, drum pad, synth — each layer is a clone, built live in real time.</p>
        </ArticleCard>

        <ArticleCard
          title="The Sound"
          meta={`${VIDEOS.items[0].duration} — Watch on YouTube`}
          href={`https://youtube.com/watch?v=${VIDEOS.items[0].youtubeId}`}
          media={{
            src: PHOTOS[0].src,
            alt: PHOTOS[0].alt,
            caption: PHOTOS[0].location,
            type: 'youtube',
            youtubeId: VIDEOS.items[0].youtubeId,
          }}
        />

        <CredentialCard
          title="Credentials"
          items={CREDENTIALS}
        />
      </NpGrid>

      {/* ═══ Quote 1 ═══ */}
      <QuoteCard
        quote={TESTIMONIALS[0].quote}
        name={TESTIMONIALS[0].name}
        role={TESTIMONIALS[0].role}
      />

      {/* ═══ Zone 2 — Performance Modes (each mode = its own article) ═══ */}
      <NpGrid>
        {PERFORMANCE_MODES.map((mode) => (
          <ArticleCard
            key={mode.id}
            title={mode.name}
            meta={`${mode.duration} — ${mode.bestFor[0]}`}
            media={
              mode.id === 'the-show'
                ? { src: PHOTOS[1].src, alt: PHOTOS[1].alt, caption: PHOTOS[1].location }
                : mode.id === 'sunset-ambient'
                  ? { src: PHOTOS[0].src, alt: PHOTOS[0].alt, caption: PHOTOS[0].location }
                  : { src: PHOTOS[2].src, alt: PHOTOS[2].alt, caption: PHOTOS[2].location }
            }
          >
            <p>{mode.description}</p>
            <p><small>{mode.bestFor.join(' · ')}</small></p>
          </ArticleCard>
        ))}
      </NpGrid>

      {/* ═══ Zone 3 — Setup + Press ═══ */}
      <NpGrid>
        <TechCard
          title="The Setup"
          meta={TECH_RIDER.headline}
          items={[
            { key: 'Signal Flow', value: TECH_RIDER.signalFlow },
            { key: 'Setup', value: TECH_RIDER.setup },
            { key: 'Soundcheck', value: TECH_RIDER.soundcheck },
            { key: 'Breakdown', value: TECH_RIDER.breakdown },
            { key: 'Stage', value: '2m × 2m min' },
            { key: 'Power', value: '220V, 2× outlets' },
          ]}
          footnote="Fully self-contained — no backline, no sound engineer needed"
        />

        <PressCard
          title="Press"
          items={PRESS.map((p) => ({
            quote: p.quote,
            outlet: p.outlet,
            date: p.date,
            url: p.url,
            hasLink: p.hasLink,
          }))}
        />
      </NpGrid>

      {/* ═══ Quote 2 ═══ */}
      <QuoteCard
        quote={TESTIMONIALS[1].quote}
        name={TESTIMONIALS[1].name}
        role={TESTIMONIALS[1].role}
      />

      {/* ═══ Zone 4 — Watch (3 feature videos, newspaper articles) ═══ */}
      <NpGrid>
        {VIDEOS.items.filter(v => v.youtubeId).slice(0, 3).map((v) => (
          <ArticleCard
            key={v.id}
            title={v.title}
            meta={`${v.duration} — ${v.subtitle}`}
            href={`https://youtube.com/watch?v=${v.youtubeId}`}
            media={{
              src: `https://img.youtube.com/vi/${v.youtubeId}/maxresdefault.jpg`,
              alt: v.title,
              type: 'youtube',
              youtubeId: v.youtubeId,
            }}
          >
            <p><small>{v.bestFor.join(' · ')}</small></p>
          </ArticleCard>
        ))}
      </NpGrid>

      {/* ═══ Zone 5 — More Videos (compact row) ═══ */}
      <NpGrid>
        {VIDEOS.items.filter(v => v.youtubeId).slice(3, 6).map((v) => (
          <VideoCard
            key={v.id}
            youtubeId={v.youtubeId}
            title={v.title}
            subtitle={v.subtitle}
            duration={v.duration}
          />
        ))}
      </NpGrid>

      {/* ═══ Gallery ═══ */}
      <GalleryCard
        title="Live"
        images={PHOTOS.map((p) => ({
          src: p.src,
          alt: p.alt,
          caption: p.location,
        }))}
      />

      {/* ═══ Book — full width CTA ═══ */}
      <CTACard
        title="Book Flutur"
        meta="2026 — Europe, Mediterranean, USA"
      >
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
      </CTACard>

      {/* ═══ Footer ═══ */}
      <FooterCard groups={[SOCIAL_LINKS, MUSIC_LINKS]} />
    </div>
  );
}
