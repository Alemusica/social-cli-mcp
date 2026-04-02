'use client';

import { useRef, useState, useCallback } from 'react';
import gsap from 'gsap';
import { TECH_RIDER } from '@/lib/artist-config';

export function TechnicalRider() {
  const expandedRef = useRef(false);
  const [ariaExpanded, setAriaExpanded] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const iconRef = useRef<HTMLSpanElement>(null);

  const toggle = useCallback(() => {
    const content = contentRef.current;
    const icon = iconRef.current;
    if (!content || !icon) return;

    const isExpanded = expandedRef.current;

    if (!isExpanded) {
      // Expand — measure real content height, animate to it
      const autoHeight = content.scrollHeight;
      gsap.to(content, {
        height: autoHeight,
        opacity: 1,
        duration: 0.6,
        ease: 'power2.out',
        onComplete: () => { gsap.set(content, { height: 'auto', overflow: 'visible' }); },
      });
      gsap.to(icon, { rotation: 45, duration: 0.3, ease: 'power2.out' });
    } else {
      // Collapse — lock overflow first, then shrink
      gsap.set(content, { overflow: 'hidden' });
      gsap.to(content, {
        height: 0,
        opacity: 0,
        duration: 0.4,
        ease: 'power2.inOut',
      });
      gsap.to(icon, { rotation: 0, duration: 0.3, ease: 'power2.out' });
    }

    expandedRef.current = !isExpanded;
    setAriaExpanded(!isExpanded);
  }, []);

  return (
    <section id="tech" className="px-phi-md md:px-phi-xl py-phi-2xl">
      <div className="rule mb-phi-xl" />

      <div className="max-w-5xl mx-auto">
        {/* Header row — clickable to expand/collapse */}
        <button
          onClick={toggle}
          className="w-full text-left flex items-start justify-between gap-phi-md group"
          aria-expanded={ariaExpanded}
          aria-controls="tech-rider-content"
        >
          <div>
            <p className="font-mono text-micro uppercase text-gold tracking-[0.12em] mb-phi-sm">
              TECHNICAL
            </p>
            <h2 className="font-display text-display font-bold text-text-primary tracking-[0.02em]">
              TECH RIDER
            </h2>
          </div>
          <span
            ref={iconRef}
            className="text-gold text-heading-1 font-display leading-none mt-phi-lg select-none"
            aria-hidden="true"
          >
            +
          </span>
        </button>

        {/* Headline — always visible */}
        <p className="font-body text-body-lg text-text-secondary mt-phi-md max-w-prose">
          {TECH_RIDER.headline}
        </p>

        {/* Collapsible content — GSAP height tween, not CSS max-height */}
        <div
          ref={contentRef}
          id="tech-rider-content"
          style={{ height: 0, opacity: 0, overflow: 'hidden' }}
        >
          <div className="pt-phi-xl">
            {/* Two columns: equipment + venue needs */}
            <div className="grid md:grid-cols-2 gap-phi-lg">
              {/* Artist Equipment */}
              <div>
                <p className="font-mono text-caption uppercase text-gold tracking-[0.08em] mb-phi-sm">
                  Artist Equipment
                </p>
                <div className="rule mb-phi-sm" />
                <div className="space-y-0">
                  {TECH_RIDER.artistEquipment.map((eq) => (
                    <div key={eq.item} className="py-phi-xs border-b border-rule">
                      <span className="font-mono text-caption text-text-primary">{eq.item}</span>
                      <span className="font-mono text-caption text-text-tertiary ml-phi-sm">{eq.note}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Venue Requirements */}
              <div>
                <p className="font-mono text-caption uppercase text-gold tracking-[0.08em] mb-phi-sm">
                  Venue Requirements
                </p>
                <div className="rule mb-phi-sm" />
                <div className="space-y-0">
                  {TECH_RIDER.venueNeeds.map((need) => (
                    <div key={need.item} className="py-phi-xs border-b border-rule">
                      <span className="font-mono text-caption text-text-primary">{need.item}</span>
                      <span className="font-mono text-caption text-text-tertiary ml-phi-sm">{need.spec}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Signal flow */}
            <div className="rule my-phi-lg" />
            <div>
              <p className="font-mono text-caption uppercase text-gold tracking-[0.08em] mb-phi-xs">
                Signal Flow
              </p>
              <p className="font-mono text-caption text-text-secondary">
                {TECH_RIDER.signalFlow}
              </p>
            </div>

            {/* Timing */}
            <div className="rule my-phi-lg" />
            <div className="flex gap-phi-xl">
              <div>
                <p className="font-mono text-caption text-text-tertiary uppercase">Setup</p>
                <p className="font-mono text-caption text-text-primary">{TECH_RIDER.setup}</p>
              </div>
              <div>
                <p className="font-mono text-caption text-text-tertiary uppercase">Soundcheck</p>
                <p className="font-mono text-caption text-text-primary">{TECH_RIDER.soundcheck}</p>
              </div>
              <div>
                <p className="font-mono text-caption text-text-tertiary uppercase">Breakdown</p>
                <p className="font-mono text-caption text-text-primary">{TECH_RIDER.breakdown}</p>
              </div>
            </div>

            {/* PDF download */}
            <div className="rule my-phi-lg" />
            <a
              href={TECH_RIDER.downloadUrl}
              download
              className="btn-primary inline-flex items-center gap-phi-sm"
              aria-label="Download tech rider PDF"
            >
              DOWNLOAD TECH RIDER PDF
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
