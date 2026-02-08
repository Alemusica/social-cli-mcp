#!/usr/bin/env node
/**
 * Social CLI MCP Server
 *
 * Exposes social posting capabilities to AI agents via MCP protocol.
 *
 * Tools:
 *   - post_twitter: Post to Twitter/X
 *   - post_reddit: Post to Reddit
 *   - post_linkedin: Post to LinkedIn
 *   - post_instagram: Post to Instagram
 *   - post_all: Post to all configured platforms
 *   - test_connections: Test all platform connections
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { loadConfig } from './utils/config.js';
import { TwitterClient, RedditClient, InstagramClient, LinkedInClient } from './clients/index.js';
import { getDb } from './db/client.js';
import { getCredentialsStatus, getSystemContext } from './core/index.js';
import type { PostResult } from './types.js';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Initialize
const config = loadConfig();
const clients = {
  twitter: config.twitter ? new TwitterClient(config.twitter) : null,
  reddit: config.reddit ? new RedditClient(config.reddit) : null,
  linkedin: config.linkedin ? new LinkedInClient(config.linkedin) : null,
  instagram: config.instagram ? new InstagramClient(config.instagram) : null,
};

// Create server
const server = new Server(
  {
    name: 'social-cli-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  const tools = [];

  // Twitter tool
  if (clients.twitter?.isConfigured()) {
    tools.push({
      name: 'post_twitter',
      description: 'Post a tweet to Twitter/X. Supports text, links, hashtags, and media.',
      inputSchema: {
        type: 'object',
        properties: {
          text: {
            type: 'string',
            description: 'The tweet text (max 280 characters)',
          },
          link: {
            type: 'string',
            description: 'Optional URL to include',
          },
          hashtags: {
            type: 'array',
            items: { type: 'string' },
            description: 'Optional hashtags (without # prefix)',
          },
          mediaUrls: {
            type: 'array',
            items: { type: 'string' },
            description: 'Optional image/video URLs to attach',
          },
        },
        required: ['text'],
      },
    });

    tools.push({
      name: 'post_twitter_thread',
      description: 'Post a thread of multiple tweets to Twitter/X',
      inputSchema: {
        type: 'object',
        properties: {
          tweets: {
            type: 'array',
            items: { type: 'string' },
            description: 'Array of tweet texts for the thread',
          },
        },
        required: ['tweets'],
      },
    });
  }

  // Reddit tool
  if (clients.reddit?.isConfigured()) {
    tools.push({
      name: 'post_reddit',
      description: 'Post to a subreddit. Supports text posts and link posts.',
      inputSchema: {
        type: 'object',
        properties: {
          subreddit: {
            type: 'string',
            description: 'Subreddit name (without r/)',
          },
          title: {
            type: 'string',
            description: 'Post title',
          },
          text: {
            type: 'string',
            description: 'Post body text (for self posts)',
          },
          link: {
            type: 'string',
            description: 'URL for link posts',
          },
          nsfw: {
            type: 'boolean',
            description: 'Mark as NSFW',
          },
        },
        required: ['subreddit', 'title'],
      },
    });
  }

  // LinkedIn tool
  if (clients.linkedin?.isConfigured()) {
    tools.push({
      name: 'post_linkedin',
      description: 'Post an update to LinkedIn',
      inputSchema: {
        type: 'object',
        properties: {
          text: {
            type: 'string',
            description: 'Post text content',
          },
          link: {
            type: 'string',
            description: 'Optional URL to include',
          },
          hashtags: {
            type: 'array',
            items: { type: 'string' },
            description: 'Optional hashtags',
          },
          visibility: {
            type: 'string',
            enum: ['PUBLIC', 'CONNECTIONS'],
            description: 'Post visibility',
          },
        },
        required: ['text'],
      },
    });
  }

  // Instagram tool
  if (clients.instagram?.isConfigured()) {
    tools.push({
      name: 'post_instagram',
      description: 'Post an image/video to Instagram. Requires at least one media URL.',
      inputSchema: {
        type: 'object',
        properties: {
          caption: {
            type: 'string',
            description: 'Post caption',
          },
          mediaUrls: {
            type: 'array',
            items: { type: 'string' },
            description: 'Image or video URLs (publicly accessible)',
          },
          hashtags: {
            type: 'array',
            items: { type: 'string' },
            description: 'Hashtags to append to caption',
          },
        },
        required: ['caption', 'mediaUrls'],
      },
    });

    // Instagram Insights tools
    tools.push({
      name: 'instagram_account_insights',
      description: 'Get Instagram account metrics: follower count, impressions, reach, profile views. Optionally saves snapshot to SurrealDB.',
      inputSchema: {
        type: 'object',
        properties: {
          period: {
            type: 'string',
            enum: ['day', 'week', 'days_28'],
            description: 'Time period for metrics (default: days_28)',
          },
          save_to_db: {
            type: 'boolean',
            description: 'Save snapshot to SurrealDB for tracking growth (default: true)',
          },
        },
      },
    });

    tools.push({
      name: 'instagram_media_insights',
      description: 'Get insights for a specific Instagram post: likes, comments, shares, saves, reach, impressions.',
      inputSchema: {
        type: 'object',
        properties: {
          media_id: {
            type: 'string',
            description: 'Instagram media ID',
          },
        },
        required: ['media_id'],
      },
    });

    tools.push({
      name: 'instagram_recent_posts',
      description: 'Get insights for recent Instagram posts. Returns metrics for the last N posts.',
      inputSchema: {
        type: 'object',
        properties: {
          limit: {
            type: 'number',
            description: 'Number of recent posts to fetch (default: 10, max: 25)',
          },
        },
      },
    });

    tools.push({
      name: 'instagram_audience',
      description: 'Get audience demographics: age/gender breakdown, top cities, top countries. Requires 100+ followers.',
      inputSchema: {
        type: 'object',
        properties: {},
      },
    });

    tools.push({
      name: 'instagram_best_times',
      description: 'Get best times to post based on when followers are most active online.',
      inputSchema: {
        type: 'object',
        properties: {},
      },
    });
  }

  // Multi-platform tool
  tools.push({
    name: 'post_all',
    description: 'Post to all configured platforms at once',
    inputSchema: {
      type: 'object',
      properties: {
        text: {
          type: 'string',
          description: 'Post text',
        },
        link: {
          type: 'string',
          description: 'Optional URL',
        },
        hashtags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Hashtags',
        },
        redditSubreddit: {
          type: 'string',
          description: 'Subreddit for Reddit post',
        },
        redditTitle: {
          type: 'string',
          description: 'Title for Reddit post',
        },
        instagramMedia: {
          type: 'string',
          description: 'Media URL for Instagram',
        },
      },
      required: ['text'],
    },
  });

  // Test connections tool
  tools.push({
    name: 'test_connections',
    description: 'Test connections to all configured platforms',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  });

  // Get status tool
  tools.push({
    name: 'get_status',
    description: 'Get configuration status for all platforms',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  });

  // Editorial Plan tools
  tools.push({
    name: 'get_editorial_plan',
    description: 'Get the Instagram editorial plan with scheduled posts, captions, hashtags, and photo requirements. Use filter_priority to show only HIGH/MEDIUM priority posts.',
    inputSchema: {
      type: 'object',
      properties: {
        filter_priority: {
          type: 'string',
          enum: ['HIGH', 'MEDIUM', 'all'],
          description: 'Filter posts by priority (default: all)',
        },
        include_schedule: {
          type: 'boolean',
          description: 'Include week 1 schedule (default: true)',
        },
      },
    },
  });

  tools.push({
    name: 'list_photos',
    description: 'List available photos in the media library. Returns file paths, categorized by folder. Use category filter to narrow results.',
    inputSchema: {
      type: 'object',
      properties: {
        category: {
          type: 'string',
          description: 'Filter by category/folder name (e.g., "new foto to classify", "morocco")',
        },
        search: {
          type: 'string',
          description: 'Search in filename (e.g., "IMG_7753" or "sunset")',
        },
        limit: {
          type: 'number',
          description: 'Max number of results (default: 50)',
        },
      },
    },
  });

  tools.push({
    name: 'get_post_photos',
    description: 'Get photos needed for a specific post from the editorial plan by post ID.',
    inputSchema: {
      type: 'object',
      properties: {
        post_id: {
          type: 'number',
          description: 'Post ID from the editorial plan (1-6)',
        },
      },
      required: ['post_id'],
    },
  });

  // ═══════════════════════════════════════════════════════════════
  // DATABASE ANALYSIS TOOLS (SurrealDB)
  // ═══════════════════════════════════════════════════════════════

  tools.push({
    name: 'get_data_freshness',
    description: 'Get freshness report for all analysis data in SurrealDB. Shows how old the hashtag analysis, audience snapshots, and post drafts are. Use this first to know if you need to refresh data.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  });

  tools.push({
    name: 'get_hashtag_analysis',
    description: 'Get hashtag performance analysis from SurrealDB. Returns engagement scores, avg likes/comments, and recommendations (keep/avoid/test) based on Instagram API data.',
    inputSchema: {
      type: 'object',
      properties: {
        hashtag: {
          type: 'string',
          description: 'Specific hashtag to get (without #). If not provided, returns top 10 by engagement score.',
        },
        limit: {
          type: 'number',
          description: 'Max results when getting all (default: 10)',
        },
      },
    },
  });

  tools.push({
    name: 'get_audience_snapshot',
    description: 'Get latest audience demographics from SurrealDB. Shows followers, top countries, top cities, age/gender breakdown from Instagram API.',
    inputSchema: {
      type: 'object',
      properties: {
        include_history: {
          type: 'boolean',
          description: 'Include historical snapshots for growth tracking (default: false)',
        },
        history_days: {
          type: 'number',
          description: 'Days of history to include (default: 7)',
        },
      },
    },
  });

  tools.push({
    name: 'get_post_drafts',
    description: 'Get post drafts from SurrealDB. These are posts ready to be published with captions, hashtags, and media.',
    inputSchema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['draft', 'ready', 'scheduled', 'published', 'archived'],
          description: 'Filter by status',
        },
        priority: {
          type: 'string',
          enum: ['HIGH', 'MEDIUM', 'LOW'],
          description: 'Filter by priority',
        },
      },
    },
  });

  tools.push({
    name: 'run_analysis',
    description: 'Run fresh analysis: capture audience snapshot and/or analyze hashtags via Instagram API. Saves results to SurrealDB.',
    inputSchema: {
      type: 'object',
      properties: {
        analyze_audience: {
          type: 'boolean',
          description: 'Capture audience snapshot (default: true)',
        },
        analyze_hashtags: {
          type: 'boolean',
          description: 'Analyze hashtags (default: true)',
        },
        hashtag_limit: {
          type: 'number',
          description: 'Max hashtags to analyze (default: 5, max 30/week rate limit)',
        },
      },
    },
  });

  // ═══════════════════════════════════════════════════════════════
  // SYSTEM STATUS TOOL (Unified Dashboard)
  // ═══════════════════════════════════════════════════════════════
  tools.push({
    name: 'system_status',
    description: 'Get complete system status: credentials from Keychain, platform connections, database stats, artist profile, and active story arc. Use this to understand what the system can do.',
    inputSchema: {
      type: 'object',
      properties: {
        include_credentials: {
          type: 'boolean',
          description: 'Include detailed credentials status (default: true)',
        },
        include_db_stats: {
          type: 'boolean',
          description: 'Include database record counts (default: true)',
        },
      },
    },
  });

  return { tools };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args = {} } = request.params;

  try {
    switch (name) {
      case 'post_twitter': {
        if (!clients.twitter) throw new Error('Twitter not configured');
        const result = await clients.twitter.post({
          text: args.text as string,
          link: args.link as string | undefined,
          hashtags: args.hashtags as string[] | undefined,
          mediaUrls: args.mediaUrls as string[] | undefined,
        });
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      }

      case 'post_twitter_thread': {
        if (!clients.twitter) throw new Error('Twitter not configured');
        const results = await clients.twitter.postThread(args.tweets as string[]);
        return { content: [{ type: 'text', text: JSON.stringify(results, null, 2) }] };
      }

      case 'post_reddit': {
        if (!clients.reddit) throw new Error('Reddit not configured');
        const result = await clients.reddit.post({
          subreddit: args.subreddit as string,
          title: args.title as string,
          text: (args.text as string) || '',
          link: args.link as string | undefined,
          nsfw: args.nsfw as boolean | undefined,
        });
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      }

      case 'post_linkedin': {
        if (!clients.linkedin) throw new Error('LinkedIn not configured');
        const result = await clients.linkedin.post({
          text: args.text as string,
          link: args.link as string | undefined,
          hashtags: args.hashtags as string[] | undefined,
          visibility: args.visibility as 'PUBLIC' | 'CONNECTIONS' | undefined,
        });
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      }

      case 'post_instagram': {
        if (!clients.instagram) throw new Error('Instagram not configured');
        const result = await clients.instagram.post({
          text: args.caption as string,
          caption: args.caption as string,
          mediaUrls: args.mediaUrls as string[],
          hashtags: args.hashtags as string[] | undefined,
        });
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      }

      case 'instagram_account_insights': {
        if (!clients.instagram) throw new Error('Instagram not configured');
        const period = (args.period as 'day' | 'week' | 'days_28') || 'days_28';
        const saveToDb = args.save_to_db !== false;

        const insights = await clients.instagram.getAccountInsights(period);
        if (!insights) {
          return { content: [{ type: 'text', text: JSON.stringify({ error: 'Failed to get insights' }) }], isError: true };
        }

        // Save to SurrealDB for growth tracking
        if (saveToDb) {
          try {
            const db = await getDb();
            await db.create('profile_snapshot', {
              platform: 'instagram',
              username: 'flutur', // TODO: get from account
              followers: insights.followerCount,
              posts_count: insights.mediaCount,
              engagement_rate: insights.impressions && insights.reach
                ? (insights.reach / insights.impressions) * 100
                : null,
              recorded_at: new Date().toISOString(),
            });
            (insights as any).saved_to_db = true;
          } catch (e) {
            (insights as any).db_error = 'Could not save to SurrealDB';
          }
        }

        return { content: [{ type: 'text', text: JSON.stringify(insights, null, 2) }] };
      }

      case 'instagram_media_insights': {
        if (!clients.instagram) throw new Error('Instagram not configured');
        const mediaId = args.media_id as string;
        const insights = await clients.instagram.getMediaInsights(mediaId);
        if (!insights) {
          return { content: [{ type: 'text', text: JSON.stringify({ error: 'Failed to get media insights' }) }], isError: true };
        }
        return { content: [{ type: 'text', text: JSON.stringify(insights, null, 2) }] };
      }

      case 'instagram_recent_posts': {
        if (!clients.instagram) throw new Error('Instagram not configured');
        const limit = Math.min((args.limit as number) || 10, 25);
        const insights = await clients.instagram.getRecentMediaInsights(limit);

        // Summary stats
        const summary = {
          posts_analyzed: insights.length,
          total_likes: insights.reduce((sum, p) => sum + (p.likes || 0), 0),
          total_comments: insights.reduce((sum, p) => sum + (p.comments || 0), 0),
          avg_reach: insights.length ? Math.round(insights.reduce((sum, p) => sum + (p.reach || 0), 0) / insights.length) : 0,
          avg_impressions: insights.length ? Math.round(insights.reduce((sum, p) => sum + (p.impressions || 0), 0) / insights.length) : 0,
          posts: insights,
        };

        return { content: [{ type: 'text', text: JSON.stringify(summary, null, 2) }] };
      }

      case 'instagram_audience': {
        if (!clients.instagram) throw new Error('Instagram not configured');
        const audience = await clients.instagram.getAudienceInsights();
        if (!audience) {
          return { content: [{ type: 'text', text: JSON.stringify({ error: 'Failed to get audience insights. Need 100+ followers.' }) }], isError: true };
        }
        return { content: [{ type: 'text', text: JSON.stringify(audience, null, 2) }] };
      }

      case 'instagram_best_times': {
        if (!clients.instagram) throw new Error('Instagram not configured');
        const bestTimes = await clients.instagram.getBestPostingTimes();
        if (!bestTimes.length) {
          return { content: [{ type: 'text', text: JSON.stringify({ error: 'Could not determine best posting times' }) }], isError: true };
        }
        return { content: [{ type: 'text', text: JSON.stringify({ best_times: bestTimes }, null, 2) }] };
      }

      case 'post_all': {
        const results: PostResult[] = [];

        if (clients.twitter?.isConfigured()) {
          results.push(await clients.twitter.post({
            text: args.text as string,
            link: args.link as string | undefined,
            hashtags: args.hashtags as string[] | undefined,
          }));
        }

        if (clients.reddit?.isConfigured() && args.redditSubreddit) {
          results.push(await clients.reddit.post({
            subreddit: args.redditSubreddit as string,
            title: (args.redditTitle as string) || (args.text as string).slice(0, 100),
            text: args.text as string,
            link: args.link as string | undefined,
          }));
        }

        if (clients.linkedin?.isConfigured()) {
          results.push(await clients.linkedin.post({
            text: args.text as string,
            link: args.link as string | undefined,
            hashtags: args.hashtags as string[] | undefined,
          }));
        }

        if (clients.instagram?.isConfigured() && args.instagramMedia) {
          results.push(await clients.instagram.post({
            text: args.text as string,
            caption: args.text as string,
            mediaUrls: [args.instagramMedia as string],
            hashtags: args.hashtags as string[] | undefined,
          }));
        }

        return { content: [{ type: 'text', text: JSON.stringify(results, null, 2) }] };
      }

      case 'test_connections': {
        const results: Record<string, boolean> = {};

        if (clients.twitter) results.twitter = await clients.twitter.testConnection();
        if (clients.reddit) results.reddit = await clients.reddit.testConnection();
        if (clients.linkedin) results.linkedin = await clients.linkedin.testConnection();
        if (clients.instagram) results.instagram = await clients.instagram.testConnection();

        return { content: [{ type: 'text', text: JSON.stringify(results, null, 2) }] };
      }

      case 'get_status': {
        const status = {
          twitter: clients.twitter?.isConfigured() || false,
          reddit: clients.reddit?.isConfigured() || false,
          linkedin: clients.linkedin?.isConfigured() || false,
          instagram: clients.instagram?.isConfigured() || false,
        };
        return { content: [{ type: 'text', text: JSON.stringify(status, null, 2) }] };
      }

      case 'get_editorial_plan': {
        const planPath = join(__dirname, '..', 'content', 'instagram-posts-ready.json');
        try {
          const planData = JSON.parse(readFileSync(planPath, 'utf-8'));
          const filterPriority = args.filter_priority as string || 'all';
          const includeSchedule = args.include_schedule !== false;

          let posts = planData.posts || [];
          if (filterPriority !== 'all') {
            posts = posts.filter((p: any) => p.priority === filterPriority);
          }

          const result: any = {
            version: planData.version,
            status: planData.status,
            algorithm_notes: planData.algorithm_notes,
            posts: posts.map((p: any) => ({
              id: p.id,
              title: p.title,
              type: p.type,
              priority: p.priority,
              slides: p.slides,
              caption: p.caption,
              hashtags: p.hashtags,
              best_time: p.best_time,
              photos_needed: p.photos_needed,
              story_context: p.story_context,
            })),
            privacy_compliance: planData.privacy_compliance,
          };

          if (includeSchedule) {
            result.week1_schedule = planData.week1_schedule;
          }

          return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
        } catch (e: any) {
          return { content: [{ type: 'text', text: JSON.stringify({ error: `Could not read editorial plan: ${e.message}` }) }], isError: true };
        }
      }

      case 'list_photos': {
        const mediaDir = join(__dirname, '..', 'media', 'music', 'images');
        const category = args.category as string | undefined;
        const search = args.search as string | undefined;
        const limit = (args.limit as number) || 50;

        const walkDir = (dir: string, baseDir: string = ''): { path: string; name: string; folder: string }[] => {
          const results: { path: string; name: string; folder: string }[] = [];
          try {
            const items = readdirSync(dir);
            for (const item of items) {
              const fullPath = join(dir, item);
              const stat = statSync(fullPath);
              if (stat.isDirectory()) {
                results.push(...walkDir(fullPath, item));
              } else if (/\.(jpg|jpeg|png|heic|gif)$/i.test(item)) {
                results.push({
                  path: fullPath,
                  name: item,
                  folder: baseDir || 'root',
                });
              }
            }
          } catch (_) {}
          return results;
        };

        let photos = walkDir(mediaDir);

        // Apply filters
        if (category) {
          photos = photos.filter(p => p.folder.toLowerCase().includes(category.toLowerCase()));
        }
        if (search) {
          photos = photos.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));
        }

        // Group by folder
        const grouped: Record<string, string[]> = {};
        for (const photo of photos.slice(0, limit)) {
          if (!grouped[photo.folder]) grouped[photo.folder] = [];
          grouped[photo.folder].push(photo.name);
        }

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              total_found: photos.length,
              showing: Math.min(photos.length, limit),
              base_path: mediaDir,
              by_folder: grouped,
            }, null, 2),
          }],
        };
      }

      case 'get_post_photos': {
        const planPath = join(__dirname, '..', 'content', 'instagram-posts-ready.json');
        const postId = args.post_id as number;

        try {
          const planData = JSON.parse(readFileSync(planPath, 'utf-8'));
          const post = [...(planData.posts || []), ...(planData.future_posts || [])]
            .find((p: any) => p.id === postId);

          if (!post) {
            return { content: [{ type: 'text', text: JSON.stringify({ error: `Post ${postId} not found` }) }], isError: true };
          }

          const mediaDir = join(__dirname, '..', 'media', 'music', 'images');

          // Check which photos exist
          const checkExists = (relativePath: string): { file: string; exists: boolean; full_path: string } => {
            const fullPath = join(mediaDir, relativePath);
            let exists = false;
            try {
              statSync(fullPath);
              exists = true;
            } catch (_) {}
            return { file: relativePath, exists, full_path: fullPath };
          };

          const photoStatus = (post.photos_needed || []).map((photo: any) => ({
            ...photo,
            ...checkExists(photo.file),
          }));

          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                post_id: post.id,
                title: post.title,
                type: post.type,
                priority: post.priority,
                caption: post.caption,
                hashtags: post.hashtags,
                photos: photoStatus,
                story_context: post.story_context,
                action_required: post.action_required,
              }, null, 2),
            }],
          };
        } catch (e: any) {
          return { content: [{ type: 'text', text: JSON.stringify({ error: e.message }) }], isError: true };
        }
      }

      // ═══════════════════════════════════════════════════════════════
      // DATABASE ANALYSIS HANDLERS
      // ═══════════════════════════════════════════════════════════════

      case 'get_data_freshness': {
        const { getDataFreshnessReport } = await import('./db/queries/index.js');
        try {
          const report = await getDataFreshnessReport();
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                summary: {
                  hashtags: report.hashtags.isFresh ? '✅ Fresh' : '⚠️ Stale',
                  audience: report.audience.isFresh ? '✅ Fresh' : '⚠️ Stale',
                  posts_ready: report.posts.ready,
                },
                details: report,
                recommendations: [
                  !report.hashtags.isFresh && 'Run run_analysis to refresh hashtag data',
                  !report.audience.isFresh && 'Run run_analysis to refresh audience data',
                  report.posts.ready === 0 && 'No posts ready - check editorial plan',
                ].filter(Boolean),
              }, null, 2),
            }],
          };
        } catch (e: any) {
          return { content: [{ type: 'text', text: JSON.stringify({ error: e.message }) }], isError: true };
        }
      }

      case 'get_hashtag_analysis': {
        const { getHashtagAnalysis, getTopHashtags } = await import('./db/queries/index.js');
        try {
          const hashtag = args.hashtag as string | undefined;
          const limit = (args.limit as number) || 10;

          if (hashtag) {
            const analysis = await getHashtagAnalysis(hashtag);
            if (!analysis) {
              return { content: [{ type: 'text', text: JSON.stringify({ error: `No analysis found for #${hashtag}. Run run_analysis first.` }) }], isError: true };
            }
            return { content: [{ type: 'text', text: JSON.stringify(analysis, null, 2) }] };
          }

          const topHashtags = await getTopHashtags(limit);
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                count: topHashtags.length,
                hashtags: topHashtags.map(h => ({
                  name: `#${h.hashtag_name}`,
                  score: h.engagement_score,
                  avg_likes: h.avg_likes,
                  avg_comments: h.avg_comments,
                  recommendation: h.recommendation,
                  analyzed: h.analyzed_at,
                })),
              }, null, 2),
            }],
          };
        } catch (e: any) {
          return { content: [{ type: 'text', text: JSON.stringify({ error: e.message }) }], isError: true };
        }
      }

      case 'get_audience_snapshot': {
        const { getLatestAudience, getAudienceHistory, calculateGrowth } = await import('./db/queries/index.js');
        try {
          const includeHistory = args.include_history as boolean || false;
          const historyDays = (args.history_days as number) || 7;

          const latest = await getLatestAudience('instagram');
          if (!latest) {
            return { content: [{ type: 'text', text: JSON.stringify({ error: 'No audience data. Run run_analysis first.' }) }], isError: true };
          }

          const result: any = {
            current: {
              followers: latest.followers,
              posts: latest.posts_count,
              reach_28d: latest.reach_28d,
              captured_at: latest.captured_at,
            },
            demographics: {
              top_countries: latest.top_countries.slice(0, 5),
              top_cities: latest.top_cities.slice(0, 5),
              age_gender: latest.age_gender,
            },
          };

          if (includeHistory) {
            const history = await getAudienceHistory('instagram', historyDays);
            const growth = await calculateGrowth('instagram', historyDays);
            result.history = {
              snapshots: history.length,
              growth: growth,
            };
          }

          return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
        } catch (e: any) {
          return { content: [{ type: 'text', text: JSON.stringify({ error: e.message }) }], isError: true };
        }
      }

      case 'get_post_drafts': {
        const { getPostDrafts, getReadyPosts } = await import('./db/queries/index.js');
        try {
          const status = args.status as string | undefined;
          const priority = args.priority as string | undefined;

          const drafts = status || priority
            ? await getPostDrafts(status as any, priority as any)
            : await getReadyPosts();

          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                count: drafts.length,
                posts: drafts.map(d => ({
                  id: d.id,
                  title: d.title,
                  platform: d.platform,
                  type: d.post_type,
                  status: d.status,
                  priority: d.priority,
                  scheduled: d.scheduled_for,
                  hashtags: d.hashtags,
                })),
              }, null, 2),
            }],
          };
        } catch (e: any) {
          return { content: [{ type: 'text', text: JSON.stringify({ error: e.message }) }], isError: true };
        }
      }

      case 'run_analysis': {
        if (!clients.instagram) throw new Error('Instagram not configured');

        const { startSession, endSession, saveHashtagAnalysis, saveAudienceSnapshot } = await import('./db/queries/index.js');

        const analyzeAudience = args.analyze_audience !== false;
        const analyzeHashtags = args.analyze_hashtags !== false;
        const hashtagLimit = Math.min((args.hashtag_limit as number) || 5, 10);

        const results: any = { session: null, audience: null, hashtags: [] };

        try {
          // Start session
          const sessionName = `mcp_analysis_${new Date().toISOString().split('T')[0]}`;
          const sessionId = await startSession(sessionName, 'general', 'Analysis triggered via MCP');
          results.session = sessionId;

          // Audience snapshot
          if (analyzeAudience) {
            const account = await clients.instagram.getAccountInsights('day');
            const audience = await clients.instagram.getAudienceInsights();

            if (account) {
              await saveAudienceSnapshot({
                platform: 'instagram',
                username: 'flutur_8',
                followers: account.followerCount || 0,
                following: 0,
                posts_count: account.mediaCount || 0,
                reach_28d: account.reach,
                profile_views_28d: account.profileViews,
                website_clicks_28d: account.websiteClicks,
                top_countries: audience?.topCountries || [],
                top_cities: audience?.topCities || [],
                age_gender: (audience?.ageGender || []).map(ag => ({
                  age: ag.ageRange,
                  male: ag.male,
                  female: ag.female,
                })),
              }, sessionId);
              results.audience = { followers: account.followerCount, saved: true };
            }
          }

          // Hashtag analysis
          if (analyzeHashtags) {
            const hashtagsToAnalyze = ['flutur', 'busker', 'streetmusic', 'ravvast', 'fieldrecording'].slice(0, hashtagLimit);

            for (const tag of hashtagsToAnalyze) {
              const analysis = await clients.instagram.analyzeHashtag(tag);
              if (analysis) {
                const score = analysis.avgLikes + analysis.avgComments * 2;
                await saveHashtagAnalysis({
                  hashtag_name: analysis.name,
                  instagram_id: analysis.id,
                  avg_likes: analysis.avgLikes,
                  avg_comments: analysis.avgComments,
                  engagement_score: score,
                  top_posts_analyzed: analysis.topMediaCount,
                  sample_posts: analysis.topPosts,
                  recommendation: score > 2000 ? 'keep' : score < 100 ? 'avoid' : 'test',
                }, sessionId);
                results.hashtags.push({ name: tag, score, saved: true });
              }
              await new Promise(r => setTimeout(r, 1000)); // Rate limit
            }
          }

          await endSession(sessionId, 'Analysis completed via MCP');

          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                success: true,
                ...results,
                message: `Analyzed ${results.hashtags.length} hashtags, audience ${results.audience ? 'captured' : 'skipped'}`,
              }, null, 2),
            }],
          };
        } catch (e: any) {
          return { content: [{ type: 'text', text: JSON.stringify({ error: e.message, partial_results: results }) }], isError: true };
        }
      }

      // ═══════════════════════════════════════════════════════════════
      // SYSTEM STATUS HANDLER
      // ═══════════════════════════════════════════════════════════════
      case 'system_status': {
        const includeCredentials = args.include_credentials !== false;
        const includeDbStats = args.include_db_stats !== false;

        const status: any = {
          timestamp: new Date().toISOString(),
          platforms: {
            twitter: clients.twitter?.isConfigured() || false,
            instagram: clients.instagram?.isConfigured() || false,
            reddit: clients.reddit?.isConfigured() || false,
            linkedin: clients.linkedin?.isConfigured() || false,
          },
        };

        // Credentials from Keychain
        if (includeCredentials) {
          try {
            const credStatus = await getCredentialsStatus();
            status.credentials = {
              summary: credStatus.summary,
              platforms: credStatus.platforms,
            };
          } catch (e: any) {
            status.credentials = { error: e.message };
          }
        }

        // Database stats
        if (includeDbStats) {
          try {
            const db = await getDb();
            const tables = ['content', 'venue', 'email', 'gig', 'hashtag_analysis', 'story_arc', 'platform_content'];
            const counts: Record<string, number> = {};

            for (const table of tables) {
              const [result] = await db.query(`SELECT count() FROM ${table} GROUP ALL`);
              counts[table] = (result as any)?.[0]?.count ?? 0;
            }

            status.database = {
              connected: true,
              tables: counts,
            };

            // Active story arc
            const [arcResult] = await db.query('SELECT name, theme FROM story_arc WHERE status = "active" LIMIT 1');
            if ((arcResult as any[])?.length > 0) {
              status.active_arc = (arcResult as any[])[0];
            }

            // Artist profile
            const [profileResult] = await db.query('SELECT stage_name, based_in FROM artist_profile LIMIT 1');
            if ((profileResult as any[])?.length > 0) {
              status.artist = (profileResult as any[])[0];
            }
          } catch (e: any) {
            status.database = { connected: false, error: e.message };
          }
        }

        // Quick recommendations
        status.recommendations = [];
        if (!status.platforms.twitter) status.recommendations.push('Configure Twitter credentials');
        if (!status.platforms.instagram) status.recommendations.push('Configure Instagram credentials');
        if (status.database?.tables?.content === 0) status.recommendations.push('Import content to database');
        if (!status.active_arc) status.recommendations.push('Create a story arc with orchestrator');

        return {
          content: [{
            type: 'text',
            text: JSON.stringify(status, null, 2),
          }],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error: any) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({ error: error.message }, null, 2),
      }],
      isError: true,
    };
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('🚀 Social CLI MCP Server running on stdio');
}

main().catch(console.error);
