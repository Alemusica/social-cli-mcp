#!/usr/bin/env npx tsx
import { TwitterClient } from '../src/clients/twitter.js';
import { loadConfig } from '../src/utils/config.js';

const STRATEGIC_POSTS = [
  // 1. Reply to @AnthropicAI context (standalone tweet)
  `jsOM uses MCP protocol to connect directly with Claude.

Your design becomes the spec. No screenshots. No guessing.

Canvas → LLM-readable JSON → Claude builds exactly what you designed.

Open source: https://github.com/alemusica/jsom`,

  // 2. Reply about v0 (standalone tweet)
  `Love what @v0 does with prompt → code.

jsOM handles the step before: visual design → structured spec.

Different tools, same mission: bring designers into the AI era.

https://github.com/alemusica/jsom ⭐`,

  // 3. Reply for @levelsio context (indie hacker)
  `Vibe coding needs better inputs than screenshots.

jsOM: draw what you want → export spec LLMs actually understand.

Works offline with Ollama. Privacy-first.

Perfect for shipping fast solo.

https://github.com/alemusica/jsom`,

  // 4. Follow-up tagging designers
  `@mengto @101babich

Would love your feedback on jsOM.

Trying to solve: how do designers stay relevant when AI writes all the code?

Answer: your design becomes THE spec, not just a reference.

https://github.com/alemusica/jsom`,

  // 5. Vibe coding template
  `Vibe coding works when LLMs get structure, not screenshots.

jsOM: visual canvas → LLM-native export → any AI builds it.

Open source. MIT. Offline mode.

https://github.com/alemusica/jsom ⭐`
];

async function main() {
  const config = loadConfig();
  const twitter = new TwitterClient(config.twitter);

  console.log(`Posting ${STRATEGIC_POSTS.length} strategic tweets at 50 second intervals...\n`);

  for (let i = 0; i < STRATEGIC_POSTS.length; i++) {
    const text = STRATEGIC_POSTS[i];
    console.log(`[${i + 1}/${STRATEGIC_POSTS.length}] Posting...`);
    console.log(text.substring(0, 60) + '...\n');

    const result = await twitter.post({ text });

    if (result.success) {
      console.log(`✅ Posted: ${result.url}\n`);
    } else {
      console.log(`❌ Failed: ${result.error}\n`);
    }

    // Wait 50 seconds between posts (except after last one)
    if (i < STRATEGIC_POSTS.length - 1) {
      console.log('Waiting 50 seconds...\n');
      await new Promise(r => setTimeout(r, 50000));
    }
  }

  console.log('Done! All strategic tweets posted.');
}

main().catch(console.error);
