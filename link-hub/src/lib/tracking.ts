'use client';

import { track } from '@vercel/analytics';

/**
 * EPK Event Tracking
 * Tracks visitor behavior for iteration loop:
 * who visits → what they see → what they download → correlate with replies
 */

// Capture UTM on page load
export function captureUTM(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const params = new URLSearchParams(window.location.search);
  const utm: Record<string, string> = {};
  for (const key of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content']) {
    const val = params.get(key);
    if (val) utm[key] = val;
  }
  if (Object.keys(utm).length > 0) {
    // Persist for session
    sessionStorage.setItem('epk_utm', JSON.stringify(utm));
    track('utm_captured', utm);
  }
  return utm;
}

function getUTM(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(sessionStorage.getItem('epk_utm') || '{}');
  } catch { return {}; }
}

// PDF download tracking
export function trackDownload(fileName: string) {
  track('pdf_download', { file: fileName, ...getUTM() });
}

// Video play tracking
export function trackVideoPlay(videoId: string, videoTitle: string) {
  track('video_play', { videoId, videoTitle, ...getUTM() });
}

// Section view tracking (scroll depth)
export function trackSectionView(sectionId: string) {
  track('section_view', { section: sectionId, ...getUTM() });
}

// Booking form interaction
export function trackBookingStart() {
  track('booking_form_start', getUTM());
}

export function trackBookingSubmit(format: string) {
  track('booking_form_submit', { format, ...getUTM() });
}

// External link clicks
export function trackExternalClick(platform: string, url: string) {
  track('external_click', { platform, url, ...getUTM() });
}

/**
 * Intersection Observer for scroll depth tracking.
 * Call once on mount — observes all sections with id attributes.
 */
export function initScrollTracking() {
  if (typeof window === 'undefined') return;

  const tracked = new Set<string>();

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting && !tracked.has(entry.target.id)) {
          tracked.add(entry.target.id);
          trackSectionView(entry.target.id);
        }
      }
    },
    { threshold: 0.3 }
  );

  // Observe all sections with IDs
  document.querySelectorAll('section[id]').forEach((el) => observer.observe(el));

  return () => observer.disconnect();
}
