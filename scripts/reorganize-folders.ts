#!/usr/bin/env npx tsx
/**
 * Reorganize photo folders by location
 * Creates: media/music/images/{location}/YYYY/filename.ext
 */

import * as fs from 'fs';
import * as path from 'path';
import Surreal from 'surrealdb';

const IMAGES_DIR = '/Users/alessioivoycazzaniga/Projects/social-cli-mcp/media/music/images';
const DRY_RUN = process.argv.includes('--dry-run');

interface ContentRecord {
  id: string;
  file_path: string;
  file_name: string;
  location: string | null;
  taken_at: string | null;
}

async function main() {
  console.log(`📁 Folder Reorganization ${DRY_RUN ? '(DRY RUN)' : ''}\n`);

  // Connect to SurrealDB to get metadata
  const db = new Surreal();
  await db.connect('http://127.0.0.1:8000');
  await db.signin({ username: 'root', password: 'root' });
  await db.use({ namespace: 'social', database: 'analytics' });

  // Get all content records
  const result = await db.query<[ContentRecord[]]>(`
    SELECT * FROM content
    WHERE type = 'image'
  `);

  const photos = result[0] || [];
  console.log(`Found ${photos.length} photos in database\n`);

  // Track moves
  const moves: { from: string; to: string; dbId: string }[] = [];
  const locationCounts: Record<string, number> = {};

  for (const photo of photos) {
    // Skip if no location (keep in place or move to 'unsorted')
    const location = photo.location
      ? photo.location.split(',')[0].toLowerCase().replace(/[^a-z0-9]/g, '-')
      : 'unsorted';

    // Get year from taken_at or filename
    let year = 'unknown';
    if (photo.taken_at) {
      year = new Date(photo.taken_at).getFullYear().toString();
    } else if (/^\d{4}-/.test(photo.file_name)) {
      year = photo.file_name.substring(0, 4);
    }

    // Build new path
    const newDir = path.join(IMAGES_DIR, location, year);
    const newPath = path.join(newDir, photo.file_name);

    // Skip if already in correct location
    if (photo.file_path === newPath) {
      continue;
    }

    // Skip if source doesn't exist
    if (!fs.existsSync(photo.file_path)) {
      console.log(`⚠️  Missing: ${photo.file_path}`);
      continue;
    }

    moves.push({
      from: photo.file_path,
      to: newPath,
      dbId: photo.id,
    });

    const locKey = `${location}/${year}`;
    locationCounts[locKey] = (locationCounts[locKey] || 0) + 1;
  }

  // Show summary
  console.log('📊 Files by location:\n');
  const sortedLocs = Object.entries(locationCounts).sort((a, b) => b[1] - a[1]);
  for (const [loc, count] of sortedLocs) {
    console.log(`   ${loc}: ${count} files`);
  }

  console.log(`\n📝 Total: ${moves.length} files to move\n`);

  // Show first 10 moves
  for (const move of moves.slice(0, 10)) {
    const fromRel = path.relative(IMAGES_DIR, move.from);
    const toRel = path.relative(IMAGES_DIR, move.to);
    console.log(`   ${fromRel}`);
    console.log(`   → ${toRel}\n`);
  }
  if (moves.length > 10) {
    console.log(`   ... and ${moves.length - 10} more\n`);
  }

  if (DRY_RUN) {
    console.log('⚠️  DRY RUN - no files moved. Remove --dry-run to apply.');
    await db.close();
    return;
  }

  // Create directories and move files
  console.log('🔄 Moving files...\n');
  let moved = 0;
  let errors = 0;

  for (const move of moves) {
    try {
      // Create target directory
      const targetDir = path.dirname(move.to);
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      // Check target doesn't exist
      if (fs.existsSync(move.to)) {
        console.log(`⚠️  Target exists: ${move.to}`);
        errors++;
        continue;
      }

      // Move file
      fs.renameSync(move.from, move.to);

      // Update database
      await db.query(`
        UPDATE $id SET file_path = $newPath
      `, {
        id: move.dbId,
        newPath: move.to,
      });

      moved++;
      if (moved % 50 === 0) {
        console.log(`   Moved ${moved}/${moves.length}...`);
      }
    } catch (error: any) {
      console.error(`❌ Error moving ${move.from}: ${error.message}`);
      errors++;
    }
  }

  console.log(`\n✅ Moved ${moved} files (${errors} errors)`);

  // Clean up empty directories
  console.log('\n🧹 Cleaning up empty directories...');
  cleanEmptyDirs(IMAGES_DIR);

  await db.close();
}

function cleanEmptyDirs(dir: string) {
  if (!fs.existsSync(dir)) return;

  const entries = fs.readdirSync(dir);

  for (const entry of entries) {
    const fullPath = path.join(dir, entry);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      cleanEmptyDirs(fullPath);

      // Check if empty after cleaning subdirs
      const remaining = fs.readdirSync(fullPath);
      if (remaining.length === 0) {
        fs.rmdirSync(fullPath);
        console.log(`   Removed empty: ${path.relative(IMAGES_DIR, fullPath)}/`);
      }
    }
  }
}

main().catch(console.error);
