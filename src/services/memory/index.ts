/**
 * Memory Services Barrel
 *
 * Exports session log, agent memory, story store, research store.
 * All functions require tenantId as first parameter.
 */

// Session Log
export {
  saveSessionLog,
  getRecentSessionLogs,
  getSessionLogsByEntity,
  semanticSearchSessions,
  loadSessionContext,
  type SessionLogEntry,
} from "./session-log.js";

// Agent Memory (V7 Monade)
export {
  agentMemory,
  saveSession,
  loadAgentMemory,
  maybeFuse,
  fuseMonads,
  getMemoryByEntity,
  getDeptMemory,
  getRecentSessions,
  getLastSession,
  getRecentDecisions,
  parseV7,
  serializeToV7,
  AGENT_DEPARTMENT,
  type Department,
  type SigmaLevel,
  type V7Entity,
  type V7Decision,
  type V7Observation,
  type V7Action,
  type V7Monad,
  type AgentSessionData,
  type EntityMemory,
  type DeptMemorySummary,
} from "./agent-memory.js";

// Story Store
export {
  storyStore,
  saveFragment,
  getFragmentsByTheme,
  getFragmentsForChannel,
  getUnpublishedFragments,
  markPublished,
  getFragmentsByEntity,
  getAllFragments,
  type StoryFragment,
  type StoryTheme,
} from "./story-store.js";

// Research Store
export {
  researchStore,
  saveResearch,
  findResearch,
  searchByQuery,
  invalidateResearch,
  getRecentResearch,
  type WebResearchEntry,
} from "./research-store.js";
