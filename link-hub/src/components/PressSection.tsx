'use client';

import { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { PRESS, TESTIMONIALS } from '@/lib/artist-config';

gsap.registerPlugin(ScrollTrigger, SplitText);

interface Testimonial {
  name: string;
  role: string;
  credentials: string;
  quote: string;
  context: string;
  year: string;
  bestFor: string[];
}

interface PressItem {
  outlet: string;
  quote: string;
  context: string;
  date: string;
  hasLink: boolean;
  url: string;
}

export function PressSection() {
  const container = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

      const blockquotes = gsap.utils.toArray<HTMLElement>('.press-quote');
      blockquotes.forEach((blockquoteEl) => {
        const split = new SplitText(blockquoteEl, { type: 'lines', mask: 'lines' });
        gsap.from(split.lines, {
          y: 30,
          opacity: 0,
          stagger: 0.15,
          duration: 0.8,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: blockquoteEl,
            start: 'top 80%',
            toggleActions: 'play none none reverse',
          },
        });
      });

      gsap.from('.press-attribution', {
        opacity: 0,
        y: 10,
        delay: 0.5,
        duration: 0.4,
        ease: 'power2.out',
        stagger: 0.15,
        scrollTrigger: {
          trigger: container.current,
          start: 'top 80%',
          toggleActions: 'play none none reverse',
        },
      });

      gsap.from('.press-item', {
        y: 30,
        opacity: 0,
        stagger: 0.15,
        duration: 0.6,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: '.press-item',
          start: 'top 80%',
          toggleActions: 'play none none reverse',
        },
      });
    },
    { scope: container }
  );

  return (
    <section
      ref={container}
      id="press"
      className="px-phi-md lg:px-phi-xl py-phi-2xl"
      aria-label="Press coverage and endorsements"
    >
      <div className="mb-phi-xl">
        <p className="font-mono text-micro text-gold uppercase tracking-[0.12em] mb-phi-xs">
          Press
        </p>
        <h2 className="font-display text-display font-bold uppercase tracking-[0.02em] text-text-primary">
          Press &amp; Endorsements
        </h2>
      </div>

      <div className="mb-phi-xl">
        {TESTIMONIALS.map((t: Testimonial, i: number) => (
          <div key={i}>
            {i > 0 && <div className="rule my-phi-xl" />}

            <blockquote className="lg:grid lg:grid-cols-12 lg:gap-phi-lg">
              <div className="lg:col-span-8 lg:col-start-1 mb-phi-md lg:mb-0">
                <p className="press-quote font-body text-heading-1 italic text-text-primary leading-[1.3]">
                  &ldquo;{t.quote}&rdquo;
                </p>
              </div>

              <footer className="press-attribution lg:col-span-3 lg:col-start-10 lg:text-right flex flex-col justify-start">
                <p className="font-body text-body font-medium text-text-primary">
                  {t.name}
                </p>
                <p className="font-body text-caption text-text-tertiary mt-phi-xs">
                  {t.role}
                </p>
              </footer>
            </blockquote>
          </div>
        ))}
      </div>

      <div className="rule mb-phi-xl" />

      <div className="space-y-0">
        {PRESS.map((item: PressItem, i: number) => (
          <div key={i}>
            {i > 0 && <div className="rule my-phi-lg" />}

            <article className="press-item lg:grid lg:grid-cols-12 lg:gap-phi-lg">
              <div className="lg:col-span-4 lg:col-start-1 mb-phi-sm lg:mb-0">
                <p className="font-display text-heading-1 font-semibold text-text-primary uppercase tracking-[0.02em]">
                  {item.outlet}
                </p>
                <p className="font-mono text-caption text-text-tertiary tracking-[0.08em] mt-phi-xs">
                  {item.date}
                </p>
              </div>

              <div className="lg:col-span-7 lg:col-start-6 flex flex-col justify-center">
                <p className="font-body text-body text-text-secondary leading-[1.6] mb-phi-sm">
                  &ldquo;{item.quote}&rdquo;
                </p>

                <p className="font-body text-body-sm text-text-tertiary mb-phi-sm">
                  {item.context}
                </p>

                {item.hasLink && item.url && (
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-secondary"
                    aria-label={`Read article from ${item.outlet}`}
                  >
                    Read Article &#8594;
                  </a>
                )}
              </div>
            </article>
          </div>
        ))}
      </div>
    </section>
  );
}
