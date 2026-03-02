import { PERFORMANCE_MODES, VIDEOS } from '@/lib/artist-config';

export default function PerformanceModes() {
  return (
    <section id="modes" className="px-6 py-phi-2xl">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-2xl font-display font-light tracking-wide text-text-primary mb-phi-lg text-center">
          What You Can Book
        </h2>

        <div className="grid md:grid-cols-3 gap-6">
          {PERFORMANCE_MODES.map((mode) => {
            const video = VIDEOS.items.find(v => v.id === mode.videoId);
            return (
              <div key={mode.id} className="bg-bg-medium rounded-lg overflow-hidden">
                {/* Video thumbnail */}
                {video && (
                  <a
                    href={video.youtube}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block relative group"
                  >
                    <img
                      src={`https://img.youtube.com/vi/${video.youtubeId}/mqdefault.jpg`}
                      alt={mode.name}
                      className="w-full aspect-video object-cover group-hover:opacity-80 transition-opacity"
                    />
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="w-12 h-12 rounded-full bg-black/60 flex items-center justify-center">
                        <svg className="w-5 h-5 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </div>
                    </div>
                  </a>
                )}

                <div className="p-5">
                  <h3 className="text-lg font-medium mb-1">{mode.name}</h3>
                  <p className="text-sm text-accent-gold mb-3">{mode.duration}</p>
                  <p className="text-sm text-text-secondary leading-relaxed mb-4">
                    {mode.description}
                  </p>

                  {/* Equipment */}
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {mode.equipment.map((item) => (
                      <span
                        key={item}
                        className="text-xs px-2 py-0.5 rounded bg-bg-light text-text-muted"
                      >
                        {item}
                      </span>
                    ))}
                  </div>

                  {/* Best for */}
                  <p className="text-xs text-text-muted">
                    <span className="text-accent-gold">Best for:</span>{' '}
                    {mode.bestFor.join(' · ')}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
