'use client';

import { NpHeadline } from '../shared/NpHeadline';

interface PressItem {
  quote: string;
  outlet: string;
  date: string;
  url?: string;
  hasLink?: boolean;
}

interface PressCardProps {
  title: string;
  meta?: string;
  items: PressItem[];
}

export function PressCard({ title, meta, items }: PressCardProps) {
  return (
    <article className="np-article np-card-press">
      <NpHeadline title={title} meta={meta} />
      <div className="np-press-list">
        {items.map((p, i) => (
          <div key={i} className="np-press-item">
            {p.hasLink && p.url ? (
              <a href={p.url} target="_blank" rel="noopener noreferrer" className="np-press-link">
                &ldquo;{p.quote}&rdquo;
              </a>
            ) : (
              <span className="np-press-text">&ldquo;{p.quote}&rdquo;</span>
            )}
            <small>{p.outlet} &mdash; {p.date}</small>
          </div>
        ))}
      </div>
    </article>
  );
}
