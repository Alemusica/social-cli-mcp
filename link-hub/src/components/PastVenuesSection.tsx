import { PAST_VENUES } from '@/lib/artist-config';

export default function PastVenuesSection() {
  return (
    <section className="py-phi-xl px-6">
      <h2 className="text-2xl font-display font-light text-center mb-phi-lg tracking-wide">
        Past Venues
      </h2>

      <div className="max-w-3xl mx-auto grid md:grid-cols-2 gap-4">
        {PAST_VENUES.map((venue, i) => (
          <div
            key={i}
            className="px-5 py-4 rounded-lg border border-white/5 bg-bg-medium/60"
          >
            <div className="flex justify-between items-start mb-1">
              <p className="text-base font-medium">{venue.name}</p>
              <span className="text-xs text-text-muted whitespace-nowrap ml-3">{venue.period}</span>
            </div>
            <p className="text-xs text-accent-gold mb-1">{venue.type}</p>
            <p className="text-sm text-text-secondary">{venue.description}</p>
            <p className="text-xs text-text-muted mt-1">{venue.location}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
