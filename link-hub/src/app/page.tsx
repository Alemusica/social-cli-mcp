import { Suspense } from 'react';
import StickyNav from '@/components/StickyNav';
import HeroSection from '@/components/HeroSection';
import TrackingProvider from '@/components/TrackingProvider';
import PerformanceModes from '@/components/PerformanceModes';
import PhotoGallery from '@/components/PhotoGallery';
import CredentialsBar from '@/components/CredentialsBar';
import PastVenuesSection from '@/components/PastVenuesSection';
import PressSection from '@/components/PressSection';
import TestimonialsSection from '@/components/TestimonialsSection';
import TechRiderSection from '@/components/TechRiderSection';
import VideoGallery from '@/components/VideoGallery';
import TechniqueSection from '@/components/TechniqueSection';
import JourneySection from '@/components/JourneySection';
import BookingForm from '@/components/BookingForm';
import SocialLinksSection from '@/components/SocialLinksSection';
import Footer from '@/components/Footer';

export default function Home() {
  return (
    <main className="min-h-screen">
      <TrackingProvider />
      <StickyNav />
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center">
          <p className="text-text-muted">Loading</p>
        </div>
      }>
        <HeroSection />
      </Suspense>
      {/* Buyer journey: credibility → social proof → what you get → deep dive → book */}
      <CredentialsBar />
      <TestimonialsSection />
      <PerformanceModes />
      <VideoGallery />
      <PastVenuesSection />
      <PressSection />
      <PhotoGallery />
      <BookingForm />
      <TechniqueSection />
      <TechRiderSection />
      <JourneySection />
      <SocialLinksSection />
      <Footer />
    </main>
  );
}
