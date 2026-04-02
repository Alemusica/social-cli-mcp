'use client';

import { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { TECHNIQUE } from '@/lib/artist-config';

gsap.registerPlugin(ScrollTrigger, SplitText);

const BIO_PARAGRAPHS = [
  'FLUTUR builds living sound from silence — voice, guitar, RAV Vast, drums, synth, all layered in real time through live looping. Every performance starts from nothing and grows into a full sonic ecosystem, built in front of you.',
  'From busking on Greek islands with €35 in his pocket to Greece\'s Got Talent (4 YES), main stage at Drishti Beats Festival in Aspen, and a 4-year sunset residency at a luxury hotel on Lake Maggiore — the path has been unconventional but consistent: play everywhere, carry everything, depend on nothing.',
  'Self-contained. No backline needed. No sound engineer. One person, one rig, one process: the unfolding.',
  'Currently booking for 2026 — festivals, venues, retreats, and private events worldwide.',
];

export function ArtistBio() {
  const container = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

      const firstP = container.current?.querySelector<HTMLElement>('.bio-lead');
      if (firstP) {
        const split = new SplitText(firstP, { type: 'lines', mask: 'lines' });
        gsap.from(split.lines, {
          y: 40,
          opacity: 0,
          stagger: 0.15,
          duration: 0.8,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: firstP,
            start: 'top 80%',
            toggleActions: 'play none none reverse',
          },
        });
      }

      gsap.from('.bio-paragraph', {
        y: 20,
        opacity: 0,
        stagger: 0.2,
        duration: 0.6,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: '.bio-paragraph',
          start: 'top 85%',
          toggleActions: 'play none none reverse',
        },
      });

      gsap.from('.bio-instruments', {
        opacity: 0,
        duration: 0.4,
        delay: 0.4,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: '.bio-instruments',
          start: 'top 85%',
          toggleActions: 'play none none reverse',
        },
      });
    },
    { scope: container }
  );

  return (
    <section
      ref={container}
      id="bio"
      className="px-phi-md lg:px-phi-xl py-phi-2xl"
      aria-label="About FLUTUR"
    >
      <div className="rule mb-phi-xl" />

      <div className="lg:grid lg:grid-cols-12 lg:gap-phi-sm">
        <div className="lg:col-span-7 lg:col-start-1">
          <div className="space-y-phi-md">
            {BIO_PARAGRAPHS.map((paragraph: string, i: number) => (
              <p
                key={i}
                className={
                  i === 0
                    ? 'bio-lead font-body text-heading-1 font-light text-text-primary leading-[1.3] text-left max-w-prose'
                    : 'bio-paragraph font-body text-body-lg text-text-primary leading-[1.6] text-left max-w-prose'
                }
              >
                {paragraph}
              </p>
            ))}
          </div>

          <div className="bio-instruments mt-phi-lg">
            <p className="font-body text-body-sm text-text-tertiary">
              {TECHNIQUE.instruments.join(' \u00B7 ')}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
