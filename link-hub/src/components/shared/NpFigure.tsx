'use client';

import { YouTubePlayer } from './YouTubePlayer';

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
      <YouTubePlayer
        youtubeId={media.youtubeId}
        title={media.alt}
        caption={media.caption}
      />
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
