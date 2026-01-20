#!/usr/bin/env npx tsx
/**
 * Import photo metadata to SurrealDB
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import Surreal from 'surrealdb';

const IMAGES_DIR = '/Users/alessioivoycazzaniga/Projects/social-cli-mcp/media/music/images';

// Known locations from GPS
const LOCATIONS: Record<string, { lat: [number, number]; lng: [number, number] }> = {
  'Lanzarote, Canary Islands': { lat: [28.8, 29.3], lng: [-14.0, -13.4] },
  'Madeira, Portugal': { lat: [32.6, 32.9], lng: [-17.3, -16.6] },
  'Morocco': { lat: [27.0, 36.0], lng: [-13.0, -1.0] },
  'Ios/Amorgos, Greece': { lat: [36.5, 36.6], lng: [26.3, 26.4] },
  'Lago Maggiore, Italy': { lat: [45.7, 46.2], lng: [8.4, 8.9] },
  'Venezia, Italy': { lat: [45.4, 45.5], lng: [12.3, 12.4] },
  'Milano, Italy': { lat: [45.4, 45.5], lng: [9.1, 9.3] },
  'Napoli, Italy': { lat: [40.8, 40.9], lng: [14.2, 14.3] },
  'Denver, Colorado': { lat: [39.5, 40.0], lng: [-105.5, -104.5] },
  'New Jersey, USA': { lat: [40.6, 41.1], lng: [-74.6, -74.2] },
  'Lisbon, Portugal': { lat: [38.7, 38.8], lng: [-9.3, -9.0] },
  'Sicilia, Italy': { lat: [37.8, 38.1], lng: [12.4, 12.6] },
  'Piemonte, Italy': { lat: [45.4, 45.8], lng: [8.3, 8.9] },
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
  for (const [name, coords] of Object.entries(LOCATIONS)) {
    if (lat >= coords.lat[0] && lat <= coords.lat[1] &&
        lng >= coords.lng[0] && lng <= coords.lng[1]) {
      return name;
    }
  }
  return null;
}

function parseDate(dateStr?: string): Date | null {
  if (!dateStr) return null;
  const [date, time] = dateStr.split(' ');
  const [y, m, d] = date.split(':').map(Number);
  const [h, min, s] = time.split(':').map(Number);
  return new Date(y, m - 1, d, h, min, s);
}

async function main() {
  console.log('📸 Importing photos to SurrealDB...\n');

  // Get EXIF data
  const exifJson = execSync(
    `exiftool -json -r -DateTimeOriginal -GPSLatitude -GPSLongitude -Make -Model -CreateDate "${IMAGES_DIR}"`,
    { encoding: 'utf8', maxBuffer: 50 * 1024 * 1024 }
  );
  const photos: ExifData[] = JSON.parse(exifJson);

  console.log(`Found ${photos.length} photos\n`);

  // Connect to SurrealDB
  const db = new Surreal();
  await db.connect('http://127.0.0.1:8000');
  await db.signin({ username: 'root', password: 'root' });
  await db.use({ namespace: 'social', database: 'analytics' });

  let imported = 0;

  for (const photo of photos) {
    const fileName = path.basename(photo.SourceFile);
    const filePath = photo.SourceFile;

    let location: string | null = null;
    let lat: number | null = null;
    let lng: number | null = null;

    if (photo.GPSLatitude && photo.GPSLongitude) {
      lat = parseGPS(photo.GPSLatitude);
      lng = parseGPS(photo.GPSLongitude);
      if (lat !== null && lng !== null) {
        location = findLocation(lat, lng);
      }
    }

    const takenAt = parseDate(photo.DateTimeOriginal || photo.CreateDate);
    const isVideo = filePath.endsWith('.mp4') || filePath.endsWith('.mov');

    try {
      await db.query(`
        CREATE content SET
          type = $type,
          file_path = $file_path,
          file_name = $file_name,
          location = $location,
          location_lat = $lat,
          location_lng = $lng,
          taken_at = $taken_at,
          camera = $camera,
          tags = []
      `, {
        type: isVideo ? 'video' : 'image',
        file_path: filePath,
        file_name: fileName,
        location: location,
        lat: lat,
        lng: lng,
        taken_at: takenAt?.toISOString() || null,
        camera: photo.Model || null,
      });
      imported++;

      if (imported % 50 === 0) {
        console.log(`Imported ${imported}/${photos.length}...`);
      }
    } catch (error: any) {
      console.error(`Error importing ${fileName}:`, error.message);
    }
  }

  console.log(`\n✅ Imported ${imported} photos to SurrealDB`);

  // Show stats
  const stats = await db.query(`
    SELECT location, count() as count
    FROM content
    WHERE location IS NOT NONE
    GROUP BY location
    ORDER BY count DESC
  `);

  console.log('\n📍 Photos by location:');
  for (const row of (stats[0] as any[]) || []) {
    console.log(`  ${row.location}: ${row.count}`);
  }

  await db.close();
}

main().catch(console.error);
