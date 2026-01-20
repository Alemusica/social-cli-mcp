/**
 * SurrealDB Client for Social CLI MCP
 * Knowledge graph for tracking posts, engagement, venues, and content
 */

import Surreal from 'surrealdb';

const DB_URL = process.env.SURREAL_URL || 'http://127.0.0.1:8000';
const DB_USER = process.env.SURREAL_USER || 'root';
const DB_PASS = process.env.SURREAL_PASS || 'root';
const DB_NS = 'social';
const DB_NAME = 'analytics';

let db: Surreal | null = null;

/**
 * Get database connection (singleton)
 */
export async function getDb(): Promise<Surreal> {
  if (db) return db;

  db = new Surreal();

  try {
    await db.connect(DB_URL);
    await db.signin({ username: DB_USER, password: DB_PASS });
    await db.use({ namespace: DB_NS, database: DB_NAME });
    console.log('🗄️ Connected to SurrealDB');
    return db;
  } catch (error) {
    console.error('❌ SurrealDB connection failed:', error);
    db = null;
    throw error;
  }
}

/**
 * Close database connection
 */
export async function closeDb(): Promise<void> {
  if (db) {
    await db.close();
    db = null;
  }
}

// ═══════════════════════════════════════════════════════════════
// POST OPERATIONS
// ═══════════════════════════════════════════════════════════════

export interface Post {
  id?: string;
  platform: 'twitter' | 'instagram' | 'tiktok' | 'youtube';
  external_id: string;
  content: string;
  media_paths?: string[];
  posted_at: Date;
  likes?: number;
  comments?: number;
  shares?: number;
  reach?: number;
  impressions?: number;
  engagement_rate?: number;
  url?: string;
  [key: string]: unknown;
}

export async function createPost(post: Post): Promise<any> {
  const db = await getDb();
  const result = await db.create('post', {
    ...post,
    posted_at: post.posted_at.toISOString(),
  });
  return result;
}

export async function updatePostMetrics(postId: string, metrics: {
  likes?: number;
  comments?: number;
  shares?: number;
  reach?: number;
  impressions?: number;
}): Promise<any> {
  const db = await getDb();

  // Calculate engagement rate
  const engagement_rate = metrics.impressions && metrics.impressions > 0
    ? ((metrics.likes || 0) + (metrics.comments || 0) + (metrics.shares || 0)) / metrics.impressions * 100
    : 0;

  return db.merge(`post:${postId}`, { ...metrics, engagement_rate });
}

export async function linkPostToHashtags(postId: string, hashtags: string[]): Promise<void> {
  const db = await getDb();

  for (let i = 0; i < hashtags.length; i++) {
    const tag = hashtags[i].toLowerCase().replace('#', '');

    // Create or update hashtag
    await db.query(`
      INSERT INTO hashtag (name, total_uses) VALUES ($name, 1)
      ON DUPLICATE KEY UPDATE total_uses += 1
    `, { name: tag });

    // Create relation
    await db.query(`
      RELATE post:$postId->uses_hashtag->hashtag:$tagId SET position = $pos
    `, { postId, tagId: tag, pos: i });
  }
}

// ═══════════════════════════════════════════════════════════════
// VENUE OPERATIONS
// ═══════════════════════════════════════════════════════════════

export interface Venue {
  id?: string;
  name: string;
  type: string;
  location: string;
  country: string;
  contact_email?: string;
  contact_name?: string;
  website?: string;
  instagram?: string;
  status?: string;
  tier?: number;
  notes?: string;
  [key: string]: unknown;
}

export async function createVenue(venue: Venue): Promise<any> {
  const db = await getDb();
  return db.create('venue', venue);
}

export async function updateVenueStatus(venueId: string, status: string): Promise<any> {
  const db = await getDb();
  return db.merge(`venue:${venueId}`, { status });
}

export async function getVenuesByStatus(status: string): Promise<any[]> {
  const db = await getDb();
  const result = await db.query('SELECT * FROM venue WHERE status = $status', { status });
  return result[0] as any[];
}

// ═══════════════════════════════════════════════════════════════
// EMAIL OPERATIONS
// ═══════════════════════════════════════════════════════════════

export interface Email {
  id?: string;
  subject: string;
  body: string;
  to_address: string;
  email_type?: string;
  message_id?: string;
  [key: string]: unknown;
}

export async function createEmail(email: Email, venueId?: string): Promise<any> {
  const db = await getDb();
  const result = await db.create('email', email);

  // Link to venue if provided
  if (venueId && result[0]?.id) {
    const emailId = String(result[0].id).split(':')[1];
    await db.query(`
      RELATE email:$emailId->sent_to->venue:$venueId
    `, { emailId, venueId });
  }

  return result;
}

export async function markEmailResponse(emailId: string, sentiment: string, feedback?: string): Promise<any> {
  const db = await getDb();
  return db.merge(`email:${emailId}`, {
    response_received: true,
    response_at: new Date().toISOString(),
    response_sentiment: sentiment,
    feedback,
  });
}

// ═══════════════════════════════════════════════════════════════
// CONTENT OPERATIONS
// ═══════════════════════════════════════════════════════════════

export interface Content {
  id?: string;
  type: 'image' | 'video' | 'audio';
  file_path: string;
  file_name: string;
  location?: string;
  location_lat?: number;
  location_lng?: number;
  taken_at?: Date;
  camera?: string;
  category?: string;
  tags?: string[];
  [key: string]: unknown;
}

export async function createContent(content: Content): Promise<any> {
  const db = await getDb();
  return db.create('content', {
    ...content,
    taken_at: content.taken_at?.toISOString(),
  });
}

export async function getContentByLocation(location: string): Promise<any[]> {
  const db = await getDb();
  const result = await db.query('SELECT * FROM content WHERE location = $location', { location });
  return result[0] as any[];
}

export async function getContentByCategory(category: string): Promise<any[]> {
  const db = await getDb();
  const result = await db.query('SELECT * FROM content WHERE category = $category', { category });
  return result[0] as any[];
}

// ═══════════════════════════════════════════════════════════════
// ANALYTICS
// ═══════════════════════════════════════════════════════════════

export async function getHashtagPerformance(): Promise<any[]> {
  const db = await getDb();
  const result = await db.query(`
    SELECT
      name,
      total_uses,
      avg_engagement,
      (SELECT platform, count() as uses FROM <-uses_hashtag<-post GROUP BY platform) as by_platform
    FROM hashtag
    ORDER BY avg_engagement DESC
    LIMIT 20
  `);
  return result[0] as any[];
}

export async function getVenueOutreachStats(): Promise<any[]> {
  const db = await getDb();
  const result = await db.query(`
    SELECT
      name,
      status,
      tier,
      count(<-sent_to<-email) as emails_sent,
      count(<-sent_to<-email WHERE response_received = true) as responses
    FROM venue
    ORDER BY tier ASC, status ASC
  `);
  return result[0] as any[];
}

export async function getEngagementByLocation(): Promise<any[]> {
  const db = await getDb();
  const result = await db.query(`
    SELECT
      location,
      count() as content_count,
      math::mean(->uses_content<-post.engagement_rate) as avg_engagement
    FROM content
    WHERE location IS NOT NONE
    GROUP BY location
    ORDER BY avg_engagement DESC
  `);
  return result[0] as any[];
}
