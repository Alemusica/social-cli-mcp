#!/usr/bin/env npx tsx
import { TwitterClient } from '../src/clients/twitter.js';
import { loadConfig } from '../src/utils/config.js';

async function main() {
  const config = loadConfig();
  const twitter = new TwitterClient(config.twitter);

  const text = `jsOM just hit 4 ⭐ on GitHub

And one of them is from @jschopplich - the creator of TOON.

When the person whose work inspired your token optimization strategy stars your repo... that's validation.

Still building. Still learning. Still stacking layers.

https://github.com/alemusica/jsom`;

  console.log('Posting celebration tweet...');
  const result = await twitter.post({ text });

  if (result.success) {
    console.log('✅ Posted:', result.url);
  } else {
    console.error('❌ Failed:', result.error);
  }
}

main();
