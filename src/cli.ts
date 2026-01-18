#!/usr/bin/env node
/**
 * Social CLI - Post to multiple platforms from the command line
 *
 * Usage:
 *   social post "Hello world!" --twitter --reddit
 *   social post "Check this out!" --all
 *   social thread tweet1.txt tweet2.txt --twitter
 *   social test --all
 */

import { Command } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { loadConfig, getConfiguredPlatforms } from './utils/config.js';
import { TwitterClient, RedditClient, InstagramClient, LinkedInClient } from './clients/index.js';
import type { Config, Platform, PostResult } from './types.js';

const program = new Command();

// Initialize clients
let config: Config;
let clients: {
  twitter?: TwitterClient;
  reddit?: RedditClient;
  linkedin?: LinkedInClient;
  instagram?: InstagramClient;
};

function initClients() {
  config = loadConfig();
  clients = {
    twitter: config.twitter ? new TwitterClient(config.twitter) : undefined,
    reddit: config.reddit ? new RedditClient(config.reddit) : undefined,
    linkedin: config.linkedin ? new LinkedInClient(config.linkedin) : undefined,
    instagram: config.instagram ? new InstagramClient(config.instagram) : undefined,
  };
}

program
  .name('social')
  .description('CLI tool for posting to social media platforms')
  .version('1.0.0');

// ─────────────────────────────────────────
// POST command
// ─────────────────────────────────────────
program
  .command('post <text>')
  .description('Post to social media platforms')
  .option('-t, --twitter', 'Post to Twitter/X')
  .option('-r, --reddit <subreddit>', 'Post to Reddit (requires subreddit)')
  .option('-l, --linkedin', 'Post to LinkedIn')
  .option('-i, --instagram <image>', 'Post to Instagram (requires image URL)')
  .option('-a, --all', 'Post to all configured platforms')
  .option('--title <title>', 'Title for Reddit post')
  .option('--link <url>', 'Include a link')
  .option('--hashtags <tags>', 'Comma-separated hashtags')
  .option('--media <urls>', 'Comma-separated media URLs')
  .action(async (text: string, options) => {
    initClients();

    const hashtags = options.hashtags?.split(',').map((h: string) => h.trim());
    const mediaUrls = options.media?.split(',').map((m: string) => m.trim());
    const results: PostResult[] = [];

    console.log(chalk.blue('\n📤 Posting to social media...\n'));

    // Twitter
    if ((options.twitter || options.all) && clients.twitter?.isConfigured()) {
      console.log(chalk.cyan('  🐦 Twitter...'));
      const result = await clients.twitter.post({
        text,
        link: options.link,
        hashtags,
        mediaUrls,
      });
      results.push(result);
      printResult(result);
    }

    // Reddit
    if (options.reddit && clients.reddit?.isConfigured()) {
      console.log(chalk.cyan('  🤖 Reddit...'));
      const result = await clients.reddit.post({
        text,
        subreddit: options.reddit,
        title: options.title || text.slice(0, 100),
        link: options.link,
        hashtags,
      });
      results.push(result);
      printResult(result);
    }

    // LinkedIn
    if ((options.linkedin || options.all) && clients.linkedin?.isConfigured()) {
      console.log(chalk.cyan('  💼 LinkedIn...'));
      const result = await clients.linkedin.post({
        text,
        link: options.link,
        hashtags,
        mediaUrls,
      });
      results.push(result);
      printResult(result);
    }

    // Instagram
    if (options.instagram && clients.instagram?.isConfigured()) {
      console.log(chalk.cyan('  📸 Instagram...'));
      const igMediaUrls = mediaUrls || [options.instagram];
      const result = await clients.instagram.post({
        text,
        caption: text,
        mediaUrls: igMediaUrls,
        hashtags,
      });
      results.push(result);
      printResult(result);
    }

    // Summary
    printSummary(results);
  });

// ─────────────────────────────────────────
// THREAD command (Twitter only)
// ─────────────────────────────────────────
program
  .command('thread <tweets...>')
  .description('Post a Twitter thread')
  .action(async (tweets: string[]) => {
    initClients();

    if (!clients.twitter?.isConfigured()) {
      console.log(chalk.red('❌ Twitter not configured'));
      return;
    }

    console.log(chalk.blue(`\n📤 Posting thread with ${tweets.length} tweets...\n`));

    const results = await clients.twitter.postThread(tweets);

    results.forEach((result, i) => {
      console.log(chalk.cyan(`  Tweet ${i + 1}:`));
      printResult(result);
    });

    printSummary(results);
  });

// ─────────────────────────────────────────
// TEST command
// ─────────────────────────────────────────
program
  .command('test')
  .description('Test connection to all configured platforms')
  .option('-t, --twitter', 'Test Twitter only')
  .option('-r, --reddit', 'Test Reddit only')
  .option('-l, --linkedin', 'Test LinkedIn only')
  .option('-i, --instagram', 'Test Instagram only')
  .option('-a, --all', 'Test all platforms')
  .action(async (options) => {
    initClients();

    console.log(chalk.blue('\n🔌 Testing connections...\n'));

    const testAll = options.all || (!options.twitter && !options.reddit && !options.linkedin && !options.instagram);

    if ((testAll || options.twitter) && clients.twitter) {
      await clients.twitter.testConnection();
    } else if (testAll || options.twitter) {
      console.log(chalk.yellow('  ⚠️  Twitter not configured'));
    }

    if ((testAll || options.reddit) && clients.reddit) {
      await clients.reddit.testConnection();
    } else if (testAll || options.reddit) {
      console.log(chalk.yellow('  ⚠️  Reddit not configured'));
    }

    if ((testAll || options.linkedin) && clients.linkedin) {
      await clients.linkedin.testConnection();
    } else if (testAll || options.linkedin) {
      console.log(chalk.yellow('  ⚠️  LinkedIn not configured'));
    }

    if ((testAll || options.instagram) && clients.instagram) {
      await clients.instagram.testConnection();
    } else if (testAll || options.instagram) {
      console.log(chalk.yellow('  ⚠️  Instagram not configured'));
    }

    console.log('');
  });

