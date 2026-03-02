'use client';

import { useState, useEffect } from 'react';

const NAV_LINKS = [
  { label: 'Shows', href: '#modes' },
  { label: 'Videos', href: '#videos' },
  { label: 'Press', href: '#press' },
  { label: 'Tech', href: '#tech' },
  { label: 'EPK ↓', href: '/downloads/flutur-promo-2026.pdf', download: true },
];

export default function StickyNav() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(!entry.isIntersecting),
      { threshold: 0.1 }
    );

    // Observe the hero section
    const hero = document.querySelector('section');
    if (hero) observer.observe(hero);

    return () => observer.disconnect();
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        visible
          ? 'translate-y-0 opacity-100'
          : '-translate-y-full opacity-0'
      }`}
    >
      <div className="bg-bg-dark/90 backdrop-blur-md border-b border-white/5">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          {/* Logo / Name */}
          <a href="#" className="text-lg font-display font-medium tracking-tight">
            FLUTUR
          </a>

          {/* Links */}
          <div className="hidden sm:flex items-center gap-6">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                {...('download' in link && link.download ? { download: true } : {})}
                className={`text-sm py-3 transition-colors ${
                  'download' in link && link.download
                    ? 'text-accent-gold hover:text-accent-gold/80'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                {link.label}
              </a>
            ))}
            <a
              href="#booking"
              className="btn-primary px-4 py-3 rounded text-sm font-medium"
            >
              Book 2026
            </a>
          </div>

          {/* Mobile: just CTA */}
          <a
            href="#booking"
            className="sm:hidden btn-primary px-4 py-1.5 rounded text-sm font-medium"
          >
            Book 2026
          </a>
        </div>
      </div>
    </nav>
  );
}
