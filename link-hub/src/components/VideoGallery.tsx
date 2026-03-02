'use client';

import { useState } from 'react';
import { VIDEOS } from '@/lib/artist-config';

export default function VideoGallery() {
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
  const galleryVideos = VIDEOS.items.filter(v => v.id !== 'rocca-full-set').slice(0, 7);

  const featured = galleryVideos.slice(0, 3);
  const rest = galleryVideos.slice(3);

  const handleClick = (video: typeof VIDEOS.items[0]) => {
    if (video.youtubeId) {
      setSelectedVideo(video.id);
    } else if ('instagram' in video && video.instagram) {
      window.open(video.instagram as string, '_blank', 'noopener,noreferrer');
    }
  };

  const VideoCard = ({ video }: { video: typeof VIDEOS.items[0] }) => (
    <button
      onClick={() => handleClick(video)}
      className="group text-left w-full"
    >
      <div className="relative aspect-video bg-bg-light rounded-lg overflow-hidden mb-3">
        {video.youtubeId ? (
          <img
            src={`https://img.youtube.com/vi/${video.youtubeId}/mqdefault.jpg`}
            alt={video.title}
            className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-300"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-accent-gold/20 to-bg-dark flex items-center justify-center">
            <svg className="w-8 h-8 text-accent-gold/60" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
            </svg>
          </div>
        )}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <svg className="w-5 h-5 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
      </div>
      <p className="text-sm font-medium truncate">{video.title}</p>
      <p className="text-xs text-text-muted truncate">{video.subtitle}</p>
    </button>
  );

  return (
    <section id="videos" className="py-phi-2xl px-6 bg-bg-medium">
      <h2 className="text-2xl font-display font-light text-center mb-phi-xl tracking-wide">
        Watch
      </h2>

      <div className="max-w-5xl mx-auto">
        {/* Featured row: 3 columns on desktop, 1 on mobile */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-6">
          {featured.map((video) => (
            <VideoCard key={video.id} video={video} />
          ))}
        </div>

        {/* Remaining videos: 4 columns on desktop, 2 on mobile */}
        {rest.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {rest.map((video) => (
              <VideoCard key={video.id} video={video} />
            ))}
          </div>
        )}
      </div>

      {selectedVideo && (
        <div
          className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-6"
          onClick={() => setSelectedVideo(null)}
        >
          <button
            onClick={() => setSelectedVideo(null)}
            className="absolute top-4 right-4 z-50 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 text-white/80 hover:text-white hover:bg-white/20 transition-colors"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <div className="w-full max-w-3xl" onClick={(e) => e.stopPropagation()}>
            <div className="video-container rounded-lg overflow-hidden">
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${VIDEOS.items.find(v => v.id === selectedVideo)?.youtubeId}?autoplay=1&rel=0`}
                title="Video"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
