#!/usr/bin/env npx tsx
/**
 * AI Content Analysis with Claude Vision
 * Analyzes photos to extract: categories, tags, mood, quality score
 * Updates SurrealDB content table with rich metadata
 */

import Anthropic from '@anthropic-ai/sdk';
import Surreal from 'surrealdb';
import * as fs from 'fs';
import * as path from 'path';
import { loadSecretsToEnv } from '../keychain.js';

loadSecretsToEnv();

const BATCH_SIZE = parseInt(process.argv.find(a => a.startsWith('--batch='))?.split('=')[1] || '10');
const DRY_RUN = process.argv.includes('--dry-run');
const FORCE = process.argv.includes('--force');

interface ContentRecord {
  id: string;
  file_path: string;
  file_name: string;
  location: string | null;
  category: string | null;
  tags: string[];
  taken_at: string | null;
}

interface VisionAnalysis {
  category: string;           // landscape, busking, portrait, travel, studio, audience, sunset, etc.
  tags: string[];             // scene elements: beach, crowd, instrument, ravvast, golden_hour
  mood: string;               // serene, energetic, intimate, majestic
  quality_score: number;      // 1-10 for Instagram potential
  suggested_caption_hook: string;  // hook for caption
  best_for: string[];         // reel, carousel, story, feed
}

const VISION_PROMPT = `Analyze this image for a musician/busker's Instagram content strategy.

The artist is Flutur - a multi-instrumentalist (Rav Vast, handpan, guitar) who travels and busks in scenic locations.

Return JSON only:
{
  "category": "one of: busking, landscape, portrait, travel, sunset, audience, behind_scenes, instrument_closeup, studio, nature, street_scene",
  "tags": ["array", "of", "descriptive", "tags", "max 8"],
  "mood": "one word: serene, energetic, intimate, majestic, contemplative, joyful, mysterious",
  "quality_score": 1-10 (Instagram visual appeal, composition, lighting),
  "suggested_caption_hook": "short engaging opening line",
  "best_for": ["reel", "carousel", "story", "feed"] // which format suits this image
}

Focus on: visual composition, Instagram appeal, storytelling potential, brand fit for ambient/world musician.`;

async function analyzeImage(anthropic: Anthropic, imagePath: string): Promise<VisionAnalysis | null> {
  // Read image and convert to base64
  const imageBuffer = fs.readFileSync(imagePath);
  const base64Image = imageBuffer.toString('base64');

  // Determine media type
  const ext = path.extname(imagePath).toLowerCase();
  let mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' = 'image/jpeg';
  if (ext === '.png') mediaType = 'image/png';
  else if (ext === '.gif') mediaType = 'image/gif';
  else if (ext === '.webp') mediaType = 'image/webp';

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType,
                data: base64Image,
              },
            },
            {
              type: 'text',
              text: VISION_PROMPT,
            },
          ],
        },
      ],
    });

    // Parse JSON from response
    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]) as VisionAnalysis;
    }
    return null;
  } catch (error: any) {
    console.error(`  Vision API error: ${error.message}`);
    return null;
  }
}

async function main() {
  console.log(`🔍 AI Content Analysis ${DRY_RUN ? '(DRY RUN)' : ''}`);
  console.log(`   Batch size: ${BATCH_SIZE}\n`);

  // Initialize Anthropic
  const anthropic = new Anthropic();

  // Connect to SurrealDB
  const db = new Surreal();
  await db.connect('http://127.0.0.1:8000');
  await db.signin({ username: 'root', password: 'root' });
  await db.use({ namespace: 'social', database: 'analytics' });

  // Get photos that need analysis (no category set, or force all)
  const query = FORCE
    ? `SELECT * FROM content WHERE type = 'image' LIMIT ${BATCH_SIZE}`
    : `SELECT * FROM content WHERE type = 'image' AND (category IS NONE OR array::len(tags) = 0) LIMIT ${BATCH_SIZE}`;

  const result = await db.query<[ContentRecord[]]>(query);
  const photos = result[0] || [];

  console.log(`Found ${photos.length} photos to analyze\n`);

  if (photos.length === 0) {
    console.log('All photos already analyzed. Use --force to re-analyze.');
    await db.close();
    return;
  }

  let analyzed = 0;
  let errors = 0;

  for (const photo of photos) {
    const filePath = photo.file_path;
    const ext = path.extname(filePath).toLowerCase();

    // Skip non-supported formats (HEIC needs conversion)
    if (['.heic', '.dng', '.raw'].includes(ext)) {
      console.log(`⏭️  Skipping ${photo.file_name} (${ext} not supported by Vision API)`);
      continue;
    }

    // Check file exists
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  File not found: ${photo.file_name}`);
      errors++;
      continue;
    }

    // Check file size (Vision API limit ~20MB)
    const stats = fs.statSync(filePath);
    if (stats.size > 20 * 1024 * 1024) {
      console.log(`⚠️  File too large: ${photo.file_name}`);
      continue;
    }

    console.log(`🔍 Analyzing: ${photo.file_name}`);

    if (DRY_RUN) {
      console.log(`   [DRY RUN] Would analyze with Claude Vision\n`);
      analyzed++;
      continue;
    }

    const analysis = await analyzeImage(anthropic, filePath);

    if (analysis) {
      // Update database
      await db.query(`
        UPDATE $id SET
          category = $category,
          tags = $tags,
          mood = $mood,
          quality_score = $quality,
          suggested_caption = $caption,
          best_for = $bestFor,
          analyzed_at = time::now()
      `, {
        id: photo.id,
        category: analysis.category,
        tags: analysis.tags,
        mood: analysis.mood,
        quality: analysis.quality_score,
        caption: analysis.suggested_caption_hook,
        bestFor: analysis.best_for,
      });

      console.log(`   ✅ ${analysis.category} | ${analysis.mood} | score: ${analysis.quality_score}`);
      console.log(`      Tags: ${analysis.tags.join(', ')}`);
      console.log(`      Best for: ${analysis.best_for.join(', ')}\n`);
      analyzed++;
    } else {
      console.log(`   ❌ Analysis failed\n`);
      errors++;
    }

    // Rate limiting - be gentle with API
    await new Promise(r => setTimeout(r, 1000));
  }

  console.log(`\n✅ Analyzed ${analyzed} photos (${errors} errors)`);

  // Show category distribution
  const stats = await db.query(`
    SELECT category, count() as count
    FROM content
    WHERE category IS NOT NONE
    GROUP BY category
    ORDER BY count DESC
  `);

  if ((stats[0] as any[])?.length > 0) {
    console.log('\n📊 Category distribution:');
    for (const row of stats[0] as any[]) {
      console.log(`   ${row.category}: ${row.count}`);
    }
  }

  await db.close();
}

main().catch(console.error);
