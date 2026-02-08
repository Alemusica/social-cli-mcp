#!/usr/bin/env npx tsx
import { TwitterClient } from '../src/clients/twitter.js';
import { loadConfig } from '../src/utils/config.js';

const REPLIES = [
  { id: '2013394569015013705', text: `⭐ Full source code:
https://github.com/alemusica/jsom

Star if this saves you from screenshot-prompting hell.
MIT licensed. PRs welcome.` },
  { id: '2013950795486568647', text: `🔗 All the code behind it:
https://github.com/alemusica/jsom

⭐ Star = motivation to ship v2 faster
🍴 Fork to customize for your stack` },
  { id: '2013952672697577864', text: `The PHI implementation is open source:
https://github.com/alemusica/jsom

Math-driven design that LLMs actually understand.
⭐ if you want more tools like this.` },
  { id: '2013952289589866543', text: `All 9 style blueprints are open source:
https://github.com/alemusica/jsom

Swiss, Material, Glassmorphism... pick one, export, done.
⭐ Star to support the project!` },
  { id: '2013534319952691382', text: `Source code if you want to try it:
https://github.com/alemusica/jsom

Humans design. AI builds. That's the future.` },
  { id: '2013954048311902664', text: `The canvas where layers become code:
https://github.com/alemusica/jsom

Building both music sets and design tools.
Same philosophy, different output. ⭐` }
];

async function main() {
  const config = loadConfig();
  const twitter = new TwitterClient(config.twitter);

  for (const reply of REPLIES) {
    console.log('Posting reply to', reply.id);
    const result = await twitter.post({ text: reply.text, replyToId: reply.id });
    console.log(result.success ? '✅ ' + result.url : '❌ ' + result.error);
    await new Promise(r => setTimeout(r, 2500));
  }
}

main().catch(console.error);
