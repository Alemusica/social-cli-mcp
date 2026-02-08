#!/usr/bin/env npx tsx
import { TwitterClient } from '../src/clients/twitter.js';
import { loadConfig } from '../src/utils/config.js';

async function main() {
  const config = loadConfig();
  const twitter = new TwitterClient(config.twitter);
  const result = await twitter.getMyRecentTweets(50);

  if (!result.tweets) {
    console.error('Failed to get tweets');
    return;
  }

  // License drama patterns
  const wrongPatterns = [
    'license',
    'MIT',
    'Source-Available',
    'parasit',
    'should they',
    'ethical',
    'rebrand',
    '127 unique',
    '127 clones',
    'open source ethics',
    'competing products'
  ];

  console.log('🔍 Searching for LICENSE DRAMA tweets...\n');

  const wrongTweets = result.tweets.filter(t =>
    wrongPatterns.some(p => t.text.toLowerCase().includes(p.toLowerCase()))
  );

  if (wrongTweets.length === 0) {
    console.log('✅ No wrong tweets found!');
  } else {
    console.log(`❌ Found ${wrongTweets.length} wrong tweet(s):\n`);
    wrongTweets.forEach(t => {
      console.log('ID:', t.id);
      console.log('Text:', t.text);
      console.log('---');
    });

    console.log('\nTo delete, run:');
    wrongTweets.forEach(t => {
      console.log(`npx tsx scripts/delete-tweets.ts ${t.id}`);
    });
  }
}

main().catch(console.error);
