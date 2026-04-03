'use client';

import { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

// ---------------------------------------------------------------------------
// Two columns — 5 photos, forced same aspect ratio to avoid gaps
// Even columns scroll down, odd columns scroll up
// ---------------------------------------------------------------------------

const COLUMNS: string[][] = [
  [
    '/images/optimized/rocca-rav-devotional.webp',
    '/images/optimized/denver-ihf-electric.webp',
    '/images/optimized/rocca-silhouette.webp',
  ],
  [
    '/images/optimized/morocco.webp',
    '/images/optimized/rocca-guitar-golden.webp',
  ],
];

// ---------------------------------------------------------------------------
// ImageLoopGallery — section with infinite vertical loop
// Adapted from gist ad12c7a4b734f15ce435ea7e611bcf65
// ---------------------------------------------------------------------------

export function ImageLoopGallery() {
  const containerRef = useRef<HTMLDivElement>(null);
  const additionalY = useRef({ val: 0 });
  const additionalYAnim = useRef<gsap.core.Tween | null>(null);
  const offsetRef = useRef(0);

  useGSAP(
    () => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      const container = containerRef.current;
      if (!container) return;

      let started = false;

      const startAnimation = () => {
        if (started) return;
        started = true;

        const cols = gsap.utils.toArray<HTMLElement>('.loop-col', container);

        cols.forEach((col, i) => {
          const items = gsap.utils.toArray<HTMLElement>('.loop-img', col);
          const columnHeight = col.scrollHeight / 2;
          const direction = i % 2 !== 0 ? '+=' : '-=';

          items.forEach((item) => {
            gsap.to(item, {
              y: `${direction}${columnHeight}`,
              duration: 30,
              repeat: -1,
              ease: 'none',
              modifiers: {
                y: gsap.utils.unitize((y: number) => {
                  if (direction === '+=') {
                    offsetRef.current += additionalY.current.val;
                    return (y - offsetRef.current) % columnHeight;
                  } else {
                    offsetRef.current += additionalY.current.val;
                    return (y + offsetRef.current) % -columnHeight;
                  }
                }),
              },
            });
          });
        });

        ScrollTrigger.create({
          start: 0,
          end: 'max',
          onUpdate: (self) => {
            const velocity = self.getVelocity();
            if (velocity !== 0) {
              if (additionalYAnim.current) {
                additionalYAnim.current.kill();
              }
              additionalY.current.val = -velocity / (velocity > 0 ? 2000 : 3000);
              additionalYAnim.current = gsap.to(additionalY.current, { val: 0 });
            }
          },
        });
      };

      const images = container.querySelectorAll<HTMLImageElement>('.loop-img img');
      let loaded = 0;
      const total = images.length;

      const onImageLoad = () => {
        loaded++;
        if (loaded >= total) startAnimation();
      };

      images.forEach((img) => {
        if (img.complete) {
          onImageLoad();
        } else {
          img.addEventListener('load', onImageLoad, { once: true });
        }
      });

      setTimeout(startAnimation, 3000);
    },
    { scope: containerRef }
  );

  return (
    <section className="py-phi-2xl">
      <div className="rule mb-phi-xl mx-phi-md md:mx-phi-xl" />
      <div
        ref={containerRef}
        className="overflow-hidden"
        style={{ height: '80vh' }}
      >
        <div className="flex items-start">
          {COLUMNS.map((col, colIndex) => (
            <div key={colIndex} className="loop-col flex-1 flex flex-col">
              {[...col, ...col].map((src, i) => (
                <div key={`${colIndex}-${i}`} className="loop-img p-[0.5rem]">
                  <img
                    src={src}
                    alt=""
                    className="loop-photo w-full object-cover"
                    style={{ aspectRatio: '4/5' }}
                    loading="eager"
                  />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
