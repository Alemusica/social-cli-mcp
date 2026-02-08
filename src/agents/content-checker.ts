/**
 * Content Checker
 * Verifies content before posting to avoid duplicates
 *
 * Usage:
 *   import { checkTweetDuplicate, recordPostedTweet } from './content-checker.js';
 *
 *   // Before posting
 *   const isDuplicate = await checkTweetDuplicate('precision mode', 'some tweet text about precision');
 *   if (isDuplicate.found) {
 *     console.log('Duplicate found:', isDuplicate.topic, 'posted on', isDuplicate.lastPosted);
 *   }
 *
 *   // After posting
 *   await recordPostedTweet('precision_mode', 'tweet123', 'some tweet text');
 */

import * as fs from 'fs';
import * as path from 'path';

const ANALYTICS_DIR = path.join(process.cwd(), 'analytics');
const TWEETS_INDEX_PATH = path.join(ANALYTICS_DIR, 'posted-tweets-index.json');
const PENDING_ACTIONS_PATH = path.join(ANALYTICS_DIR, 'pending-actions.json');

interface PostedTopic {
  topic: string;
  keywords: string[];
  tweetIds: string[];
  firstPosted: string;
  lastPosted: string;
  note?: string;
}

interface TweetsIndex {
  lastUpdated: string;
  postedTopics: PostedTopic[];
  recentTweetIds: string[];
}

interface ManualAction {
  id: string;
  type: string;
  venue: string;
  website?: string;
  phone?: string;
  status: string;
  priority: number;
  createdAt: string;
  notes?: string;
}

interface FollowUp {
  id: string;
  type: string;
  dueDate: string;
  venues: string[];
  status: string;
  notes?: string;
}

interface PendingActionsData {
  lastUpdated: string;
  manualActions: ManualAction[];
  followUps: FollowUp[];
  contentReminders: any[];
}

