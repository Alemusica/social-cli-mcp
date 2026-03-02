'use client';

import { useState } from 'react';
import { ARTIST, PERFORMANCE_MODES, BOOKING, TECH_RIDER } from '@/lib/artist-config';
import { trackBookingSubmit, trackDownload } from '@/lib/tracking';

export default function BookingForm() {
  const [formData, setFormData] = useState({
    name: '',
    venue: '',
    email: '',
    dates: '',
    format: '',
    message: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    trackBookingSubmit(formData.format || 'unspecified');
    const subject = encodeURIComponent(`Booking Inquiry · ${formData.venue || formData.name}`);
    const body = encodeURIComponent(
      `Name: ${formData.name}\nVenue: ${formData.venue}\nEmail: ${formData.email}\nPreferred Dates: ${formData.dates}\nFormat: ${formData.format}\n\nMessage:\n${formData.message}`
    );
    window.location.href = `mailto:${ARTIST.bookingEmail}?subject=${subject}&body=${body}`;
  };

  const inputClass = 'w-full bg-bg-dark border border-border-medium rounded-lg px-4 py-3.5 text-base text-text-primary placeholder:text-text-muted/50 focus:border-accent-gold/50 transition-colors';

  return (
    <section id="booking" className="py-phi-2xl px-6">
      <div className="max-w-lg mx-auto">
        <h2 className="text-2xl font-display font-light text-center mb-2 tracking-wide">
          Book {ARTIST.name}
        </h2>
        <p className="text-text-muted text-sm text-center mb-phi-sm">
          {BOOKING.available} · {BOOKING.regions.join(', ')}
        </p>

        {/* Pricing hint — agents need this */}
        <div className="text-center mb-phi-lg">
          <p className="text-xs text-text-muted">
            Contact for rates — typically responds within 24 hours.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-phi-sm">
          <div className="grid grid-cols-2 gap-phi-sm">
            <input
              type="text"
              placeholder="Your Name"
              aria-label="Your name"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className={inputClass}
            />
            <input
              type="email"
              placeholder="Email"
              aria-label="Email address"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className={inputClass}
            />
          </div>
          <input
            type="text"
            placeholder="Venue / Event Name"
            aria-label="Venue or event name"
            value={formData.venue}
            onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
            className={inputClass}
          />
          <div className="grid grid-cols-2 gap-phi-sm">
            <input
              type="text"
              placeholder="Preferred Dates"
              aria-label="Preferred dates"
              value={formData.dates}
              onChange={(e) => setFormData({ ...formData, dates: e.target.value })}
              className={inputClass}
            />
            <select
              value={formData.format}
              aria-label="Performance format"
              onChange={(e) => setFormData({ ...formData, format: e.target.value })}
              className={`${inputClass} ${!formData.format ? 'text-text-muted/50' : ''}`}
            >
              <option value="">Performance Format</option>
              {PERFORMANCE_MODES.map((m) => (
                <option key={m.id} value={m.name}>{m.name} ({m.duration})</option>
              ))}
            </select>
          </div>
          <textarea
            placeholder="Tell me about your event — type, audience, what atmosphere you want"
            aria-label="Message about your event"
            rows={3}
            value={formData.message}
            onChange={(e) => setFormData({ ...formData, message: e.target.value })}
            className={`${inputClass} resize-none`}
          />
          <button
            type="submit"
            className="w-full btn-primary py-4 rounded-lg text-base font-medium tracking-wide"
          >
            Send Inquiry
          </button>
        </form>

        {/* Quick links below form */}
        <div className="flex justify-center items-center gap-phi-md mt-phi-lg text-sm">
          <a href={`mailto:${ARTIST.bookingEmail}`} className="py-3 text-text-muted hover:text-accent-gold transition-colors">
            Direct Email
          </a>
          <span className="text-text-muted" aria-hidden="true">·</span>
          <a href={ARTIST.whatsapp} target="_blank" rel="noopener noreferrer" className="py-3 text-text-muted hover:text-accent-gold transition-colors">
            WhatsApp
          </a>
          <span className="text-text-muted" aria-hidden="true">·</span>
          <a href={TECH_RIDER.downloadUrl} download onClick={() => trackDownload('flutur-tech-rider-2026.pdf')} className="py-3 text-text-muted hover:text-accent-gold transition-colors">
            Tech Rider PDF
          </a>
        </div>
      </div>
    </section>
  );
}
