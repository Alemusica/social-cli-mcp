'use client';

import { useEffect } from 'react';
import { captureUTM, initScrollTracking } from '@/lib/tracking';

/**
 * Client component that initializes all tracking on mount.
 * Add once in page.tsx — handles UTM capture + scroll depth.
 */
export default function TrackingProvider() {
  useEffect(() => {
    captureUTM();
    // Small delay to ensure all sections are rendered
    const timer = setTimeout(() => {
      const cleanup = initScrollTracking();
      return cleanup;
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  return null;
}
