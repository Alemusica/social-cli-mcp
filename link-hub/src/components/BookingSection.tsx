'use client';

import { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ARTIST } from '@/lib/artist-config';

gsap.registerPlugin(ScrollTrigger);

const WHATSAPP_URL = `https://wa.me/393516986198?text=${encodeURIComponent(
  "Hi, I'm interested in booking FLUTUR. I'm [name] from [venue/festival]."
)}`;

const TELEGRAM_URL = 'https://t.me/flutur_8';
const EMAIL_URL = `mailto:${ARTIST.email}`;

export function BookingSection() {
  const container = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (prefersReduced) return;

      // 1. Headline — scale + opacity scrub on scroll
      gsap.from('.booking-headline', {
        scale: 0.9,
        opacity: 0.5,
        ease: 'none',
        scrollTrigger: {
          trigger: container.current,
          start: 'top 80%',
          end: 'top 30%',
          scrub: true,
        },
      });

      // 2. Body text — fade in after headline enters view
      gsap.from('.booking-body', {
        y: 20,
        opacity: 0,
        duration: 0.6,
        scrollTrigger: {
          trigger: container.current,
          start: 'top 70%',
          toggleActions: 'play none none reverse',
        },
      });

      // 3. CTA buttons — stagger fade in
      gsap.from('.booking-cta', {
        y: 15,
        opacity: 0,
        stagger: 0.1,
        duration: 0.4,
        delay: 0.2,
        scrollTrigger: {
          trigger: container.current,
          start: 'top 70%',
          toggleActions: 'play none none reverse',
        },
      });

      // 4. Regions line — fade in last
      gsap.from('.booking-regions', {
        opacity: 0,
        duration: 0.3,
        delay: 0.4,
        scrollTrigger: {
          trigger: container.current,
          start: 'top 70%',
          toggleActions: 'play none none reverse',
        },
      });
    },
    { scope: container }
  );

  return (
    <section ref={container} id="booking" className="px-phi-md lg:px-phi-xl py-phi-2xl">
      <div className="rule mb-phi-xl" />

      {/* Asymmetric 12-col: message left (1-7), action right (9-12) */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-phi-lg md:gap-0">

        {/* Left — headline + copy */}
        <div className="md:col-span-7">
          <h2
            className="booking-headline font-display font-bold text-gold tracking-[0.02em] mb-phi-lg"
            style={{ fontSize: 'clamp(48px, 8vw, 80px)', lineHeight: 1.05 }}
          >
            FALL/WINTER 2026
          </h2>

          <p className="booking-body font-body text-body-lg text-text-secondary max-w-prose">
            Most summer festivals finalize acts by end of April.
            Remaining slots go to artists who move now.
          </p>
        </div>

        {/* Right — CTA stack */}
        <div className="md:col-start-9 md:col-span-4 flex flex-col items-start md:items-end md:justify-end gap-phi-sm">
          {/* Primary CTA */}
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="booking-cta btn-primary inline-flex items-center gap-phi-sm"
            aria-label="Contact FLUTUR on WhatsApp to secure a booking date"
          >
            WHATSAPP — SECURE A DATE
          </a>

          {/* Secondary CTAs */}
          <div className="booking-cta flex items-center gap-phi-sm">
            <a
              href={TELEGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary"
              aria-label="Contact FLUTUR on Telegram"
            >
              Telegram
            </a>
            <span className="text-text-tertiary font-body text-caption" aria-hidden="true">&middot;</span>
            <a
              href={EMAIL_URL}
              className="btn-secondary"
              aria-label="Email FLUTUR for booking"
            >
              Email
            </a>
          </div>
        </div>
      </div>

      {/* Regions — full width, left-aligned */}
      <p className="booking-regions font-body text-caption text-text-tertiary mt-phi-xl uppercase tracking-[0.08em]">
        Europe &middot; Mediterranean &middot; USA &middot; Worldwide
      </p>
    </section>
  );
}
