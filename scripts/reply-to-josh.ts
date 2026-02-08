/**
 * Strategic reply to Josh Puckett's viral tweet about design tools
 */

import { TwitterApi } from 'twitter-api-v2';
import { execSync } from 'child_process';

function getKey(name: string): string {
  return execSync(`security find-generic-password -a "${name}" -s "social-cli-mcp" -w 2>/dev/null`, { encoding: 'utf8' }).trim();
}

async function main() {
  const client = new TwitterApi({
    appKey: getKey('TWITTER_API_KEY'),
    appSecret: getKey('TWITTER_API_SECRET'),
    accessToken: getKey('TWITTER_ACCESS_TOKEN'),
    accessSecret: getKey('TWITTER_ACCESS_SECRET'),
  });

  // Josh's viral tweet ID
  const joshTweetId = '2009816811852976280';

  // Concise, respectful reply with link
  const replyText = `This resonates hard. Built jsOM to solve the same pain:

Visual canvas → LLM-readable spec → agent builds it.

No screenshots. No guessing. Open source.

github.com/Alemusica/jsom`;

  console.log('📤 Posting reply to @joshpuckett...');
  console.log('---');
  console.log(replyText);
  console.log('---');

  try {
    const result = await client.v2.tweet(replyText, {
      reply: { in_reply_to_tweet_id: joshTweetId }
    });

    console.log('\n✅ Reply posted successfully!');
    console.log(`🔗 https://twitter.com/FluturArt/status/${result.data.id}`);
    return result.data.id;
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    if (error.data) {
      console.error('Details:', JSON.stringify(error.data, null, 2));
    }
    throw error;
  }
}

main();
