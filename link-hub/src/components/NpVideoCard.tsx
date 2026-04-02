'use client';

interface NpVideoCardProps {
  youtubeId: string;
  title: string;
  subtitle: string;
  duration: string;
}

export function NpVideoCard({ youtubeId, title, subtitle, duration }: NpVideoCardProps) {
  const youtubeUrl = `https://youtube.com/watch?v=${youtubeId}`;
  const thumbnail = `https://img.youtube.com/vi/${youtubeId}/mqdefault.jpg`;

  return (
    <div className="np-article np-video-card">
      <a href={youtubeUrl} target="_blank" rel="noopener noreferrer">
        <figure className="np-figure np-frame">
          <img className="np-media" src={thumbnail} alt={title} />
          <span className="np-video-duration">{duration}</span>
        </figure>
      </a>
      <div className="np-headline">
        <a href={youtubeUrl} className="np-press-link" target="_blank" rel="noopener noreferrer">
          <span className="np-video-title">{title}</span>
        </a>
        <span className="np-meta">{subtitle}</span>
      </div>
    </div>
  );
}
