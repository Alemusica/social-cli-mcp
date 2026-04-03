/**
 * Outreach Services Barrel Export
 *
 * All outreach functionality: pipeline, conversation, intelligence,
 * logistics, scheduler, preflight.
 */

// ── Conversation ──
export {
  conversationStore,
  getConversation,
  getConversationDashboard,
  backfillThreadIds,
  getGmailConversation,
  syncManualSentMessages,
  persistManualSentEmail,
  type ThreadMessage,
  type OutreachConversation,
  type ConversationDashboard,
} from "./conversation.js";

// ── Pipeline ──
export {
  runPipeline,
  getBatchPreview,
  getEmailDetail,
  approveBatch,
  sendApprovedBatch,
  getBatchStatus,
  getDailyLimits,
  getOrchestrationStats,
  type PipelineBatch,
  type PipelineConfig,
  type PipelineResult,
  type OutreachEmail,
  type SendResult,
  type DailyLimits,
} from "./pipeline.js";

// ── Intelligence Router ──
export {
  intelligenceRouter,
  routeEvent,
  routeReplyEvent,
  formatBriefingForTelegram,
  formatBriefingForConsole,
  type EventType,
  type IntelligenceEvent,
  type IntelligenceBriefing,
  type ConversationBriefing,
  type BrandReview,
} from "./intelligence.js";

// ── Logistics ──
export {
  buildLogisticsBriefing,
  buildClusterBriefing,
  getRegionCosts,
  HOME_BASE,
  NO_FLIGHT_COUNTRIES,
  costByRegion,
  DEFAULT_COSTS,
  type LogisticsBriefing,
  type ClusterBriefing,
  type RegionCosts,
} from "./logistics.js";

// ── Scheduler ──
export {
  outreachScheduler,
  getUncontactedByCountry,
  generateOutreachPlan,
  createBatchFromPlan,
  type RawVenueData,
  type OutreachBatchPlan,
  type OutreachPlan,
  type CountryStats,
} from "./scheduler.js";

// ── Preflight ──
export {
  preflight,
  preflightCheck,
  type ActionType,
  type PreflightResult,
} from "./preflight.js";
