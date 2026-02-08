/**
 * Hashtag Analysis Queries
 * Store and retrieve hashtag performance data
 */

import { getDb } from '../client.js';

export interface HashtagAnalysis {
  id?: string;
  hashtag_name: string;
  instagram_id?: string;
  avg_likes: number;
  avg_comments: number;
  engagement_score: number;
  top_posts_analyzed: number;
  sample_posts: { permalink: string; likes: number; comments: number }[];
  recommendation?: 'keep' | 'avoid' | 'test';
  analyzed_at: string;
  rate_limit_week?: number;
}

/**
 * Save hashtag analysis result
 */
export async function saveHashtagAnalysis(
  analysis: Omit<HashtagAnalysis, 'id' | 'analyzed_at'>,
  sessionId?: string
): Promise<string> {
  const db = await getDb();

  // Upsert - update if exists, create if not
  const result = await db.query<[{ id: string }[]]>(`
    UPSERT hashtag_analysis
    MERGE {
      hashtag_name: $name,
      instagram_id: $igId,
      avg_likes: $likes,
      avg_comments: $comments,
      engagement_score: $score,
      top_posts_analyzed: $analyzed,
      sample_posts: $samples,
      recommendation: $rec,
      rate_limit_week: $rate,
      analyzed_at: time::now()
    }
    WHERE hashtag_name = $name
  `, {
    name: analysis.hashtag_name,
    igId: analysis.instagram_id,
    likes: analysis.avg_likes,
    comments: analysis.avg_comments,
    score: analysis.engagement_score,
    analyzed: analysis.top_posts_analyzed,
    samples: analysis.sample_posts,
    rec: analysis.recommendation,
    rate: analysis.rate_limit_week
  });

  const id = result[0]?.[0]?.id;

  // Link to session if provided
  if (sessionId && id) {
    await db.query(`
      RELATE $hashtag->analyzed_in->$sess
    `, {
      hashtag: id,
      sess: sessionId
    });
  }

  return id;
}

/**
 * Get hashtag analysis by name
 */
export async function getHashtagAnalysis(
  hashtagName: string
): Promise<HashtagAnalysis | null> {
  const db = await getDb();

  const result = await db.query<[HashtagAnalysis[]]>(`
    SELECT * FROM hashtag_analysis
    WHERE hashtag_name = $name
  `, { name: hashtagName.replace(/^#/, '') });

  return result[0]?.[0] || null;
}

/**
 * Get all hashtag analyses, sorted by engagement score
 */
export async function getAllHashtagAnalyses(
  limit: number = 50
): Promise<HashtagAnalysis[]> {
  const db = await getDb();

  const result = await db.query<[HashtagAnalysis[]]>(`
    SELECT * FROM hashtag_analysis
    ORDER BY engagement_score DESC
    LIMIT $limit
  `, { limit });

  return result[0] || [];
}

/**
 * Get top performing hashtags
 */
export async function getTopHashtags(
  limit: number = 10
): Promise<HashtagAnalysis[]> {
  const db = await getDb();

  const result = await db.query<[HashtagAnalysis[]]>(`
    SELECT * FROM hashtag_analysis
    WHERE engagement_score > 0
    ORDER BY engagement_score DESC
    LIMIT $limit
  `, { limit });

  return result[0] || [];
}

/**
 * Get hashtags analyzed within time window
 */
export async function getRecentHashtagAnalyses(
  hoursAgo: number = 24
): Promise<HashtagAnalysis[]> {
  const db = await getDb();

  const result = await db.query<[HashtagAnalysis[]]>(`
    SELECT * FROM hashtag_analysis
    WHERE analyzed_at > time::now() - $hours * 1h
    ORDER BY engagement_score DESC
  `, { hours: hoursAgo });

  return result[0] || [];
}

/**
 * Check if hashtag analysis is fresh
 */
export async function isHashtagAnalysisFresh(
  hashtagName: string,
  maxAgeHours: number = 168 // 7 days default
): Promise<boolean> {
  const analysis = await getHashtagAnalysis(hashtagName);
  if (!analysis) return false;

  const analyzedAt = new Date(analysis.analyzed_at);
  const ageMs = Date.now() - analyzedAt.getTime();
  const ageHours = ageMs / (1000 * 60 * 60);

  return ageHours < maxAgeHours;
}

/**
 * Batch save multiple hashtag analyses
 */
export async function saveHashtagAnalysesBatch(
  analyses: Omit<HashtagAnalysis, 'id' | 'analyzed_at'>[],
  sessionId?: string
): Promise<string[]> {
  const ids: string[] = [];

  for (const analysis of analyses) {
    const id = await saveHashtagAnalysis(analysis, sessionId);
    ids.push(id);
  }

  return ids;
}
