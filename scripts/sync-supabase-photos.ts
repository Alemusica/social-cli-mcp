#!/usr/bin/env npx tsx
/**
 * Sync Photos: Supabase ↔ SurrealDB
 *
 * Supabase = storage + AI labels + user annotations
 * SurrealDB = graph relations (photo→gig→venue, photo→pillar)
 *
 * Usage:
 *   npx tsx scripts/sync-supabase-photos.ts sync       # Sync new photos to SurrealDB
 *   npx tsx scripts/sync-supabase-photos.ts status     # Show sync status
 *   npx tsx scripts/sync-supabase-photos.ts import     # Import existing media/ folder
 *   npx tsx scripts/sync-supabase-photos.ts label      # Trigger AI labeling
 */

import { getDb, closeDb } from '../src/db/client.js';
import {
  getSupabase,
  getPhotosNeedingSync,
  markPhotoSynced,
  getPhotoUrl,
  uploadPhoto,
  PhotoRecord,
} from '../src/db/supabase-client.js';
import { readdirSync, statSync } from 'fs';
import { join, extname, basename } from 'path';

const MEDIA_ROOT = 'media/music/images';

interface SyncResult {
  synced: number;
  failed: number;
  skipped: number;
}

/**
 * Sync photos from Supabase to SurrealDB content table
 */
async function syncToSurreal(): Promise<SyncResult> {
  const db = await getDb();
  const photos = await getPhotosNeedingSync(50);

  console.log(`\n📸 Found ${photos.length} photos to sync\n`);

  let synced = 0;
  let failed = 0;
  let skipped = 0;

  for (const photo of photos) {
    try {
      // Determine content pillar from AI labels or user tags
      const pillar = determinePillar(photo);
      const publicUrl = getPhotoUrl(photo.storage_path);

      // Create content record in SurrealDB
      const [result] = await db.query(`
        CREATE content SET
          type = "photo",
          title = $title,
          description = $description,
          pillar = $pillar,
          url = $url,
          storage_path = $storagePath,
          supabase_id = $supabaseId,
          location = $location,
          taken_at = $takenAt,
          ai_labels = $aiLabels,
          ai_description = $aiDescription,
          user_tags = $userTags,
          user_story = $userStory,
          created_at = time::now()
      `, {
        title: photo.user_title || photo.filename,
        description: photo.user_description || photo.ai_description || '',
        pillar,
        url: publicUrl,
        storagePath: photo.storage_path,
        supabaseId: photo.id,
        location: photo.location,
        takenAt: photo.taken_at,
        aiLabels: photo.ai_labels,
        aiDescription: photo.ai_description,
        userTags: photo.user_tags,
        userStory: photo.user_story,
      });

      const contentId = (result as any)?.[0]?.id;

      if (contentId) {
        // Mark synced in Supabase
        await markPhotoSynced(photo.id, contentId);

        // Create pillar relation
        if (pillar !== 'unknown') {
          await db.query(`
            RELATE $content->belongs_to_pillar->content_pillar:${pillar}
          `, { content: contentId });
        }

        console.log(`✅ ${photo.filename} → ${contentId} [${pillar}]`);
        synced++;
      } else {
        console.log(`⚠️ ${photo.filename} - no ID returned`);
        skipped++;
      }
    } catch (e: any) {
      console.error(`❌ ${photo.filename}: ${e.message}`);
      failed++;
    }
  }

  await closeDb();

  return { synced, failed, skipped };
}

/**
 * Determine content pillar from AI labels and user tags
 */
