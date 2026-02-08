import { TwitterApi } from 'twitter-api-v2';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function getKey(name: string): Promise<string> {
  const { stdout } = await execAsync(`security find-generic-password -a "${name}" -s "social-cli-mcp" -w 2>/dev/null`);
  return stdout.trim();
}

async function main() {
  const client = new TwitterApi({
    appKey: await getKey('TWITTER_API_KEY'),
    appSecret: await getKey('TWITTER_API_SECRET'),
    accessToken: await getKey('TWITTER_ACCESS_TOKEN'),
    accessSecret: await getKey('TWITTER_ACCESS_SECRET'),
  });

  const me = await client.v2.me();
  const myUsername = me.data.username;
  console.log('Checking replies to @' + myUsername + '...\n');

  // Get mentions (replies to us)
  const mentions = await client.v2.userMentionTimeline(me.data.id, {
    max_results: 25,
    'tweet.fields': ['created_at', 'author_id', 'in_reply_to_user_id', 'conversation_id', 'public_metrics', 'referenced_tweets'],
    'user.fields': ['username', 'name', 'public_metrics', 'description'],
    expansions: ['author_id']
  });

  if (mentions.data?.data) {
    console.log('📬 RECENT MENTIONS/REPLIES:\n');

    for (const tweet of mentions.data.data) {
      const author = mentions.includes?.users?.find(u => u.id === tweet.author_id);
      if (author && author.username !== myUsername) {
        console.log('---');
        console.log('From: @' + author.username + ' (' + (author.public_metrics?.followers_count || 0) + ' followers)');
        console.log('Bio: ' + (author.description || 'N/A').substring(0, 100));
        console.log('Tweet ID: ' + tweet.id);
        console.log('Time: ' + tweet.created_at);
        console.log('Text: ' + tweet.text);
        console.log('');
      }
    }
  } else {
    console.log('No mentions found');
  }

  // Check our recent tweets engagement
  console.log('\n📊 OUR RECENT TWEETS PERFORMANCE:\n');

  const ourTweets = await client.v2.userTimeline(me.data.id, {
    max_results: 10,
    'tweet.fields': ['public_metrics', 'created_at']
  });

  if (ourTweets.data?.data) {
    for (const tweet of ourTweets.data.data.slice(0, 10)) {
      const m = tweet.public_metrics;
      const hasReplies = (m?.reply_count || 0) > 0;
      console.log('ID: ' + tweet.id + (hasReplies ? ' ⚠️ HAS REPLIES' : ''));
      console.log('  ' + tweet.text.substring(0, 100) + '...');
      console.log('  👍 ' + (m?.like_count || 0) + ' | 🔁 ' + (m?.retweet_count || 0) + ' | 💬 ' + (m?.reply_count || 0) + ' | 👁 ' + (m?.impression_count || 0));
      console.log('');
    }
  }
}

main();
