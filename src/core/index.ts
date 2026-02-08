/**
 * FLUTUR Core System
 *
 * Single import point for all system functionality.
 *
 * Usage:
 *   import { bootstrap, systemContext, credentials, db } from './core/index.js';
 *
 *   await bootstrap();
 *   const ctx = await systemContext.get();
 */

// Bootstrap
export { bootstrap, quickBootstrap, shutdown, type BootstrapResult } from './bootstrap.js';

// System Context
export {
  getSystemContext,
  printSystemStatus,
  getContextForPrompt,
  systemContext,
  type SystemContext,
} from './context.js';

// Credentials
export {
  getFromKeychain,
  setInKeychain,
  loadCredentialsToEnv,
  getCredentialsStatus,
  syncCredentialsToDb,
  printCredentialsStatus,
  credentials,
  type CredentialKey,
  type PlatformStatus,
  type CredentialsStatus,
} from './credentials.js';

// Re-export DB client for convenience
export { getDb, closeDb } from '../db/client.js';

// Re-export artist profile
export { ARTIST_PROFILE } from '../db/artist-profile.js';

// Supabase (Photo Management)
export {
  getSupabase,
  uploadPhoto,
  getPhoto,
  annotatePhoto,
  getPhotosNeedingLabels,
  getPhotosNeedingSync,
  markPhotoSynced,
  searchPhotos,
  getPhotoUrl,
  type PhotoRecord,
} from '../db/supabase-client.js';

// Duplicate Checker (Twitter & Instagram)
export {
  checkDuplicate,
  recordPost,
  getDuplicateReport,
  addTopic,
  duplicateChecker,
  type PostedTopic,
  type PostIndex,
  type DuplicateCheckResult,
} from './duplicate-checker.js';

// Database helpers for agents
export {
  query,
  queryOne,
  create,
  update,
  remove,
  relate,
  db,
  getActiveArc,
  getTodayContent,
  getContentByDay,
  getUnusedContent,
  getTopHashtags,
  getPendingFollowups,
  getArtistProfile,
  getContentStats,
  getUpcomingGigs,
  getRecentPerformance,
} from './db-helpers.js';

// Insights Archiver (Instagram insights persistence)
export {
  archiveAudienceInsights,
  getAudienceEvolution,
  getLatestAudienceSnapshot,
  needsFreshInsights,
  archiveAndAnalyze,
  getCorridorAnalysis,
  insightsArchiver,
  type AudienceSnapshotRecord,
  type InsightsEvolution,
} from './insights-archiver.js';

// Editorial Intelligence (content strategy brain)
export {
  getContentBrief,
  suggestNarrativeArc,
  getTodayStoryPrompt,
  saveNarrativeArc,
  editorialIntelligence,
  type ContentBrief,
  type NarrativeArc,
} from './editorial-intelligence.js';

// Content Drafter (interview-based post generation)
export {
  startDraftSession,
  completeDraftSession,
  getContentReadyForDrafting,
  markContentUsed,
  generateQuestions,
  generateDrafts,
  contentDrafter,
  type ContentContext,
  type DraftQuestion,
  type DraftSession,
  type PostDraft,
  type DraftResult,
} from './content-drafter.js';

// Pillar Helpers (centralized pillar logic)
export {
  BRAND_PILLARS,
  getPillarHashtags,
  determinePillarFromContent,
  getWeeklyPillarBalance,
  checkConsecutivePillarRule,
  getPillarQuestionAngles,
  type PillarKey,
} from './pillar-helpers.js';

// Cross-Platform Analytics (YouTube + Instagram + EPK correlation)
export {
  youtubeFetcher,
  instagramFetcher,
  correlator,
  saveYouTubeSnapshot,
  saveInstagramSnapshot,
  saveEpkAnalytics,
  type YouTubeChannelSnapshot,
  type InstagramSnapshot,
  type CorrelationEvent,
  type DailyDigest,
  type AnalyticsSnapshot,
} from '../analytics/index.js';

// Agent Memory (V7 Monade Persistence)
export {
  memory,
  AGENT_DEPARTMENT,
  serializeToV7,
  parseV7,
  saveSession,
  loadAgentMemory,
  getMemoryByEntity,
  getDeptMemory,
  getRecentDecisions,
  fuseMonads,
  maybeFuse,
  type Department,
  type V7Monad,
  type V7Entity,
  type V7Decision,
  type AgentSessionData,
  type EntityMemory,
} from '../agents/memory/index.js';

// Session Narrative Log (Human↔Claude persistence — SQL + Graph + Vector)
export {
  saveSessionLog,
  getRecentSessionLogs,
  getSessionLogsByEntity,
  semanticSearchSessions,
  loadSessionContext,
  type SessionLogEntry,
} from '../agents/memory/index.js';

// Story Fragments (Editorial Department — biographical source material)
export {
  saveFragment,
  getFragmentsByTheme,
  getFragmentsForChannel,
  getUnpublishedFragments,
  markPublished,
  getFragmentsByEntity,
  getAllFragments,
  storyStore,
  type StoryFragment,
  type StoryTheme,
} from '../db/story-store.js';

// Web Research Persistence (search cache + knowledge base)
export {
  saveResearch,
  findResearch,
  searchByQuery,
  invalidateResearch,
  getRecentResearch,
  researchStore,
  type WebResearchEntry,
} from '../db/research-store.js';

// Gmail Reader (API-based inbox scanning + reply persistence)
export {
  gmailReader,
  listMessages,
  getMessage,
  scanOutreachReplies,
  scanSentEmails,
  persistReply,
  classifyReply,
  getPersistedReplies,
  isReplyPersisted,
  getThread,
  findThreadByMessageId,
  type GmailMessage,
  type GmailThread,
  type InboxScanResult,
} from '../clients/gmail-reader.js';

// Outreach Conversation Store (thread view, sync, dashboard)
export {
  conversationStore,
  getConversation,
  getConversationDashboard,
  backfillThreadIds,
  getGmailConversation,
  syncTrackingToDb,
  type ThreadMessage,
  type OutreachConversation,
  type ConversationDashboard,
} from '../outreach/conversation-store.js';

// Intelligence Router (event→action dispatcher, auto-briefings)
export {
  intelligenceRouter,
  routeEvent,
  routeReplyEvent,
  formatBriefingForConsole,
  formatBriefingForTelegram,
  type IntelligenceEvent,
  type IntelligenceBriefing,
  type LogisticsBriefing,
  type ClusterBriefing,
  type ConversationBriefing,
  type EventType,
} from '../agents/intelligence-router.js';
