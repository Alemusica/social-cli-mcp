import { FORMATS } from '@/lib/artist-config';

export default function FormatsSection() {
  return (
    <section className="py-phi-xl px-6 bg-bg-medium/40">
      <h2 className="text-xl font-light text-center mb-phi-lg tracking-wide">
        Performance Formats
      </h2>

      <div className="max-w-md mx-auto space-y-phi-sm">
        {FORMATS.map((format, i) => (
          <div key={i} className="bg-bg-dark/60 rounded-lg p-phi-md">
            <div className="flex justify-between items-baseline mb-2">
              <p className="text-base font-medium">{format.name}</p>
              <span className="text-sm text-text-muted">{format.duration}</span>
            </div>
            <p className="text-sm text-text-secondary">{format.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
