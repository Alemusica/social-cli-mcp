#!/usr/bin/env npx tsx
import { TwitterClient } from '../src/clients/twitter.js';
import { loadConfig } from '../src/utils/config.js';

async function findAbletonConsumers() {
  const config = loadConfig();
  const twitter = new TwitterClient(config.twitter);

  // Search for Ableton/looping discussions
  console.log('=== ABLETON/LOOPING CONSUMERS ===\n');

  const result = await twitter.client.v2.search('"live looping" OR "loop pedal" OR "looper station"', {
    max_results: 30,
    expansions: ['author_id'],
    'user.fields': ['public_metrics', 'description'],
    'tweet.fields': ['public_metrics', 'created_at']
  });

  // Access real data from paginator
  const realData = (result as any)._realData;
  const tweets = realData?.data || [];
  const includes = realData?.includes || {};

  if (!tweets.length) {
    console.log('No results found.');
    return;
  }

  const users = new Map();
  includes.users?.forEach((u: any) => users.set(u.id, u));

  const targets: any[] = [];

  for (const tweet of tweets) {
    const user = users.get(tweet.author_id);
    if (!user) continue;

    // Skip if bio mentions coding/dev (we want consumers, not devs)
    const bio = (user.description || '').toLowerCase();
    const isDevLike = bio.includes('developer') || bio.includes('engineer') || bio.includes('coding') || bio.includes('programmer') || bio.includes('software');

    // Want active consumers with some following but not huge accounts
    if (!isDevLike && user.public_metrics.followers_count < 5000 && user.public_metrics.followers_count > 50) {
      targets.push({
        username: user.username,
        followers: user.public_metrics.followers_count,
        bio: user.description?.substring(0, 100) || 'N/A',
        tweet: tweet.text.substring(0, 150),
        likes: tweet.public_metrics?.like_count || 0,
        tweetId: tweet.id
      });
    }
  }

  // Sort by followers (higher = better reach)
  targets.sort((a, b) => b.followers - a.followers);

  // Show top 10
  for (const t of targets.slice(0, 10)) {
    console.log('---');
    console.log(`@${t.username} (${t.followers} followers)`);
    console.log(`Bio: ${t.bio}`);
    console.log(`Tweet: ${t.tweet}`);
    console.log(`Likes: ${t.likes}`);
    console.log(`ID: ${t.tweetId}`);
  }
}

findAbletonConsumers();
