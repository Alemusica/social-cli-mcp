#!/usr/bin/env npx tsx
/**
 * DIGITAL DEPARTMENT: Post Optimizer
 *
 * Uses hashtag analysis data from SurrealDB to optimize upcoming posts:
 * - Recommends best hashtags based on engagement scores
 * - Suggests optimal posting times
 * - Refines captions based on top-performing patterns
 *
 * Run after posting to refine the next batch based on real performance.
 */

import * as fs from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import Surreal from 'surrealdb';
import { getDb } from '../db/client.js';

// Dynamic paths relative to project root
const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..', '..');
const POSTS_FILE = join(PROJECT_ROOT, 'content', 'instagram-posts-ready.json');
const OUTPUT_FILE = join(PROJECT_ROOT, 'content', 'instagram-posts-optimized.json');

interface HashtagAnalysis {
  hashtag_name: string;
  avg_likes: number;
  avg_comments: number;
  engagement_score: number;
  recommendation: string;
}

interface Post {
  id: number;
  title: string;
  type: string;
  priority: string;
  hashtags: string[];
  caption: string;
  best_time: string;
  target_audience: string[];
  [key: string]: any;
}

async function getHashtagData(db: Surreal): Promise<HashtagAnalysis[]> {
  const result = await db.query(`
    SELECT hashtag_name, avg_likes, avg_comments, engagement_score, recommendation
    FROM hashtag_analysis
    WHERE engagement_score > 0
    ORDER BY engagement_score DESC
  `);
  return (result[0] as HashtagAnalysis[]) || [];
}

async function getRecentPostPerformance(db: Surreal) {
  const result = await db.query(`
    SELECT * FROM post_monitor
    WHERE status = 'completed' OR status = 'monitoring'
    ORDER BY started_at DESC
    LIMIT 5
  `);
  return (result[0] as any[]) || [];
}

