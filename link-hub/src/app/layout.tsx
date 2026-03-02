import type { Metadata } from 'next';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';
import './globals.css';
import { ARTIST, CREDENTIALS } from '@/lib/artist-config';

const siteUrl = 'https://8i8.art';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: 'FLUTUR | RAV Vast Live Looping Artist — EPK & Booking',
  description: `${ARTIST.shortBio}. ${CREDENTIALS[0].text}. ${CREDENTIALS[1].text}. ${CREDENTIALS[2].text}.`,
  keywords: ['FLUTUR', 'RAV Vast', 'live looping', 'sunset sessions', 'sound healing', 'EPK', 'booking', 'Drishti Beats', 'handpan', 'one-man orchestra'],
  openGraph: {
    title: 'FLUTUR | RAV Vast Live Looping Artist — EPK & Booking',
    description: ARTIST.shortBio,
    type: 'website',
    url: siteUrl,
    images: [{ url: '/images/optimized/rocca-rav-devotional.webp', width: 1920, height: 1068, alt: 'FLUTUR playing RAV Vast at golden hour' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FLUTUR | RAV Vast Live Looping Artist',
    description: ARTIST.shortBio,
    images: ['/images/optimized/rocca-rav-devotional.webp'],
  },
  robots: 'index, follow',
  alternates: { canonical: siteUrl },
};

// JSON-LD structured data for Google
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'MusicGroup',
  name: 'FLUTUR',
  alternateName: ARTIST.fullName,
  url: siteUrl,
  description: ARTIST.shortBio,
  genre: ['Ambient', 'Organic House', 'Sound Healing', 'Live Looping'],
  sameAs: [
    ARTIST.instagram,
    ARTIST.youtube,
    ARTIST.spotify,
    ARTIST.facebook,
  ],
  image: `${siteUrl}/images/optimized/rocca-rav-devotional.webp`,
  member: {
    '@type': 'Person',
    name: ARTIST.fullName,
    instrument: ['RAV Vast', 'Guitar', 'Vocals', 'Ableton Push', 'Drums'],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <link rel="preload" href="/images/optimized/rocca-rav-devotional.webp" as="image" type="image/webp" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="bg-background text-text-primary antialiased">
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
