'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';

gsap.registerPlugin();

interface NavItem {
  label: string;
  href: string;
  sectionId: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Shows', href: '#modes', sectionId: 'modes' },
  { label: 'Press', href: '#press', sectionId: 'press' },
  { label: 'Tech', href: '#tech', sectionId: 'tech' },
  { label: 'Book', href: '#booking', sectionId: 'booking' },
];

export function StickyNav() {
  const [activeSection, setActiveSection] = useState<string>('');
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const scrollObserverRef = useRef<IntersectionObserver | null>(null);
  const navRef = useRef<HTMLElement | null>(null);

  // Entrance animation — stagger nav items on page load
  useGSAP(
    () => {
      // Respect prefers-reduced-motion
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

      gsap.from('.nav-item', {
        y: -15,
        opacity: 0,
        duration: 0.3,
        stagger: 0.05,
        ease: 'power2.out',
      });
    },
    { scope: navRef }
  );

  // Scroll spy via IntersectionObserver — no scroll event listeners
  useEffect(() => {
    const sectionIds = NAV_ITEMS.map(item => item.sectionId);
    const visibleSections = new Map<string, number>();

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            visibleSections.set(entry.target.id, entry.intersectionRatio);
          } else {
            visibleSections.delete(entry.target.id);
          }
        });

        // Active = most visible section
        let maxRatio = 0;
        let maxId = '';
        visibleSections.forEach((ratio, id) => {
          if (ratio > maxRatio) {
            maxRatio = ratio;
            maxId = id;
          }
        });
        if (maxId) {
          setActiveSection(maxId);
        }
      },
      { threshold: [0, 0.25, 0.5, 0.75, 1], rootMargin: '-80px 0px 0px 0px' }
    );

    sectionIds.forEach((id) => {
      const el = document.getElementById(id);
      if (el && observerRef.current) observerRef.current.observe(el);
    });

    return () => observerRef.current?.disconnect();
  }, []);

  // Detect scroll position via sentinel element + IntersectionObserver
  // A small sentinel div at top of page — when it leaves viewport, nav is scrolled
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    scrollObserverRef.current = new IntersectionObserver(
      ([entry]) => {
        setScrolled(!entry.isIntersecting);
      },
      { threshold: 0 }
    );

    scrollObserverRef.current.observe(sentinel);

    return () => scrollObserverRef.current?.disconnect();
  }, []);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  const closeMobile = useCallback(() => setMobileOpen(false), []);

  return (
    <>
      {/* Sentinel for scroll detection — sits at top of page, zero height */}
      <div ref={sentinelRef} className="absolute top-0 left-0 w-full h-px" aria-hidden="true" />

      <nav
        ref={navRef}
        className={`sticky top-0 z-50 border-b border-rule transition-[background] duration-200 ease-out ${
          scrolled
            ? 'bg-background/90'
            : 'bg-transparent'
        }`}
        aria-label="Main navigation"
      >
        <div className="mx-auto max-w-[1200px] px-phi-md lg:px-phi-xl h-[48px] flex items-center justify-between">
          {/* Left: brand */}
          <a
            href="#"
            className="font-display text-heading-2 font-bold text-text-primary tracking-[-0.01em] min-h-[44px] flex items-center"
          >
            FLUTUR
          </a>

          {/* Desktop: numbered section labels, equidistributed */}
          <div className="hidden md:flex items-center justify-between gap-phi-md">
            {NAV_ITEMS.map((item, i) => (
              <a
                key={item.sectionId}
                href={item.href}
                className={`nav-item font-mono text-caption uppercase tracking-[0.1em] min-h-[44px] flex items-center gap-[0.25em] transition-colors duration-200 ease-out ${
                  activeSection === item.sectionId
                    ? 'text-gold'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                <span className="text-text-tertiary">0{i + 1}/</span>
                {item.label}
              </a>
            ))}
          </div>

          {/* Mobile: Book button + hamburger */}
          <div className="flex md:hidden items-center gap-phi-sm">
            <a
              href="#booking"
              className="btn-primary"
            >
              Book
            </a>

            <button
              type="button"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileOpen}
              className="flex flex-col justify-center items-center w-[44px] h-[44px] gap-[5px]"
            >
              <div
                className={`w-[20px] h-px bg-text-primary transition-transform duration-200 ease-out ${
                  mobileOpen ? 'translate-y-[6px] rotate-45' : ''
                }`}
              />
              <div
                className={`w-[20px] h-px bg-text-primary transition-opacity duration-200 ease-out ${
                  mobileOpen ? 'opacity-0' : ''
                }`}
              />
              <div
                className={`w-[20px] h-px bg-text-primary transition-transform duration-200 ease-out ${
                  mobileOpen ? '-translate-y-[6px] -rotate-45' : ''
                }`}
              />
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile menu — slides from right */}
      <div
        className={`fixed inset-0 z-40 md:hidden transition-opacity duration-200 ease-out ${
          mobileOpen
            ? 'opacity-100 pointer-events-auto'
            : 'opacity-0 pointer-events-none'
        }`}
        aria-hidden={!mobileOpen}
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-background/60"
          onClick={closeMobile}
        />

        {/* Panel */}
        <div
          className={`absolute top-0 right-0 h-full w-[280px] bg-background flex flex-col pt-[82px] px-phi-lg transition-transform duration-200 ease-out ${
            mobileOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          {NAV_ITEMS.map((item, i) => (
            <a
              key={item.sectionId}
              href={item.href}
              onClick={closeMobile}
              className={`font-mono text-caption uppercase tracking-[0.1em] py-phi-md border-b border-rule min-h-[44px] flex items-center gap-[0.25em] transition-colors duration-200 ease-out ${
                activeSection === item.sectionId
                  ? 'text-gold'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <span className="text-text-tertiary">0{i + 1}/</span>
              {item.label}
            </a>
          ))}
        </div>
      </div>
    </>
  );
}
