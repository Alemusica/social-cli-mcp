#!/usr/bin/env npx tsx
/**
 * Twitter Scheduler
 *
 * Runs as background process, posts at scheduled times.
 *
 * Usage:
 *   npx tsx scripts/twitter-scheduler.ts start     # Start scheduler daemon
 *   npx tsx scripts/twitter-scheduler.ts queue     # Show queued posts
 *   npx tsx scripts/twitter-scheduler.ts add "text" "2026-01-22 09:00"
 *   npx tsx scripts/twitter-scheduler.ts today     # Queue today's posts
 */

import * as fs from 'fs';
import * as path from 'path';
import { TwitterClient } from '../src/clients/twitter.js';
import { loadConfig } from '../src/utils/config.js';

const QUEUE_FILE = path.join(process.cwd(), 'analytics', 'twitter-queue.json');

interface QueuedTweet {
  id: string;
  text: string;
  scheduledFor: string; // ISO datetime
  status: 'pending' | 'posted' | 'failed';
  postedAt?: string;
  tweetId?: string;
  tweetUrl?: string;
  error?: string;
  isThread?: boolean;
  threadTweets?: string[];
}

interface Queue {
  tweets: QueuedTweet[];
  lastChecked: string;
}

// Content for days
const DAY_CONTENT = {
  day1: {
    '09:00': {
      isThread: true,
      threadTweets: [
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
      ]
    },
    '11:00': {
      text: `ClyphX Pro trick I use every set:

Map a single button to:
1. Stop all clips
2. Fade master to -inf in 4 bars
3. Launch next scene
4. Fade back to 0dB

One button. Zero stress.

What's your Ableton life-saver macro?`
    },
    '14:00': {
      text: `Hot take: The best live looping performances don't sound like loops.

They sound like a band that happens to be one person.

Agree or nah?`
    },
    '18:00': {
      text: `Same process, different medium:

Code: Start simple → add layers → refactor → test → ship
Music: Start simple → add layers → arrange → mix → perform

"Layer su layer" isn't just a motto.
It's how I build everything.`
    }
  },
  day2: {
    '09:00': {
      text: `Building jsOM taught me:

1. TypeScript inference is magical (use it)
2. Zero-config beats configurability
3. Edge-first isn't optional anymore
4. Documentation > features

What's your "wish I knew sooner" from building OSS?`
    },
    '11:00': {
      text: `Ableton workflow nobody talks about:

Your CPU isn't the bottleneck.
Your decision-making is.

Freeze tracks. Move on. Revisit later.

The song that's 80% done today > the perfect loop you've been tweaking for 3 weeks.`
    },
    '14:00': {
      text: `4 years ago: Busking in Greece with €30 to my name
Today: Coding AI tools and planning 2026 tour dates

The bridge between these two lives?

Both require showing up every day.
Both reward consistency over talent.
Both feel impossible until they don't.`
    },
    '18:00': {
      text: `Summer booking season is open.

Sunset sessions. Boutique hotels. Beach clubs.
RAV Vast + live looping + vocals.

60+ venues contacted this week.

Let's see what 2026 brings.`
    }
  },
  day3: {
    '09:00': {
      text: `jsOM week 1 update:

✅ Core mapping working
✅ TypeScript types inferred
🔄 Edge runtime tests
📝 Documentation in progress

Next: Product Hunt launch prep

Building in public = accountability`
    },
    '11:00': {
      text: `The RAV Vast isn't just an instrument.

It's a constraint.

8 notes. No wrong combinations.
Forces you to think melodically, not harmonically.

Sometimes the best creative tool is the one that limits you.`
    },
    '14:00': {
      text: `For devs who also make music:

Does coding make you a better musician?

🔁 RT = Yes, systematic thinking helps
❤️ Like = No, they're separate skills
💬 Reply = It's complicated`
    },
    '18:00': {
      text: `Two worlds, one process:

MUSIC: Sunrise in Grecia → RAV Vast → looping → sunset set
CODE: Problem → prototype → iterate → ship

Different outputs. Same creative muscle.

That's the bridge I'm building with every post.

What's YOUR bridge?`
    },
    '21:00': {
      text: `Week wins:

📧 60+ venue emails sent
🎵 New content planned
💻 jsOM thread launched
🎸 Villa Porta 2026 confirmed

Next week: Follow-ups + more building

What was your win this week?`
    }
  }
};

