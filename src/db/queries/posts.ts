/**
 * Post Draft Queries
 * Manage posts ready for publishing
 */

import { getDb } from '../client.js';

export interface PostDraft {
  id?: string;
  title: string;
  platform: string;
  post_type: 'carousel' | 'reel' | 'single' | 'story';
  caption: string;
  hashtags: string[];
  media_files: { path: string; order: number; description?: string }[];
  scheduled_for?: string;
  best_time?: string;
  status: 'draft' | 'ready' | 'scheduled' | 'published' | 'archived';
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  target_audience: string[];
  story_context?: object;
  privacy_notes?: string;
  published_post_id?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Create a new post draft
 */
export async function createPostDraft(
  draft: Omit<PostDraft, 'id' | 'created_at' | 'updated_at'>
): Promise<string> {
  const db = await getDb();

  const result = await db.query<[{ id: string }[]]>(`
    CREATE post_draft CONTENT {
      title: $title,
      platform: $platform,
      post_type: $postType,
      caption: $caption,
      hashtags: $hashtags,
      media_files: $media,
      scheduled_for: $scheduled,
      best_time: $bestTime,
      status: $status,
      priority: $priority,
      target_audience: $audience,
      story_context: $context,
      privacy_notes: $privacy,
      created_at: time::now(),
      updated_at: time::now()
    }
  `, {
    title: draft.title,
    platform: draft.platform,
    postType: draft.post_type,
    caption: draft.caption,
    hashtags: draft.hashtags,
    media: draft.media_files,
    scheduled: draft.scheduled_for,
    bestTime: draft.best_time,
    status: draft.status,
    priority: draft.priority,
    audience: draft.target_audience,
    context: draft.story_context,
    privacy: draft.privacy_notes
  });

  const id = result[0]?.[0]?.id;
  console.log(`📝 Created post draft: ${draft.title} (${id})`);
  return id;
}

/**
 * Get all post drafts
 */
export async function getPostDrafts(
  status?: PostDraft['status'],
  priority?: PostDraft['priority']
): Promise<PostDraft[]> {
  const db = await getDb();

  let query = 'SELECT * FROM post_draft';
  const conditions: string[] = [];
  const params: Record<string, any> = {};

  if (status) {
    conditions.push('status = $status');
    params.status = status;
  }

  if (priority) {
    conditions.push('priority = $priority');
    params.priority = priority;
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }

  query += ' ORDER BY priority DESC, scheduled_for ASC';

  const result = await db.query<[PostDraft[]]>(query, params);
  return result[0] || [];
}

/**
 * Get ready posts (ready + scheduled)
 */
export async function getReadyPosts(): Promise<PostDraft[]> {
  const db = await getDb();

  const result = await db.query<[PostDraft[]]>(`
    SELECT * FROM post_draft
    WHERE status IN ["ready", "scheduled"]
    ORDER BY priority DESC, scheduled_for ASC
  `);

  return result[0] || [];
}

/**
 * Update post draft status
 */
export async function updatePostStatus(
  postId: string,
  status: PostDraft['status'],
  publishedPostId?: string
): Promise<void> {
  const db = await getDb();

  await db.query(`
    UPDATE $id SET
      status = $status,
      published_post_id = $pubId,
      updated_at = time::now()
  `, {
    id: postId,
    status,
    pubId: publishedPostId
  });

  console.log(`✅ Updated post ${postId} status to: ${status}`);
}

/**
 * Link post draft to hashtag analysis
 */
export async function linkHashtagAnalysis(
  postId: string,
  hashtagAnalysisId: string,
  reason?: string
): Promise<void> {
  const db = await getDb();

  await db.query(`
    RELATE $post->uses_hashtag_analysis->$analysis SET
      selected_at = time::now(),
      reason = $reason
  `, {
    post: postId,
    analysis: hashtagAnalysisId,
    reason
  });
}

/**
 * Get post with linked analyses
 */
export async function getPostWithAnalyses(
  postId: string
): Promise<PostDraft & { hashtag_analyses: any[] } | null> {
  const db = await getDb();

  const result = await db.query<[any[]]>(`
    SELECT *,
      ->uses_hashtag_analysis->hashtag_analysis AS hashtag_analyses
    FROM $id
  `, { id: postId });

  return result[0]?.[0] || null;
}

/**
 * Get posts scheduled for date range
 */
export async function getScheduledPosts(
  startDate: Date,
  endDate: Date
): Promise<PostDraft[]> {
  const db = await getDb();

  const result = await db.query<[PostDraft[]]>(`
    SELECT * FROM post_draft
    WHERE scheduled_for >= $start
      AND scheduled_for <= $end
      AND status IN ["ready", "scheduled"]
    ORDER BY scheduled_for ASC
  `, {
    start: startDate.toISOString(),
    end: endDate.toISOString()
  });

  return result[0] || [];
}
