#!/usr/bin/env npx tsx
/**
 * DIGITAL DEPARTMENT: Workflow Orchestrator
 *
 * The main control center for the iterative content optimization loop:
 *
 * ┌─────────────────────────────────────────────────────────────┐
 * │                    WORKFLOW STAGES                          │
 * ├─────────────────────────────────────────────────────────────┤
 * │  1. PLAN    → Load posts from calendar                      │
 * │  2. ANALYZE → Check hashtag performance data                │
 * │  3. OPTIMIZE → Refine hashtags & captions                   │
 * │  4. POST    → Publish to Instagram (manual confirm)         │
 * │  5. MONITOR → Track performance in real-time                │
 * │  6. LEARN   → Feed data back into next cycle                │
 * └─────────────────────────────────────────────────────────────┘
 *
 * API Call Budget (10 remaining this week):
 * - 5 for posting (creates container + publishes)
 * - 5 for iterative analysis (media insights, hashtag analysis)
 */

import * as fs from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import Surreal from 'surrealdb';
import { InstagramClient } from '../clients/instagram.js';
import { loadCredentialsToEnv, getFromKeychain } from '../core/credentials.js';
import { getDb } from '../db/client.js';

loadCredentialsToEnv();

// Dynamic paths relative to project root
const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..', '..');
const POSTS_FILE = join(PROJECT_ROOT, 'content', 'instagram-posts-ready.json');
const OPTIMIZED_FILE = join(PROJECT_ROOT, 'content', 'instagram-posts-optimized.json');
const WORKFLOW_STATE_FILE = join(PROJECT_ROOT, 'analytics', 'workflow-state.json');

interface WorkflowState {
  currentStage: 'plan' | 'analyze' | 'optimize' | 'post' | 'monitor' | 'learn';
  lastRun: string;
  apiCallsUsed: number;
  apiCallsRemaining: number;
  currentPostId: number | null;
  monitoredPosts: string[];
  nextActions: string[];
}

function loadWorkflowState(): WorkflowState {
  if (fs.existsSync(WORKFLOW_STATE_FILE)) {
    return JSON.parse(fs.readFileSync(WORKFLOW_STATE_FILE, 'utf-8'));
  }
  return {
    currentStage: 'plan',
    lastRun: new Date().toISOString(),
    apiCallsUsed: 0,
    apiCallsRemaining: 10,
    currentPostId: null,
    monitoredPosts: [],
    nextActions: [],
  };
}

function saveWorkflowState(state: WorkflowState) {
  fs.writeFileSync(WORKFLOW_STATE_FILE, JSON.stringify(state, null, 2));
}

