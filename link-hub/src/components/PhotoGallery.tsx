'use client';

import { useState } from 'react';
import { PHOTOS } from '@/lib/artist-config';

export default function PhotoGallery() {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <section className="py-phi-xl px-6">
      <h2 className="text-2xl font-display font-light text-center mb-phi-lg tracking-wide">
        Gallery
      </h2>
      <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-3 gap-4">
        {PHOTOS.map((photo) => (
          <button
            key={photo.id}
            onClick={() => setExpanded(photo.id)}
            className="aspect-[4/3] rounded-lg overflow-hidden relative group cursor-pointer"
          >
            <img
              src={photo.src}
              alt={photo.alt}
              className="w-full h-full object-cover opacity-90 group-hover:opacity-100 group-hover:scale-105 transition-all duration-300"
            />
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4">
              <p className="text-sm text-white/90">{photo.location}</p>
            </div>
          </button>
        ))}
      </div>

      {expanded && (
        <div
          className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-6"
          onClick={() => setExpanded(null)}
        >
          <button
            onClick={() => setExpanded(null)}
            className="absolute top-4 right-4 z-50 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 text-white/80 hover:text-white hover:bg-white/20 transition-colors"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <div className="max-w-4xl w-full">
            {(() => {
              const photo = PHOTOS.find(p => p.id === expanded);
              if (!photo) return null;
              return (
                <>
                  <img
                    src={photo.src}
                    alt={photo.alt}
                    className="w-full max-h-[80vh] object-contain rounded-lg"
                  />
                  <div className="mt-4 text-center">
                    <p className="text-white/90 text-sm">{photo.alt}</p>
                    <p className="text-text-muted text-xs mt-1">{photo.location}</p>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </section>
  );
}
