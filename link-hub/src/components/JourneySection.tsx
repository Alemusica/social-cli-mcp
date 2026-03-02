import { JOURNEY } from '@/lib/artist-config';

export default function JourneySection() {
  return (
    <section className="py-phi-2xl px-6">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-2xl font-display font-light text-center mb-phi-xl tracking-wide">
          The Journey
        </h2>

        <div className="relative">
          <div className="absolute left-[60px] top-0 bottom-0 w-px bg-border-medium" />

          {JOURNEY.map((item, i) => (
            <div key={i} className="flex gap-phi-lg mb-phi-lg last:mb-0">
              <div className="w-[60px] text-right">
                <span className={`text-sm font-medium ${
                  'current' in item && item.current ? 'text-accent-gold' : 'text-text-muted'
                }`}>
                  {item.year}
                </span>
              </div>

              <div className="relative">
                <div className={`w-2.5 h-2.5 rounded-full mt-1 ${
                  'highlight' in item && item.highlight
                    ? 'bg-accent-gold'
                    : 'current' in item && item.current
                    ? 'bg-accent-gold animate-pulse'
                    : 'bg-text-muted/40'
                }`} />
              </div>

              <div className="flex-1 pb-phi-sm">
                <p className="text-base font-medium">{item.title}</p>
                <p className="text-sm text-text-secondary mt-1">{item.description}</p>
                <p className="text-sm text-text-muted mt-0.5">{item.location}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
