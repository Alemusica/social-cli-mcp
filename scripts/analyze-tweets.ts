#!/usr/bin/env npx tsx
/**
 * Analyze recent tweets for content strategy
 */

import { TwitterClient } from '../src/clients/twitter.js';
import { loadConfig } from '../src/utils/config.js';

async function main() {
  const config = loadConfig();
  const twitter = new TwitterClient(config.twitter);

  if (!twitter.isConfigured()) {
    console.error('❌ Twitter not configured');
    process.exit(1);
  }

  const count = parseInt(process.argv[2]) || 30;

  console.log(`\n📊 ANALYZING LAST ${count} TWEETS\n`);

  const result = await twitter.getMyRecentTweets(count);

  if (!result.success || !result.tweets) {
    console.error('Error:', result.error);
    process.exit(1);
  }

  // Categorize tweets
  const categories = {
    tech: [] as any[],
    music: [] as any[],
    personal: [] as any[],
    engagement: [] as any[],
    other: [] as any[]
  };

  const keywords = {
    tech: ['code', 'AI', 'typescript', 'javascript', 'build', 'dev', 'npm', 'github', 'api', 'LLM', 'jsOM', 'tool'],
    music: ['RAV', 'handpan', 'looping', 'Ableton', 'sunset', 'music', 'gig', 'venue', 'perform', 'busking', 'ClyphX'],
    engagement: ['?', 'what', 'how', 'who', 'agree', 'thoughts', 'reply', 'RT']
  };

  for (const tweet of result.tweets) {
    const text = tweet.text.toLowerCase();

    let categorized = false;
    for (const [cat, words] of Object.entries(keywords)) {
      if (words.some(w => text.includes(w.toLowerCase()))) {
        (categories as any)[cat].push(tweet);
        categorized = true;
        break;
      }
    }
    if (!categorized) {
      categories.other.push(tweet);
    }
  }

  // Print analysis
  console.log('📈 TOP PERFORMING TWEETS:\n');

  const sorted = [...result.tweets].sort((a, b) => {
    const scoreA = (a.metrics?.likes || 0) + (a.metrics?.retweets || 0) * 3 + (a.metrics?.replies || 0) * 2;
    const scoreB = (b.metrics?.likes || 0) + (b.metrics?.retweets || 0) * 3 + (b.metrics?.replies || 0) * 2;
    return scoreB - scoreA;
  });

  sorted.slice(0, 5).forEach((t, i) => {
    console.log(`${i + 1}. [${t.metrics?.likes || 0}❤️ ${t.metrics?.retweets || 0}🔁 ${t.metrics?.replies || 0}💬]`);
    console.log(`   ${t.text.substring(0, 80)}...`);
    console.log(`   ${t.created_at}\n`);
  });

  console.log('\n📊 CATEGORY BREAKDOWN:\n');
  for (const [cat, tweets] of Object.entries(categories)) {
    if (tweets.length > 0) {
      const totalLikes = tweets.reduce((sum, t) => sum + (t.metrics?.likes || 0), 0);
      const totalRT = tweets.reduce((sum, t) => sum + (t.metrics?.retweets || 0), 0);
      console.log(`${cat.toUpperCase()}: ${tweets.length} tweets | ${totalLikes}❤️ ${totalRT}🔁 avg`);
    }
  }

  console.log('\n📝 RECENT TOPICS (to avoid repeating):\n');
  result.tweets.slice(0, 10).forEach(t => {
    console.log(`• ${t.text.substring(0, 60)}...`);
  });

  // Look for patterns in high engagement
  console.log('\n🔍 PATTERNS IN TOP TWEETS:\n');
  const topTweets = sorted.slice(0, 10);

  const patterns = {
    questions: topTweets.filter(t => t.text.includes('?')).length,
    threads: topTweets.filter(t => t.text.includes('🧵') || t.text.includes('Thread')).length,
    lists: topTweets.filter(t => /\d\./m.test(t.text)).length,
    emojis: topTweets.filter(t => /[\u{1F300}-\u{1F9FF}]/u.test(t.text)).length
  };

  console.log(`Questions: ${patterns.questions}/10`);
  console.log(`Threads: ${patterns.threads}/10`);
  console.log(`Lists: ${patterns.lists}/10`);
  console.log(`With emojis: ${patterns.emojis}/10`);

  // jsOM specific analysis
  console.log('\n🔍 jsOM/DESIGN RELATED TWEETS:\n');
  const jsomTweets = result.tweets.filter(t =>
    t.text.toLowerCase().includes('jsom') ||
    t.text.toLowerCase().includes('design tool') ||
    t.text.toLowerCase().includes('ui design') ||
    t.text.toLowerCase().includes('definitive designer')
  );

  if (jsomTweets.length > 0) {
    jsomTweets.forEach(t => {
      console.log('---');
      console.log(t.text);
      console.log(`[${t.metrics?.likes || 0}❤️ ${t.metrics?.retweets || 0}🔁 ${t.metrics?.replies || 0}💬]`);
    });
  } else {
    console.log('No jsOM-specific tweets found in last', count, 'tweets');
  }
}

main().catch(console.error);
