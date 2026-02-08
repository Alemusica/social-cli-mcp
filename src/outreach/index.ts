/**
 * FLUTUR Outreach Module
 *
 * Clean interface for outreach pipeline, learning, and safety.
 * Used by: scripts, morning-check, alessio-os API, MCP tools.
 */

export {
  loadTracking,
  getPipelineStats,
  getFunnelBy,
  getOverdueFollowUps,
  type TrackingEntry,
  type PipelineStats,
  type FunnelByDimension,
} from './pipeline.js';

export {
  analyze as analyzeOutreach,
  type OutreachLearning,
  type LearningInsight,
} from './learning.js';

export {
  wasEmailSentToday,
  isDailyLimitReached,
  recordSend,
  getTodaySendCount,
  safeSendEmail,
} from '../utils/email-guard.js';

export {
  getConversation,
  getConversationDashboard,
  backfillThreadIds,
  getGmailConversation,
  syncTrackingToDb,
  conversationStore,
  type ThreadMessage,
  type OutreachConversation,
  type ConversationDashboard,
} from './conversation-store.js';
