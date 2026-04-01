'use client';

interface NpCardImage {
  src: string;
  alt: string;
  caption?: string;
}

interface NpCardProps {
  title: string;
  meta?: string;
  subtitle?: string;
  image?: NpCardImage;
  href?: string;
  children?: React.ReactNode;
}

export function NpCard({ title, meta, subtitle, image, href, children }: NpCardProps) {
  return (
    <div className="np-article">
      <div className="np-headline">
        {href ? (
          <a href={href} target="_blank" rel="noopener noreferrer">
            <span className="np-title">{title}</span>
            {meta && <span className="np-meta">{meta}</span>}
            {subtitle && <span className="np-subtitle">{subtitle}</span>}
          </a>
        ) : (
          <>
            <span className="np-title">{title}</span>
            {meta && <span className="np-meta">{meta}</span>}
            {subtitle && <span className="np-subtitle">{subtitle}</span>}
          </>
        )}
      </div>
      {image && (
        <figure className="np-figure">
          <img className="np-media" src={image.src} alt={image.alt} />
          {image.caption && (
            <figcaption className="np-figcaption">{image.caption}</figcaption>
          )}
        </figure>
      )}
      {children}
    </div>
  );
}
