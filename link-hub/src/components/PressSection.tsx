import { PRESS } from '@/lib/artist-config';

export default function PressSection() {
  return (
    <section id="press" className="py-phi-xl px-6 bg-bg-medium">
      <h2 className="text-2xl font-display font-light text-center mb-phi-lg tracking-wide">
        Press
      </h2>

      <div className="max-w-3xl mx-auto space-y-phi-lg">
        {PRESS.map((item, i) => (
          <div key={i} className="text-center">
            <p className="text-base italic text-text-secondary leading-relaxed">
              &ldquo;{item.quote}&rdquo;
            </p>

            <p className="text-sm text-text-muted mt-2">
              {item.outlet} &middot; {item.date}
            </p>

            {item.hasLink && (
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block mt-2 py-3 text-xs text-accent-gold hover:text-accent-gold/80 transition-colors underline underline-offset-2"
              >
                Read article &rarr;
              </a>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
