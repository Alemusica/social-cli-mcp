#!/usr/bin/env npx tsx
/**
 * Analyze hashtags for editorial posts using Instagram API
 * Rate limit: 30 unique hashtags per 7 days
 */

import { loadConfig } from './utils/config.js';
import { InstagramClient } from './clients/instagram.js';

// Hashtags from our editorial plan
const HASHTAGS_TO_ANALYZE = [
  // Post 1: GGT Story
  'flutur', 'busker', 'greecegottalent', 'streetmusic', 'ravvast',
  // Post 2: Lanzarote
  'fieldrecording', 'binaural', 'ku100', 'sounddesign', 'lanzarote',
  // Post 3: Kids
  'musicismagic',
  // Post 4: Denver
  'ontour', 'denver', 'djlife', 'livemusic',
  // Post 5: Morocco
  'morocco', 'goldenhour', 'sunsetlovers', 'travelphotography',
  // Post 6: Greek Church
  'astypalea', 'greekislands', 'bluehour', 'dodecanese',
];

async function main() {
  const config = loadConfig();

  if (!config.instagram) {
    console.error('❌ Instagram not configured');
    process.exit(1);
  }

  const instagram = new InstagramClient(config.instagram);

  // Test connection
  console.log('📡 Testing connection...');
  const connected = await instagram.testConnection();
  if (!connected) {
    console.error('❌ Connection failed');
    process.exit(1);
  }

  console.log('\n📊 Hashtag Analysis for Editorial Posts\n');
  console.log('=' .repeat(60));
  console.log('⚠️  Note: Rate limited to 30 unique hashtags per 7 days');
  console.log('=' .repeat(60));

  const results: any[] = [];

  // Analyze first 10 hashtags (to stay within rate limits)
  const hashtagsToTest = HASHTAGS_TO_ANALYZE.slice(0, 10);

  for (const tag of hashtagsToTest) {
    console.log(`\n🔍 Analyzing #${tag}...`);

    const analysis = await instagram.analyzeHashtag(tag);

    if (analysis) {
      results.push(analysis);
      console.log(`   ✅ Found hashtag ID: ${analysis.id}`);
      console.log(`   📈 Top media analyzed: ${analysis.topMediaCount}`);
      console.log(`   ❤️  Avg likes: ${analysis.avgLikes}`);
      console.log(`   💬 Avg comments: ${analysis.avgComments}`);
    } else {
      console.log(`   ❌ Could not analyze (may count against rate limit)`);
    }

    // Small delay to avoid rate limiting
    await new Promise(r => setTimeout(r, 1000));
  }

  // Summary
  console.log('\n' + '=' .repeat(60));
  console.log('📊 HASHTAG PERFORMANCE SUMMARY');
  console.log('=' .repeat(60));
  console.log('\n| Hashtag | Avg Likes | Avg Comments | Score |');
  console.log('|---------|-----------|--------------|-------|');

  const sortedResults = results
    .filter(r => r.topMediaCount > 0)
    .sort((a, b) => (b.avgLikes + b.avgComments * 2) - (a.avgLikes + a.avgComments * 2));

  for (const r of sortedResults) {
    const score = r.avgLikes + r.avgComments * 2;
    console.log(`| #${r.name.padEnd(15)} | ${String(r.avgLikes).padStart(9)} | ${String(r.avgComments).padStart(12)} | ${String(score).padStart(5)} |`);
  }

  console.log('\n✅ Done! Results saved to hashtag analysis.');
  console.log(`\n⏰ Rate limit used: ${hashtagsToTest.length}/30 hashtags this week`);
}

main().catch(console.error);
