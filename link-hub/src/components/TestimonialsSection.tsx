import { TESTIMONIALS } from '@/lib/artist-config';

export default function TestimonialsSection() {
  return (
    <section id="testimonials" className="py-phi-xl px-6">
      <h2 className="text-2xl font-display font-light tracking-wide text-text-primary mb-phi-lg text-center">
        Endorsements
      </h2>

      <div className="max-w-3xl mx-auto space-y-phi-xl">
        {TESTIMONIALS.map((t, i) => (
          <blockquote key={i} className="text-center">
            <p className="text-lg md:text-xl font-light italic text-text-primary leading-relaxed">
              &ldquo;{t.quote}&rdquo;
            </p>

            <cite className="mt-phi-md block not-italic">
              <p className="text-sm font-medium text-accent-gold">
                {t.name}
              </p>
              <p className="text-xs text-text-secondary mt-1">
                {t.role}
              </p>
              <p className="text-xs text-text-muted mt-1">
                {t.context}
              </p>
            </cite>
          </blockquote>
        ))}
      </div>
    </section>
  );
}