function determinePillar(photo: PhotoRecord): string {
  const allTags = [
    ...photo.ai_labels,
    ...photo.user_tags,
    photo.ai_mood || '',
  ].map(t => t.toLowerCase());

  // Tech pillar keywords
  if (allTags.some(t =>
    ['code', 'computer', 'screen', 'laptop', 'programming', 'developer', 'tech'].includes(t)
  )) {
    return 'tech';
  }

  // Music production pillar
  if (allTags.some(t =>
    ['ableton', 'studio', 'mixing', 'recording', 'daw', 'production', 'equipment'].includes(t)
  )) {
    return 'music_production';
  }

  // Live performance pillar
  if (allTags.some(t =>
    ['concert', 'stage', 'performance', 'rav', 'handpan', 'busking', 'live', 'instrument'].includes(t)
  )) {
    return 'live_performance';
  }

  // Nature/authentic pillar
  if (allTags.some(t =>
    ['sunset', 'nature', 'beach', 'mountain', 'outdoor', 'landscape', 'field'].includes(t)
  )) {
    return 'nature_authentic';
  }

  return 'unknown';
}

/**
 * Show sync status
 */
async function showStatus(): Promise<void> {
  const db = await getDb();
  const supabase = getSupabase();

  console.log('\n' + '═'.repeat(50));
  console.log('📊 PHOTO SYNC STATUS');
  console.log('═'.repeat(50));

  // Supabase stats
  const { count: totalSupabase } = await supabase
    .from('photos')
    .select('*', { count: 'exact', head: true });

  const { count: needsSync } = await supabase
    .from('photos')
    .select('*', { count: 'exact', head: true })
    .is('surreal_content_id', null);

  const { count: needsLabels } = await supabase
    .from('photos')
    .select('*', { count: 'exact', head: true })
    .is('ai_description', null);

  console.log('\n📦 Supabase:');
  console.log(`   Total photos: ${totalSupabase || 0}`);
  console.log(`   Needs AI labeling: ${needsLabels || 0}`);
  console.log(`   Needs sync to SurrealDB: ${needsSync || 0}`);

  // SurrealDB stats
  const [surrealStats] = await db.query(`
    SELECT
      count() as total,
      count(IF pillar = "tech" THEN 1 ELSE NONE END) as tech,
      count(IF pillar = "music_production" THEN 1 ELSE NONE END) as music_prod,
      count(IF pillar = "live_performance" THEN 1 ELSE NONE END) as live,
      count(IF pillar = "nature_authentic" THEN 1 ELSE NONE END) as nature
    FROM content
    WHERE type = "photo"
    GROUP ALL
  `);

  const stats = (surrealStats as any)?.[0] || {};
  console.log('\n🗄️ SurrealDB:');
  console.log(`   Total synced: ${stats.total || 0}`);
  console.log(`   By pillar:`);
  console.log(`     Tech: ${stats.tech || 0}`);
  console.log(`     Music Prod: ${stats.music_prod || 0}`);
  console.log(`     Live: ${stats.live || 0}`);
  console.log(`     Nature: ${stats.nature || 0}`);

  // Photos with graph relations
  const [withRelations] = await db.query(`
    SELECT count() as total FROM content
    WHERE type = "photo" AND (->taken_at_gig->gig OR ->belongs_to_pillar->content_pillar)
  `);

  console.log(`\n🔗 Graph Relations:`);
  console.log(`   Photos with relations: ${(withRelations as any)?.[0]?.total || 0}`);

  console.log('\n' + '═'.repeat(50));

  await closeDb();
}

/**
 * Import existing photos from media/ folder to Supabase
 */
