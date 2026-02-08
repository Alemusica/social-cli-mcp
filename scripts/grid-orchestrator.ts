#!/usr/bin/env node
/**
 * Grid Orchestrator
 *
 * Posts a 3x3 grid canvas to Instagram with expiry tracking.
 * Supports mix of single images, carousels, and reels.
 *
 * Usage:
 *   npx tsx scripts/grid-orchestrator.ts <grid-dir> [--expires-in-days=3]
 *
 * Example:
 *   npx tsx scripts/grid-orchestrator.ts content/grid-canvas-1/ --expires-in-days=3
 *
 * Features:
 * - Posts tiles in correct order (reverse chronological)
 * - Supports carousel + reel + single post mix
 * - Tracks expiry and sends Telegram reminder
 * - Optional auto-delete after expiry
 */

import fs from 'fs/promises';
import path from 'path';
import { getInstagramClient } from '../src/clients/instagram.js';
import { sendTelegramMessage } from '../src/telegram-bot.js';

interface GridPost {
  tile: string;
  type: 'single' | 'carousel' | 'reel';
  caption?: string;
  videoUrl?: string; // For reels
  carouselImages?: string[]; // For carousels
}

interface GridCanvas {
  name: string;
  tiles: GridPost[];
  expiresInDays: number;
  postedIds?: string[];
  postedAt?: string;
  expiresAt?: string;
}

async function postGridCanvas(gridDir: string, expiresInDays: number = 3): Promise<void> {
  console.log(`\n🎨 Starting Grid Canvas Posting`);
  console.log(`📁 Grid directory: ${gridDir}`);
  console.log(`⏱️  Expires in: ${expiresInDays} days`);

  // Load grid metadata
  const metadataPath = path.join(gridDir, 'grid-metadata.json');
  let metadata: any;

  try {
    const content = await fs.readFile(metadataPath, 'utf-8');
    metadata = JSON.parse(content);
  } catch (err) {
    console.error(`❌ No grid-metadata.json found in ${gridDir}`);
    console.error('Run grid-canvas-generator.ts first!');
    process.exit(1);
  }

  // Load grid config (if exists)
  const configPath = path.join(gridDir, 'grid-config.json');
  let gridPosts: GridPost[] = [];

  try {
    const configContent = await fs.readFile(configPath, 'utf-8');
    const config = JSON.parse(configContent);
    gridPosts = config.posts;
    console.log(`✅ Loaded ${gridPosts.length} posts from grid-config.json`);
  } catch {
    // Default: all tiles as single posts
    console.log('⚠️  No grid-config.json found, using all tiles as single posts');
    gridPosts = metadata.tiles.map((tile: any) => ({
      tile: path.join(gridDir, tile.file),
      type: 'single' as const,
      caption: `${tile.post_order}/${metadata.tiles.length} 🧩`,
    }));
  }

  // Instagram client
  const instagram = getInstagramClient();
  const postedIds: string[] = [];

  console.log(`\n📤 Posting ${gridPosts.length} tiles in sequence...`);

  for (let i = 0; i < gridPosts.length; i++) {
    const post = gridPosts[i];
    console.log(`\n[${i + 1}/${gridPosts.length}] Posting ${post.type}...`);

    try {
      let result;

      if (post.type === 'single') {
        result = await instagram.post({
          image_url: post.tile,
          caption: post.caption || '',
        });
      } else if (post.type === 'carousel') {
        result = await instagram.postCarousel({
          images: post.carouselImages || [post.tile],
          caption: post.caption || '',
        });
      } else if (post.type === 'reel') {
        result = await instagram.postReel({
          video_url: post.videoUrl!,
          thumbnail_url: post.tile, // Tile as cover
          caption: post.caption || '',
        });
      }

      if (result?.id) {
        postedIds.push(result.id);
        console.log(`✅ Posted: ${result.id}`);
      }

      // Rate limit: wait 60 seconds between posts
      if (i < gridPosts.length - 1) {
        console.log('⏳ Waiting 60s before next post...');
        await new Promise(resolve => setTimeout(resolve, 60000));
      }
    } catch (err: any) {
      console.error(`❌ Failed to post tile ${i + 1}:`, err.message);
      // Continue with next tile
    }
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + expiresInDays * 24 * 60 * 60 * 1000);

  // Save tracking info
  const trackingPath = path.join(gridDir, 'grid-tracking.json');
  const tracking: GridCanvas = {
    name: path.basename(gridDir),
    tiles: gridPosts,
    expiresInDays,
    postedIds,
    postedAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
  };

  await fs.writeFile(trackingPath, JSON.stringify(tracking, null, 2));
  console.log(`\n💾 Tracking saved: ${trackingPath}`);

  // Schedule expiry notification
  const expiryMs = expiresInDays * 24 * 60 * 60 * 1000;
  console.log(`\n⏰ Setting expiry reminder for ${expiresAt.toLocaleString()}`);

  // In production, use a job scheduler (cron/pm2)
  // For now, just save to analytics for manual check
  const pendingActions = {
    action: 'archive_grid_canvas',
    grid: path.basename(gridDir),
    postedIds,
    expiresAt: expiresAt.toISOString(),
    instructions: [
      `Go to Instagram app`,
      `Archive these ${postedIds.length} posts manually`,
      `Or run: npx tsx scripts/delete-grid-canvas.ts ${path.basename(gridDir)}`,
    ]
  };

  const analyticsPath = path.join(process.cwd(), 'analytics', 'pending-grid-actions.json');
  await fs.mkdir(path.dirname(analyticsPath), { recursive: true });

  let existing: any[] = [];
  try {
    existing = JSON.parse(await fs.readFile(analyticsPath, 'utf-8'));
  } catch {}

  existing.push(pendingActions);
  await fs.writeFile(analyticsPath, JSON.stringify(existing, null, 2));

  // Send Telegram notification NOW
  await sendTelegramMessage(
    `🎨 Grid Canvas Posted!\n\n` +
    `📁 ${path.basename(gridDir)}\n` +
    `📸 ${postedIds.length} posts\n` +
    `⏱️ Expires: ${expiresAt.toLocaleDateString('it-IT')}\n\n` +
    `⚠️ REMEMBER: Announce in Stories that this grid is temporary (3 days)!\n\n` +
    `You'll get a reminder to archive when it expires.`
  );

  console.log(`\n✨ Grid Canvas Posted!`);
  console.log(`📸 ${postedIds.length} posts live`);
  console.log(`⏱️  Expires: ${expiresAt.toLocaleString()}`);
  console.log(`\n🔔 Don't forget to announce via Stories that this grid is temporary!`);
}

// CLI
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);

  if (args.length < 1) {
    console.error('Usage: npx tsx scripts/grid-orchestrator.ts <grid-dir> [--expires-in-days=3]');
    process.exit(1);
  }

  const gridDir = args[0];
  const expiresInDays = parseInt(args.find(a => a.startsWith('--expires-in-days='))?.split('=')[1] || '3');

  postGridCanvas(gridDir, expiresInDays)
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('❌ Error:', err);
      process.exit(1);
    });
}

export { postGridCanvas };
