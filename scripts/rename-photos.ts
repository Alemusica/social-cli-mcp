#!/usr/bin/env npx tsx
/**
 * Smart Photo Renamer
 * Renames photos based on location, date, and metadata
 * Format: YYYY-MM-DD_location_category_XX.ext
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

const IMAGES_DIR = '/Users/alessioivoycazzaniga/Projects/social-cli-mcp/media/music/images';
const DRY_RUN = process.argv.includes('--dry-run');

// Location mappings
const LOCATIONS: Record<string, { lat: [number, number]; lng: [number, number]; slug: string }> = {
  'lanzarote': { lat: [28.8, 29.3], lng: [-14.0, -13.4], slug: 'lanzarote' },
  'madeira': { lat: [32.6, 32.9], lng: [-17.3, -16.6], slug: 'madeira' },
  'morocco': { lat: [27.0, 36.0], lng: [-13.0, -1.0], slug: 'morocco' },
  'ios_greece': { lat: [36.5, 36.6], lng: [26.3, 26.4], slug: 'ios-greece' },
  'lago_maggiore': { lat: [45.7, 46.2], lng: [8.4, 8.9], slug: 'lago-maggiore' },
  'venezia': { lat: [45.4, 45.5], lng: [12.3, 12.4], slug: 'venezia' },
  'milano': { lat: [45.4, 45.5], lng: [9.1, 9.3], slug: 'milano' },
  'napoli': { lat: [40.8, 40.9], lng: [14.2, 14.3], slug: 'napoli' },
  'denver': { lat: [39.5, 40.0], lng: [-105.5, -104.5], slug: 'denver' },
  'new_jersey': { lat: [40.6, 41.1], lng: [-74.6, -74.2], slug: 'new-jersey' },
  'lisbon': { lat: [38.7, 38.8], lng: [-9.3, -9.0], slug: 'lisbon' },
  'sicilia': { lat: [37.8, 38.1], lng: [12.4, 12.6], slug: 'sicilia' },
  'piemonte': { lat: [45.4, 45.8], lng: [8.3, 8.9], slug: 'piemonte' },
};

interface ExifData {
  SourceFile: string;
  DateTimeOriginal?: string;
  CreateDate?: string;
  GPSLatitude?: string;
  GPSLongitude?: string;
  Make?: string;
  Model?: string;
}

function parseGPS(gps: string): number | null {
  const match = gps.match(/(\d+)\s*deg\s*(\d+)'\s*([\d.]+)"\s*([NSEW])/);
  if (!match) return null;
  const [, deg, min, sec, dir] = match;
  let decimal = parseFloat(deg) + parseFloat(min) / 60 + parseFloat(sec) / 3600;
  if (dir === 'S' || dir === 'W') decimal = -decimal;
  return decimal;
}

function findLocation(lat: number, lng: number): string | null {
  for (const [, data] of Object.entries(LOCATIONS)) {
    if (lat >= data.lat[0] && lat <= data.lat[1] &&
        lng >= data.lng[0] && lng <= data.lng[1]) {
      return data.slug;
    }
  }
  return null;
}

function parseDate(dateStr?: string): { date: string; time: string } | null {
  if (!dateStr) return null;
  const [datePart, timePart] = dateStr.split(' ');
  const [y, m, d] = datePart.split(':');
  return {
    date: `${y}-${m}-${d}`,
    time: timePart.replace(/:/g, ''),
  };
}

async function main() {
  console.log(`📸 Smart Photo Renamer ${DRY_RUN ? '(DRY RUN)' : ''}\n`);

  // Get EXIF data
  const exifJson = execSync(
    `exiftool -json -r -DateTimeOriginal -GPSLatitude -GPSLongitude -Make -Model -CreateDate "${IMAGES_DIR}"`,
    { encoding: 'utf8', maxBuffer: 50 * 1024 * 1024 }
  );
  const photos: ExifData[] = JSON.parse(exifJson);

  console.log(`Found ${photos.length} photos\n`);

  // Track renames by location/date for numbering
  const counters: Record<string, number> = {};
  const renames: { from: string; to: string }[] = [];

  for (const photo of photos) {
    const oldPath = photo.SourceFile;
    const ext = path.extname(oldPath).toLowerCase();
    const dir = path.dirname(oldPath);

    // Get location
    let locationSlug = 'unknown';
    if (photo.GPSLatitude && photo.GPSLongitude) {
      const lat = parseGPS(photo.GPSLatitude);
      const lng = parseGPS(photo.GPSLongitude);
      if (lat !== null && lng !== null) {
        locationSlug = findLocation(lat, lng) || 'unknown';
      }
    }

    // Get date
    const dateInfo = parseDate(photo.DateTimeOriginal || photo.CreateDate);
    const dateStr = dateInfo?.date || 'undated';

    // Create unique key for numbering
    const key = `${dateStr}_${locationSlug}`;
    counters[key] = (counters[key] || 0) + 1;
    const num = counters[key].toString().padStart(2, '0');

    // Determine category based on camera or other hints
    let category = 'photo';
    if (photo.Model?.includes('Nikon')) {
      category = 'nikon';
    } else if (photo.Model?.includes('iPhone')) {
      category = 'iphone';
    }

    // Create new filename
    const newName = `${dateStr}_${locationSlug}_${category}_${num}${ext}`;
    const newPath = path.join(dir, newName);

    // Skip if already has good name or same name
    if (oldPath === newPath || path.basename(oldPath).startsWith('20')) {
      continue;
    }

    renames.push({ from: oldPath, to: newPath });
  }

  console.log(`Will rename ${renames.length} photos:\n`);

  // Show first 20 examples
  for (const { from, to } of renames.slice(0, 20)) {
    console.log(`  ${path.basename(from)}`);
    console.log(`  → ${path.basename(to)}\n`);
  }

  if (renames.length > 20) {
    console.log(`  ... and ${renames.length - 20} more\n`);
  }

  if (DRY_RUN) {
    console.log('\n⚠️  DRY RUN - no files renamed. Remove --dry-run to apply.');
    return;
  }

  // Actually rename
  console.log('\nRenaming files...');
  let renamed = 0;
  let errors = 0;

  for (const { from, to } of renames) {
    try {
      // Check if target exists
      if (fs.existsSync(to)) {
        console.log(`⚠️  Skipping ${path.basename(from)} - target exists`);
        continue;
      }
      fs.renameSync(from, to);
      renamed++;
    } catch (error) {
      console.error(`❌ Error renaming ${path.basename(from)}:`, error);
      errors++;
    }
  }

  console.log(`\n✅ Renamed ${renamed} photos (${errors} errors)`);
}

main().catch(console.error);
