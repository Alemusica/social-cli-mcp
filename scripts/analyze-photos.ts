#!/usr/bin/env npx tsx
/**
 * Photo Analyzer - Categorize photos by location and date
 * Uses EXIF GPS data to determine locations
 */

import * as fs from 'fs';
import * as path from 'path';

interface PhotoMetadata {
  SourceFile: string;
  DateTimeOriginal?: string;
  CreateDate?: string;
  GPSLatitude?: string;
  GPSLongitude?: string;
  Make?: string;
  Model?: string;
}

interface Location {
  name: string;
  lat: { min: number; max: number };
  lng: { min: number; max: number };
}

// Known locations based on GPS coordinates
const KNOWN_LOCATIONS: Location[] = [
  // Canary Islands - Lanzarote
  { name: 'Lanzarote, Canary Islands', lat: { min: 28.8, max: 29.3 }, lng: { min: -14.0, max: -13.4 } },
  // Madeira
  { name: 'Madeira, Portugal', lat: { min: 32.6, max: 32.9 }, lng: { min: -17.3, max: -16.6 } },
  // Morocco
  { name: 'Morocco', lat: { min: 27.0, max: 36.0 }, lng: { min: -13.0, max: -1.0 } },
  // Athens area, Greece
  { name: 'Athens, Greece', lat: { min: 37.8, max: 38.1 }, lng: { min: 23.5, max: 23.9 } },
  // Greek Islands - Mykonos
  { name: 'Mykonos, Greece', lat: { min: 37.4, max: 37.5 }, lng: { min: 25.3, max: 25.5 } },
  // Greek Islands - Santorini
  { name: 'Santorini, Greece', lat: { min: 36.35, max: 36.5 }, lng: { min: 25.35, max: 25.5 } },
  // Greek Islands - Ios/Amorgos area
  { name: 'Ios/Amorgos, Greece', lat: { min: 36.5, max: 36.6 }, lng: { min: 26.3, max: 26.4 } },
  // Greek Islands - Naxos/Paros
  { name: 'Naxos/Paros, Greece', lat: { min: 37.0, max: 37.3 }, lng: { min: 24.3, max: 25.5 } },
  // Denver, Colorado
  { name: 'Denver, Colorado', lat: { min: 39.5, max: 40.0 }, lng: { min: -105.5, max: -104.5 } },
  // Italy - Lake Maggiore area
  { name: 'Lago Maggiore, Italy', lat: { min: 45.7, max: 46.2 }, lng: { min: 8.4, max: 8.9 } },
  // Italy - Arona/Novara area
  { name: 'Piemonte, Italy', lat: { min: 45.4, max: 45.8 }, lng: { min: 8.3, max: 8.9 } },
  // Venice
  { name: 'Venezia, Italy', lat: { min: 45.4, max: 45.5 }, lng: { min: 12.3, max: 12.4 } },
  // Milan area
  { name: 'Milano, Italy', lat: { min: 45.4, max: 45.5 }, lng: { min: 9.1, max: 9.3 } },
  // Naples
  { name: 'Napoli, Italy', lat: { min: 40.8, max: 40.9 }, lng: { min: 14.2, max: 14.3 } },
  // Sicily - Trapani area
  { name: 'Sicilia, Italy', lat: { min: 37.8, max: 38.1 }, lng: { min: 12.4, max: 12.6 } },
  // Lake Garda
  { name: 'Lago di Garda, Italy', lat: { min: 45.5, max: 45.6 }, lng: { min: 10.0, max: 10.2 } },
  // Barcelona
  { name: 'Barcelona, Spain', lat: { min: 41.3, max: 41.5 }, lng: { min: 2.0, max: 2.3 } },
  // Lisbon
  { name: 'Lisbon, Portugal', lat: { min: 38.7, max: 38.8 }, lng: { min: -9.3, max: -9.0 } },
  // New Jersey (USA Tour)
  { name: 'New Jersey, USA', lat: { min: 40.6, max: 41.1 }, lng: { min: -74.6, max: -74.2 } },
];

