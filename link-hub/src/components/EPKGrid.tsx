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
      <div className="np-zone">
        <div className="np-article">
          <div className="np-headline">
            <span className="np-title">From silence, layer by layer</span>
            <span className="np-meta">by {ARTIST.fullName.toUpperCase()}</span>
          </div>
          <p>{ARTIST.shortBio}</p>
          <p>Every performance starts from silence. Voice, guitar, RAV Vast, drum pad, synth — each layer is a clone, built live in real time.</p>
        </div>

        <div className="np-article">
          <div className="np-headline">
            <a href={`https://youtube.com/watch?v=${VIDEOS.items[0].youtubeId}`} target="_blank" rel="noopener noreferrer">
              <span className="np-title">The Sound</span>
              <span className="np-meta">{VIDEOS.items[0].duration} — Watch on YouTube</span>
            </a>
          </div>
          <figure className="np-figure">
            <img className="np-media" src={PHOTOS[0].src} alt={PHOTOS[0].alt} />
            <figcaption className="np-figcaption">{PHOTOS[0].location}</figcaption>
          </figure>
        </div>

        <div className="np-article">
          <div className="np-headline">
            <span className="np-title">Credentials</span>
          </div>
          {CREDENTIALS.map((cred, i) => (
            <p key={i} className="np-cred-line">
              <strong>{cred.text}</strong>
              <br />
              <small>{cred.year}</small>
            </p>
          ))}
        </div>
      </div>

      {/* ═══ Quote 1 ═══ */}
      <blockquote className="np-citation">
        &ldquo;{TESTIMONIALS[0].quote}&rdquo;
        <cite className="np-cite">— {TESTIMONIALS[0].name}, {TESTIMONIALS[0].role}</cite>
      </blockquote>

      {/* ═══ Zone 2 — Show + Setup + Press ═══ */}
      <div className="np-zone">
        <div className="np-article">
          <div className="np-headline">
            <span className="np-title">The Show</span>
            <span className="np-meta">Full live — one-man orchestra</span>
          </div>
          <figure className="np-figure">
            <img className="np-media" src={PHOTOS[1].src} alt={PHOTOS[1].alt} />
            <figcaption className="np-figcaption">{PHOTOS[1].location}</figcaption>
          </figure>
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
        </div>

        <div className="np-article">
          <div className="np-headline">
            <span className="np-title">The Setup</span>
            <span className="np-meta">{TECH_RIDER.headline}</span>
          </div>
          <figure className="np-figure">
            <img className="np-media" src={PHOTOS[2].src} alt={PHOTOS[2].alt} />
            <figcaption className="np-figcaption">{PHOTOS[2].location}</figcaption>
          </figure>
          <p>Signal: {TECH_RIDER.signalFlow}</p>
          <p>Setup {TECH_RIDER.setup} · Soundcheck {TECH_RIDER.soundcheck} · Breakdown {TECH_RIDER.breakdown}</p>
          <div className="np-button">
            <a href={TECH_RIDER.downloadUrl} download>Download Tech Rider PDF</a>
          </div>
        </div>

        <div className="np-article">
          <div className="np-headline">
            <span className="np-title">Press</span>
          </div>
          {PRESS.filter(p => p.hasLink).map((p, i) => (
            <p key={i}>
              <a href={p.url} target="_blank" rel="noopener noreferrer" className="np-press-link">
                &ldquo;{p.quote}&rdquo;
              </a>
              <br />
              <small>{p.outlet} — {p.date}</small>
            </p>
          ))}
        </div>
      </div>

      {/* ═══ Quote 2 ═══ */}
      <blockquote className="np-citation">
        &ldquo;{TESTIMONIALS[1].quote}&rdquo;
        <cite className="np-cite">— {TESTIMONIALS[1].name}, {TESTIMONIALS[1].role}</cite>
      </blockquote>

      {/* ═══ Zone 3 — Watch ═══ */}
      <div className="np-zone">
        {VIDEOS.items.filter(v => v.youtubeId).slice(0, 5).map((v) => (
          <div key={v.id} className="np-article">
            <a href={`https://youtube.com/watch?v=${v.youtubeId}`} target="_blank" rel="noopener noreferrer" className="np-press-link">
              {v.title}
            </a>
            <br />
            <small>{v.subtitle} — {v.duration}</small>
          </div>
        ))}
      </div>

      {/* ═══ Book — full width CTA ═══ */}
      <div className="np-cta">
        <div className="np-headline">
          <span className="np-title">Book Flutur</span>
          <span className="np-meta">2026 — Europe, Mediterranean, USA</span>
        </div>
        <div className="np-cta-grid">
          <div>
            <p>
              <a href={`mailto:${ARTIST.bookingEmail}?subject=Booking Inquiry — FLUTUR 2026`} className="np-press-link">{ARTIST.bookingEmail}</a>
            </p>
            <p>
              <a href={ARTIST.whatsapp} target="_blank" rel="noopener noreferrer" className="np-press-link">WhatsApp</a>
            </p>
          </div>
          <div>
            <div className="np-button">
              <a href={TECH_RIDER.promoUrl} download>Download Promo Sheet</a>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ Footer ═══ */}
      <div className="np-footer">
        {SOCIAL_LINKS.map((link) => (
          <a key={link.name} href={link.url} target="_blank" rel="noopener noreferrer" className="np-footer-link">{link.name}</a>
        ))}
        <span className="np-footer-sep">·</span>
        {MUSIC_LINKS.map((link) => (
          <a key={link.name} href={link.url} target="_blank" rel="noopener noreferrer" className="np-footer-link">{link.name}</a>
        ))}
      </div>
    </div>
  );
}
