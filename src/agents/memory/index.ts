/**
 * Agent Memory Module — V7 Monade Persistence
 *
 * Usage:
 *   import { memory } from '../agents/memory/index.js';
 *
 *   // Bootstrap: load memory for an agent
 *   const ctx = await memory.load('daily-brief', 'reception');
 *
 *   // Save: persist session as V7 monad
 *   const sessionId = await memory.save({ agentId, department, ... });
 *
 *   // Query: what do we know about Japan?
 *   const japan = await memory.queryEntity('market:japan');
 *
 *   // Fuse: merge sessions into department memory (auto-triggered)
 *   await memory.fuse('marketing');
 */

// Types
export type {
  Department,
  SigmaLevel,
  V7Monad,
  V7Entity,
  V7Decision,
  V7Observation,
  V7Action,
  AgentSessionData,
  AgentSessionRecord,
  DeptMemoryRecord,
  MemoryLinkRecord,
  EntityMemory,
  DeptMemorySummary,
} from './types.js';

export { AGENT_DEPARTMENT } from './types.js';

// Writer
export { serializeToV7, parseV7, saveSession } from './writer.js';

// Reader
export {
  getMemoryByEntity,
  getDeptEntityMemory,
  getDeptMemory,
  getDeptMemorySummary,
  getRecentDecisions,
  searchDecisions,
  getRecentSessions,
  getLastSession,
  getEntityDepartments,
  getSharedEntities,
  loadAgentMemory,
} from './reader.js';

// Fuser
export { fuseMonads, maybeFuse } from './fuser.js';

// Session Log (human↔Claude conversation persistence — SQL + Graph + Vector)
export {
  saveSessionLog,
  getRecentSessionLogs,
  getSessionLogsByEntity,
  semanticSearchSessions,
  loadSessionContext,
} from './session-log.js';
export type { SessionLogEntry } from './session-log.js';

// ═══════════════════════════════════════════════════════════════
// CONVENIENCE NAMESPACE
// ═══════════════════════════════════════════════════════════════

import { saveSession } from './writer.js';
import {
  loadAgentMemory,
  getMemoryByEntity,
  getDeptMemory,
  getDeptMemorySummary,
  getRecentDecisions,
  searchDecisions,
  getSharedEntities,
} from './reader.js';
import { maybeFuse } from './fuser.js';
import type { AgentSessionData, Department } from './types.js';

export const memory = {
  /** Load memory context for an agent at bootstrap */
  load: loadAgentMemory,

  /** Save a session and auto-fuse if threshold exceeded */
  async save(session: AgentSessionData): Promise<string> {
    const sessionId = await saveSession(session);
    await maybeFuse(session.department);
    return sessionId;
  },

  /** Query entity intelligence across departments */
  queryEntity: getMemoryByEntity,

  /** Get department's fused working memory */
  dept: getDeptMemory,

  /** Get department memory summary (counts, last updated) */
  deptSummary: getDeptMemorySummary,

  /** Get σ₂ decisions from last N days */
  recentDecisions: getRecentDecisions,

  /** Search decisions by keyword */
  searchDecisions,

  /** Entities that multiple departments have intelligence about */
  sharedEntities: getSharedEntities,

  /** Manually trigger fusion for a department */
  fuse: maybeFuse,
};
