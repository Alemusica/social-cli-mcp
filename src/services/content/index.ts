/**
 * Content Services — barrel
 */

export { contentDrafter } from "./drafter.js";
export type {
  ContentContext,
  DraftQuestion,
  DraftSession,
  PostDraftResult,
  DraftResult,
} from "./drafter.js";
export {
  generateQuestions,
  generateDrafts,
  startDraftSession,
  completeDraftSession,
  getContentReadyForDrafting,
  markContentUsed,
  saveDraft,
} from "./drafter.js";

export { duplicateChecker } from "./duplicate-checker.js";
export type {
  PostedTopic,
  PostIndex,
  DuplicateCheckResult,
} from "./duplicate-checker.js";
export {
  checkDuplicate,
  recordPost,
  getDuplicateReport,
  addTopic,
} from "./duplicate-checker.js";

export { EditorialPlanner, createEditorialPlanner } from "./editorial-planner.js";
export type {
  DailyPlan,
  ScheduledPost,
  WeekOverview,
  DaySlot,
} from "./editorial-planner.js";
