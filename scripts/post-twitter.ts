#!/usr/bin/env npx tsx
/**
 * Twitter Direct Posting Script
 *
 * Usage:
 *   npx tsx scripts/post-twitter.ts single "Tweet text here"
 *   npx tsx scripts/post-twitter.ts thread              # Posts jsOM thread
 *   npx tsx scripts/post-twitter.ts day1                # Posts all Day 1 content
 *   npx tsx scripts/post-twitter.ts test                # Test connection
 */

import { TwitterClient } from '../src/clients/twitter.js';
import { loadConfig } from '../src/utils/config.js';

// Content library - 3 days of tweets
const CONTENT = {
  // Day 1 - Mercoledì 22
  day1: {
    jsomThread: [
      `🚀 Introducing jsOM: Zero-config object mapping for TypeScript

I was tired of writing boilerplate to transform data between APIs, databases, and frontends.

So I built something different.

🧵 Thread:`,

      `The problem:

Every JS app needs to transform data:
- API response → UI model
- DB record → DTO
- Form data → API payload

Current solutions require:
❌ Decorators everywhere
❌ Config files
❌ Runtime reflection

jsOM: just works ✅`,

      `How it works:

const userDTO = map(dbUser, UserDTO)

That's it.

- Types inferred automatically
- No decorators needed
- No config files
- Edge-runtime compatible`,

      `Why edge-native matters:

Vercel Edge, Cloudflare Workers = the future

Most mapping libraries bundle heavy reflection code.

jsOM:
- Zero runtime dependencies
- Tree-shakeable
- Works everywhere JS runs`,

      `Try it:

npm install jsom

GitHub: https://github.com/alemusica/jsom

⭐ Star if useful
🔄 RT to help other devs find it

Building in public - follow for updates on:
- jsOM roadmap
- TypeScript tips
- Dev tool insights`
    ],

    clyphx: `ClyphX Pro trick I use every set:

Map a single button to:
1. Stop all clips
2. Fade master to -inf in 4 bars
3. Launch next scene
4. Fade back to 0dB

One button. Zero stress.

What's your Ableton life-saver macro?`,

    hotTake: `Hot take: The best live looping performances don't sound like loops.

They sound like a band that happens to be one person.

Agree or nah?`,

    bridge: `Same process, different medium:

Code: Start simple → add layers → refactor → test → ship
Music: Start simple → add layers → arrange → mix → perform

"Layer su layer" isn't just a motto.
It's how I build everything.`
  },

  // Day 2 - Giovedì 23
  day2: {
    techInsight: `Building jsOM taught me:

1. TypeScript inference is magical (use it)
2. Zero-config beats configurability
3. Edge-first isn't optional anymore
4. Documentation > features

What's your "wish I knew sooner" from building OSS?`,

    abletonWorkflow: `Ableton workflow nobody talks about:

Your CPU isn't the bottleneck.
Your decision-making is.

Freeze tracks. Move on. Revisit later.

The song that's 80% done today > the perfect loop you've been tweaking for 3 weeks.`,

    thirtyEuros: `4 years ago: Busking in Greece with €30 to my name
Today: Coding AI tools and planning 2026 tour dates

The bridge between these two lives?

Both require showing up every day.
Both reward consistency over talent.
Both feel impossible until they don't.`,

    bookingTease: `Summer booking season is open.

Sunset sessions. Boutique hotels. Beach clubs.
RAV Vast + live looping + vocals.

60+ venues contacted this week.

Let's see what 2026 brings.`
  },

  // Day 3 - Venerdì 24
  day3: {
    buildUpdate: `jsOM week 1 update:

✅ Core mapping working
✅ TypeScript types inferred
🔄 Edge runtime tests
📝 Documentation in progress

Next: Product Hunt launch prep

Building in public = accountability`,

    ravConstraint: `The RAV Vast isn't just an instrument.

It's a constraint.

8 notes. No wrong combinations.
Forces you to think melodically, not harmonically.

Sometimes the best creative tool is the one that limits you.`,

    poll: `For devs who also make music:

Does coding make you a better musician?

🔁 RT = Yes, systematic thinking helps
❤️ Like = No, they're separate skills
💬 Reply = It's complicated`,

    bridgePeak: `Two worlds, one process:

MUSIC: Sunrise in Grecia → RAV Vast → looping → sunset set
CODE: Problem → prototype → iterate → ship

Different outputs. Same creative muscle.

That's the bridge I'm building with every post.

What's YOUR bridge?`,

    weekWins: `Week wins:

📧 60+ venue emails sent
🎵 New content planned
💻 jsOM thread launched
🎸 Villa Porta 2026 confirmed

Next week: Follow-ups + more building

What was your win this week?`
  }
};

