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
    <div className="np-article">
      <a href={youtubeUrl} target="_blank" rel="noopener noreferrer">
        <figure className="np-figure">
          <img className="np-media" src={thumbnail} alt={title} />
        </figure>
      </a>
      <a href={youtubeUrl} className="np-press-link" target="_blank" rel="noopener noreferrer">
        {title}
      </a>
      <br />
      <small>{subtitle} — {duration}</small>
    </div>
  );
}
