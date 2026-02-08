#!/usr/bin/env npx tsx
import { TwitterClient } from '../src/clients/twitter.js';
import { loadConfig } from '../src/utils/config.js';

async function main() {
  const config = loadConfig();
  const twitter = new TwitterClient(config.twitter);

  const text = `8 hours. One deadline. Zero external tools.

Built an AI startup scouting system in Google Apps Script.

Custom scraper, Groq free tier with guardrails, TOON for token management, LangGraph-style agent orchestration.

All in a Google Sheet.

After 8 hours of AI-enhanced coding... I still sketch on paper first.

Do you?`;

  console.log('Posting tweet with media...');

  const result = await twitter.post({
    text,
    mediaUrls: ['/Users/alessioivoycazzaniga/Projects/social-cli-mcp/content/twitter-posts/IMG_0540.jpg']
  });

  if (result.success) {
    console.log('✅ Main tweet:', result.url);

    // Post reply with tags and repo
    console.log('\nPosting reply with tags...');
    const reply = await twitter.post({
      text: `@jschopplich TOON saved me on token efficiency with Groq's free tier limits
@LangChainAI borrowed the graph node concepts

Repo: https://github.com/Alemusica/ai-startup-scouting/

#buildinpublic #ai #googleappsscript`,
      replyToId: result.tweetId
    });

    console.log(reply.success ? '✅ Reply: ' + reply.url : '❌ Reply failed: ' + reply.error);
  } else {
    console.error('❌ Failed:', result.error);
  }
}

main();