async function main() {
  const config = loadConfig();
  const twitter = new TwitterClient(config.twitter);

  if (!twitter.isConfigured()) {
    console.error('❌ Twitter not configured. Check .env file.');
    process.exit(1);
  }

  const command = process.argv[2];
  const arg = process.argv[3];

  switch (command) {
    case 'test':
      console.log('🔄 Testing Twitter connection...');
      const connected = await twitter.testConnection();
      if (connected) {
        const me = await twitter.getMe();
        console.log(`\n📊 Account: @${me?.username}`);
        console.log(`👥 Followers: ${me?.followers}`);
      }
      break;

    case 'single':
      if (!arg) {
        console.error('Usage: npx tsx scripts/post-twitter.ts single "Tweet text"');
        process.exit(1);
      }
      console.log('📤 Posting single tweet...');
      const singleResult = await twitter.post({ text: arg });
      if (singleResult.success) {
        console.log(`✅ Posted: ${singleResult.url}`);
      } else {
        console.error(`❌ Failed: ${singleResult.error}`);
      }
      break;

    case 'thread':
      console.log('📤 Posting jsOM thread (5 tweets)...');
      const threadResults = await twitter.postThread(CONTENT.day1.jsomThread);
      threadResults.forEach((r, i) => {
        if (r.success) {
          console.log(`✅ Tweet ${i + 1}: ${r.url}`);
        } else {
          console.error(`❌ Tweet ${i + 1} failed: ${r.error}`);
        }
      });
      break;

    case 'day1':
      console.log('📤 Posting Day 1 content...\n');

      // Thread first
      console.log('1/4 - jsOM Thread:');
      const d1Thread = await twitter.postThread(CONTENT.day1.jsomThread);
      d1Thread.forEach((r, i) => {
        console.log(r.success ? `  ✅ Tweet ${i + 1}` : `  ❌ Tweet ${i + 1}: ${r.error}`);
      });

      // Wait 2 hours between posts in real usage
      console.log('\n⏰ Remaining posts for today (post manually at scheduled times):');
      console.log('2/4 - 11:00 ClyphX trick');
      console.log('3/4 - 14:00 Hot take');
      console.log('4/4 - 18:00 Bridge post');
      break;

    case 'day2':
      console.log('📤 Day 2 content available:\n');
      console.log('1. 09:00 - Tech Insight (OSS lessons)');
      console.log('2. 11:00 - Ableton Workflow');
      console.log('3. 14:00 - €30 Story');
      console.log('4. 18:00 - Booking Tease');
      console.log('\nUse: npx tsx scripts/post-twitter.ts d2-1 (etc.)');
      break;

    case 'd1-2': // ClyphX
      const r1 = await twitter.post({ text: CONTENT.day1.clyphx });
      console.log(r1.success ? `✅ ${r1.url}` : `❌ ${r1.error}`);
      break;

    case 'd1-3': // Hot take
      const r2 = await twitter.post({ text: CONTENT.day1.hotTake });
      console.log(r2.success ? `✅ ${r2.url}` : `❌ ${r2.error}`);
      break;

    case 'd1-4': // Bridge
      const r3 = await twitter.post({ text: CONTENT.day1.bridge });
      console.log(r3.success ? `✅ ${r3.url}` : `❌ ${r3.error}`);
      break;

    case 'd2-1':
      const r4 = await twitter.post({ text: CONTENT.day2.techInsight });
      console.log(r4.success ? `✅ ${r4.url}` : `❌ ${r4.error}`);
      break;

    case 'd2-2':
      const r5 = await twitter.post({ text: CONTENT.day2.abletonWorkflow });
      console.log(r5.success ? `✅ ${r5.url}` : `❌ ${r5.error}`);
      break;

    case 'd2-3':
      const r6 = await twitter.post({ text: CONTENT.day2.thirtyEuros });
      console.log(r6.success ? `✅ ${r6.url}` : `❌ ${r6.error}`);
      break;

    case 'd2-4':
      const r7 = await twitter.post({ text: CONTENT.day2.bookingTease });
      console.log(r7.success ? `✅ ${r7.url}` : `❌ ${r7.error}`);
      break;

    case 'd3-1':
      const r8 = await twitter.post({ text: CONTENT.day3.buildUpdate });
      console.log(r8.success ? `✅ ${r8.url}` : `❌ ${r8.error}`);
      break;

    case 'd3-2':
      const r9 = await twitter.post({ text: CONTENT.day3.ravConstraint });
      console.log(r9.success ? `✅ ${r9.url}` : `❌ ${r9.error}`);
      break;

    case 'd3-3':
      const r10 = await twitter.post({ text: CONTENT.day3.poll });
      console.log(r10.success ? `✅ ${r10.url}` : `❌ ${r10.error}`);
      break;

    case 'd3-4':
      const r11 = await twitter.post({ text: CONTENT.day3.bridgePeak });
      console.log(r11.success ? `✅ ${r11.url}` : `❌ ${r11.error}`);
      break;

    case 'd3-5':
      const r12 = await twitter.post({ text: CONTENT.day3.weekWins });
      console.log(r12.success ? `✅ ${r12.url}` : `❌ ${r12.error}`);
      break;

    default:
      console.log(`
Twitter Direct Posting

Commands:
  test              Test connection
  single "text"     Post single tweet
  thread            Post jsOM thread (5 tweets)

  d1-2              Day 1: ClyphX trick (11:00)
  d1-3              Day 1: Hot take (14:00)
  d1-4              Day 1: Bridge post (18:00)

  d2-1              Day 2: Tech insight (09:00)
  d2-2              Day 2: Ableton workflow (11:00)
  d2-3              Day 2: €30 story (14:00)
  d2-4              Day 2: Booking tease (18:00)

  d3-1              Day 3: Build update (09:00)
  d3-2              Day 3: RAV constraint (11:00)
  d3-3              Day 3: Poll (14:00)
  d3-4              Day 3: BRIDGE peak (18:00)
  d3-5              Day 3: Week wins (21:00)
`);
  }
}

main().catch(console.error);
