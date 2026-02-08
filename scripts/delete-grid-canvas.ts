#!/usr/bin/env node
/**
 * Delete Grid Canvas
 *
 * Deletes all posts from an expired grid canvas via Instagram Graph API.
 *
 * Usage:
 *   npx tsx scripts/delete-grid-canvas.ts <grid-name>
 *
 * Example:
 *   npx tsx scripts/delete-grid-canvas.ts grid-canvas-1
 *
 * NOTE: This DELETES posts permanently. If you want to archive instead,
 *       do it manually via Instagram app (API doesn't support archiving).
 */

import fs from 'fs/promises';
import path from 'path';
import { getInstagramClient } from '../src/clients/instagram.js';
import { sendTelegramMessage } from '../src/telegram-bot.js';

async function deleteGridCanvas(gridName: string): Promise<void> {
  console.log(`\n🗑️  Deleting Grid Canvas: ${gridName}`);

  // Load tracking info
  const trackingPath = path.join(process.cwd(), 'content', gridName, 'grid-tracking.json');

  let tracking: any;
  try {
    tracking = JSON.parse(await fs.readFile(trackingPath, 'utf-8'));
  } catch (err) {
    console.error(`❌ No tracking file found: ${trackingPath}`);
    console.error('Make sure the grid was posted via grid-orchestrator.ts');
    process.exit(1);
  }

  const { postedIds, postedAt, expiresAt } = tracking;

  console.log(`📸 Posts to delete: ${postedIds.length}`);
  console.log(`📅 Posted: ${new Date(postedAt).toLocaleString()}`);
  console.log(`⏱️  Expires: ${new Date(expiresAt).toLocaleString()}`);

  // Confirm deletion
  const now = new Date();
  const expired = new Date(expiresAt);

  if (now < expired) {
    console.warn(`\n⚠️  WARNING: This grid hasn't expired yet!`);
    console.warn(`Current time: ${now.toLocaleString()}`);
    console.warn(`Expiry time: ${expired.toLocaleString()}`);
    console.warn(`\nIf you want to delete anyway, pass --force flag`);

    if (!process.argv.includes('--force')) {
      console.log('\n❌ Deletion cancelled.');
      process.exit(0);
    }
  }

  console.log(`\n⚠️  About to DELETE ${postedIds.length} posts permanently!`);
  console.log(`This action CANNOT be undone.`);
  console.log(`\nIf you want to ARCHIVE instead, do it manually via Instagram app.`);
  console.log(`\nPress Ctrl+C to cancel, or wait 5 seconds to proceed...`);

  await new Promise(resolve => setTimeout(resolve, 5000));

  const instagram = getInstagramClient();
  const deleted: string[] = [];
  const failed: string[] = [];

  for (let i = 0; i < postedIds.length; i++) {
    const postId = postedIds[i];
    console.log(`\n[${i + 1}/${postedIds.length}] Deleting ${postId}...`);

    try {
      await instagram.deletePost(postId);
      deleted.push(postId);
      console.log(`✅ Deleted`);

      // Rate limit
      if (i < postedIds.length - 1) {
        console.log('⏳ Waiting 2s...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    } catch (err: any) {
      console.error(`❌ Failed:`, err.message);
      failed.push(postId);
    }
  }

  // Update tracking
  tracking.deletedAt = new Date().toISOString();
  tracking.deletedIds = deleted;
  tracking.failedIds = failed;
  await fs.writeFile(trackingPath, JSON.stringify(tracking, null, 2));

  // Notify
  await sendTelegramMessage(
    `🗑️ Grid Canvas Deleted\n\n` +
    `📁 ${gridName}\n` +
    `✅ Deleted: ${deleted.length}\n` +
    `❌ Failed: ${failed.length}\n\n` +
    `Your feed is clean! 🎉`
  );

  console.log(`\n✨ Grid Canvas Deleted!`);
  console.log(`✅ Deleted: ${deleted.length}`);
  console.log(`❌ Failed: ${failed.length}`);

  if (failed.length > 0) {
    console.log(`\n⚠️  Failed posts:`);
    failed.forEach(id => console.log(`  - ${id}`));
    console.log(`\nYou may need to delete these manually via Instagram app.`);
  }
}

// CLI
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);

  if (args.length < 1) {
    console.error('Usage: npx tsx scripts/delete-grid-canvas.ts <grid-name> [--force]');
    console.error('\nExample: npx tsx scripts/delete-grid-canvas.ts grid-canvas-1');
    console.error('\nNOTE: Use --force to delete before expiry date');
    process.exit(1);
  }

  const gridName = args[0];

  deleteGridCanvas(gridName)
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('❌ Error:', err);
      process.exit(1);
    });
}

export { deleteGridCanvas };
