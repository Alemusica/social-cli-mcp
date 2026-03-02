import { ARTIST } from '@/lib/artist-config';

export default function Footer() {
  return (
    <footer className="py-phi-xl px-6">
      <div className="divider mb-phi-lg" />
      <div className="flex justify-center gap-phi-xl mb-phi-md">
        <a
          href={ARTIST.instagram}
          target="_blank"
          rel="noopener noreferrer"
          className="py-3 text-text-muted hover:text-accent-gold transition-colors text-sm"
        >
          Instagram
        </a>
        <a
          href={ARTIST.youtube}
          target="_blank"
          rel="noopener noreferrer"
          className="py-3 text-text-muted hover:text-accent-gold transition-colors text-sm"
        >
          YouTube
        </a>
      </div>
      <p className="text-center text-text-muted text-sm">
        {new Date().getFullYear()} {ARTIST.name}
      </p>
    </footer>
  );
}
