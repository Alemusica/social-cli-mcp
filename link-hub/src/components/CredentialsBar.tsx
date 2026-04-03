import { CREDENTIALS } from '@/lib/artist-config';

interface Credential {
  text: string;
  year: string;
  highlight: boolean;
}

export function CredentialsBar() {
  const items = CREDENTIALS.filter((c: Credential) => c.highlight);
  // Duplicate for seamless loop: keyframe translates -50%, so 2× content = one full cycle
  const tickerItems = [...items, ...items];

  return (
    <section
      id="credentials"
      className="w-full overflow-hidden"
      aria-label="Credentials and achievements"
    >
      {/* Top ruled line */}
      <div className="rule" />

      <div className="py-phi-sm">
        <div className="flex animate-marquee">
          {tickerItems.map((cred: Credential, i: number) => (
            <span
              key={i}
              className="shrink-0 px-phi-lg font-display text-display text-gold whitespace-nowrap uppercase tracking-[0.02em]"
            >
              {cred.text} {cred.year}
              <span className="text-gold/50"> — </span>
            </span>
          ))}
        </div>
      </div>

      {/* Bottom ruled line */}
      <div className="rule" />
    </section>
  );
}
