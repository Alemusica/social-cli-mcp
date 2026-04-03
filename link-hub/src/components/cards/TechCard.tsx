'use client';

import { NpHeadline } from '../shared/NpHeadline';

interface TechItem {
  key: string;
  value: string;
}

interface TechCardProps {
  title: string;
  meta?: string;
  items: TechItem[];
  footnote?: string;
}

export function TechCard({ title, meta, items, footnote }: TechCardProps) {
  return (
    <article className="np-article np-card-tech">
      <NpHeadline title={title} meta={meta} />
      <dl className="np-tech-list">
        {items.map((item, i) => (
          <div key={i} className="np-tech-row">
            <dt>{item.key}</dt>
            <dd>{item.value}</dd>
          </div>
        ))}
      </dl>
      {footnote && <p className="np-tech-footnote">{footnote}</p>}
    </article>
  );
}
