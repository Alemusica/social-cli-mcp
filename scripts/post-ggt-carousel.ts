#!/usr/bin/env npx tsx
/**
 * Post €30 to GGT carousel to Instagram
 */

import { InstagramClient } from '../src/clients/instagram.js';
import { loadConfig } from '../src/utils/config.js';

const BASE_URL = 'https://raw.githubusercontent.com/Alemusica/social-cli-mcp/main/public/instagram';

const CAROUSEL_IMAGES = [
  `${BASE_URL}/01-cover-selfie-ravvast.jpg`,
  `${BASE_URL}/02-tips-thankyou-note.jpg`,
  `${BASE_URL}/03-busking-rooftop.jpg`,
  `${BASE_URL}/04-live-performance.jpg`,
  `${BASE_URL}/05-acropolis-night.jpg`,
  `${BASE_URL}/06-ggt-stage.png`,
];

const CAPTION = `€30 in my wallet. 8 days of clothes. 4.5 months ahead.

Astypalea, 2021.

They called the police to make me stop.
So I played without amplification.
Played until my hands needed ice.

Then one person believed.

Alexandra, if you're reading this — you changed everything.

What's your "€30 moment"? When you had nothing but kept going anyway?

@taklounge @crystallia.riga thank you for believing in me that day.

#busker #streetmusic #ravvast #flutur #greecegottalent #elladaecheistalento`;

async function main() {
  const config = loadConfig();
  const instagram = new InstagramClient(config.instagram);

  // Test connection
  const connected = await instagram.testConnection();
  if (!connected) {
    console.error('❌ Instagram not connected. Check your credentials.');
    process.exit(1);
  }

  console.log(`\n📸 Posting carousel with ${CAROUSEL_IMAGES.length} images...\n`);
  console.log('Images:');
  CAROUSEL_IMAGES.forEach((url, i) => console.log(`  ${i + 1}. ${url.split('/').pop()}`));
  console.log(`\nCaption preview:\n${CAPTION.substring(0, 100)}...\n`);

  const result = await instagram.post({
    text: CAPTION,
    caption: CAPTION,
    mediaUrls: CAROUSEL_IMAGES,
    postType: 'feed',
  });

  if (result.success) {
    console.log(`\n✅ Carousel posted!`);
    console.log(`🔗 ${result.url}`);
    console.log(`📱 Post ID: ${result.postId}`);
  } else {
    console.error(`\n❌ Failed: ${result.error}`);
    process.exit(1);
  }
}

main().catch(console.error);
