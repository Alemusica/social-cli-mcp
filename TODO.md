# TODO - Social CLI MCP

## Priority: High

### Security & Infrastructure
- [ ] **Deploy Telegram bot** - Options: PM2 on Mac Mini (free), Fly.io (free), Railway ($5/mo)
- [ ] **Add remaining APIs to security-gate** - Instagram, LinkedIn, Reddit, TikTok, YouTube
- [ ] **Setup encrypted storage** - Sparse bundle or Keychain for local secrets (avoid FileVault for music production latency)

### Outreach
- [ ] **Monitor venue responses** - 21+ emails sent, check replies
- [ ] **Submit Scorpios form manually** - Data in `content/outreach/scorpios-form-data.md`
- [ ] **Tier 1 venues** - Research and contact premium venues

## Priority: Medium

### Content & Social
- [ ] **Twitter content calendar** - Plan posts for Flutur (music) and jsOM (software)
- [ ] **Create video content** - Use ai-clips-maker for short-form content
- [ ] **Cross-platform posting** - Add Instagram, LinkedIn posting to bot

### Bot Enhancements
- [ ] **Add /schedule command** - Schedule tweets/posts for later
- [ ] **Add /analytics command** - Fetch Twitter/social analytics
- [ ] **Improve Claude context** - Add more project data for better AI responses

## Priority: Low

- [ ] **Add tests** - Unit tests for clients and security-gate
- [ ] **CI/CD pipeline** - GitHub Actions for automated testing
- [ ] **Rate limiting** - Add rate limits to prevent API abuse

---

## Completed

### 2026-01-20
- [x] Created Telegram bot with Claude AI integration
- [x] Implemented security confirmation for tweets and emails
- [x] Added Twitter reading (getMyRecentTweets, getMe)
- [x] Sent 21+ venue outreach emails
- [x] Posted NICO/jsOM tweet with hashtags
- [x] Setup Railway deployment config (Dockerfile, railway.json)
- [x] Created security-gate.ts for CLI-to-Telegram confirmation bridge

---

## Quick Commands

```bash
# Run bot locally
npm run bot

# Test email with Telegram confirmation
npx tsx src/security-gate.ts test-email your@email.com

# Test tweet with Telegram confirmation
npx tsx src/security-gate.ts test-tweet "Your tweet text"

# Build for production
npm run build
```

## Architecture

```
┌─────────────────┐     ┌──────────────────┐
│  Claude Code    │────▶│  security-gate   │
│  (CLI actions)  │     │  (confirmation)  │
└─────────────────┘     └────────┬─────────┘
                                 │
                                 ▼
                        ┌──────────────────┐
                        │  Telegram Bot    │
                        │  (user confirms) │
                        └────────┬─────────┘
                                 │
                    ┌────────────┼────────────┐
                    ▼            ▼            ▼
              ┌─────────┐  ┌─────────┐  ┌─────────┐
              │ Twitter │  │  Email  │  │  Other  │
              │   API   │  │  SMTP   │  │  APIs   │
              └─────────┘  └─────────┘  └─────────┘
```

## Environment Variables Required

See `.env.example` for full list. Key ones:
- `TELEGRAM_BOT_TOKEN` - From @BotFather
- `TELEGRAM_USER_ID` - Your Telegram user ID (security)
- `TWITTER_*` - Twitter API credentials
- `GMAIL_USER` / `GMAIL_APP_PASSWORD` - For email sending
- `ANTHROPIC_API_KEY` - For Claude AI in bot
