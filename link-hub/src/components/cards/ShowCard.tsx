'use client';

import { NpHeadline } from '../shared/NpHeadline';
import { NpFigure } from '../shared/NpFigure';
import type { NpMedia } from '../shared/NpFigure';

interface ShowFormat {
  name: string;
  duration: string;
  bestFor: string[];
}

interface ShowCardProps {
  title: string;
  meta?: string;
  media?: NpMedia;
  description?: string;
  formats: ShowFormat[];
}

export function ShowCard({ title, meta, media, description, formats }: ShowCardProps) {
  return (
    <article className="np-article np-card-show">
      <NpHeadline title={title} meta={meta} />
      {media && <NpFigure media={media} />}
      {description && <p>{description}</p>}
      <div className="np-formats">
        {formats.map((mode) => (
          <div key={mode.name} className="np-format-line">
            <strong>{mode.name}</strong> &mdash; {mode.duration}
            <br />
            <small>{mode.bestFor.join(', ')}</small>
          </div>
        ))}
      </div>
    </article>
  );
}
