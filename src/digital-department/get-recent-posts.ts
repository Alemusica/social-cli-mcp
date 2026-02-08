#!/usr/bin/env npx tsx
/**
 * DIGITAL DEPARTMENT: Get Recent Posts
 * Lists recent Instagram posts with their media IDs for monitoring
 */

import { InstagramClient } from '../clients/instagram.js';
import { loadCredentialsToEnv, getFromKeychain } from '../core/credentials.js';

loadCredentialsToEnv();

const LIMIT = parseInt(process.argv[2] || '10');

async function main() {
  console.log('📱 Recent Instagram Posts\n');

  const accessToken = getFromKeychain('INSTAGRAM_ACCESS_TOKEN');
  const businessAccountId = getFromKeychain('INSTAGRAM_BUSINESS_ACCOUNT_ID');
  const facebookPageId = getFromKeychain('FACEBOOK_PAGE_ID');

  if (!accessToken || !businessAccountId) {
    console.error('❌ Missing Instagram credentials in Keychain');
    console.log('   Required: INSTAGRAM_ACCESS_TOKEN, INSTAGRAM_BUSINESS_ACCOUNT_ID');
    process.exit(1);
  }

  const instagram = new InstagramClient({
    accessToken,
    businessAccountId,
    facebookPageId: facebookPageId || '',
  });

  const insights = await instagram.getRecentMediaInsights(LIMIT);

  if (insights.length === 0) {
    console.log('No posts found or client not configured.');
    return;
  }

  console.log('┌────────────────────────────────────────────────────────────────────┐');
  console.log('│  #  │ Type    │ Likes │ Comments │ Reach   │ Media ID               │');
  console.log('├────────────────────────────────────────────────────────────────────┤');

  for (let i = 0; i < insights.length; i++) {
    const post = insights[i];
    const typeShort = (post.mediaType || 'UNK').substring(0, 7).padEnd(7);
    const likes = (post.likes || 0).toString().padStart(5);
    const comments = (post.comments || 0).toString().padStart(8);
    const reach = (post.reach || 0).toString().padStart(7);
    const id = post.mediaId.substring(0, 22);

    console.log(`│ ${(i + 1).toString().padStart(2)} │ ${typeShort} │ ${likes} │ ${comments} │ ${reach} │ ${id} │`);
  }

  console.log('└────────────────────────────────────────────────────────────────────┘');

  console.log('\n📋 To monitor a post:');
  console.log('   npx tsx src/digital-department/monitor-post.ts <media_id>');

  console.log('\n📋 Full media IDs for copy-paste:');
  for (let i = 0; i < Math.min(3, insights.length); i++) {
    console.log(`   ${i + 1}. ${insights[i].mediaId}`);
  }
}

main().catch(console.error);
