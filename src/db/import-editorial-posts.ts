#!/usr/bin/env npx tsx
/**
 * Import editorial posts from JSON to SurrealDB post_draft table
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { getDb, closeDb } from './client.js';
import { createPostDraft } from './queries/posts.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

interface EditorialPost {
  id: number;
  title: string;
  type: string;
  slides?: number;
  priority: string;
  target_audience: string[];
  photos_needed: { file: string; description: string; slide?: number }[];
  caption: string;
  hashtags: string[];
  best_time: string;
  story_context?: object;
  action_required?: string;
  alternative_photo?: object;
}

async function main() {
  console.log('📦 Importing editorial posts to SurrealDB...\n');

  // Load editorial plan
  const planPath = join(__dirname, '..', '..', 'content', 'instagram-posts-ready.json');
  const planData = JSON.parse(readFileSync(planPath, 'utf-8'));

  // Connect to DB
  await getDb();

  const allPosts: EditorialPost[] = [
    ...(planData.posts || []),
    ...(planData.future_posts || []),
  ];

  console.log(`Found ${allPosts.length} posts to import\n`);

  let imported = 0;
  let skipped = 0;

  for (const post of allPosts) {
    try {
      // Convert photos to media_files format
      const mediaFiles = (post.photos_needed || []).map((photo, idx) => ({
        path: photo.file,
        order: photo.slide || idx + 1,
        description: photo.description,
      }));

      // Determine status based on content
      let status: 'draft' | 'ready' = 'ready';
      let privacyNotes: string | undefined;

      // Check for privacy concerns
      if (post.photos_needed?.some(p =>
        p.description?.toLowerCase().includes('blur') ||
        p.description?.toLowerCase().includes('privacy') ||
        p.description?.toLowerCase().includes('gdpr')
      )) {
        status = 'draft';
        privacyNotes = 'Contains photos requiring face blur (GDPR compliance)';
      }

      // Check for action required
      if (post.action_required) {
        status = 'draft';
        privacyNotes = (privacyNotes ? privacyNotes + '. ' : '') + post.action_required;
      }

      // Create post draft
      const id = await createPostDraft({
        title: post.title,
        platform: 'instagram',
        post_type: post.type as any,
        caption: post.caption,
        hashtags: post.hashtags.map(h => h.replace(/^#/, '')),
        media_files: mediaFiles,
        best_time: post.best_time,
        status,
        priority: post.priority as any,
        target_audience: post.target_audience,
        story_context: post.story_context,
        privacy_notes: privacyNotes,
      });

      console.log(`✅ Imported: ${post.title} (${status}) → ${id}`);
      imported++;
    } catch (error: any) {
      console.error(`❌ Failed to import "${post.title}": ${error.message}`);
      skipped++;
    }
  }

  console.log(`\n${'═'.repeat(50)}`);
  console.log(`📊 Import complete: ${imported} imported, ${skipped} skipped`);

  // Verify
  const db = await getDb();
  const result = await db.query('SELECT id, title, status, priority FROM post_draft ORDER BY priority DESC');
  console.log('\n📋 Posts in database:');
  for (const post of (result[0] as any[]) || []) {
    const statusIcon = post.status === 'ready' ? '✅' : '⚠️';
    console.log(`   ${statusIcon} [${post.priority}] ${post.title} (${post.status})`);
  }

  await closeDb();
}

main().catch(console.error);
