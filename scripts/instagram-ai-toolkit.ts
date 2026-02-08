#!/usr/bin/env npx tsx
/**
 * Instagram AI Toolkit - Full API v24 Capabilities
 *
 * Features:
 * 1. Account Analytics Dashboard
 * 2. Best Posting Times (from follower activity)
 * 3. AI Caption Generator (with Claude)
 * 4. Hashtag Performance Analyzer
 * 5. Content Performance Report
 * 6. Competitor Hashtag Research
 */

import { InstagramClient } from '../src/clients/instagram.js';
import { loadConfig } from '../src/utils/config.js';
import Anthropic from '@anthropic-ai/sdk';

const config = loadConfig();
const instagram = new InstagramClient(config.instagram);

// ─────────────────────────────────────────
// 1. ACCOUNT ANALYTICS DASHBOARD
// ─────────────────────────────────────────
async function showDashboard() {
  console.log('\n📊 INSTAGRAM ANALYTICS DASHBOARD\n');
  console.log('─'.repeat(50));

  const insights = await instagram.getAccountInsights('days_28');
  if (!insights) {
    console.log('❌ Could not fetch insights');
    return;
  }

  console.log(`👥 Followers: ${insights.followerCount?.toLocaleString() || 'N/A'}`);
  console.log(`📸 Total Posts: ${insights.mediaCount || 'N/A'}`);
  console.log(`👁️ Reach (28 days): ${insights.reach?.toLocaleString() || 'N/A'}`);
  console.log(`🏠 Profile Views: ${insights.profileViews?.toLocaleString() || 'N/A'}`);
  console.log(`🔗 Website Clicks: ${insights.websiteClicks?.toLocaleString() || 'N/A'}`);
}

// ─────────────────────────────────────────
// 2. BEST POSTING TIMES
// ─────────────────────────────────────────
async function showBestTimes() {
  console.log('\n⏰ BEST POSTING TIMES\n');
  console.log('─'.repeat(50));

  const bestTimes = await instagram.getBestPostingTimes();
  if (!bestTimes.length) {
    console.log('❌ Could not fetch best times (need 100+ followers)');
    return;
  }

  console.log('Top 5 times when your followers are online:\n');
  bestTimes.forEach((slot, i) => {
    console.log(`  ${i + 1}. ${slot.day} at ${slot.hour} (${slot.followers} followers online)`);
  });
}

// ─────────────────────────────────────────
// 3. AI CAPTION GENERATOR
// ─────────────────────────────────────────
async function generateCaption(context: string, style: 'storytelling' | 'minimal' | 'cta' = 'storytelling') {
  console.log('\n✍️ AI CAPTION GENERATOR\n');
  console.log('─'.repeat(50));

  const anthropic = new Anthropic();

  const stylePrompts = {
    storytelling: 'Write an engaging, personal story-style caption. Use line breaks for readability. End with a question to boost engagement.',
    minimal: 'Write a short, punchy caption (2-3 lines max). Poetic and impactful.',
    cta: 'Write a caption with a clear call-to-action. Include engagement hooks and end with a specific ask.',
  };

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 500,
    messages: [{
      role: 'user',
      content: `You're writing an Instagram caption for a musician/artist account (@flutur_8).

Context: ${context}

Style: ${stylePrompts[style]}

Requirements:
- No emojis unless specifically requested
- Include 3-5 relevant hashtags at the end
- Make it feel authentic, not salesy
- Optimize for saves and shares (valuable content)

Write only the caption, nothing else.`
    }]
  });

  const caption = (response.content[0] as any).text;
  console.log('Generated caption:\n');
  console.log(caption);
  console.log('\n' + '─'.repeat(50));

  return caption;
}

// ─────────────────────────────────────────
// 4. HASHTAG ANALYZER
// ─────────────────────────────────────────
async function analyzeHashtags(hashtags: string[]) {
  console.log('\n#️⃣ HASHTAG PERFORMANCE ANALYZER\n');
  console.log('─'.repeat(50));

  for (const tag of hashtags) {
    const analysis = await instagram.analyzeHashtag(tag);
    if (analysis) {
      console.log(`\n#${analysis.name}`);
      console.log(`  📊 Avg Likes: ${analysis.avgLikes}`);
      console.log(`  💬 Avg Comments: ${analysis.avgComments}`);
      console.log(`  🏆 Top posts sampled: ${analysis.topMediaCount}`);
    } else {
      console.log(`\n#${tag} - Could not analyze`);
    }
  }
}

// ─────────────────────────────────────────
// 5. RECENT POSTS PERFORMANCE
// ─────────────────────────────────────────
async function showRecentPerformance() {
  console.log('\n📈 RECENT POSTS PERFORMANCE\n');
  console.log('─'.repeat(50));

  const posts = await instagram.getRecentMediaInsights(10);
  if (!posts.length) {
    console.log('❌ Could not fetch recent posts');
    return;
  }

  console.log('Last 10 posts:\n');
  posts.forEach((post, i) => {
    const date = new Date(post.timestamp).toLocaleDateString();
    console.log(`${i + 1}. [${post.mediaType}] ${date}`);
    console.log(`   ❤️ ${post.likes || 0} | 💬 ${post.comments || 0} | 👁️ ${post.reach || 'N/A'} | 💾 ${post.saved || 'N/A'}`);
    console.log(`   🔗 ${post.permalink}`);
  });
}

