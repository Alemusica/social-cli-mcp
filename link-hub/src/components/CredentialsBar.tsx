import { CREDENTIALS } from '@/lib/artist-config';

export default function CredentialsBar() {
  return (
    <section id="credentials" className="px-6 py-phi-xl bg-bg-medium">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-2xl font-display font-light tracking-wide text-text-primary mb-phi-md text-center">
          Credentials
        </h2>

        {/* Desktop: grid, Mobile: scroll */}
        <div className="hidden md:grid md:grid-cols-4 gap-3">
          {CREDENTIALS.map((cred, i) => (
            <div
              key={i}
              className={`px-4 py-3 rounded-lg border text-center ${
                cred.highlight
                  ? 'border-accent-gold/30 bg-bg-light'
                  : 'border-white/10 bg-bg-light'
              }`}
            >
              <p className={`text-sm font-medium ${cred.highlight ? 'text-text-primary' : 'text-text-primary'}`}>
                {cred.text}
              </p>
              <p className="text-xs text-text-muted mt-1">{cred.year}</p>
            </div>
          ))}
        </div>

        {/* Mobile: horizontal scroll */}
        <div className="flex md:hidden gap-3 overflow-x-auto pb-2 -mx-6 px-6 no-scrollbar">
          {CREDENTIALS.map((cred, i) => (
            <div
              key={i}
              className={`flex-none px-4 py-3 rounded-lg border min-w-[200px] ${
                cred.highlight
                  ? 'border-accent-gold/30 bg-bg-light'
                  : 'border-white/10 bg-bg-light'
              }`}
            >
              <p className={`text-sm font-medium ${cred.highlight ? 'text-text-primary' : 'text-text-primary'}`}>
                {cred.text}
              </p>
              <p className="text-xs text-text-muted mt-1">{cred.year}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
