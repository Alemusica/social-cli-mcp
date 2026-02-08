#!/usr/bin/env npx tsx
/**
 * Post tweet with media (images/video)
 *
 * Usage:
 *   npx tsx scripts/post-with-media.ts "Tweet text" /path/to/image.png
 *   npx tsx scripts/post-with-media.ts "Tweet text" /path/to/image1.png /path/to/image2.png
 *   npx tsx scripts/post-with-media.ts test /path/to/image.png   # Test upload only
 */

import { TwitterClient } from '../src/clients/twitter.js';
import { loadConfig } from '../src/utils/config.js';
import { existsSync } from 'fs';

async function main() {
  const config = loadConfig();
  const twitter = new TwitterClient(config.twitter);

  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.log(`Usage:
  npx tsx scripts/post-with-media.ts "Tweet text" /path/to/image.png
  npx tsx scripts/post-with-media.ts "Tweet text" image1.png image2.png
  npx tsx scripts/post-with-media.ts test image.png   # Test upload only

Supported formats: PNG, JPG, GIF, MP4, MOV
Max 4 images or 1 video per tweet`);
    process.exit(1);
  }

  const text = args[0];
  const mediaFiles = args.slice(1);

  // Validate files exist
  for (const file of mediaFiles) {
    if (!existsSync(file)) {
      console.error(`❌ File not found: ${file}`);
      process.exit(1);
    }
  }

  console.log(`📸 Uploading ${mediaFiles.length} media file(s)...`);
  mediaFiles.forEach(f => console.log(`   • ${f}`));

  if (text === 'test') {
    // Test mode - just upload, don't post
    console.log('\n🧪 Test mode - uploading without posting...');

    try {
      // Access internal client for test
      const client = (twitter as any).client;
      for (const file of mediaFiles) {
        console.log(`Uploading ${file}...`);
        const mediaId = await client.v1.uploadMedia(file);
        console.log(`✅ Upload successful! Media ID: ${mediaId}`);
      }
      console.log('\n✅ All uploads successful! Media upload is working.');
    } catch (error: any) {
      console.error(`❌ Upload failed: ${error.message}`);
      process.exit(1);
    }
    return;
  }

  // Post with media
  console.log(`\n📝 Posting: "${text.substring(0, 50)}..."`);

  const result = await twitter.post({
    text,
    mediaUrls: mediaFiles
  });

  if (result.success) {
    console.log(`\n✅ Posted with media!`);
    console.log(`🔗 ${result.url}`);
  } else {
    console.error(`\n❌ Failed: ${result.error}`);
    process.exit(1);
  }
}

main().catch(console.error);
