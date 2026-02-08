#!/usr/bin/env npx tsx
import { TwitterClient } from '../src/clients/twitter.js';
import { loadConfig } from '../src/utils/config.js';

async function main() {
  const config = loadConfig();
  const twitter = new TwitterClient(config.twitter);

  // Reply 1: Sunday coding tweet
  console.log('Posting reply to "So, do you code on Sunday?"...');
  const reply1 = await twitter.post({
    text: 'Sunday builds hit different. Just shipped a feature for jsOM at 2am. The quiet hours are where the real work happens.',
    replyToId: '2015349606771830986'
  });
  console.log(reply1.success ? '✅ Reply 1: ' + reply1.url : '❌ ' + reply1.error);

  // Reply 2: Niche building tweet
  console.log('\nPosting reply to "You\'re building for everyone..."...');
  const reply2 = await twitter.post({
    text: "This. jsOM isn't for everyone—it's for designers who want pixel-perfect specs that LLMs actually understand. Framework-agnostic, 11 export targets, but built for ONE use case: design → AI.",
    replyToId: '2015239308383543777'
  });
  console.log(reply2.success ? '✅ Reply 2: ' + reply2.url : '❌ ' + reply2.error);
}

main();
