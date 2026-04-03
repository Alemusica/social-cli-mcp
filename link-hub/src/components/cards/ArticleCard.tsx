'use client';

import { NpHeadline } from '../shared/NpHeadline';
import { NpFigure } from '../shared/NpFigure';
import type { NpMedia } from '../shared/NpFigure';
import { ReactNode } from 'react';

interface ArticleCardProps {
  title: string;
  meta?: string;
  subtitle?: string;
  href?: string;
  media?: NpMedia;
  feature?: boolean;
  bar?: string[];
  children?: ReactNode;
}

export function ArticleCard({ title, meta, subtitle, href, media, feature, bar, children }: ArticleCardProps) {
  const cls = feature ? 'np-article np-card-feature' : 'np-article np-card-article';

  return (
    <article className={cls}>
      {media && <NpFigure media={media} />}
      <div>
        <NpHeadline title={title} meta={meta} subtitle={subtitle} href={href} />
        {children && <div className="np-body">{children}</div>}
        {bar && bar.length > 0 && (
          <div className="np-bar">
            {bar.map((item, i) => (
              <span key={i} className="np-bar-item">{item}</span>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}
