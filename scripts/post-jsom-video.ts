#!/usr/bin/env npx tsx
import { TwitterClient } from '../src/clients/twitter.js';
import { loadConfig } from '../src/utils/config.js';
import path from 'path';

async function main() {
  const config = loadConfig();
  const twitter = new TwitterClient(config.twitter);

  const videoPath = path.resolve('/Users/alessioivoycazzaniga/Projects/social-cli-mcp/media/precision mode active.mov');

  console.log('📹 Uploading jsOM demo video...');
  console.log('Video path:', videoPath);

  // Main tweet with video
  const result = await twitter.post({
    text: `This is what happens when you make your design tool speak LLM.

Precision mode active.

The designer clicks. The AI understands EXACTLY what they meant.

No more "select the third blue rectangle".

Just: "that one" → done.`,
    mediaUrls: [videoPath],
  });

  if (result.success) {
    console.log('✅ Tweet posted:', result.url);

    // Reply with GitHub link
    const reply = await twitter.post({
      text: `jsOM - semantic design ↔ LLM bridge

https://github.com/AleMusica/jsom

⭐ if you've felt the pain of describing UI to AI`,
      replyToId: result.postId,
    });

    if (reply.success) {
      console.log('✅ Reply posted:', reply.url);
    } else {
      console.log('❌ Reply failed:', reply.error);
    }
  } else {
    console.log('❌ Tweet failed:', result.error);
  }
}

main();