async function showStatus(db: Surreal, instagram: InstagramClient) {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║            DIGITAL DEPARTMENT STATUS                         ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  const state = loadWorkflowState();

  // Current stage
  const stages = ['plan', 'analyze', 'optimize', 'post', 'monitor', 'learn'];
  const stageIndex = stages.indexOf(state.currentStage);
  console.log('📍 WORKFLOW STAGE:');
  console.log('   ' + stages.map((s, i) => {
    if (i < stageIndex) return `✅ ${s}`;
    if (i === stageIndex) return `🔄 ${s.toUpperCase()}`;
    return `⬜ ${s}`;
  }).join(' → '));

  // API budget
  console.log('\n💳 API BUDGET:');
  const used = '█'.repeat(state.apiCallsUsed);
  const remaining = '░'.repeat(state.apiCallsRemaining);
  console.log(`   [${used}${remaining}] ${state.apiCallsUsed}/10 used`);
  console.log(`   Posting: ~${Math.floor(state.apiCallsRemaining / 2)} posts`);
  console.log(`   Analysis: ~${Math.floor(state.apiCallsRemaining / 2)} checks`);

  // Posts status
  console.log('\n📝 POSTS QUEUE:');
  if (fs.existsSync(POSTS_FILE)) {
    const posts = JSON.parse(fs.readFileSync(POSTS_FILE, 'utf-8')).posts;
    for (const post of posts.slice(0, 4)) {
      const status = post.id <= (state.currentPostId || 0) ? '✅' : '⬜';
      console.log(`   ${status} ${post.id}. ${post.title} (${post.type})`);
    }
  }

  // Hashtag analysis summary
  console.log('\n🏷️  HASHTAG INTELLIGENCE:');
  const hashtagCount = await db.query(`SELECT count() as c FROM hashtag_analysis GROUP ALL`);
  const count = (hashtagCount[0] as any)?.[0]?.c || 0;
  console.log(`   ${count} hashtags analyzed`);

  const topHashtags = await db.query(`
    SELECT hashtag_name, engagement_score FROM hashtag_analysis
    ORDER BY engagement_score DESC LIMIT 5
  `);
  const top = (topHashtags[0] as any[]) || [];
  if (top.length > 0) {
    console.log(`   Top: ${top.map(h => `#${h.hashtag_name}`).join(' ')}`);
  }

  // Monitored posts
  if (state.monitoredPosts.length > 0) {
    console.log('\n📊 MONITORING:');
    for (const mediaId of state.monitoredPosts.slice(0, 3)) {
      const monitor = await db.query(`
        SELECT snapshots FROM post_monitor WHERE media_id = $id
      `, { id: mediaId });
      const snapshots = (monitor[0] as any)?.[0]?.snapshots || [];
      const latest = snapshots[snapshots.length - 1];
      if (latest) {
        console.log(`   ${mediaId.substring(0, 12)}... | ${latest.likes} likes | ${latest.engagementRate}% eng`);
      }
    }
  }

  // Next actions
  console.log('\n🎯 RECOMMENDED ACTIONS:');
  const actions = determineNextActions(state);
  for (const action of actions) {
    console.log(`   → ${action}`);
  }

  return state;
}

function determineNextActions(state: WorkflowState): string[] {
  const actions: string[] = [];

  switch (state.currentStage) {
    case 'plan':
      actions.push('Run: npx tsx src/digital-department/optimize-posts.ts');
      break;
    case 'analyze':
      if (state.apiCallsRemaining > 5) {
        actions.push('Run hashtag analysis for remaining budget');
      }
      actions.push('Move to optimize stage when ready');
      break;
    case 'optimize':
      actions.push('Review optimized posts');
      actions.push('When ready, move to post stage');
      break;
    case 'post':
      actions.push('Post next item from queue (confirm manually)');
      actions.push('After posting, start monitoring');
      break;
    case 'monitor':
      if (state.monitoredPosts.length > 0) {
        actions.push('Run: npx tsx src/digital-department/monitor-post.ts <media_id>');
      }
      actions.push('Check post performance at 1h, 4h, 24h marks');
      break;
    case 'learn':
      actions.push('Review performance data');
      actions.push('Start new cycle with insights');
      break;
  }

  return actions;
}

async function advanceStage(state: WorkflowState): Promise<WorkflowState> {
  const stages: WorkflowState['currentStage'][] = ['plan', 'analyze', 'optimize', 'post', 'monitor', 'learn'];
  const currentIndex = stages.indexOf(state.currentStage);
  const nextIndex = (currentIndex + 1) % stages.length;

  state.currentStage = stages[nextIndex];
  state.lastRun = new Date().toISOString();

  console.log(`\n✅ Advanced to stage: ${state.currentStage.toUpperCase()}`);
  return state;
}

async function main() {
  const command = process.argv[2] || 'status';

  // Initialize DB (uses centralized client with env vars)
  const db = await getDb();

  // Initialize Instagram client with proper validation
  const accessToken = getFromKeychain('INSTAGRAM_ACCESS_TOKEN');
  const businessAccountId = getFromKeychain('INSTAGRAM_BUSINESS_ACCOUNT_ID');
  const facebookPageId = getFromKeychain('FACEBOOK_PAGE_ID');

  if (!accessToken || !businessAccountId) {
    console.error('❌ Missing Instagram credentials in Keychain');
    console.log('   Required: INSTAGRAM_ACCESS_TOKEN, INSTAGRAM_BUSINESS_ACCOUNT_ID');
    process.exit(1);
  }

  const instagram = new InstagramClient({
    accessToken,
    businessAccountId,
    facebookPageId: facebookPageId || '',
  });

  switch (command) {
    case 'status':
      await showStatus(db, instagram);
      break;

    case 'next':
      const state = loadWorkflowState();
      const newState = await advanceStage(state);
      saveWorkflowState(newState);
      await showStatus(db, instagram);
      break;

    case 'use-api':
      const useState = loadWorkflowState();
      const amount = parseInt(process.argv[3] || '1');
      useState.apiCallsUsed += amount;
      useState.apiCallsRemaining = Math.max(0, useState.apiCallsRemaining - amount);
      saveWorkflowState(useState);
      console.log(`✅ Recorded ${amount} API call(s). Remaining: ${useState.apiCallsRemaining}`);
      break;

    case 'add-monitor':
      const monitorState = loadWorkflowState();
      const mediaId = process.argv[3];
      if (mediaId && !monitorState.monitoredPosts.includes(mediaId)) {
        monitorState.monitoredPosts.push(mediaId);
        saveWorkflowState(monitorState);
        console.log(`✅ Added ${mediaId} to monitoring list`);
      }
      break;

    case 'reset':
      const freshState: WorkflowState = {
        currentStage: 'plan',
        lastRun: new Date().toISOString(),
        apiCallsUsed: 0,
        apiCallsRemaining: 10,
        currentPostId: null,
        monitoredPosts: [],
        nextActions: [],
      };
      saveWorkflowState(freshState);
      console.log('✅ Workflow reset to initial state');
      break;

    default:
      console.log('DIGITAL DEPARTMENT - Workflow Orchestrator');
      console.log('');
      console.log('Usage:');
      console.log('  npx tsx workflow.ts status      Show current status');
      console.log('  npx tsx workflow.ts next        Advance to next stage');
      console.log('  npx tsx workflow.ts use-api N   Record N API calls used');
      console.log('  npx tsx workflow.ts add-monitor <media_id>  Add post to monitor');
      console.log('  npx tsx workflow.ts reset       Reset workflow state');
  }

  await db.close();
}

main().catch(console.error);
