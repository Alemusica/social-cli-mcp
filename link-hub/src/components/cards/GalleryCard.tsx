'use client';

interface GalleryImage {
  src: string;
  alt: string;
  caption?: string;
}

interface GalleryCardProps {
  title?: string;
  images: GalleryImage[];
}

export function GalleryCard({ title, images }: GalleryCardProps) {
  return (
    <article className="np-article np-card-gallery">
      {title && (
        <div className="np-headline">
          <span className="np-title">{title}</span>
        </div>
      )}
      <div className="np-gallery-reel no-scrollbar">
        {images.map((img, i) => (
          <figure key={i} className="np-gallery-item np-figure">
            <img className="np-media" src={img.src} alt={img.alt} />
            {img.caption && (
              <figcaption className="np-figcaption">{img.caption}</figcaption>
            )}
          </figure>
        ))}
      </div>
    </article>
  );
}
