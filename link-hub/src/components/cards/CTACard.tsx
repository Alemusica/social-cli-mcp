'use client';

import { NpHeadline } from '../shared/NpHeadline';
import { NpLink } from '../shared/index';
import { ReactNode } from 'react';

interface CTACardProps {
  title: string;
  meta?: string;
  children: ReactNode;
}

export function CTACard({ title, meta, children }: CTACardProps) {
  return (
    <article className="np-article np-card-cta np-cta">
      <NpHeadline title={title} meta={meta} />
      <div className="np-cta-grid">
        {children}
      </div>
    </article>
  );
}
