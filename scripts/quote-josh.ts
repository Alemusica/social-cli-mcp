/**
 * Quote tweet Josh Puckett's post with different angle
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

  // Quote with validation angle - shows the idea is hot, positions jsOM as the solution
  // Include demo link and reference to video tweet
  const quoteText = `"The experience of designing and refining with [AI agents] sucks"

@joshpuckett nailed the problem.

Been building the solution:
jsOM - visual canvas → LLM-readable spec

Demo: jsom-canvas.vercel.app
Video: x.com/FluturArt/status/2014096740547232106

Open source: github.com/Alemusica/jsom`;

  console.log('📤 Posting quote tweet...');
  console.log('---');
  console.log(quoteText);
  console.log('---');

  try {
    const result = await client.v2.tweet(quoteText, {
      quote_tweet_id: joshTweetId
    });

    console.log('\n✅ Quote tweet posted!');
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
