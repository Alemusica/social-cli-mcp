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
import type { PostResult } from './types.js';

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
