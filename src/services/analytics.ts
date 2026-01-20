/**
 * Analytics Service
 * Tracks all posts, stats, and engagement history
 * Persists data for cross-session context
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import type { Platform, Vertical, PostResult } from '../types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '../..');
const ANALYTICS_FILE = path.join(PROJECT_ROOT, 'analytics', 'posts-history.json');

export interface PostStats {
  impressions: number;
  likes: number;
  retweets?: number;
  replies?: number;
  quotes?: number;
  shares?: number;
  saves?: number;
  comments?: number;
  views?: number;
  engagementRate: number;
  lastChecked: string;
}

export interface TrackedPost {
  id: string;
  date: string;
  platform: Platform;
  vertical: Vertical;
  type: 'post' | 'thread' | 'reply' | 'reel' | 'story' | 'short' | 'video';
  content: string;
  url?: string;
  postId?: string;
  replyTo?: {
    user: string;
    postUrl: string;
    originalViews?: number;
  };
  stats: PostStats;
  hashtags: string[];
  mentions: string[];
  mediaUrls?: string[];
  notes?: string;
}

export interface AnalyticsData {
  posts: TrackedPost[];
  statsHistory: Array<{
    date: string;
    postId: string;
    stats: PostStats;
  }>;
  summary: {
    totalPosts: number;
    byPlatform: Record<string, number>;
    byVertical: Record<string, number>;
    lastUpdated: string;
  };
}

export class AnalyticsService {
  private data: AnalyticsData;

  constructor() {
    this.data = this.load();
  }

  private load(): AnalyticsData {
    if (fs.existsSync(ANALYTICS_FILE)) {
      return JSON.parse(fs.readFileSync(ANALYTICS_FILE, 'utf-8'));
    }
    return {
      posts: [],
      statsHistory: [],
      summary: {
        totalPosts: 0,
        byPlatform: {},
        byVertical: {},
        lastUpdated: new Date().toISOString().split('T')[0],
      },
    };
  }

  private save(): void {
    fs.writeFileSync(ANALYTICS_FILE, JSON.stringify(this.data, null, 2));
  }

  /**
   * Track a new post
   */
  trackPost(post: Omit<TrackedPost, 'id' | 'stats'>): TrackedPost {
    const id = `${post.platform.slice(0, 2)}-${post.date}-${String(this.data.posts.length + 1).padStart(3, '0')}`;

    const trackedPost: TrackedPost = {
      ...post,
      id,
      stats: {
        impressions: 0,
        likes: 0,
        retweets: 0,
        replies: 0,
        quotes: 0,
        engagementRate: 0,
        lastChecked: new Date().toISOString().split('T')[0],
      },
    };

    this.data.posts.push(trackedPost);
    this.updateSummary();
    this.save();

    return trackedPost;
  }

  /**
   * Update stats for a post
   */
  updateStats(postId: string, stats: Partial<PostStats>): TrackedPost | null {
    const post = this.data.posts.find(p => p.id === postId);
    if (!post) return null;

    // Save history
    this.data.statsHistory.push({
      date: new Date().toISOString(),
      postId,
      stats: { ...post.stats },
    });

    // Update current stats
    post.stats = {
      ...post.stats,
      ...stats,
      lastChecked: new Date().toISOString().split('T')[0],
    };

    // Calculate engagement rate
    if (post.stats.impressions > 0) {
      const engagements = (post.stats.likes || 0) +
        (post.stats.retweets || 0) +
        (post.stats.replies || 0) +
        (post.stats.quotes || 0) +
        (post.stats.shares || 0) +
        (post.stats.comments || 0);
      post.stats.engagementRate = (engagements / post.stats.impressions) * 100;
    }

    this.save();
    return post;
  }

  /**
   * Get all posts
   */
  getAllPosts(): TrackedPost[] {
    return this.data.posts;
  }

  /**
   * Get posts by platform
   */
  getPostsByPlatform(platform: Platform): TrackedPost[] {
    return this.data.posts.filter(p => p.platform === platform);
  }

  /**
   * Get posts by vertical
   */
  getPostsByVertical(vertical: Vertical): TrackedPost[] {
    return this.data.posts.filter(p => p.vertical === vertical);
  }

  /**
   * Get post by ID
   */
  getPost(id: string): TrackedPost | null {
    return this.data.posts.find(p => p.id === id) || null;
  }

  /**
   * Get recent posts
   */
  getRecentPosts(limit: number = 10): TrackedPost[] {
    return [...this.data.posts]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, limit);
  }

  /**
   * Get summary
   */
  getSummary(): AnalyticsData['summary'] {
    return this.data.summary;
  }

  /**
   * Get stats history for a post
   */
  getStatsHistory(postId: string): Array<{ date: string; stats: PostStats }> {
    return this.data.statsHistory
      .filter(h => h.postId === postId)
      .map(h => ({ date: h.date, stats: h.stats }));
  }

  /**
   * Generate report for a date range
   */
  generateReport(startDate: string, endDate: string): {
    posts: TrackedPost[];
    totalImpressions: number;
    totalEngagement: number;
    avgEngagementRate: number;
    topPosts: TrackedPost[];
  } {
    const posts = this.data.posts.filter(p => {
      const date = new Date(p.date);
      return date >= new Date(startDate) && date <= new Date(endDate);
    });

    const totalImpressions = posts.reduce((sum, p) => sum + p.stats.impressions, 0);
    const totalEngagement = posts.reduce((sum, p) => {
      return sum + (p.stats.likes || 0) + (p.stats.retweets || 0) +
        (p.stats.replies || 0) + (p.stats.comments || 0);
    }, 0);

    const avgEngagementRate = posts.length > 0
      ? posts.reduce((sum, p) => sum + p.stats.engagementRate, 0) / posts.length
      : 0;

    const topPosts = [...posts]
      .sort((a, b) => b.stats.impressions - a.stats.impressions)
      .slice(0, 5);

    return {
      posts,
      totalImpressions,
      totalEngagement,
      avgEngagementRate,
      topPosts,
    };
  }

  private updateSummary(): void {
    const summary = {
      totalPosts: this.data.posts.length,
      byPlatform: {} as Record<string, number>,
      byVertical: {} as Record<string, number>,
      lastUpdated: new Date().toISOString().split('T')[0],
    };

    for (const post of this.data.posts) {
      summary.byPlatform[post.platform] = (summary.byPlatform[post.platform] || 0) + 1;
      summary.byVertical[post.vertical] = (summary.byVertical[post.vertical] || 0) + 1;
    }

    this.data.summary = summary;
  }

  /**
   * Export to CSV
   */
  exportToCSV(): string {
    const headers = [
      'id', 'date', 'platform', 'vertical', 'type', 'content',
      'impressions', 'likes', 'retweets', 'replies', 'engagementRate',
      'hashtags', 'mentions', 'url'
    ];

    const rows = this.data.posts.map(p => [
      p.id,
      p.date,
      p.platform,
      p.vertical,
      p.type,
      `"${p.content.replace(/"/g, '""')}"`,
      p.stats.impressions,
      p.stats.likes,
      p.stats.retweets || 0,
      p.stats.replies || 0,
      p.stats.engagementRate.toFixed(2),
      `"${p.hashtags.join(', ')}"`,
      `"${p.mentions.join(', ')}"`,
      p.url || ''
    ].join(','));

    return [headers.join(','), ...rows].join('\n');
  }
}

// Singleton instance
let analyticsInstance: AnalyticsService | null = null;

export function getAnalytics(): AnalyticsService {
  if (!analyticsInstance) {
    analyticsInstance = new AnalyticsService();
  }
  return analyticsInstance;
}
