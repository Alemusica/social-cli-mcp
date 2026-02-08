/**
 * Database Helper Functions for Agents
 *
 * Wraps SurrealDB operations for easy use by agents.
 * All agents should use these instead of direct DB calls.
 */

import { getDb } from '../db/client.js';

/**
 * Execute a SurrealQL query and return results
 */
export async function query<T = any>(sql: string, vars?: Record<string, any>): Promise<T[]> {
  const db = await getDb();
  const [result] = await db.query(sql, vars);
  return (result as T[]) || [];
}

/**
 * Execute a SurrealQL query and return first result
 */
export async function queryOne<T = any>(sql: string, vars?: Record<string, any>): Promise<T | null> {
  const results = await query<T>(sql, vars);
  return results[0] || null;
}

/**
 * Create a record
 */
export async function create<T = any>(table: string, data: Record<string, any>): Promise<T> {
  const db = await getDb();
  const [result] = await db.create(table, data);
  return result as T;
}

/**
 * Update a record
 */
export async function update<T = any>(id: string, data: Record<string, any>): Promise<T> {
  const db = await getDb();
  const result = await db.merge(id, data);
  return result as T;
}

/**
 * Delete a record
 */
export async function remove(id: string): Promise<void> {
  const db = await getDb();
  await db.delete(id);
}

/**
 * Create a relation between records
 */
export async function relate(
  from: string,
  relation: string,
  to: string,
  data?: Record<string, any>
): Promise<any> {
  const db = await getDb();
  const setClause = data
    ? `SET ${Object.entries(data).map(([k, v]) => `${k} = $${k}`).join(', ')}`
    : '';
  const [result] = await db.query(
    `RELATE $from->$relation->$to ${setClause}`,
    { from, relation, to, ...data }
  );
  return result;
}

// =====================================================
// AGENT-SPECIFIC QUERIES
// =====================================================

/**
 * Get active story arc
 */
export async function getActiveArc(): Promise<any | null> {
  return queryOne(`
    SELECT * FROM story_arc
    WHERE status = "active"
    ORDER BY week_start DESC
    LIMIT 1
  `);
}

/**
 * Get today's scheduled content
 */
export async function getTodayContent(): Promise<any[]> {
  const today = new Date().toISOString().split('T')[0];
  return query(`
    SELECT * FROM platform_content
    WHERE scheduled_for >= $start
    AND scheduled_for < $end
    ORDER BY scheduled_for ASC
  `, {
    start: `${today}T00:00:00Z`,
    end: `${today}T23:59:59Z`,
  });
}

/**
 * Get content by day of week
 */
export async function getContentByDay(day: string): Promise<any[]> {
  return query(`
    SELECT * FROM platform_content
    WHERE day_of_week = $day
    ORDER BY scheduled_time ASC
  `, { day: day.toLowerCase() });
}

/**
 * Get unused content from library
 */
export async function getUnusedContent(limit = 20): Promise<any[]> {
  return query(`
    SELECT * FROM content
    WHERE used_count = 0
    ORDER BY taken_at DESC
    LIMIT $limit
  `, { limit });
}

/**
 * Get top performing hashtags
 */
export async function getTopHashtags(limit = 10): Promise<any[]> {
  return query(`
    SELECT hashtag_name, engagement_score, avg_likes, avg_comments
    FROM hashtag_analysis
    ORDER BY engagement_score DESC
    LIMIT $limit
  `, { limit });
}

/**
 * Get pending follow-ups
 */
export async function getPendingFollowups(): Promise<any[]> {
  return query(`
    SELECT email.*, ->sent_to->venue.name AS venue_name
    FROM email
    WHERE follow_up_due <= time::now()
    AND response_received = false
    AND bounced = false
    ORDER BY follow_up_due ASC
  `);
}

/**
 * Get artist profile
 */
export async function getArtistProfile(): Promise<any | null> {
  return queryOne(`SELECT * FROM artist_profile:flutur`);
}

/**
 * Get content stats by category
 */
export async function getContentStats(): Promise<any[]> {
  return query(`
    SELECT category, count() as total
    FROM content
    GROUP BY category
  `);
}

/**
 * Get upcoming gigs
 */
export async function getUpcomingGigs(limit = 5): Promise<any[]> {
  return query(`
    SELECT * FROM gig
    WHERE date > time::now()
    ORDER BY date ASC
    LIMIT $limit
  `, { limit });
}

/**
 * Get recent post performance by platform
 */
export async function getRecentPerformance(): Promise<any[]> {
  return query(`
    SELECT platform, math::mean(performance.engagement_rate) as avg_engagement
    FROM platform_content
    WHERE published_at != NONE
    GROUP BY platform
  `);
}

// Export all helpers
export const db = {
  query,
  queryOne,
  create,
  update,
  remove,
  relate,
  // Agent helpers
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
};
