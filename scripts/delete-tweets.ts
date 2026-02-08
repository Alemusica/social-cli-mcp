#!/usr/bin/env npx tsx
import { TwitterClient } from '../src/clients/twitter.js';
import { loadConfig } from '../src/utils/config.js';

async function main() {
  const config = loadConfig();
  const twitter = new TwitterClient(config.twitter);

  const ids = process.argv.slice(2);

  if (ids.length === 0) {
    console.log('Usage: npx tsx scripts/delete-tweets.ts <tweet_id> [tweet_id2] ...');
    process.exit(1);
  }

  for (const id of ids) {
    const result = await twitter.deleteTweet(id);
    console.log(id + ':', result.success ? '✅ Deleted' : '❌ ' + result.error);
  }
}

main().catch(console.error);