// ─────────────────────────────────────────
// 6. AUDIENCE DEMOGRAPHICS
// ─────────────────────────────────────────
async function showAudience() {
  console.log('\n👥 AUDIENCE DEMOGRAPHICS\n');
  console.log('─'.repeat(50));

  const audience = await instagram.getAudienceInsights();
  if (!audience) {
    console.log('❌ Could not fetch audience data (need 100+ followers)');
    return;
  }

  if (audience.topCountries?.length) {
    console.log('\n🌍 Top Countries:');
    audience.topCountries.slice(0, 5).forEach((c, i) => {
      console.log(`  ${i + 1}. ${c.country}: ${c.count}`);
    });
  }

  if (audience.topCities?.length) {
    console.log('\n🏙️ Top Cities:');
    audience.topCities.slice(0, 5).forEach((c, i) => {
      console.log(`  ${i + 1}. ${c.city}: ${c.count}`);
    });
  }

  if (audience.ageGender?.length) {
    console.log('\n📊 Age/Gender Breakdown:');
    audience.ageGender.forEach(ag => {
      console.log(`  ${ag.ageRange}: M=${ag.male} F=${ag.female}`);
    });
  }
}

// ─────────────────────────────────────────
// 7. AI CONTENT STRATEGY
// ─────────────────────────────────────────
async function generateContentStrategy() {
  console.log('\n🧠 AI CONTENT STRATEGY GENERATOR\n');
  console.log('─'.repeat(50));

  // Fetch recent performance
  const posts = await instagram.getRecentMediaInsights(10);
  const audience = await instagram.getAudienceInsights();
  const bestTimes = await instagram.getBestPostingTimes();

  const anthropic = new Anthropic();

  const context = {
    recentPosts: posts.map(p => ({
      type: p.mediaType,
      likes: p.likes,
      comments: p.comments,
      reach: p.reach,
      saved: p.saved,
    })),
    topCountries: audience?.topCountries?.slice(0, 3),
    topCities: audience?.topCities?.slice(0, 3),
    bestTimes: bestTimes.slice(0, 3),
  };

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1000,
    messages: [{
      role: 'user',
      content: `You're an Instagram growth strategist analyzing @flutur_8 (musician/artist account).

Here's the data:
${JSON.stringify(context, null, 2)}

Based on this data, provide:
1. What content type is performing best?
2. What's the ideal posting schedule?
3. 3 specific content ideas for next week
4. Hashtag strategy recommendation
5. One key insight from the audience demographics

Be specific and actionable. No fluff.`
    }]
  });

  console.log((response.content[0] as any).text);
}

// ─────────────────────────────────────────
// MAIN CLI
// ─────────────────────────────────────────
async function main() {
  const command = process.argv[2];

  // Test connection first
  const connected = await instagram.testConnection();
  if (!connected) {
    console.error('❌ Instagram not connected');
    process.exit(1);
  }

  switch (command) {
    case 'dashboard':
      await showDashboard();
      break;

    case 'times':
      await showBestTimes();
      break;

    case 'caption':
      const context = process.argv[3] || 'A photo of me performing live with Rav Vast';
      const style = (process.argv[4] as any) || 'storytelling';
      await generateCaption(context, style);
      break;

    case 'hashtags':
      const tags = process.argv.slice(3);
      if (!tags.length) {
        console.log('Usage: instagram-ai-toolkit.ts hashtags busker ravvast streetmusic');
        process.exit(1);
      }
      await analyzeHashtags(tags);
      break;

    case 'performance':
      await showRecentPerformance();
      break;

    case 'audience':
      await showAudience();
      break;

    case 'strategy':
      await generateContentStrategy();
      break;

    case 'full':
      await showDashboard();
      await showBestTimes();
      await showAudience();
      await showRecentPerformance();
      await generateContentStrategy();
      break;

    default:
      console.log(`
Instagram AI Toolkit

Commands:
  dashboard    - Account analytics overview
  times        - Best posting times based on follower activity
  caption      - AI-generate caption (args: context, style)
  hashtags     - Analyze hashtag performance (args: tag1 tag2...)
  performance  - Recent posts performance
  audience     - Audience demographics
  strategy     - AI-generated content strategy
  full         - Run all analytics + AI strategy

Examples:
  npx tsx scripts/instagram-ai-toolkit.ts dashboard
  npx tsx scripts/instagram-ai-toolkit.ts caption "Live performance in Athens" storytelling
  npx tsx scripts/instagram-ai-toolkit.ts hashtags busker ravvast streetmusic
  npx tsx scripts/instagram-ai-toolkit.ts full
`);
  }
}

main().catch(console.error);
