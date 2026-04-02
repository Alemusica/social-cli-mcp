'use client';

export interface NpMedia {
  src: string;
  alt: string;
  caption?: string;
  type?: 'image' | 'video' | 'youtube';
  poster?: string;
  youtubeId?: string;
}

interface NpFigureProps {
  media: NpMedia;
  frame?: 'default' | 'portrait' | 'golden' | 'cinema';
}

const frameClass: Record<string, string> = {
  default: '',
  portrait: 'np-frame-portrait',
  golden: 'np-frame-golden',
  cinema: 'np-frame-cinema',
};

export function NpFigure({ media, frame = 'default' }: NpFigureProps) {
  const mediaType = media.type || 'image';
  const extraClass = frameClass[frame] || '';

  if (mediaType === 'youtube' && media.youtubeId) {
    return (
      <div className={`np-figure np-embed ${extraClass}`.trim()}>
        <iframe
          className="np-media-embed"
          src={`https://www.youtube.com/embed/${media.youtubeId}?autoplay=1&mute=1&loop=1&playlist=${media.youtubeId}&controls=0&showinfo=0&modestbranding=1&rel=0&playsinline=1`}
          allow="autoplay; encrypted-media"
          loading="lazy"
          title={media.alt}
        />
        {media.caption && (
          <figcaption className="np-figcaption">{media.caption}</figcaption>
        )}
      </div>
    );
  }

  return (
    <figure className={`np-figure ${extraClass}`.trim()}>
      {mediaType === 'video' ? (
        <video
          className="np-media"
          src={media.src}
          poster={media.poster}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
        />
      ) : (
        <img className="np-media" src={media.src} alt={media.alt} />
      )}
      {media.caption && (
        <figcaption className="np-figcaption">{media.caption}</figcaption>
      )}
    </figure>
  );
}