function loadTweetsIndex(): TweetsIndex {
  try {
    const data = fs.readFileSync(TWEETS_INDEX_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (e) {
    return {
      lastUpdated: new Date().toISOString(),
      postedTopics: [],
      recentTweetIds: []
    };
  }
}

function saveTweetsIndex(index: TweetsIndex): void {
  index.lastUpdated = new Date().toISOString();
  fs.writeFileSync(TWEETS_INDEX_PATH, JSON.stringify(index, null, 2));
}

function loadPendingActions(): PendingActionsData {
  try {
    const data = fs.readFileSync(PENDING_ACTIONS_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (e) {
    return {
      lastUpdated: new Date().toISOString(),
      manualActions: [],
      followUps: [],
      contentReminders: []
    };
  }
}

function savePendingActions(data: PendingActionsData): void {
  data.lastUpdated = new Date().toISOString();
  fs.writeFileSync(PENDING_ACTIONS_PATH, JSON.stringify(data, null, 2));
}

/**
 * Check if a tweet topic/content is a duplicate
 */
export function checkTweetDuplicate(topic: string, content: string): {
  found: boolean;
  topic?: string;
  lastPosted?: string;
  tweetIds?: string[];
  similarity?: string;
} {
  const index = loadTweetsIndex();
  const lowerContent = content.toLowerCase();
  const lowerTopic = topic.toLowerCase();

  for (const posted of index.postedTopics) {
    // Check topic match
    if (posted.topic.toLowerCase() === lowerTopic) {
      return {
        found: true,
        topic: posted.topic,
        lastPosted: posted.lastPosted,
        tweetIds: posted.tweetIds,
        similarity: 'exact topic match'
      };
    }

    // Check keyword match
    for (const keyword of posted.keywords) {
      if (lowerContent.includes(keyword.toLowerCase())) {
        return {
          found: true,
          topic: posted.topic,
          lastPosted: posted.lastPosted,
          tweetIds: posted.tweetIds,
          similarity: `keyword match: "${keyword}"`
        };
      }
    }
  }

  return { found: false };
}

/**
 * Record a posted tweet in the index
 */
export function recordPostedTweet(
  topic: string,
  tweetId: string,
  content: string,
  keywords?: string[]
): void {
  const index = loadTweetsIndex();
  const today = new Date().toISOString().split('T')[0];

  // Find existing topic or create new
  let existing = index.postedTopics.find(t => t.topic === topic);

  if (existing) {
    // Update existing
    if (!existing.tweetIds.includes(tweetId)) {
      existing.tweetIds.push(tweetId);
    }
    existing.lastPosted = today;
    if (existing.tweetIds.length > 1) {
      existing.note = `DUPLICATE DETECTED - ${existing.tweetIds.length} tweets`;
    }
  } else {
    // Create new
    const extractedKeywords = keywords || extractKeywords(content);
    index.postedTopics.push({
      topic,
      keywords: extractedKeywords,
      tweetIds: [tweetId],
      firstPosted: today,
      lastPosted: today
    });
  }

  // Add to recent tweets
  if (!index.recentTweetIds.includes(tweetId)) {
    index.recentTweetIds.unshift(tweetId);
    // Keep only last 50
    index.recentTweetIds = index.recentTweetIds.slice(0, 50);
  }

  saveTweetsIndex(index);
}

/**
 * Extract keywords from content for duplicate detection
 */
function extractKeywords(content: string): string[] {
  const words = content.toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 4);

  // Get unique significant words
  const significant = [...new Set(words)]
    .filter(w => !['about', 'their', 'there', 'would', 'could', 'should', 'being', 'these', 'those'].includes(w))
    .slice(0, 5);

  return significant;
}

/**
 * Get pending manual actions
 */
export function getPendingManualActions(): ManualAction[] {
  const data = loadPendingActions();
  return data.manualActions.filter(a => a.status === 'pending');
}

/**
 * Get pending follow-ups
 */
export function getPendingFollowUps(): FollowUp[] {
  const data = loadPendingActions();
  return data.followUps.filter(f => f.status === 'pending');
}

/**
 * Get follow-ups due today or overdue
 */
export function getDueFollowUps(): FollowUp[] {
  const today = new Date().toISOString().split('T')[0];
  return getPendingFollowUps().filter(f => f.dueDate <= today);
}

/**
 * Add a new manual action
 */
export function addManualAction(action: Omit<ManualAction, 'id' | 'createdAt'>): void {
  const data = loadPendingActions();
  const id = `manual-${Date.now()}`;
  data.manualActions.push({
    ...action,
    id,
    createdAt: new Date().toISOString().split('T')[0]
  });
  savePendingActions(data);
}

/**
 * Mark a manual action as completed
 */
export function completeManualAction(id: string): boolean {
  const data = loadPendingActions();
  const action = data.manualActions.find(a => a.id === id);
  if (action) {
    action.status = 'completed';
    savePendingActions(data);
    return true;
  }
  return false;
}

/**
 * Add a new follow-up
 */
export function addFollowUp(followUp: Omit<FollowUp, 'id'>): void {
  const data = loadPendingActions();
  const id = `followup-${Date.now()}`;
  data.followUps.push({
    ...followUp,
    id
  });
  savePendingActions(data);
}

/**
 * Mark a follow-up as completed
 */
export function completeFollowUp(id: string): boolean {
  const data = loadPendingActions();
  const followUp = data.followUps.find(f => f.id === id);
  if (followUp) {
    followUp.status = 'completed';
    savePendingActions(data);
    return true;
  }
  return false;
}

/**
 * Get a summary of all pending items (for agents)
 */
export function getPendingSummary(): string {
  const manualActions = getPendingManualActions();
  const dueFollowUps = getDueFollowUps();
  const upcomingFollowUps = getPendingFollowUps().filter(f => {
    const today = new Date().toISOString().split('T')[0];
    return f.dueDate > today;
  });

  const lines: string[] = [];

  if (manualActions.length > 0) {
    lines.push(`MANUAL ACTIONS (${manualActions.length}):`);
    manualActions.forEach(a => {
      lines.push(`- ${a.venue} (${a.type}): ${a.phone || a.website || ''}`);
    });
  }

  if (dueFollowUps.length > 0) {
    lines.push(`\nFOLLOW-UPS DUE:`);
    dueFollowUps.forEach(f => {
      lines.push(`- ${f.dueDate}: ${f.venues.join(', ')}`);
    });
  }

  if (upcomingFollowUps.length > 0) {
    lines.push(`\nUPCOMING FOLLOW-UPS:`);
    upcomingFollowUps.forEach(f => {
      lines.push(`- ${f.dueDate}: ${f.venues.join(', ')}`);
    });
  }

  return lines.length > 0 ? lines.join('\n') : 'No pending items';
}

// CLI usage
if (process.argv[1]?.includes('content-checker')) {
  const command = process.argv[2];

  if (command === 'check') {
    const topic = process.argv[3] || '';
    const content = process.argv[4] || topic;
    const result = checkTweetDuplicate(topic, content);
    console.log(JSON.stringify(result, null, 2));
  } else if (command === 'pending') {
    console.log(getPendingSummary());
  } else {
    console.log('Usage:');
    console.log('  npx tsx src/agents/content-checker.ts check "topic" "content"');
    console.log('  npx tsx src/agents/content-checker.ts pending');
  }
}
