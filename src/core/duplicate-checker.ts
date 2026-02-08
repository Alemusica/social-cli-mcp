/**
 * Duplicate Content Checker
 *
 * Prevents posting duplicate content on Twitter and Instagram.
 * Uses:
 * - Exact text matching
 * - Keyword/topic matching
 * - Recent post history
 *
 * Usage:
 *   import { checkDuplicate, recordPost, getDuplicateReport } from './duplicate-checker.js';
 *
 *   // Before posting
 *   const check = await checkDuplicate('twitter', tweetText);
 *   if (check.isDuplicate) {
 *     console.log('Duplicate detected:', check.reason);
 *     return;
 *   }
 *
 *   // After posting
 *   await recordPost('twitter', { id: tweetId, text: tweetText, topic: 'jsom_feature' });
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const ANALYTICS_DIR = join(process.cwd(), 'analytics');
const TWITTER_INDEX_FILE = join(ANALYTICS_DIR, 'posted-tweets-index.json');
const INSTAGRAM_INDEX_FILE = join(ANALYTICS_DIR, 'posted-instagram-index.json');

export interface PostedTopic {
  topic: string;
  keywords: string[];
  postIds: string[];
  firstPosted: string;
  lastPosted: string;
  note?: string;
}

export interface PostIndex {
  lastUpdated: string;
  postedTopics: PostedTopic[];
  recentPostIds: string[];
  recentTexts: string[]; // Last 50 post texts for exact matching
}

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  reason?: string;
  matchedTopic?: string;
  matchedPostId?: string;
  similarity?: number;
}

// Similarity threshold (0-1)
const SIMILARITY_THRESHOLD = 0.7;

/**
 * Load index file or create new one
 */
function loadIndex(platform: 'twitter' | 'instagram'): PostIndex {
  const file = platform === 'twitter' ? TWITTER_INDEX_FILE : INSTAGRAM_INDEX_FILE;

  if (existsSync(file)) {
    try {
      const data = JSON.parse(readFileSync(file, 'utf-8'));

      // Backward compatibility: handle old field names
      // Old: tweetIds, recentTweetIds -> New: postIds, recentPostIds
      const topics = (data.postedTopics || []).map((topic: any) => ({
        ...topic,
        postIds: topic.postIds || topic.tweetIds || [],
      }));

      // Handle both old (recentTweetIds) and new (recentPostIds) field names
      const recentIds = data.recentPostIds || data.recentTweetIds || [];

      return {
        lastUpdated: data.lastUpdated || new Date().toISOString(),
        postedTopics: topics,
        recentPostIds: recentIds,
        recentTexts: data.recentTexts || [],
      };
    } catch {
      // Return default if file is corrupted
    }
  }

  return {
    lastUpdated: new Date().toISOString(),
    postedTopics: [],
    recentPostIds: [],
    recentTexts: [],
  };
}

/**
 * Save index file
 */
function saveIndex(platform: 'twitter' | 'instagram', index: PostIndex): void {
  const file = platform === 'twitter' ? TWITTER_INDEX_FILE : INSTAGRAM_INDEX_FILE;
  index.lastUpdated = new Date().toISOString();
  writeFileSync(file, JSON.stringify(index, null, 2));
}

/**
 * Normalize text for comparison
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, '') // Remove URLs
    .replace(/[@#]\w+/g, '') // Remove mentions and hashtags
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
}

/**
 * Calculate text similarity (Jaccard index on words)
 */
function calculateSimilarity(text1: string, text2: string): number {
  const words1 = new Set(normalizeText(text1).split(' ').filter(w => w.length > 3));
  const words2 = new Set(normalizeText(text2).split(' ').filter(w => w.length > 3));

  if (words1.size === 0 && words2.size === 0) return 0;

  const intersection = new Set([...words1].filter(w => words2.has(w)));
  const union = new Set([...words1, ...words2]);

  return intersection.size / union.size;
}

/**
 * Check if text contains any keywords from a topic
 */
function containsTopicKeywords(text: string, keywords: string[]): boolean {
  const normalizedText = normalizeText(text);
  return keywords.some(keyword =>
    normalizedText.includes(keyword.toLowerCase())
  );
}

/**
 * Check for duplicate content before posting
 */
