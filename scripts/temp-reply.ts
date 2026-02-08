#!/usr/bin/env npx tsx
import { TwitterClient } from '../src/clients/twitter.js';
import { loadConfig } from '../src/utils/config.js';

async function main() {
  const config = loadConfig();
  const twitter = new TwitterClient(config.twitter);

  const result = await twitter.post({
    text: `jsOM - the design tool that speaks LLM

https://github.com/AleMusica/jsom

⭐ if you've felt this frustration`,
    replyToId: '2014298865738887666'
  });

  console.log(result.success ? '✅ Reply posted: ' + result.url : '❌ ' + result.error);
}

main();
