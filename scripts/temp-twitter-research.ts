/**
 * Temporary script to research Josh Puckett's tweet and my jsOM posts
 */

import { TwitterApi } from 'twitter-api-v2';
import { execSync } from 'child_process';

// Get credentials from Keychain (correct format)
function getKey(name: string): string | null {
  try {
    return execSync(`security find-generic-password -a "${name}" -s "social-cli-mcp" -w 2>/dev/null`, { encoding: 'utf8' }).trim();
  } catch { return null; }
}

async function main() {
  const client = new TwitterApi({
    appKey: getKey('TWITTER_API_KEY')!,
    appSecret: getKey('TWITTER_API_SECRET')!,
    accessToken: getKey('TWITTER_ACCESS_TOKEN')!,
    accessSecret: getKey('TWITTER_ACCESS_SECRET')!,
  });

  // 1. Get Josh's tweet by ID
  const tweetId = '2009816811852976280';
  console.log('=== FETCHING JOSH PUCKETT TWEET ===\n');

  try {
    const tweet = await client.v2.singleTweet(tweetId, {
      'tweet.fields': ['created_at', 'public_metrics', 'text', 'author_id', 'conversation_id'],
      'expansions': ['author_id'],
      'user.fields': ['name', 'username', 'public_metrics', 'description'],
    });
    console.log('Tweet:', JSON.stringify(tweet, null, 2));
  } catch (e: any) {
    console.log('Tweet fetch error:', e.message);
    if (e.data) console.log('Error data:', JSON.stringify(e.data, null, 2));
  }

  // 2. Search Josh's recent tweets
  console.log('\n=== JOSH PUCKETT RECENT TWEETS ===\n');

  try {
    const joshUser = await client.v2.userByUsername('joshpuckett', {
      'user.fields': ['public_metrics', 'description'],
    });
    console.log('Josh Profile:', JSON.stringify(joshUser, null, 2));

    if (joshUser.data) {
      const joshTimeline = await client.v2.userTimeline(joshUser.data.id, {
        max_results: 20,
        'tweet.fields': ['created_at', 'public_metrics', 'text'],
        exclude: ['retweets'],
      });
      console.log('\nRecent tweets:');
      for (const t of joshTimeline.data.data || []) {
        console.log(`\n[${t.created_at}] (♥${t.public_metrics?.like_count || 0} RT${t.public_metrics?.retweet_count || 0})`);
        console.log(t.text.substring(0, 200) + (t.text.length > 200 ? '...' : ''));
        console.log('ID:', t.id);
      }
    }
  } catch (e: any) {
    console.log('Josh timeline error:', e.message);
  }

  // 3. Get my recent tweets to check jsOM mentions
  console.log('\n=== MY RECENT TWEETS (checking jsOM mentions) ===\n');

  try {
    const me = await client.v2.me();
    console.log('My account:', me.data.username);

    const myTimeline = await client.v2.userTimeline(me.data.id, {
      max_results: 50,
      'tweet.fields': ['created_at', 'public_metrics', 'text'],
    });

    const jsomTweets = (myTimeline.data.data || []).filter(t =>
      t.text.toLowerCase().includes('jsom') ||
      t.text.toLowerCase().includes('ui canvas') ||
      t.text.toLowerCase().includes('mcp') ||
      t.text.toLowerCase().includes('design') ||
      t.text.toLowerCase().includes('figma')
    );

    console.log(`Found ${jsomTweets.length} potentially relevant tweets:\n`);
    for (const t of jsomTweets) {
      console.log(`[${t.created_at}] (♥${t.public_metrics?.like_count || 0} RT${t.public_metrics?.retweet_count || 0})`);
      console.log(t.text);
      console.log('---');
    }

    console.log('\n=== ALL MY RECENT TWEETS ===\n');
    for (const t of (myTimeline.data.data || []).slice(0, 10)) {
      console.log(`[${t.created_at}] (♥${t.public_metrics?.like_count || 0})`);
      console.log(t.text.substring(0, 150) + (t.text.length > 150 ? '...' : ''));
      console.log('---');
    }
  } catch (e: any) {
    console.log('My timeline error:', e.message);
  }
}

main().catch(console.error);