export async function checkDuplicate(
  platform: 'twitter' | 'instagram',
  text: string,
  options: {
    topic?: string;
    minDaysBetweenSameTopic?: number;
  } = {}
): Promise<DuplicateCheckResult> {
  const index = loadIndex(platform);
  const normalizedText = normalizeText(text);
  const minDays = options.minDaysBetweenSameTopic || 7;

  // 1. Check exact text match
  for (const recentText of index.recentTexts) {
    if (normalizeText(recentText) === normalizedText) {
      return {
        isDuplicate: true,
        reason: 'Exact text match found in recent posts',
        similarity: 1.0,
      };
    }
  }

  // 2. Check high similarity
  for (const recentText of index.recentTexts) {
    const similarity = calculateSimilarity(text, recentText);
    if (similarity >= SIMILARITY_THRESHOLD) {
      return {
        isDuplicate: true,
        reason: `High similarity (${(similarity * 100).toFixed(0)}%) with recent post`,
        similarity,
      };
    }
  }

  // 3. Check topic keywords
  for (const topic of index.postedTopics) {
    if (containsTopicKeywords(text, topic.keywords)) {
      const lastPosted = new Date(topic.lastPosted);
      const daysSincePost = (Date.now() - lastPosted.getTime()) / (1000 * 60 * 60 * 24);

      if (daysSincePost < minDays) {
        return {
          isDuplicate: true,
          reason: `Topic "${topic.topic}" was posted ${daysSincePost.toFixed(1)} days ago (min: ${minDays})`,
          matchedTopic: topic.topic,
          matchedPostId: topic.postIds[topic.postIds.length - 1],
        };
      }
    }
  }

  // 4. If specific topic provided, check it
  if (options.topic) {
    const existingTopic = index.postedTopics.find(t => t.topic === options.topic);
    if (existingTopic) {
      const lastPosted = new Date(existingTopic.lastPosted);
      const daysSincePost = (Date.now() - lastPosted.getTime()) / (1000 * 60 * 60 * 24);

      if (daysSincePost < minDays) {
        return {
          isDuplicate: true,
          reason: `Topic "${options.topic}" was explicitly posted ${daysSincePost.toFixed(1)} days ago`,
          matchedTopic: options.topic,
        };
      }
    }
  }

  return { isDuplicate: false };
}

/**
 * Record a post after successful publishing
 */
export async function recordPost(
  platform: 'twitter' | 'instagram',
  post: {
    id: string;
    text: string;
    topic?: string;
    keywords?: string[];
  }
): Promise<void> {
  const index = loadIndex(platform);
  const today = new Date().toISOString().split('T')[0];

  // Add to recent IDs (keep last 100)
  index.recentPostIds.unshift(post.id);
  if (index.recentPostIds.length > 100) {
    index.recentPostIds = index.recentPostIds.slice(0, 100);
  }

  // Add to recent texts (keep last 50)
  index.recentTexts.unshift(post.text);
  if (index.recentTexts.length > 50) {
    index.recentTexts = index.recentTexts.slice(0, 50);
  }

  // Update or create topic
  if (post.topic) {
    const existingTopic = index.postedTopics.find(t => t.topic === post.topic);

    if (existingTopic) {
      existingTopic.postIds.push(post.id);
      existingTopic.lastPosted = today;
      if (post.keywords) {
        // Merge keywords
        const allKeywords = new Set([...existingTopic.keywords, ...post.keywords]);
        existingTopic.keywords = [...allKeywords];
      }
    } else {
      index.postedTopics.push({
        topic: post.topic,
        keywords: post.keywords || [],
        postIds: [post.id],
        firstPosted: today,
        lastPosted: today,
      });
    }
  }

  saveIndex(platform, index);
}

/**
 * Get duplicate check report for agents
 */
export async function getDuplicateReport(platform: 'twitter' | 'instagram'): Promise<{
  totalTopics: number;
  recentPostCount: number;
  topicsPostedLast7Days: string[];
  safeTopics: string[];
}> {
  const index = loadIndex(platform);
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const recentTopics = index.postedTopics
    .filter(t => new Date(t.lastPosted) > sevenDaysAgo)
    .map(t => t.topic);

  const safeTopics = index.postedTopics
    .filter(t => new Date(t.lastPosted) <= sevenDaysAgo)
    .map(t => t.topic);

  return {
    totalTopics: index.postedTopics.length,
    recentPostCount: index.recentPostIds.length,
    topicsPostedLast7Days: recentTopics,
    safeTopics,
  };
}

/**
 * Add topic manually (for retroactive indexing)
 */
export async function addTopic(
  platform: 'twitter' | 'instagram',
  topic: PostedTopic
): Promise<void> {
  const index = loadIndex(platform);

  const existing = index.postedTopics.find(t => t.topic === topic.topic);
  if (existing) {
    existing.keywords = [...new Set([...existing.keywords, ...topic.keywords])];
    existing.postIds = [...new Set([...existing.postIds, ...topic.postIds])];
    existing.lastPosted = topic.lastPosted;
  } else {
    index.postedTopics.push(topic);
  }

  saveIndex(platform, index);
}

// Export for direct use
export const duplicateChecker = {
  check: checkDuplicate,
  record: recordPost,
  getReport: getDuplicateReport,
  addTopic,
};