function parseGPS(gps: string): number | null {
  // Parse "28 deg 56' 1.11\" N" format
  const match = gps.match(/(\d+)\s*deg\s*(\d+)'\s*([\d.]+)"\s*([NSEW])/);
  if (!match) return null;

  const [, deg, min, sec, dir] = match;
  let decimal = parseFloat(deg) + parseFloat(min) / 60 + parseFloat(sec) / 3600;
  if (dir === 'S' || dir === 'W') decimal = -decimal;
  return decimal;
}

function findLocation(lat: number, lng: number): string {
  for (const loc of KNOWN_LOCATIONS) {
    if (lat >= loc.lat.min && lat <= loc.lat.max &&
        lng >= loc.lng.min && lng <= loc.lng.max) {
      return loc.name;
    }
  }
  return `Unknown (${lat.toFixed(2)}, ${lng.toFixed(2)})`;
}

function parseDate(dateStr?: string): Date | null {
  if (!dateStr) return null;
  // Format: "2025:01:04 16:30:51"
  const [date, time] = dateStr.split(' ');
  const [y, m, d] = date.split(':').map(Number);
  const [h, min, s] = time.split(':').map(Number);
  return new Date(y, m - 1, d, h, min, s);
}

async function main() {
  const metadata: PhotoMetadata[] = JSON.parse(
    fs.readFileSync('/tmp/photo_metadata.json', 'utf-8')
  );

  console.log(`\n📸 Analyzing ${metadata.length} photos...\n`);

  // Categorize by location
  const byLocation: Record<string, PhotoMetadata[]> = {};
  const byYear: Record<string, PhotoMetadata[]> = {};
  const byMonth: Record<string, PhotoMetadata[]> = {};

  for (const photo of metadata) {
    // Location
    if (photo.GPSLatitude && photo.GPSLongitude) {
      const lat = parseGPS(photo.GPSLatitude);
      const lng = parseGPS(photo.GPSLongitude);
      if (lat !== null && lng !== null) {
        const location = findLocation(lat, lng);
        if (!byLocation[location]) byLocation[location] = [];
        byLocation[location].push(photo);
      }
    }

    // Date
    const date = parseDate(photo.DateTimeOriginal || photo.CreateDate);
    if (date) {
      const year = date.getFullYear().toString();
      const month = `${year}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      if (!byYear[year]) byYear[year] = [];
      byYear[year].push(photo);

      if (!byMonth[month]) byMonth[month] = [];
      byMonth[month].push(photo);
    }
  }

  // Print results
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('📍 BY LOCATION');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const sortedLocations = Object.entries(byLocation)
    .sort((a, b) => b[1].length - a[1].length);

  for (const [location, photos] of sortedLocations) {
    console.log(`${location}: ${photos.length} photos`);
    // Show date range
    const dates = photos
      .map(p => parseDate(p.DateTimeOriginal || p.CreateDate))
      .filter(Boolean) as Date[];
    if (dates.length > 0) {
      const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
      const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));
      console.log(`   📅 ${minDate.toLocaleDateString('it-IT')} - ${maxDate.toLocaleDateString('it-IT')}`);
    }
  }

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('📅 BY YEAR');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const sortedYears = Object.entries(byYear).sort((a, b) => b[0].localeCompare(a[0]));
  for (const [year, photos] of sortedYears) {
    console.log(`${year}: ${photos.length} photos`);
  }

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('📆 RECENT MONTHS (last 12)');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const sortedMonths = Object.entries(byMonth)
    .sort((a, b) => b[0].localeCompare(a[0]))
    .slice(0, 12);

  for (const [month, photos] of sortedMonths) {
    console.log(`${month}: ${photos.length} photos`);
  }

  // Generate editorial calendar suggestion
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('📋 SUGGESTED EDITORIAL THEMES');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const themes = [
    { name: '🏝️ Island Life', locations: ['Lanzarote', 'Madeira', 'Mykonos', 'Santorini'] },
    { name: '🏄 Surf & Beach', locations: ['Morocco'] },
    { name: '🎵 Music Journey', locations: ['Denver'] },
    { name: '🏔️ Lakes & Mountains', locations: ['Lago Maggiore', 'Piemonte'] },
    { name: '🏛️ Mediterranean Cities', locations: ['Athens', 'Barcelona', 'Lisbon'] },
  ];

  for (const theme of themes) {
    const count = theme.locations.reduce((sum, loc) => {
      const found = Object.entries(byLocation).find(([k]) => k.includes(loc));
      return sum + (found ? found[1].length : 0);
    }, 0);
    if (count > 0) {
      console.log(`${theme.name}: ${count} photos available`);
    }
  }

  // Save results
  const output = {
    totalPhotos: metadata.length,
    byLocation: Object.fromEntries(
      Object.entries(byLocation).map(([k, v]) => [k, v.length])
    ),
    byYear: Object.fromEntries(
      Object.entries(byYear).map(([k, v]) => [k, v.length])
    ),
    byMonth: Object.fromEntries(
      Object.entries(byMonth).map(([k, v]) => [k, v.length])
    ),
  };

  fs.writeFileSync(
    '/Users/alessioivoycazzaniga/Projects/social-cli-mcp/content/music/photo-analysis.json',
    JSON.stringify(output, null, 2)
  );

  console.log('\n✅ Analysis saved to content/music/photo-analysis.json');
}

main().catch(console.error);
