import { MUSIC_LINKS, SOCIAL_LINKS } from '@/lib/artist-config';

export default function SocialLinksSection() {
  return (
    <section className="px-6 py-phi-xl">
      <div className="max-w-3xl mx-auto">
        {/* Listen */}
        <div className="mb-phi-lg">
          <h3 className="text-xs font-medium tracking-[0.2em] uppercase text-text-muted mb-4 text-center">
            Listen
          </h3>
          <div className="flex justify-center gap-4 flex-wrap">
            {MUSIC_LINKS.map((link) => (
              <a
                key={link.name}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-5 py-3 rounded-lg bg-bg-medium hover:bg-bg-light transition-colors text-sm"
              >
                {link.name}
              </a>
            ))}
          </div>
        </div>

        {/* Connect */}
        <div>
          <h3 className="text-xs font-medium tracking-[0.2em] uppercase text-text-muted mb-4 text-center">
            Connect
          </h3>
          <div className="flex justify-center gap-4 flex-wrap">
            {SOCIAL_LINKS.map((link) => (
              <a
                key={link.name}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-5 py-3 rounded-lg bg-bg-medium hover:bg-bg-light transition-colors text-sm"
              >
                {link.name}
              </a>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