function loadQueue(): Queue {
  try {
    if (fs.existsSync(QUEUE_FILE)) {
      return JSON.parse(fs.readFileSync(QUEUE_FILE, 'utf-8'));
    }
  } catch (e) {
    console.error('Error loading queue:', e);
  }
  return { tweets: [], lastChecked: new Date().toISOString() };
}

function saveQueue(queue: Queue): void {
  const dir = path.dirname(QUEUE_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(QUEUE_FILE, JSON.stringify(queue, null, 2));
}

function generateId(): string {
  return `tw_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

async function postTweet(twitter: TwitterClient, tweet: QueuedTweet): Promise<QueuedTweet> {
  try {
    if (tweet.isThread && tweet.threadTweets) {
      const results = await twitter.postThread(tweet.threadTweets);
      const firstResult = results[0];
      if (firstResult?.success) {
        return {
          ...tweet,
          status: 'posted',
          postedAt: new Date().toISOString(),
          tweetId: firstResult.postId,
          tweetUrl: firstResult.url
        };
      } else {
        return {
          ...tweet,
          status: 'failed',
          error: firstResult?.error || 'Thread posting failed'
        };
      }
    } else {
      const result = await twitter.post({ text: tweet.text });
      if (result.success) {
        return {
          ...tweet,
          status: 'posted',
          postedAt: new Date().toISOString(),
          tweetId: result.postId,
          tweetUrl: result.url
        };
      } else {
        return {
          ...tweet,
          status: 'failed',
          error: result.error
        };
      }
    }
  } catch (e: any) {
    return {
      ...tweet,
      status: 'failed',
      error: e.message
    };
  }
}

async function checkAndPost(): Promise<void> {
  const config = loadConfig();
  const twitter = new TwitterClient(config.twitter);

  if (!twitter.isConfigured()) {
    console.error('❌ Twitter not configured');
    return;
  }

  const queue = loadQueue();
  const now = new Date();
  let updated = false;

  for (let i = 0; i < queue.tweets.length; i++) {
    const tweet = queue.tweets[i];
    if (tweet.status !== 'pending') continue;

    const scheduledTime = new Date(tweet.scheduledFor);
    if (scheduledTime <= now) {
      console.log(`📤 Posting scheduled tweet: ${tweet.id}`);
      queue.tweets[i] = await postTweet(twitter, tweet);
      updated = true;

      if (queue.tweets[i].status === 'posted') {
        console.log(`✅ Posted: ${queue.tweets[i].tweetUrl}`);
      } else {
        console.log(`❌ Failed: ${queue.tweets[i].error}`);
      }

      // Small delay between posts
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  queue.lastChecked = now.toISOString();
  if (updated) {
    saveQueue(queue);
  }
}

function queueDayPosts(dayNum: number, dateStr: string): void {
  const dayKey = `day${dayNum}` as keyof typeof DAY_CONTENT;
  const dayContent = DAY_CONTENT[dayKey];

  if (!dayContent) {
    console.error(`❌ No content for day ${dayNum}`);
    return;
  }

  const queue = loadQueue();

  for (const [time, content] of Object.entries(dayContent)) {
    const scheduledFor = `${dateStr}T${time}:00`;

    const tweet: QueuedTweet = {
      id: generateId(),
      text: (content as any).text || '',
      scheduledFor,
      status: 'pending',
      isThread: (content as any).isThread,
      threadTweets: (content as any).threadTweets
    };

    queue.tweets.push(tweet);
    console.log(`📅 Queued for ${time}: ${tweet.isThread ? 'Thread' : tweet.text.substring(0, 40)}...`);
  }

  saveQueue(queue);
  console.log(`\n✅ Queued ${Object.keys(dayContent).length} posts for ${dateStr}`);
}

function showQueue(): void {
  const queue = loadQueue();

  console.log('\n📋 TWITTER QUEUE\n');
  console.log(`Last checked: ${queue.lastChecked}\n`);

  const pending = queue.tweets.filter(t => t.status === 'pending');
  const posted = queue.tweets.filter(t => t.status === 'posted');
  const failed = queue.tweets.filter(t => t.status === 'failed');

  if (pending.length > 0) {
    console.log('⏳ PENDING:');
    pending.forEach(t => {
      const preview = t.isThread ? '[Thread]' : t.text.substring(0, 50) + '...';
      console.log(`  ${t.scheduledFor} - ${preview}`);
    });
  }

  if (posted.length > 0) {
    console.log('\n✅ POSTED:');
    posted.slice(-5).forEach(t => {
      console.log(`  ${t.postedAt} - ${t.tweetUrl}`);
    });
  }

  if (failed.length > 0) {
    console.log('\n❌ FAILED:');
    failed.forEach(t => {
      console.log(`  ${t.scheduledFor} - ${t.error}`);
    });
  }

  console.log(`\nTotal: ${pending.length} pending, ${posted.length} posted, ${failed.length} failed`);
}

async function startDaemon(): Promise<void> {
  console.log('🚀 Twitter Scheduler Started');
  console.log('Checking every 60 seconds for scheduled posts...\n');

  // Check immediately
  await checkAndPost();

  // Then check every minute
  setInterval(async () => {
    await checkAndPost();
  }, 60000);

  // Keep process alive
  process.on('SIGINT', () => {
    console.log('\n👋 Scheduler stopped');
    process.exit(0);
  });
}

async function main(): Promise<void> {
  const command = process.argv[2];

  switch (command) {
    case 'start':
      await startDaemon();
      break;

    case 'queue':
      showQueue();
      break;

    case 'check':
      await checkAndPost();
      break;

    case 'today':
      // Queue today's posts (Day 1)
      const today = new Date().toISOString().split('T')[0];
      queueDayPosts(1, today);
      break;

    case 'day1':
      queueDayPosts(1, process.argv[3] || new Date().toISOString().split('T')[0]);
      break;

    case 'day2':
      queueDayPosts(2, process.argv[3] || new Date(Date.now() + 86400000).toISOString().split('T')[0]);
      break;

    case 'day3':
      queueDayPosts(3, process.argv[3] || new Date(Date.now() + 172800000).toISOString().split('T')[0]);
      break;

    case 'add':
      const text = process.argv[3];
      const dateTime = process.argv[4];
      if (!text || !dateTime) {
        console.error('Usage: add "tweet text" "2026-01-22 09:00"');
        process.exit(1);
      }
      const queue = loadQueue();
      queue.tweets.push({
        id: generateId(),
        text,
        scheduledFor: new Date(dateTime).toISOString(),
        status: 'pending'
      });
      saveQueue(queue);
      console.log(`✅ Added tweet scheduled for ${dateTime}`);
      break;

    case 'clear':
      saveQueue({ tweets: [], lastChecked: new Date().toISOString() });
      console.log('✅ Queue cleared');
      break;

    default:
      console.log(`
Twitter Scheduler

Commands:
  start              Start scheduler daemon (runs continuously)
  queue              Show queued posts
  check              Check and post due tweets (one-time)

  today              Queue Day 1 posts for today
  day1 [date]        Queue Day 1 (e.g., day1 2026-01-22)
  day2 [date]        Queue Day 2
  day3 [date]        Queue Day 3

  add "text" "datetime"   Add custom tweet
  clear              Clear all queued posts

Examples:
  npx tsx scripts/twitter-scheduler.ts today
  npx tsx scripts/twitter-scheduler.ts start
  npx tsx scripts/twitter-scheduler.ts day1 2026-01-22
`);
  }
}

main().catch(console.error);
