# Email Preview Module — Design Spec

**Date:** 2026-04-03
**Status:** PLANNED (not yet implemented)
**Depends on:** Production-ready refactor completion (outreach pipeline reimplementation)

## Problem

The outreach workflow currently has no visual preview step. Emails are composed as JSON objects, reviewed as raw text in the terminal, then sent. This creates risk:
- HTML rendering issues invisible until the venue receives them
- No quick way to edit formatting/layout before send
- Approval flow is text-based — easy to miss issues in long batches
- No unified view of what was sent, what's pending, what got replies

## Goal

A local preview server that renders outreach emails in a browser popup, allows inline editing, and feeds approval status back to Claude Code for send orchestration.

**Flow:**
```
Claude composes batch → preview server renders HTML → user reviews in browser
→ user approves/edits per-email → back in Claude CLI: "manda le approvate"
→ Claude calls send pipeline → tracking updated
```

## Architecture

### Components

```
src/
├── services/
│   └── outreach/
│       └── preview.ts         # Preview server logic
└── server/
    └── tools/
        └── outreach.ts        # MCP tool: outreach_preview_open, outreach_preview_status

scripts/
└── preview-server.ts          # Standalone launcher (launchd or manual)
```

### Preview Server (`src/services/outreach/preview.ts`)

Express server on `localhost:3847`. NOT exposed externally.

**Endpoints:**

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | Dashboard: all batches, status overview |
| GET | `/batch/:id` | Batch view: all emails in batch, rendered |
| GET | `/email/:id` | Single email rendered as HTML (as recipient sees it) |
| POST | `/email/:id/approve` | Mark email as approved |
| POST | `/email/:id/reject` | Mark email as rejected (with optional reason) |
| POST | `/email/:id/edit` | Update email body/subject |
| POST | `/batch/:id/approve-all` | Approve all emails in batch |
| GET | `/api/batch/:id/status` | JSON: approval status per email (Claude polls this) |
| GET | `/conversations` | Thread view: sent + replies per venue |

**UI stack:** Server-rendered HTML with inline CSS. No React, no build step, no client JS framework. Just `res.send()` with template literals. Emails render in `<iframe>` to isolate styles.

**Why no framework:** This is a local dev tool for one user. Template literals are faster to build, zero dependencies, instant reload. If it grows, migrate to Vite later.

### Data Flow

```
                    ┌──────────────────────┐
                    │  outreach pipeline   │
                    │  (services/outreach) │
                    └──────────┬───────────┘
                               │ generates batch JSON
                               ▼
                    ┌──────────────────────┐
                    │   preview server     │
                    │   localhost:3847     │
                    │                      │
                    │  reads batch JSON    │
                    │  renders HTML        │
                    │  tracks approvals    │
                    └──────────┬───────────┘
                               │
              ┌────────────────┼────────────────┐
              ▼                ▼                ▼
         browser          Claude CLI       send pipeline
         (user reviews)   (polls status)   (sends approved)
```

### Batch State Machine

```
generating → preview → [user reviews] → approved → sending → sent
                ↓                            ↓
             rejected                     error
```

Approval is per-email within a batch. A batch moves to `approved` only when the user explicitly triggers it (not auto on last email approval).

### MCP Tool Integration

Two new tools in `src/server/tools/outreach.ts`:

**`outreach_preview_open`**
- Starts preview server if not running
- Opens batch in default browser (`open http://localhost:3847/batch/{id}`)
- Returns batch URL

**`outreach_preview_status`**
- Returns JSON: per-email approval status, edit history, rejection reasons
- Claude uses this to know what to send

### Storage

Batch data lives in the same JSON files the pipeline already generates (`content/outreach/generated/*.json`). The preview server reads these — no separate database.

Approval status stored as a sidecar file: `content/outreach/generated/{batch-id}-approvals.json`:

```json
{
  "batchId": "greece-wave-2026-02-23",
  "emails": [
    {
      "id": "email-001",
      "venue": "Afrogreco",
      "status": "approved",
      "editedBody": null,
      "editedSubject": null,
      "rejectedReason": null,
      "reviewedAt": "2026-02-23T10:15:00Z"
    }
  ],
  "batchStatus": "approved",
  "approvedAt": "2026-02-23T10:20:00Z"
}
```

### Conversation View

The `/conversations` endpoint renders the thread history per venue:
- Pulls from `src/services/outreach/conversation.ts` (Drizzle queries)
- Shows: sent emails, received replies, reply type (human/auto/bounce), timestamps
- Links to related batch previews

This replaces the current terminal-only conversation dashboard.

## Email Rendering

Emails are composed as plain text (the outreach pipeline doesn't generate HTML). The preview server wraps them in a minimal email template:

```html
<div style="max-width: 600px; font-family: Arial, sans-serif; line-height: 1.6;">
  <p>{body with newlines → <br>}</p>
  <hr>
  <small>Video: {video_url}</small>
</div>
```

The iframe shows exactly how Gmail will render it (Gmail strips most CSS, so keeping it simple is correct).

## Integration with Existing Systems

| System | Integration |
|--------|------------|
| `services/outreach/pipeline.ts` | Pipeline generates batch → preview reads it |
| `services/outreach/conversation.ts` | Conversation history for `/conversations` view |
| `services/platform/gmail.ts` | Send approved emails |
| `lib/email-guard.ts` | Rate limit + dedup check before send |
| `services/outreach/preflight.ts` | Preflight check before send |
| MCP `outreach_pipeline_run` | Triggers pipeline → then opens preview |

## Security

- Binds to `localhost` only — not exposed on network
- No authentication (local tool, single user)
- Email guard fail-closed: any error blocks send
- Daily limit enforced: 55 emails/day

## Dependencies (new)

```
express          # already in package.json (spec'd for HTTP transport)
```

No new dependencies. Express is already a dependency per the refactor design spec.

## What This Does NOT Do

- Does NOT replace the MCP server or Telegram bot
- Does NOT add a full CRM/dashboard (admin-dashboard/ exists separately)
- Does NOT handle Gmail OAuth — uses existing `services/platform/gmail.ts`
- Does NOT build HTML email templates — emails are plain text, as they should be for cold outreach
- Does NOT auto-send on approval — user must explicitly tell Claude to send

## Implementation Estimate

~300-400 lines total:
- `services/outreach/preview.ts`: ~200 lines (Express server + template rendering)
- `server/tools/outreach.ts`: ~30 lines (two new tool registrations)
- `scripts/preview-server.ts`: ~20 lines (standalone launcher)
- Templates: ~100 lines (HTML template literals for dashboard, batch view, email view)
