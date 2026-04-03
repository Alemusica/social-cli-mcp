'use client';

interface NpHeadlineProps {
  title: string;
  meta?: string;
  subtitle?: string;
  href?: string;
}

export function NpHeadline({ title, meta, subtitle, href }: NpHeadlineProps) {
  const inner = (
    <>
      <span className="np-title">{title}</span>
      {meta && <span className="np-meta">{meta}</span>}
      {subtitle && <span className="np-subtitle">{subtitle}</span>}
    </>
  );

  return (
    <div className="np-headline">
      {href ? (
        <a href={href} target="_blank" rel="noopener noreferrer">
          {inner}
        </a>
      ) : (
        inner
      )}
    </div>
  );
}
