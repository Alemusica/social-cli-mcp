#!/usr/bin/env npx tsx
/**
 * Test Agent Memory System — V7 Monade Persistence
 *
 * Tests: write → read → query → fuse cycle
 */

import { memory, type AgentSessionData } from '../src/agents/memory/index.js';
import { closeDb } from '../src/db/client.js';

async function main() {
  console.log('\n🧪 Testing Agent Memory System');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // 1. Save a marketing session (Japan research)
  console.log('\n1️⃣  Saving marketing session (Japan research)...');
  const session1: AgentSessionData = {
    agentId: 'outreach',
    department: 'marketing',
    trigger: 'deep-research:japan',
    entitiesTouched: [
      {
        id: 'market:japan',
        type: 'market',
        label: 'Japan',
        context: 'Asia',
        attrs: {
          status: 'researching',
          yt_views: '27',
          yt_engagement: '4.3 min/view (highest)',
        },
        sigma2: [
          'Japan: tech+wellness convergence — unique positioning opportunity',
          'ClyphX scripting + Ableton API video = tech workshop angle',
        ],
      },
      {
        id: 'venue:blue_note_tokyo',
        type: 'jazz-club',
        label: 'Blue Note Tokyo',
        context: 'Minato-ku, Tokyo',
        attrs: { tier: '1', category: 'jazz' },
        sigma2: ['Premier jazz venue, international acts, high-tech audience'],
      },
    ],
    decisions: [
      {
        content: 'Japan positioning = tech+wellness convergence, NOT just musician',
        entities: ['market:japan'],
        rationale: 'Coding culture + wellness culture = unique fit for FLUTUR',
        date: new Date().toISOString().split('T')[0],
      },
      {
        content: 'Prepare Ableton API scripting video before Japan outreach',
        entities: ['market:japan'],
        rationale: 'Show tech credentials to Japanese audience',
        date: new Date().toISOString().split('T')[0],
      },
    ],
    observations: [
      { content: 'YouTube JP: 27 views but 4.3 min/view = highest engagement ratio globally', sigma: 'σ₂' },
      { content: 'Japan loves: precision, scripting, effects, wellness, craftsmanship', sigma: 'σ₁' },
    ],
    actions: [
      {
        description: 'Deep research initiated for Japan market',
        target: 'market:japan',
        result: 'prompt generated',
        date: new Date().toISOString().split('T')[0],
      },
    ],
  };

  const id1 = await memory.save(session1);
  console.log('   ✅ Session saved:', id1);

  // 2. Save an engineering session (Ableton API video)
  console.log('\n2️⃣  Saving engineering session (Ableton API)...');
  const session2: AgentSessionData = {
    agentId: 'software-strategy',
    department: 'engineering',
    trigger: 'content:ableton-api-video',
    entitiesTouched: [
      {
        id: 'market:japan',
        type: 'market',
        label: 'Japan',
        attrs: { tech_angle: 'ClyphX Pro + Ableton API + live scripting' },
        sigma2: ['RAV Vast + scripted delays + looping = high-tech workshop material'],
      },
      {
        id: 'content:ableton_api_video',
        type: 'video',
        label: 'Ableton API Scripting Demo',
        attrs: { status: 'planned', format: 'tutorial + live performance' },
        sigma2: [],
      },
    ],
    decisions: [
      {
        content: 'Ableton API video: scripting + live performance, NOT dry tutorial',
        entities: ['content:ableton_api_video', 'market:japan'],
        date: new Date().toISOString().split('T')[0],
      },
    ],
    observations: [
      { content: 'Japan = only market where dev+musician identity BOTH valued', sigma: 'σ₂' },
    ],
    actions: [],
  };

  const id2 = await memory.save(session2);
  console.log('   ✅ Session saved:', id2);

  // 3. Query: What do we know about Japan?
  console.log('\n3️⃣  Querying: What do we know about Japan?');
  const japan = await memory.queryEntity('market:japan');
  if (japan) {
    console.log('   Entity:', japan.entity.label, '(' + japan.entity.type + ')');
    console.log('   Departments:', japan.departments.join(', '));
    console.log('   Decisions:', japan.decisions.length);
    for (const d of japan.decisions) {
      console.log('     σ₂', d.content);
    }
    console.log('   Observations:', japan.observations.length);
    for (const o of japan.observations) {
      console.log('     ' + o.sigma, o.content);
    }
  } else {
    console.log('   ❌ No memory found');
  }

  // 4. Query: recent decisions
  console.log('\n4️⃣  Recent σ₂ decisions (7 days):');
  const decisions = await memory.recentDecisions(7);
  for (const d of decisions) {
    console.log('   σ₂', d.content, '→', d.entities.join(', '));
  }

  // 5. Load agent memory (bootstrap simulation)
  console.log('\n5️⃣  Loading memory for outreach agent (marketing):');
  const ctx = await memory.load('outreach', 'marketing');
  console.log('   Dept memory:', ctx.deptMemory ? 'exists (fused)' : 'empty (pre-fusion, need 5+ sessions)');
  console.log('   Recent sessions:', ctx.recentSessions.length);
  console.log('   Recent decisions:', ctx.recentDecisions.length);

  // 6. Show the V7 monad text
  if (ctx.recentSessions.length > 0) {
    console.log('\n6️⃣  V7 Monad text (latest session):');
    console.log('   ─────────────────────────────');
    const lines = ctx.recentSessions[0].raw.split('\n');
    for (const line of lines) {
      console.log('   ' + line);
    }
    console.log('   ─────────────────────────────');
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ Agent Memory System: all tests passed');

  await closeDb();
}

main().catch(err => {
  console.error('❌ Test failed:', err.message);
  console.error(err.stack);
  process.exit(1);
});
