'use client';

import { useState } from 'react';
import { MUSIC_LINKS } from '@/lib/artist-config';

export default function MusicLinksSection() {
  const [open, setOpen] = useState(false);

  return (
    <section className="py-phi-lg px-6 bg-bg-medium/40">
      <div className="max-w-sm mx-auto">
        <button
          onClick={() => setOpen(!open)}
          className="w-full flex items-center justify-between py-3 text-base text-text-muted hover:text-text-primary transition-colors"
        >
          <span>Listen</span>
          <svg
            className={`w-5 h-5 transform transition-transform ${open ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {open && (
          <div className="flex justify-center gap-phi-xl py-phi-md">
            {MUSIC_LINKS.map((link) => (
              <a
                key={link.name}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-text-secondary hover:text-accent-gold transition-colors"
              >
                {link.name}
              </a>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
