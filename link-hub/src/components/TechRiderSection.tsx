import { TECH_RIDER } from '@/lib/artist-config';

export default function TechRiderSection() {
  return (
    <section id="tech" className="px-6 py-phi-2xl">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl font-display font-light tracking-wide text-text-primary mb-phi-lg text-center">
          Technical Rider
        </h2>

        {/* Self-contained badge */}
        <div className="flex justify-center mb-phi-lg">
          <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-accent-gold/40 bg-bg-light">
            <svg className="w-4 h-4 text-accent-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-sm font-medium text-text-primary">{TECH_RIDER.headline}</span>
          </div>
        </div>

        {/* Two columns: Artist equipment + Venue needs */}
        <div className="grid md:grid-cols-2 gap-6 mb-phi-lg">
          {/* Artist equipment */}
          <div className="bg-bg-medium rounded-lg overflow-hidden">
            <div className="px-5 py-3 border-b border-white/5">
              <h3 className="text-xs font-medium tracking-[0.15em] uppercase text-text-muted">
                Artist Equipment (provided)
              </h3>
            </div>
            <div className="divide-y divide-white/5">
              {TECH_RIDER.artistEquipment.map((eq) => (
                <div key={eq.item} className="px-5 py-2.5">
                  <span className="text-sm font-medium">{eq.item}</span>
                  <span className="text-xs text-text-muted ml-2">{eq.note}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Venue requirements */}
          <div className="bg-bg-medium rounded-lg overflow-hidden">
            <div className="px-5 py-3 border-b border-white/5">
              <h3 className="text-xs font-medium tracking-[0.15em] uppercase text-text-muted">
                Venue Requirements
              </h3>
            </div>
            <div className="divide-y divide-white/5">
              {TECH_RIDER.venueNeeds.map((need) => (
                <div key={need.item} className="px-5 py-2.5">
                  <span className="text-sm font-medium">{need.item}</span>
                  <span className="text-xs text-text-muted ml-2">{need.spec}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Signal flow */}
        <div className="bg-bg-medium rounded-lg px-5 py-4 mb-phi-lg text-center">
          <p className="text-xs font-medium tracking-[0.15em] uppercase text-text-muted mb-2">Signal Flow</p>
          <p className="text-sm text-text-secondary">{TECH_RIDER.signalFlow}</p>
        </div>

        {/* Timing */}
        <div className="grid grid-cols-3 gap-4 mb-phi-lg">
          <div className="text-center">
            <p className="text-lg font-medium">{TECH_RIDER.setup}</p>
            <p className="text-xs text-text-muted">Setup</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-medium">{TECH_RIDER.soundcheck}</p>
            <p className="text-xs text-text-muted">Soundcheck</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-medium">{TECH_RIDER.breakdown}</p>
            <p className="text-xs text-text-muted">Breakdown</p>
          </div>
        </div>

        {/* Download buttons */}
        <div className="flex justify-center gap-4">
          <a
            href={TECH_RIDER.downloadUrl}
            download
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border border-accent-gold/30 hover:bg-accent-gold/5 transition-colors text-sm text-accent-gold"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3M6 20h12" />
            </svg>
            Download Tech Rider
          </a>
          <a
            href={TECH_RIDER.promoUrl}
            download
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border border-accent-gold/30 hover:bg-accent-gold/5 transition-colors text-sm text-accent-gold"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3M6 20h12" />
            </svg>
            Download Promo Sheet
          </a>
        </div>
      </div>
    </section>
  );
}
