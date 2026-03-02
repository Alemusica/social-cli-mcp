import { TECHNIQUE } from '@/lib/artist-config';

export default function TechniqueSection() {
  return (
    <section className="py-phi-2xl px-6 bg-bg-medium">
      <div className="max-w-3xl mx-auto text-center">
        <h2 className="text-2xl font-display font-light mb-phi-lg tracking-wide">
          {TECHNIQUE.title}
        </h2>

        <p className="text-base text-text-secondary leading-relaxed mb-phi-lg">
          {TECHNIQUE.description}
        </p>

        <div className="flex flex-wrap justify-center gap-x-phi-md gap-y-2">
          {TECHNIQUE.instruments.map((inst, i) => (
            <span key={i} className="text-sm text-text-muted">
              {inst}
              {i < TECHNIQUE.instruments.length - 1 && (
                <span className="ml-phi-md text-text-muted" aria-hidden="true">·</span>
              )}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
