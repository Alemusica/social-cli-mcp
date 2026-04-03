'use client';

import { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Image from 'next/image';
import { PHOTOS } from '@/lib/artist-config';

gsap.registerPlugin(ScrollTrigger);

const visible = PHOTOS.slice(0, 4);

const PHOTO_LAYOUT = [
  { col: 'col-span-12 md:col-span-5 md:col-start-1', aspect: 'aspect-[3/2]', speed: -40 },
  { col: 'col-span-12 md:col-span-6 md:col-start-7 md:mt-phi-xl', aspect: 'aspect-[4/5]', speed: 60 },
  { col: 'col-span-12 md:col-span-6 md:col-start-3', aspect: 'aspect-video', speed: -20 },
  { col: 'col-span-12 md:col-span-3 md:col-start-9 md:mt-phi-lg', aspect: 'aspect-square', speed: 40 },
];

// ---------------------------------------------------------------------------
// Per-photo entrance — each photo gets a distinct animation.
// Patterns sourced from Alessio's GSAP gists.
// ---------------------------------------------------------------------------

const PHOTO_ENTRANCES: Array<(el: HTMLElement) => void> = [
  // 0: Clip-path left wipe + inner image counter-scale (gist 53ee4e2b)
  (el) => {
    gsap.fromTo(el,
      { clipPath: 'polygon(0 0, 0 0, 0 100%, 0 100%)' },
      {
        clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)',
        duration: 1.2,
        ease: 'power2.out',
        scrollTrigger: { trigger: el, start: 'top 75%' },
        onComplete: () => { gsap.set(el, { clearProps: 'clipPath' }); },
      }
    );
    const img = el.querySelector('img');
    if (img) {
      gsap.fromTo(img,
        { scale: 1.3 },
        {
          scale: 1,
          duration: 1.4,
          ease: 'power2.out',
          scrollTrigger: { trigger: el, start: 'top 75%' },
          onComplete: () => { gsap.set(img, { clearProps: 'scale' }); },
        }
      );
    }
  },

  // 1: 3D rotateX entrance — panel flips down into view (gist b12e58e6)
  (el) => {
    const parent = el.parentElement;
    if (parent) gsap.set(parent, { perspective: 800 });
    gsap.fromTo(el,
      { rotateX: 90, opacity: 0, transformOrigin: 'center bottom' },
      {
        rotateX: 0,
        opacity: 1,
        duration: 1.0,
        ease: 'power3.out',
        scrollTrigger: { trigger: el, start: 'top 80%' },
        onComplete: () => { gsap.set(el, { clearProps: 'rotateX,opacity' }); },
      }
    );
  },

  // 2: Clip-path right wipe + filter brightness/saturation reveal (gist 877c9d5d)
  (el) => {
    gsap.fromTo(el,
      {
        clipPath: 'polygon(100% 0, 100% 0, 100% 100%, 100% 100%)',
        filter: 'brightness(1.6) saturate(0)',
      },
      {
        clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)',
        filter: 'brightness(1) saturate(1)',
        duration: 1.4,
        ease: 'power2.out',
        scrollTrigger: { trigger: el, start: 'top 75%' },
        onComplete: () => { gsap.set(el, { clearProps: 'clipPath,filter' }); },
      }
    );
  },

  // 3: Scale + subtle rotation snap (gist 011a7eb6 hover pattern, adapted for scroll)
  (el) => {
    gsap.fromTo(el,
      { scale: 0.85, opacity: 0, rotation: -3 },
      {
        scale: 1,
        opacity: 1,
        rotation: 0,
        duration: 0.8,
        ease: 'back.out(1.4)',
        scrollTrigger: { trigger: el, start: 'top 80%' },
        onComplete: () => { gsap.set(el, { clearProps: 'scale,opacity,rotation' }); },
      }
    );
  },
];

export function PhotoGallery() {
  const container = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

      const photoEls = gsap.utils.toArray<HTMLElement>('.photo-reveal');

      photoEls.forEach((photoEl, index) => {
        const layout = PHOTO_LAYOUT[index];

        // Parallax — different speeds per photo create scattered depth
        gsap.to(photoEl, {
          y: layout.speed,
          ease: 'none',
          scrollTrigger: {
            trigger: container.current,
            start: 'top bottom',
            end: 'bottom top',
            scrub: true,
          },
        });

        // Per-photo distinct entrance animation
        const entrance = PHOTO_ENTRANCES[index];
        if (entrance) entrance(photoEl);
      });
    },
    { scope: container }
  );

  return (
    <section ref={container} className="px-phi-md lg:px-phi-xl py-phi-2xl">
      <div className="rule mb-phi-xl" />

      <div className="grid grid-cols-12 gap-phi-sm">
        {visible.map((photo, index) => {
          const layout = PHOTO_LAYOUT[index];
          return (
            <div
              key={photo.id}
              className={`relative ${layout.col} ${layout.aspect}`}
            >
              <div className="photo-reveal relative w-full h-full overflow-hidden group">
                <Image
                  src={photo.src}
                  alt={photo.alt}
                  fill
                  sizes="(max-width: 768px) 100vw, 60vw"
                  className="object-cover transition-opacity duration-200 ease-out group-hover:opacity-80"
                  loading={index === 0 ? 'eager' : 'lazy'}
                />
                <div className="absolute inset-x-0 bottom-0 p-phi-xs bg-background/70 opacity-0 group-hover:opacity-100 transition-opacity duration-200 ease-out">
                  <p className="font-body text-caption text-text-secondary">
                    {photo.location}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
