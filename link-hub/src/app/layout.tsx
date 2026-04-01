import type { Metadata } from 'next';
import { Space_Grotesk, IBM_Plex_Mono, Playfair_Display } from 'next/font/google';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';
import './globals.css';
import { ARTIST, CREDENTIALS } from '@/lib/artist-config';
import { LenisProvider } from '@/providers/LenisProvider';

// Font loading via next/font — no Google CDN @import
const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-body',
  display: 'swap',
});

const playfairDisplay = Playfair_Display({
  subsets: ['latin'],
  weight: ['400', '700', '900'],
  style: ['normal', 'italic'],
  variable: '--font-display-serif',
  display: 'swap',
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-mono',
  display: 'swap',
});

const siteUrl = 'https://8i8.art';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: 'FLUTUR | Live Looping Artist — EPK & Booking',
  description: `${ARTIST.shortBio}. ${CREDENTIALS[0].text}. ${CREDENTIALS[1].text}. ${CREDENTIALS[2].text}.`,
  keywords: ['FLUTUR', 'RAV Vast', 'live looping', 'one-man orchestra', 'EPK', 'booking', 'Drishti Beats', 'handpan', 'sunset sessions'],
  openGraph: {
    title: 'FLUTUR | Live Looping Artist — EPK & Booking',
    description: ARTIST.shortBio,
    type: 'website',
    url: siteUrl,
    images: [{ url: '/images/optimized/rocca-rav-devotional.webp', width: 1920, height: 1068, alt: 'FLUTUR playing RAV Vast at golden hour' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FLUTUR | Live Looping Artist',
    description: ARTIST.shortBio,
    images: ['/images/optimized/rocca-rav-devotional.webp'],
  },
  robots: 'index, follow',
  alternates: { canonical: siteUrl },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'MusicGroup',
  name: 'FLUTUR',
  alternateName: ARTIST.fullName,
  url: siteUrl,
  description: ARTIST.shortBio,
  genre: ['Ambient', 'Organic House', 'Live Looping', 'Sound Art'],
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
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${playfairDisplay.variable} ${ibmPlexMono.variable}`}
    >
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="bg-background text-text-primary antialiased">
        <a href="#main-content" className="skip-link">
          Skip to content
        </a>
        <LenisProvider>
          {children}
        </LenisProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
