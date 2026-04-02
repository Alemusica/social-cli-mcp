'use client';

import { NpHeadline } from '../shared/NpHeadline';
import { NpFigure } from '../shared/NpFigure';

interface VideoCardProps {
  youtubeId: string;
  title: string;
  subtitle: string;
  duration: string;
  embed?: boolean;
}

export function VideoCard({ youtubeId, title, subtitle, duration, embed = false }: VideoCardProps) {
  const youtubeUrl = `https://youtube.com/watch?v=${youtubeId}`;
  const thumbnail = `https://img.youtube.com/vi/${youtubeId}/mqdefault.jpg`;

  return (
    <article className="np-article np-card-video">
      {embed ? (
        <NpFigure
          media={{
            src: '',
            alt: title,
            type: 'youtube',
            youtubeId,
          }}
        />
      ) : (
        <a href={youtubeUrl} target="_blank" rel="noopener noreferrer">
          <figure className="np-figure np-frame">
            <img className="np-media" src={thumbnail} alt={title} />
            <span className="np-video-duration">{duration}</span>
          </figure>
        </a>
      )}
      <NpHeadline title={title} meta={subtitle} href={youtubeUrl} />
    </article>
  );
}