function selectOptimalHashtags(
  currentHashtags: string[],
  hashtagData: HashtagAnalysis[],
  targetAudience: string[]
): { hashtags: string[]; reasoning: string[] } {
  const reasoning: string[] = [];

  // Create hashtag lookup
  const hashtagMap = new Map(hashtagData.map(h => [h.hashtag_name.toLowerCase(), h]));

  // Categorize hashtags
  const keepTags = hashtagData.filter(h => h.recommendation === 'keep');
  const testTags = hashtagData.filter(h => h.recommendation === 'test');

  // Start with current hashtags that perform well
  const optimized: string[] = [];

  for (const tag of currentHashtags) {
    const cleanTag = tag.replace(/^#/, '').toLowerCase();
    const data = hashtagMap.get(cleanTag);

    if (data) {
      if (data.recommendation === 'keep') {
        optimized.push(`#${cleanTag}`);
        reasoning.push(`✅ KEEP #${cleanTag} (score: ${data.engagement_score})`);
      } else if (data.recommendation === 'test') {
        optimized.push(`#${cleanTag}`);
        reasoning.push(`🧪 TEST #${cleanTag} (score: ${data.engagement_score})`);
      } else {
        reasoning.push(`❌ DROP #${cleanTag} (${data.recommendation})`);
      }
    } else {
      // Unknown tag - keep if it fits brand
      if (['flutur', 'ravvast', 'streetmusic'].includes(cleanTag)) {
        optimized.push(`#${cleanTag}`);
        reasoning.push(`🏷️ BRAND #${cleanTag} (no data, but brand tag)`);
      } else {
        reasoning.push(`❓ UNKNOWN #${cleanTag} (no analysis data)`);
      }
    }
  }

  // Add high-performing tags if we have room (max 5 total for Instagram algorithm)
  const targetCount = 5;
  if (optimized.length < targetCount) {
    const available = keepTags.filter(h =>
      !optimized.some(o => o.toLowerCase().includes(h.hashtag_name.toLowerCase()))
    );

    for (const tag of available.slice(0, targetCount - optimized.length)) {
      optimized.push(`#${tag.hashtag_name}`);
      reasoning.push(`➕ ADD #${tag.hashtag_name} (top performer: ${tag.engagement_score})`);
    }
  }

  // If we have too many, keep only top 5
  if (optimized.length > targetCount) {
    const sorted = optimized
      .map(tag => {
        const clean = tag.replace(/^#/, '').toLowerCase();
        const data = hashtagMap.get(clean);
        return { tag, score: data?.engagement_score || 0 };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, targetCount)
      .map(t => t.tag);

    reasoning.push(`📊 Limited to top ${targetCount} by engagement score`);
    return { hashtags: sorted, reasoning };
  }

  return { hashtags: optimized, reasoning };
}

function optimizeCaption(caption: string, postType: string): { caption: string; tips: string[] } {
  const tips: string[] = [];
  let optimized = caption;

  // Check for hook in first line
  const firstLine = caption.split('\n')[0];
  if (firstLine.length > 80) {
    tips.push('⚠️ First line too long - Instagram truncates at ~80 chars');
  }

  // Check for question (drives comments)
  if (!caption.includes('?')) {
    tips.push('💡 Add a question to encourage comments');
  }

  // Check for call to action
  const ctaPatterns = ['comment', 'share', 'save', 'link in bio', 'tell me', 'what', 'drop'];
  const hasCTA = ctaPatterns.some(p => caption.toLowerCase().includes(p));
  if (!hasCTA) {
    tips.push('💡 Add a call-to-action (ask for saves, shares, or comments)');
  }

  // Check line breaks (readability)
  if (!caption.includes('\n\n')) {
    tips.push('💡 Add empty lines between paragraphs for readability');
  }

  // Reels-specific
  if (postType === 'reel') {
    if (!caption.toLowerCase().includes('watch') && !caption.toLowerCase().includes('listen')) {
      tips.push('💡 For Reels: Start with action verb (Watch, Listen, See)');
    }
  }

  // Carousel-specific
  if (postType === 'carousel') {
    if (!caption.includes('→') && !caption.includes('swipe')) {
      tips.push('💡 For Carousels: Hint at swiping (→ or "swipe")');
    }
  }

  return { caption: optimized, tips };
}

async function main() {
  console.log('🎯 DIGITAL DEPARTMENT: Post Optimizer\n');

  // Load current posts
  if (!fs.existsSync(POSTS_FILE)) {
    console.error('❌ Posts file not found:', POSTS_FILE);
    process.exit(1);
  }

  const postsData = JSON.parse(fs.readFileSync(POSTS_FILE, 'utf-8'));
  const posts: Post[] = postsData.posts || [];

  // Connect to SurrealDB (uses centralized client with env vars)
  const db = await getDb();

  // Get hashtag analysis data
  const hashtagData = await getHashtagData(db);
  console.log(`📊 Loaded ${hashtagData.length} hashtag analyses\n`);

  // Get recent post performance for learning
  const recentPerformance = await getRecentPostPerformance(db);
  if (recentPerformance.length > 0) {
    console.log(`📈 Learning from ${recentPerformance.length} monitored posts\n`);
  }

  // Top hashtags summary
  console.log('🏆 TOP HASHTAGS (by engagement score):');
  for (const tag of hashtagData.slice(0, 10)) {
    const bar = '█'.repeat(Math.min(20, Math.floor(tag.engagement_score / 300)));
    console.log(`   #${tag.hashtag_name.padEnd(18)} ${bar} ${tag.engagement_score}`);
  }
  console.log('');

  // Optimize each post
  const optimizedPosts: any[] = [];

  for (const post of posts) {
    console.log(`\n${'═'.repeat(60)}`);
    console.log(`📝 POST ${post.id}: ${post.title}`);
    console.log(`${'═'.repeat(60)}`);

    // Optimize hashtags
    const { hashtags: newHashtags, reasoning } = selectOptimalHashtags(
      post.hashtags || [],
      hashtagData,
      post.target_audience || []
    );

    console.log('\n🏷️  HASHTAG OPTIMIZATION:');
    console.log(`   Before: ${(post.hashtags || []).join(' ')}`);
    console.log(`   After:  ${newHashtags.join(' ')}`);
    console.log('\n   Reasoning:');
    for (const r of reasoning) {
      console.log(`   ${r}`);
    }

    // Optimize caption
    const { caption, tips } = optimizeCaption(post.caption, post.type);

    if (tips.length > 0) {
      console.log('\n✍️  CAPTION TIPS:');
      for (const tip of tips) {
        console.log(`   ${tip}`);
      }
    }

    // Build optimized post
    const optimized = {
      ...post,
      hashtags: newHashtags,
      optimization: {
        hashtag_reasoning: reasoning,
        caption_tips: tips,
        optimized_at: new Date().toISOString(),
      },
    };

    optimizedPosts.push(optimized);
  }

  // Save optimized posts
  const output = {
    ...postsData,
    posts: optimizedPosts,
    optimization_summary: {
      optimized_at: new Date().toISOString(),
      hashtags_analyzed: hashtagData.length,
      posts_optimized: optimizedPosts.length,
      top_hashtags: hashtagData.slice(0, 5).map(h => `#${h.hashtag_name}`),
    },
  };

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));
  console.log(`\n\n✅ Optimized posts saved to: ${OUTPUT_FILE}`);

  // Summary
  console.log('\n📋 OPTIMIZATION SUMMARY:');
  console.log(`   Posts optimized: ${optimizedPosts.length}`);
  console.log(`   Recommended hashtags: ${hashtagData.slice(0, 5).map(h => `#${h.hashtag_name}`).join(' ')}`);

  await db.close();
}

main().catch(console.error);
