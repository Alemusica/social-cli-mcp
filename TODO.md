# TODO — flutur-ops (social-cli-mcp)

## Architecture Status

Production-ready refactor completed 2026-04-03.
- **New arch:** `src/server/` + `src/services/` + `src/db/` (Drizzle/Neon) + `src/config/` + `src/lib/` + `src/types/`
- **Old code removed:** ~26K lines deleted (mcp-server.ts monolith, telegram-bot.ts, core/, agents/, old outreach/, etc.)
- **Scripts cleaned:** 113 → 18 (86 one-off scripts deleted)
- **Design spec:** `docs/superpowers/specs/2026-04-02-production-ready-refactor-design.md`

---

## Priority: Critical

### Remaining Migration Work
- [ ] **Data migration SurrealDB → Neon** — `scripts/migrate-from-surreal.ts` exists, needs execution
- [ ] **Rewrite `scripts/send-outreach.ts`** — currently imports from old `src/utils/email-guard.js` + `src/outreach/preflight.js` + `src/keychain.js` (all deleted). Must use `src/services/outreach/pipeline.ts` + `src/lib/email-guard.ts`
- [ ] **Rewrite `scripts/analytics-snapshot.ts`** — imports from deleted `src/core/credentials.js`, `src/analytics/*`. Must use `src/services/analytics/` + `src/config/credentials.ts`
- [ ] **Rewrite `scripts/memory-context.ts`** — likely imports from deleted code. Must use `src/services/memory/`
- [ ] **Reimplement email generation** — `src/services/outreach/pipeline.ts` has TODO stub at line ~163 where old `email-generator.ts` was dynamically imported. Core outreach pipeline is incomplete without this.
- [ ] **Wire Telegram bot** — `src/server/telegram.ts` exists (922 lines) but may reference old barrel. Verify imports.

### Email Preview Module (PLANNED)
- [ ] **Spec:** `docs/superpowers/specs/2026-04-03-email-preview-module-design.md`
- [ ] Local Express server on `localhost:3847` for HTML email preview
- [ ] Claude composes → preview server renders → user approves/edits → Claude sends
- [ ] Integrates with `src/services/outreach/pipeline.ts` + `src/services/platform/gmail.ts`

---

## Priority: High

### Infrastructure
- [ ] **Deploy Telegram bot** — PM2 on Mac Mini (free), Fly.io (free), or Railway ($5/mo)
- [ ] **Setup Neon production** — Create production branch, configure DATABASE_URL
- [ ] **Backup automation** — `scripts/backup.sh` exists, wire to launchd
- [ ] **Sentry monitoring** — Add `@sentry/node` + `wrapMcpServerWithSentry`

### Testing
- [ ] **Unit tests for services** — Zero tests currently. Start with outreach pipeline + email guard
- [ ] **Integration tests for DB** — Neon branching or local Docker postgres
- [ ] **MCP tool tests** — Input validation, registration verification

---

## Priority: Medium

### Multi-tenancy
- [ ] **Client D (Lago Maggiore Academy)** — Create tenant config, test RLS isolation
- [ ] **Seed script** — `src/db/seed.ts` exists, populate tenant table + initial data

### Content & Outreach
- [ ] **Outreach follow-up automation** — Scheduled follow-ups via `src/services/outreach/scheduler.ts`
- [ ] **Content calendar** — `src/services/content/editorial-planner.ts` ready, needs wiring to MCP tools
- [ ] **Cross-platform posting** — `src/services/platform/` clients ready for Twitter, Instagram, YouTube

---

## Priority: Low

- [ ] **CI/CD** — GitHub Actions for `tsc --noEmit` + vitest
- [ ] **Streamable HTTP transport** — Currently stdio only. Express setup in spec.
- [ ] **Rate limiting middleware** — `src/server/middleware/rate-limit.ts` spec'd but not implemented
- [ ] **Remove SurrealDB dependency** — After migration complete, remove `surrealdb` from package.json

---

## Completed

### 2026-04-03
- [x] Production-ready refactor — new architecture stesura completa
- [x] Old code cleanup — 26K+ lines removed, 86 scripts deleted
- [x] Type system extracted — `src/types/index.ts` + `src/types/analytics.ts`
- [x] Zero TypeScript errors on clean build
- [x] Email preview module spec written

### 2026-04-02
- [x] Design spec written — clean slate approach with Neon PostgreSQL + Drizzle
- [x] Drizzle schema — 27 tables + 3 junction + pgvector (src/db/schema.ts)
- [x] MCP server modular — 7 tool files + middleware + dual transport
- [x] Services layer — outreach, analytics, content, calendar, memory, platform
