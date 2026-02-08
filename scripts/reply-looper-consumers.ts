#!/usr/bin/env npx tsx
import { TwitterClient } from '../src/clients/twitter.js';
import { loadConfig } from '../src/utils/config.js';

async function main() {
  const config = loadConfig();
  const twitter = new TwitterClient(config.twitter);

  // Follow-up to RePeterRadio with repo link
  console.log('Adding repo link to @RePeterRadio thread...');
  const reply1 = await twitter.post({
    text: 'Here\'s the repo if you want to dig in: https://github.com/Alemusica/looperpedal-learn',
    replyToId: '2015826661363593676'
  });
  console.log(reply1.success ? '✅ ' + reply1.url : '❌ ' + reply1.error);

  // Retry GudfellaMusic with repo link
  console.log('\nRetrying @GudfellaMusic with repo...');
  const reply2 = await twitter.post({
    text: 'I do live looping + vocals too. Built a VST that starts free like Boss RC but auto-syncs with Ableton. Repo: https://github.com/Alemusica/looperpedal-learn',
    replyToId: '2014584859105300694'
  });
  console.log(reply2.success ? '✅ ' + reply2.url : '❌ ' + reply2.error);
}

main();
