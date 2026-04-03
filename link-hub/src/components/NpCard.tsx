'use client';

interface NpCardMedia {
  src: string;
  alt: string;
  caption?: string;
  type?: 'image' | 'video' | 'youtube';
  poster?: string;
  youtubeId?: string;
}

interface NpCardProps {
  title: string;
  meta?: string;
  subtitle?: string;
  image?: NpCardMedia;
  href?: string;
  children?: React.ReactNode;
}

export function NpCard({ title, meta, subtitle, image, href, children }: NpCardProps) {
  const mediaType = image?.type || 'image';

  const renderMedia = () => {
    if (!image) return null;

    if (mediaType === 'youtube' && image.youtubeId) {
      return (
        <div className="np-figure np-embed">
          <iframe
            className="np-media-embed"
            src={`https://www.youtube.com/embed/${image.youtubeId}?autoplay=1&mute=1&loop=1&playlist=${image.youtubeId}&controls=0&showinfo=0&modestbranding=1&rel=0&playsinline=1`}
            allow="autoplay; encrypted-media"
            loading="lazy"
            title={image.alt}
          />
          {image.caption && (
            <figcaption className="np-figcaption">{image.caption}</figcaption>
          )}
        </div>
      );
    }

    return (
      <figure className="np-figure">
        {mediaType === 'video' ? (
          <video
            className="np-media"
            src={image.src}
            poster={image.poster}
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
          />
        ) : (
          <img className="np-media" src={image.src} alt={image.alt} />
        )}
        {image.caption && (
          <figcaption className="np-figcaption">{image.caption}</figcaption>
        )}
      </figure>
    );
  };

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
      {renderMedia()}
      {children}
    </div>
  );
}