// ─────────────────────────────────────────
// STATUS command
// ─────────────────────────────────────────
program
  .command('status')
  .description('Show configured platforms')
  .action(() => {
    initClients();

    console.log(chalk.blue('\n📊 Platform Status\n'));

    const platforms = [
      { name: 'Twitter/X', client: clients.twitter, emoji: '🐦' },
      { name: 'Reddit', client: clients.reddit, emoji: '🤖' },
      { name: 'LinkedIn', client: clients.linkedin, emoji: '💼' },
      { name: 'Instagram', client: clients.instagram, emoji: '📸' },
    ];

    platforms.forEach(({ name, client, emoji }) => {
      if (client?.isConfigured()) {
        console.log(chalk.green(`  ${emoji} ${name}: ✅ Configured`));
      } else {
        console.log(chalk.gray(`  ${emoji} ${name}: ⚪ Not configured`));
      }
    });

    console.log(chalk.gray('\n  Configure platforms in .env file'));
    console.log(chalk.gray('  See .env.example for required variables\n'));
  });

// ─────────────────────────────────────────
// INTERACTIVE command
// ─────────────────────────────────────────
program
  .command('interactive')
  .alias('i')
  .description('Interactive posting mode')
  .action(async () => {
    initClients();

    const configuredPlatforms = getConfiguredPlatforms(config);

    if (configuredPlatforms.length === 0) {
      console.log(chalk.red('\n❌ No platforms configured. Set up .env file first.\n'));
      return;
    }

    const answers = await inquirer.prompt([
      {
        type: 'checkbox',
        name: 'platforms',
        message: 'Select platforms:',
        choices: [
          { name: '🐦 Twitter/X', value: 'twitter', disabled: !clients.twitter?.isConfigured() },
          { name: '🤖 Reddit', value: 'reddit', disabled: !clients.reddit?.isConfigured() },
          { name: '💼 LinkedIn', value: 'linkedin', disabled: !clients.linkedin?.isConfigured() },
          { name: '📸 Instagram', value: 'instagram', disabled: !clients.instagram?.isConfigured() },
        ],
      },
      {
        type: 'editor',
        name: 'text',
        message: 'Enter your post:',
      },
      {
        type: 'input',
        name: 'hashtags',
        message: 'Hashtags (comma-separated):',
      },
      {
        type: 'input',
        name: 'link',
        message: 'Link to include (optional):',
      },
      {
        type: 'input',
        name: 'subreddit',
        message: 'Subreddit (for Reddit):',
        when: (answers) => answers.platforms.includes('reddit'),
      },
      {
        type: 'input',
        name: 'redditTitle',
        message: 'Reddit post title:',
        when: (answers) => answers.platforms.includes('reddit'),
      },
      {
        type: 'input',
        name: 'imageUrl',
        message: 'Image URL (required for Instagram):',
        when: (answers) => answers.platforms.includes('instagram'),
      },
    ]);

    const hashtags = answers.hashtags?.split(',').map((h: string) => h.trim()).filter(Boolean);
    const results: PostResult[] = [];

    console.log(chalk.blue('\n📤 Posting...\n'));

    for (const platform of answers.platforms) {
      console.log(chalk.cyan(`  Posting to ${platform}...`));

      let result: PostResult;

      switch (platform) {
        case 'twitter':
          result = await clients.twitter!.post({
            text: answers.text,
            link: answers.link,
            hashtags,
          });
          break;
        case 'reddit':
          result = await clients.reddit!.post({
            text: answers.text,
            subreddit: answers.subreddit,
            title: answers.redditTitle || answers.text.slice(0, 100),
            link: answers.link,
            hashtags,
          });
          break;
        case 'linkedin':
          result = await clients.linkedin!.post({
            text: answers.text,
            link: answers.link,
            hashtags,
          });
          break;
        case 'instagram':
          result = await clients.instagram!.post({
            text: answers.text,
            caption: answers.text,
            mediaUrls: [answers.imageUrl],
            hashtags,
          });
          break;
        default:
          continue;
      }

      results.push(result);
      printResult(result);
    }

    printSummary(results);
  });

// ─────────────────────────────────────────
// Helper functions
// ─────────────────────────────────────────
function printResult(result: PostResult) {
  if (result.success) {
    console.log(chalk.green(`    ✅ Success!`));
    if (result.url) {
      console.log(chalk.gray(`    📎 ${result.url}`));
    }
  } else {
    console.log(chalk.red(`    ❌ Failed: ${result.error}`));
  }
}

function printSummary(results: PostResult[]) {
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  console.log(chalk.blue('\n📊 Summary'));
  console.log(chalk.green(`  ✅ Successful: ${successful}`));
  if (failed > 0) {
    console.log(chalk.red(`  ❌ Failed: ${failed}`));
  }
  console.log('');
}

// Run CLI
program.parse();
