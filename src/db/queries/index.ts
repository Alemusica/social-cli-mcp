/**
 * Database Queries Index
 * Export all query functions for easy access
 */

// Session management
export {
  startSession,
  endSession,
  incrementApiCalls,
  getLatestSession,
  getSessions,
  type AnalysisSession
} from './sessions.js';

// Hashtag analysis
export {
  saveHashtagAnalysis,
  getHashtagAnalysis,
  getAllHashtagAnalyses,
  getTopHashtags,
  getRecentHashtagAnalyses,
  isHashtagAnalysisFresh,
  saveHashtagAnalysesBatch,
  type HashtagAnalysis
} from './hashtags.js';

// Audience snapshots
export {
  saveAudienceSnapshot,
  getLatestAudience,
  getAudienceHistory,
  calculateGrowth,
  isAudienceDataFresh,
  getAudienceFreshness,
  type AudienceSnapshot
} from './audience.js';

// Post drafts
export {
  createPostDraft,
  getPostDrafts,
  getReadyPosts,
  updatePostStatus,
  linkHashtagAnalysis,
  getPostWithAnalyses,
  getScheduledPosts,
  type PostDraft
} from './posts.js';

/**
 * Get complete data freshness report
 * Useful for agents to understand data state
 */
export async function getDataFreshnessReport(): Promise<{
  hashtags: { count: number; latestAge?: number; isFresh: boolean };
  audience: { hasData: boolean; latestAge?: number; isFresh: boolean };
  posts: { total: number; ready: number; scheduled: number };
}> {
  const { getAudienceFreshness } = await import('./audience.js');
  const { getAllHashtagAnalyses } = await import('./hashtags.js');
  const { getPostDrafts } = await import('./posts.js');

  // Hashtags
  const hashtags = await getAllHashtagAnalyses(100);
  const latestHashtag = hashtags[0];
  let hashtagAge: number | undefined;
  if (latestHashtag) {
    const age = Date.now() - new Date(latestHashtag.analyzed_at).getTime();
    hashtagAge = Math.round(age / (1000 * 60 * 60));
  }

  // Audience
  const audienceFreshness = await getAudienceFreshness('instagram');

  // Posts
  const allPosts = await getPostDrafts();
  const readyPosts = allPosts.filter(p => p.status === 'ready');
  const scheduledPosts = allPosts.filter(p => p.status === 'scheduled');

  return {
    hashtags: {
      count: hashtags.length,
      latestAge: hashtagAge,
      isFresh: hashtagAge !== undefined && hashtagAge < 168 // 7 days
    },
    audience: {
      hasData: audienceFreshness.hasDatas,
      latestAge: audienceFreshness.ageHours,
      isFresh: audienceFreshness.isFresh
    },
    posts: {
      total: allPosts.length,
      ready: readyPosts.length,
      scheduled: scheduledPosts.length
    }
  };
}
