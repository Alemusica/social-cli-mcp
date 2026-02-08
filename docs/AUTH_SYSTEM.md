# Auth & Credentials System

## Overview

Credentials are stored in **macOS Keychain** (service: `social-cli-mcp`).
At runtime, `loadSecretsToEnv()` loads them into `process.env`.

Code: `src/core/credentials.ts` + `src/keychain.ts`

---

## Credential Sources

| Platform | Auth Method | Files | Refresh |
|----------|------------|-------|---------|
| Gmail (send) | App Password | Keychain: `GMAIL_USER`, `GMAIL_APP_PASSWORD` | Never expires |
| Gmail (read) | OAuth2 | `gmail-credentials.json` + `gmail-token.json` | `npx tsx scripts/refresh-gmail-token.ts` |
| Twitter | API Keys | Keychain: `TWITTER_*` | Never expires |
| Instagram | Graph API | Keychain: `INSTAGRAM_*` | `npx tsx scripts/refresh-instagram-token.ts` |
| Telegram | Bot Token | Keychain: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_USER_ID` | Never expires |
| YouTube | OAuth2 | `youtube-credentials.json` + Keychain | `npx tsx scripts/youtube-oauth-setup.ts` |
| Anthropic | API Key | Keychain: `ANTHROPIC_API_KEY` | Never expires |
| SurrealDB | User/Pass | Hardcoded: `root/root` @ `localhost:8000` | N/A |
| Supabase | Service Key | Keychain: `SUPABASE_URL`, `SUPABASE_SERVICE_KEY` | Never expires |

---

## Gmail Auth (2 systems)

### 1. Gmail SMTP (Sending)

Used by: `src/gmail-sender.ts`, `scripts/send-outreach.ts`

- **Auth**: App Password (not OAuth)
- **Keychain keys**: `GMAIL_USER` = `flutur8i8@gmail.com`, `GMAIL_APP_PASSWORD`
- **How to get**: Google Account → Security → 2FA → App Passwords → "Mail"
- **Never expires** unless 2FA is disabled

### 2. Gmail API (Reading)

Used by: `src/clients/gmail-reader.ts`, `scripts/outreach-morning-check.ts`

- **Auth**: OAuth2 (googleapis npm)
- **Google Cloud Project**: `charged-sled-370207` (app name: `gmail_assistant_api`)
- **Scopes**: `gmail.readonly` + `gmail.send`
- **Files**:
  - `gmail-credentials.json` — OAuth client config (DO NOT COMMIT)
  - `gmail-token.json` — Access + refresh token (DO NOT COMMIT)
- **Refresh**: Automatic via `auth.on('tokens')` handler in gmail-reader.ts
- **Full re-auth** (when refresh token is revoked):
  ```bash
  npx tsx scripts/refresh-gmail-token.ts
  ```
  Opens browser → authorize → callback on localhost:3456 → token saved

**IMPORTANT**: The Google Cloud project is in "Testing" mode.
If you get `access_denied`, add the Gmail account as a test user:
Google Cloud Console → Project `charged-sled-370207` → OAuth consent screen → Test users

---

## YouTube Auth

Used by: `src/analytics/index.ts`, `scripts/analytics-snapshot.ts`

- **Google Cloud Project**: `gen-lang-client-0315532984` (app name: `flutur-cli`)
- **Scopes**: `youtube.readonly`, `yt-analytics.readonly`
- **Keychain keys**: `YOUTUBE_ACCESS_TOKEN`, `YOUTUBE_REFRESH_TOKEN`, `YOUTUBE_CHANNEL_ID`
- **Channel ID**: `UCiY5OuIb2OvK0tYsJzYnkig`
- **Setup**: `npx tsx scripts/youtube-oauth-setup.ts`

---

## Keychain Operations

```bash
# List all stored credentials
security find-generic-password -s social-cli-mcp -a social-cli-mcp 2>/dev/null

# Add/update a credential
security add-generic-password -a social-cli-mcp -s social-cli-mcp -w "KEY=value" -U

# In code
import { getFromKeychain, setInKeychain } from './core/credentials.js';
const value = getFromKeychain('GMAIL_USER');
```

---

## Safety Layers

| Layer | File | What it does |
|-------|------|-------------|
| Email Guard | `src/utils/email-guard.ts` | 25/day limit, per-recipient dedup, fail-CLOSED |
| Send Log | `logs/send-log.json` | Append-only record of every email sent |
| Tracking | `content/outreach/tracking.json` | Source of truth for sent outreach |
| Gmail Dedup | `outreach_reply.gmail_message_id` | UNIQUE index prevents duplicate reply records |

---

## File Locations (DO NOT COMMIT)

These files contain secrets and are in `.gitignore`:

```
gmail-credentials.json    # OAuth client config
gmail-token.json          # OAuth access/refresh token
youtube-credentials.json  # YouTube OAuth client config
.env                      # Legacy env vars (mostly empty now)
```

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `invalid_grant` on Gmail | Token revoked. Run `npx tsx scripts/refresh-gmail-token.ts` |
| `access_denied` on Gmail | Add email to test users in Google Cloud Console |
| `localhost refused` after OAuth | Script crashed. Run script first, then auth in browser |
| Gmail send fails | Check App Password in Keychain, not OAuth token |
| YouTube `invalid_grant` | Run `npx tsx scripts/youtube-oauth-setup.ts` |
| SurrealDB connection refused | `launchctl start com.surrealdb.knowledge` |
