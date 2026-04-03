/**
 * Analytics Services — barrel
 */

export { instagramAnalytics } from "./instagram.js";
export type {
  AudienceSnapshotData,
  AudienceSnapshotRecord,
  InsightsEvolution,
} from "./instagram.js";
export {
  saveAudienceSnapshot,
  getLatestAudience,
  getAudienceHistory,
  getAudienceEvolution,
  needsFreshInsights,
  getCorridorAnalysis,
} from "./instagram.js";

export { youtubeAnalytics } from "./youtube.js";
export type {
  YouTubeSnapshotRecord,
  VideoCountryRecord,
} from "./youtube.js";
export {
  saveYouTubeSnapshot,
  saveVideoCountryData,
  getLatestYouTubeSnapshot,
  getVideoCountriesForSnapshot,
  getVideoCountriesByVideoId,
  getSubscriberHistory,
} from "./youtube.js";

export { correlator } from "./correlator.js";
export {
  buildDailyDigest,
  detectCorrelations,
  saveCorrelationEvent,
  getSavedCorrelations,
  runCorrelationDetection,
} from "./correlator.js";
