'use client';

import { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';

gsap.registerPlugin(ScrollTrigger, SplitText);

interface ScrollRevealOptions {
  type?: 'lines' | 'chars' | 'words';
  stagger?: number;
  duration?: number;
  y?: number;
  start?: string;
  delay?: number;
}

export function useScrollReveal<T extends HTMLElement>(
  selector: string,
  options: ScrollRevealOptions = {}
) {
  const container = useRef<T>(null);

  const {
    type = 'lines',
    stagger = 0.15,
    duration = 0.8,
    y = 40,
    start = 'top 80%',
    delay = 0,
  } = options;

  useGSAP(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced || !container.current) return;

    const elements = container.current.querySelectorAll(selector);
    if (elements.length === 0) return;

    elements.forEach((el) => {
      const split = new SplitText(el, { type, mask: type });
      const targets = type === 'lines' ? split.lines : type === 'chars' ? split.chars : split.words;

      gsap.from(targets, {
        y,
        opacity: 0,
        stagger,
        duration,
        delay,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: el,
          start,
          toggleActions: 'play none none reverse',
        },
      });
    });
  }, { scope: container });

  return container;
}