async function importLocalPhotos(): Promise<void> {
  const extensions = ['.jpg', '.jpeg', '.png', '.webp', '.heic'];

  function findPhotos(dir: string): string[] {
    const files: string[] = [];

    try {
      const entries = readdirSync(dir);
      for (const entry of entries) {
        const fullPath = join(dir, entry);
        const stat = statSync(fullPath);

        if (stat.isDirectory()) {
          files.push(...findPhotos(fullPath));
        } else if (extensions.includes(extname(entry).toLowerCase())) {
          files.push(fullPath);
        }
      }
    } catch (e) {
      // Skip inaccessible directories
    }

    return files;
  }

  console.log(`\n📁 Scanning ${MEDIA_ROOT} for photos...\n`);

  const photos = findPhotos(MEDIA_ROOT);
  console.log(`Found ${photos.length} photos\n`);

  if (photos.length === 0) {
    console.log('No photos found to import.');
    return;
  }

  // Show first 10
  console.log('Sample files:');
  photos.slice(0, 10).forEach(p => console.log(`  ${p}`));
  if (photos.length > 10) console.log(`  ... and ${photos.length - 10} more`);

  console.log('\n⏳ Starting import (this may take a while)...\n');

  let imported = 0;
  let failed = 0;

  for (const photo of photos) {
    try {
      const result = await uploadPhoto(photo);
      if (result) {
        console.log(`✅ ${basename(photo)} → ${result.path}`);
        imported++;
      } else {
        console.log(`⚠️ ${basename(photo)} - upload failed`);
        failed++;
      }
    } catch (e: any) {
      console.error(`❌ ${basename(photo)}: ${e.message}`);
      failed++;
    }

    // Rate limit: 1 upload per second
    await new Promise(r => setTimeout(r, 1000));
  }

  console.log('\n' + '━'.repeat(50));
  console.log(`📊 Import Complete:`);
  console.log(`   ✅ Imported: ${imported}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log('━'.repeat(50));
}

/**
 * Trigger AI labeling for photos without labels
 */
async function triggerAILabeling(): Promise<void> {
  const supabase = getSupabase();

  // Get photos needing labels
  const { data: photos } = await supabase
    .from('photos')
    .select('id, storage_path, filename')
    .is('ai_description', null)
    .limit(10);

  if (!photos?.length) {
    console.log('✅ All photos have AI labels!');
    return;
  }

  console.log(`\n🤖 Triggering AI labeling for ${photos.length} photos...\n`);

  // Call Edge Function for each photo
  for (const photo of photos) {
    try {
      const { data, error } = await supabase.functions.invoke('label-photo', {
        body: { photoId: photo.id },
      });

      if (error) {
        console.error(`❌ ${photo.filename}: ${error.message}`);
      } else {
        console.log(`✅ ${photo.filename}: ${data?.labels?.slice(0, 3).join(', ')}...`);
      }
    } catch (e: any) {
      console.error(`❌ ${photo.filename}: ${e.message}`);
    }

    // Rate limit
    await new Promise(r => setTimeout(r, 500));
  }

  console.log('\n✅ Labeling batch complete. Run again for more photos.');
}

// CLI
async function main() {
  const command = process.argv[2];

  switch (command) {
    case 'sync':
      console.log('🔄 Syncing photos to SurrealDB...');
      const result = await syncToSurreal();
      console.log('\n' + '━'.repeat(50));
      console.log(`📊 Sync Results:`);
      console.log(`   ✅ Synced: ${result.synced}`);
      console.log(`   ❌ Failed: ${result.failed}`);
      console.log(`   ⏭️ Skipped: ${result.skipped}`);
      break;

    case 'status':
      await showStatus();
      break;

    case 'import':
      await importLocalPhotos();
      break;

    case 'label':
      await triggerAILabeling();
      break;

    default:
      console.log(`
Sync Photos: Supabase ↔ SurrealDB
=================================

Commands:
  sync     Sync new Supabase photos to SurrealDB content table
  status   Show sync status and stats
  import   Import local media/ photos to Supabase
  label    Trigger AI labeling for unlabeled photos

Workflow:
  1. npx tsx scripts/sync-supabase-photos.ts import   # Upload local photos
  2. npx tsx scripts/sync-supabase-photos.ts label    # AI labels them
  3. npx tsx scripts/sync-supabase-photos.ts sync     # Sync to SurrealDB
  4. npx tsx scripts/sync-supabase-photos.ts status   # Check progress

Architecture:
  Supabase: File storage + AI labels + User annotations
  SurrealDB: Graph relations (photo→gig→venue, photo→pillar)
      `);
  }
}

main().catch(console.error);
