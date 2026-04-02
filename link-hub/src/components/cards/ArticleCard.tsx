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
  children?: ReactNode;
}

export function ArticleCard({ title, meta, subtitle, href, media, children }: ArticleCardProps) {
  return (
    <article className="np-article np-card-article">
      <NpHeadline title={title} meta={meta} subtitle={subtitle} href={href} />
      {media && <NpFigure media={media} />}
      {children && <div className="np-body">{children}</div>}
    </article>
  );
}
