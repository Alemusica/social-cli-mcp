#!/usr/bin/env npx tsx
import { TwitterClient } from '../src/clients/twitter.js';
import { loadConfig } from '../src/utils/config.js';

const THREAD = [
  `We're all becoming coding authors.

Like having a 3D printer at home:
You don't buy the cup. You make the cup the way you want.

Same with software now. You supervise. You shape. You don't build every brick.

#BuildInPublic`,

  `Closed software is dying.

Not because it's bad. Because it's static.

The future: software as clay.

Half-formed, but still fresh. You shape it to your taste.

Everyone becomes an author of their own tools.`,

  `Soon your OS will ask: "Want to personalize this?"

Not themes. Not settings.

Actual code. Upper layers. Behavior. Flows.

LLMs embedded in the frontend, not buried in core logic.

Customization becomes creation.`,

  `The problem I solved with jsOM:

LLMs are brilliant but ungrounded.
They guess layouts. Invent components. Hallucinate UIs.

jsOM = visual grounding.

You design the spec. LLM executes it.

No guessing. Your vision, precisely.

https://github.com/alemusica/jsom`,

  `Built this in ~16 hours across 3 days.

Not because I'm fast.
Because the tools exist now.

If I can build my own design-to-code pipeline...
imagine what you could build for YOUR workflow.

We're all authors now.`,

  `Zero stars. Zero sponsors. Just shipped.

If this resonates:
⭐ https://github.com/alemusica/jsom
💬 Tell me what you'd build

The personalization era is here.
Let's shape it together.

#VibeCoding #OpenSource #AI #BuildInPublic

@AnthropicAI @OpenAI @v0 @veraborges @levelsio`
];

async function main() {
  const config = loadConfig();
  const twitter = new TwitterClient(config.twitter);

  console.log(`Posting thread of ${THREAD.length} tweets at 50 second intervals...\n`);

  let previousTweetId: string | undefined;

  for (let i = 0; i < THREAD.length; i++) {
    const text = THREAD[i];
    console.log(`[${i + 1}/${THREAD.length}] Posting...`);
    console.log(text.substring(0, 60) + '...\n');

    const result = await twitter.post({
      text,
      replyToId: previousTweetId
    });

    if (result.success) {
      console.log(`✅ Posted: ${result.url}\n`);
      // Extract tweet ID from URL for threading
      previousTweetId = result.url?.split('/').pop();
    } else {
      console.log(`❌ Failed: ${result.error}\n`);
      break;
    }

    // Wait 50 seconds between posts (except after last one)
    if (i < THREAD.length - 1) {
      console.log('Waiting 50 seconds...\n');
      await new Promise(r => setTimeout(r, 50000));
    }
  }

  console.log('Done! Thread posted.');
}

main().catch(console.error);
