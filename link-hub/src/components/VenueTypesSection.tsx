import { VENUE_TYPES } from '@/lib/artist-config';

export default function VenueTypesSection() {
  return (
    <section className="py-phi-xl px-6">
      <p className="text-center text-text-muted text-sm tracking-wider uppercase mb-phi-md">
        Perfect for
      </p>
      <div className="flex flex-wrap justify-center gap-x-phi-lg gap-y-2 max-w-lg mx-auto">
        {VENUE_TYPES.map((venue, i) => (
          <span key={i} className="text-base text-text-secondary">
            {venue}
            {i < VENUE_TYPES.length - 1 && <span className="text-text-subtle mx-phi-sm">·</span>}
          </span>
        ))}
      </div>
    </section>
  );
}
