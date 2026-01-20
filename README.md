# Social CLI MCP 📱

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> CLI tool for posting to social media platforms with MCP server support for AI agents

Post to **Twitter/X**, **Reddit**, **LinkedIn**, and **Instagram** from your terminal or via AI agents.

---

## Features

- 🐦 **Twitter/X** - Posts, threads, media uploads, analytics
- 🤖 **Reddit** - Text posts, link posts, cross-posting
- 💼 **LinkedIn** - Updates with links and images
- 📸 **Instagram** - Photo/video posts, carousels (Creator/Business accounts)
- 📧 **Email** - Gmail SMTP for outreach campaigns
- 🤖 **MCP Server** - AI agent integration
- 🎨 **Interactive mode** - Guided posting experience
- 📱 **Telegram Bot** - Remote control + Claude AI chat
- 🔐 **Security Gate** - All sensitive actions require Telegram confirmation

---

## Quick Start

### 1. Install

```bash
git clone https://github.com/Alemusica/social-cli-mcp.git
cd social-cli-mcp
npm install
```

### 2. Configure

```bash
cp .env.example .env
# Edit .env with your API credentials
```

### 3. Test connections

```bash
npm run cli test
```

### 4. Post!

```bash
# Single platform
npm run cli post "Hello world!" --twitter

# Multiple platforms
npm run cli post "Check this out!" --twitter --linkedin

# Reddit (requires subreddit)
npm run cli post "My post" --reddit ClaudeAI --title "My Title"

# Instagram (requires image)
npm run cli post "My caption" --instagram "https://example.com/image.jpg"

# Interactive mode
npm run cli interactive
```

---

## CLI Commands

```bash
# Post to platforms
social post <text> [options]
  -t, --twitter              Post to Twitter/X
  -r, --reddit <subreddit>   Post to Reddit
  -l, --linkedin             Post to LinkedIn
  -i, --instagram <image>    Post to Instagram
  -a, --all                  Post to all configured
  --title <title>            Reddit post title
  --link <url>               Include a link
  --hashtags <tags>          Comma-separated hashtags
  --media <urls>             Comma-separated media URLs

# Post Twitter thread
social thread <tweet1> <tweet2> ...

# Test connections
social test [--all|--twitter|--reddit|--linkedin|--instagram]

# Show status
social status

# Interactive mode
social interactive
social i
```

---

## API Credentials Setup

### Twitter/X

1. Go to [developer.twitter.com](https://developer.twitter.com)
2. Create a project and app
3. Generate API keys and access tokens
4. Add to `.env`:
   ```
   TWITTER_API_KEY=xxx
   TWITTER_API_SECRET=xxx
   TWITTER_ACCESS_TOKEN=xxx
   TWITTER_ACCESS_SECRET=xxx
   ```

### Reddit

1. Go to [reddit.com/prefs/apps](https://reddit.com/prefs/apps)
2. Create a "script" type application
3. Add to `.env`:
   ```
   REDDIT_CLIENT_ID=xxx
   REDDIT_CLIENT_SECRET=xxx
   REDDIT_USERNAME=xxx
   REDDIT_PASSWORD=xxx
   ```

### LinkedIn

1. Go to [linkedin.com/developers](https://linkedin.com/developers)
2. Create an app
3. Request "Share on LinkedIn" permission
4. Get OAuth access token
5. Add to `.env`:
   ```
   LINKEDIN_ACCESS_TOKEN=xxx
   ```

### Instagram

> Requires Business or Creator account

1. Go to [developers.facebook.com](https://developers.facebook.com)
2. Create an app
3. Add Instagram Graph API
4. Link Facebook Page to Instagram account
5. Get access token
6. Add to `.env`:
   ```
   INSTAGRAM_ACCESS_TOKEN=xxx
   INSTAGRAM_BUSINESS_ACCOUNT_ID=xxx
   ```

---

## MCP Server

Use with Claude, Cursor, or any MCP-compatible AI agent.

### Configuration

Add to your MCP config:

```json
{
  "mcpServers": {
    "social": {
      "command": "node",
      "args": ["/path/to/social-cli-mcp/dist/mcp-server.js"],
      "env": {
        "TWITTER_API_KEY": "xxx",
        "TWITTER_API_SECRET": "xxx",
        "TWITTER_ACCESS_TOKEN": "xxx",
        "TWITTER_ACCESS_SECRET": "xxx"
      }
    }
  }
}
```

### Available Tools

| Tool | Description |
|------|-------------|
| `post_twitter` | Post a tweet |
| `post_twitter_thread` | Post a thread |
| `post_reddit` | Post to subreddit |
| `post_linkedin` | Post to LinkedIn |
| `post_instagram` | Post to Instagram |
| `post_all` | Post to all platforms |
| `test_connections` | Test all connections |
| `get_status` | Get config status |

---

## Telegram Bot 📱

Control your social media from Telegram with security confirmations.

### Setup

1. Create bot with [@BotFather](https://t.me/BotFather)
2. Get your user ID from [@userinfobot](https://t.me/userinfobot)
3. Add to `.env`:
   ```
   TELEGRAM_BOT_TOKEN=your_bot_token
   TELEGRAM_USER_ID=your_user_id
   ANTHROPIC_API_KEY=sk-ant-xxx  # Optional, for Claude AI
   ```

### Run

```bash
npm run bot
```

### Commands

| Command | Description |
|---------|-------------|
| `/tweet <text>` | Post tweet (with confirmation) |
| `/email to\|subj\|body` | Send email (with confirmation) |
| `/pending` | View pending actions |
| `/twitter` | View recent tweets + metrics |
| `/status` | Outreach status |
| `/venues` | List contacted venues |
| Free text | Chat with Claude AI |

### Security

All sensitive actions (tweets, emails) require confirmation via inline buttons. Actions expire after 5 minutes.

See [docs/TELEGRAM_BOT_SETUP.md](docs/TELEGRAM_BOT_SETUP.md) for detailed setup.

---

## Security Gate 🔐

When using Claude Code or other CLI tools, sensitive actions are routed through Telegram for confirmation:

```bash
# Test email with confirmation
npx tsx src/security-gate.ts test-email your@email.com

# Test tweet with confirmation
npx tsx src/security-gate.ts test-tweet "Hello world"
```

---

## Development

```bash
# Run CLI in dev mode
npm run cli <command>

# Run MCP server
npm run mcp

# Run Telegram bot
npm run bot

# Build
npm run build
```

---

## License

MIT

---

Built with ❤️ by [@FluturArt](https://twitter.com/FluturArt)
