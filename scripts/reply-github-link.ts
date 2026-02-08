#!/usr/bin/env npx tsx
/**
 * Reply to jsOM tweets with GitHub link to encourage stars
 */
import { TwitterClient } from '../src/clients/twitter.js';
import { loadConfig } from '../src/utils/config.js';

const GITHUB_REPLIES = [
  `⭐ Star on GitHub if this helps your workflow:
https://github.com/alemusica/jsom

100% open source. MIT licensed.
PRs welcome!`,

  `🔗 Full source code:
https://github.com/alemusica/jsom

Star ⭐ = motivation to ship faster
Issue = feature you need

Building this in public.`,

  `Want to try it yourself?

GitHub: https://github.com/alemusica/jsom

⭐ Stars help more designers discover it
🍴 Fork to customize for your workflow`,
];

async function main() {
  const config = loadConfig();
  const twitter = new TwitterClient(config.twitter);

  const command = process.argv[2];

  if (command === 'list') {
    // List jsOM tweets that could use a GitHub reply
    const result = await twitter.getMyRecentTweets(30);
    const jsomTweets = result.tweets?.filter(t =>
      t.text.toLowerCase().includes('jsom') &&
      t.text.indexOf('RT ') !== 0
    ) || [];

    console.log('jsOM tweets:\n');
    jsomTweets.forEach(t => {
      const hasGithub = t.text.includes('github.com/alemusica/jsom');
      console.log(`ID: ${t.id} ${hasGithub ? '✅ has GitHub' : '❌ no GitHub link'}`);
      console.log(`[${t.metrics?.likes || 0}❤️] ${t.text.substring(0, 60)}...`);
      console.log('---');
    });
    return;
  }

  if (command === 'reply') {
    const tweetId = process.argv[3];
    const replyIndex = parseInt(process.argv[4] || '0');

    if (!tweetId) {
      console.log('Usage: npx tsx scripts/reply-github-link.ts reply <tweet_id> [reply_variant 0-2]');
      return;
    }

    const replyText = GITHUB_REPLIES[replyIndex % GITHUB_REPLIES.length];
    console.log('Posting reply to', tweetId);
    console.log('Text:', replyText);

    const result = await twitter.post({
      text: replyText,
      replyToId: tweetId
    });

    if (result.success) {
      console.log('✅ Reply posted:', result.url);
    } else {
      console.log('❌ Failed:', result.error);
    }
    return;
  }

  if (command === 'batch') {
    // Reply to multiple tweets
    const result = await twitter.getMyRecentTweets(30);
    const jsomTweets = result.tweets?.filter(t =>
      t.text.toLowerCase().includes('jsom') &&
      t.text.indexOf('RT ') !== 0 &&
      !t.text.includes('github.com/alemusica/jsom') &&
      (t.metrics?.likes || 0) > 0 // Only reply to tweets with engagement
    ) || [];

    if (jsomTweets.length === 0) {
      console.log('No jsOM tweets without GitHub link found (with engagement)');
      return;
    }

    console.log(`Found ${jsomTweets.length} tweets to reply to:\n`);

    for (let i = 0; i < jsomTweets.length; i++) {
      const tweet = jsomTweets[i];
      const replyText = GITHUB_REPLIES[i % GITHUB_REPLIES.length];

      console.log(`Replying to: ${tweet.text.substring(0, 50)}...`);

      const replyResult = await twitter.post({
        text: replyText,
        replyToId: tweet.id
      });

      if (replyResult.success) {
        console.log('✅ Posted:', replyResult.url);
      } else {
        console.log('❌ Failed:', replyResult.error);
      }

      // Wait 2 seconds between replies
      await new Promise(r => setTimeout(r, 2000));
    }
    return;
  }

  console.log(`Usage:
  npx tsx scripts/reply-github-link.ts list          # List jsOM tweets
  npx tsx scripts/reply-github-link.ts reply <id>    # Reply to specific tweet
  npx tsx scripts/reply-github-link.ts batch         # Reply to all engaged tweets`);
}

main().catch(console.error);
