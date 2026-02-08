# v7.0 | flutur-cc | 2026-02-07

## GRAFO

S.1 "SurrealDB" :graph @localhost:8000 ns=social db=analytics root/root
  .schema → src/db/schema.surql
  .fn → {outreach_status, data_freshness, top_hashtags, daily_analytics, recent_correlations}

S.2 "Supabase" :storage+ai | file storage + Claude Vision labeling
  .schema → supabase/migrations/001_photos_schema.sql
  .client → src/db/supabase-client.ts
  .sync → npx tsx scripts/sync-supabase-photos.ts [import|label|sync|status]

S.3 "Keychain" :credentials service="social-cli-mcp"
  .api → src/core/credentials.ts | getFromKeychain() setInKeychain()
  .ok = {Twitter, Instagram, Gmail, Telegram, Anthropic}
  .setup = {YouTube, Supabase}
  .missing = {LinkedIn, TikTok}

S.4 "8i8.art" :epk Next.js 14.2→Vercel
  .config → link-hub/src/lib/artist-config.ts
  .utm = ?utm_campaign=beach → hero swap
  .cookies = zero
  σ₂ send link NOT PDF | PDF only when explicitly requested

## ENTITÀ CENTRALI

```
E.1 "artist_profile:flutur" :nodo-centrale @S.1
  →creates→ E.2
  →performs_at→ venue
E.2 "software_project:jsom" :exit @github.com/alemusica/jsom
  →targets→ {Lovable, Vercel, Prisma, YC}
  =$ 6-7 fig

email →sent_to→ venue
content →taken_at_gig→ gig →performed_at→ venue
post →uses_hashtag→ hashtag
post →belongs_to_pillar→ content_pillar
story_fragment →fragment_inspires→ platform_content
story_fragment →fragment_in_arc→ story_arc
web_research →memory_link→ entity (via researchStore.save)
```

## FLUSSI DATI

```
M.1 instagramFetcher ← IG API (10 calls/wk budget) → S.1:audience_snapshot
M.2 youtubeFetcher ← YT API OAuth2 → S.1:youtube_snapshot
M.3 correlator ← {M.1, M.2, S.1:epk_analytics} → S.1:analytics_correlation
  | email→views→visit→reply pattern, 3-day window
M.4 insightsArchiver → M.5 → M.6
M.5 editorialIntelligence | corridor IT↔GR 70%
M.6 contentDrafter :interview | NON inventa, chiede
  .styles = {storytelling, minimal, poetic, educational, bridge}
  .guard = "Cosa NON devo inventare?"
M.7 email-guard :safety fail-CLOSED
  .limit = 25/day
  .log → logs/send-log.json (append-only)
  → gmail-sender → S.1:email →sent_to→ venue
M.8 duplicateChecker :auto
  | exact + 70% similarity + topic cooldown 7d
  .track → {analytics/posted-tweets-index.json, analytics/posted-instagram-index.json}
M.9 storyStore :editorial | biographical narrative fragments
  .save → story_fragment → memory_link (entities)
  .query → byTheme, forChannel, unpublished, byEntity
M.10 researchStore :cache | web research persistence
  σ₂ BEFORE WebSearch → researchStore.find(topic) | skip if <7d
  σ₂ AFTER WebSearch → researchStore.save() | ALWAYS
  .query → find(topic), search(query), recent()
M.11 gmailReader :inbox | Gmail API scan + Message-ID dedup
  .scan → outreach_reply (SCHEMAFULL, UNIQUE gmail_message_id)
  .scanSent → email (sent folder scan)
  .getThread → full Gmail thread (sent+reply)
  .findThreadByMessageId → RFC2822 → gmail_thread_id
  .classify → human_reply | auto_reply | bounce
  .persist → outreach_reply + memory_link(venue)
M.12 conversationStore :threads | unified sent+reply thread view
  .get(venue) → OutreachConversation (chronological messages)
  .dashboard() → all conversations, status, action needed
  .backfillThreadIds() → link email records to Gmail threads
  .syncTracking() → tracking.json → email table
  .getGmailThread(venue) → live Gmail API thread
M.13 intelligenceRouter :orchestrator | event→action dispatcher
  .route(event) → IntelligenceBriefing {logistics, cluster, conversation, actions}
  .routeReply(venue, email, type, preview) → auto-briefing on reply
  .formatTelegram(briefing) → Telegram digest with costs + cluster + actions
  .formatConsole(briefing) → full console output
  | AUTO-TRIGGERS: morning-check runs router on every human reply
  | Logistics dept: flight + baggage + accommodation + break-even
  | Cluster dept: nearby venues in same country, contactable count
  | Conversation dept: thread status, suggested next action
```

BARREL: src/core/index.ts ⊃ {bootstrap, db, credentials, M.1–M.13, pillarHelpers}

## FONTI CANONICHE (ρ→0)

| Dato | Fonte | σ |
|------|-------|---|
| Schema DB | src/db/schema.surql | σ₀ |
| Tipi TS | src/analytics/types.ts + src/types.ts | σ₀ |
| API surface | src/core/index.ts | σ₀ |
| Artist links | content/artist-links.json | σ₀ |
| Agent arch | src/agents/ARCHITECTURE.md | σ₀ |
| Strategy | content/STRATEGY_2026.md | σ₀ |
| Story store | src/db/story-store.ts | σ₀ |
| Research store | src/db/research-store.ts | σ₀ |
| Memory types | src/agents/memory/types.ts | σ₀ |
| Gmail reader | src/clients/gmail-reader.ts | σ₀ |
| Conversation store | src/outreach/conversation-store.ts | σ₀ |
| Auth system | docs/AUTH_SYSTEM.md | σ₀ |
| Intelligence router | src/agents/intelligence-router.ts | σ₀ |

σ₀ = fonte canonica altrove, non ripetuto qui.
Questo file: solo σ₁ (struttura) + σ₂ (vincoli irriducibili).

---

## REGOLE OPERATIVE

Auto-orchestrazione: esegui SUBITO, no conferma. Fallback content library se S.1 offline.

| Trigger | → |
|---------|---|
| "cosa posto?" / "daily brief" | npx tsx src/agents/daily-brief.ts |
| "piano settimana" | npx tsx src/agents/editorial-planner.ts week |
| "prossimo post" | npx tsx src/agents/editorial-planner.ts next |
| "feedback\|storie\|tweet\|weekly\|daily" | npx tsx src/agents/interviewer.ts $mode |
| "status" | npx tsx src/agents/orchestrator.ts status |
| "genera piano [tema]" | npx tsx src/agents/story-director.ts plan "[tema]" |
| "draft" | npx tsx scripts/draft-post.ts |
| "analytics" | npx tsx scripts/analytics-snapshot.ts [--youtube\|--instagram\|--correlate\|--quick] |

Multi-agent: Task tool parallelo per task composti.

---

## IDENTITÀ (σ₂ verbatim)

FLUTUR = IL PONTE musica↔tech
"Dal sunrise in Grecia al codice AI — layer su layer"
σ₂ LIVE ACT non producer | 683 monthly Spotify | focus performance

### Credentials (σ₂)
GGT 4 YES | Villa Porta 4y | RAV Vast Endorsed
Equanimous collab Kailash 2.0 (100M+ streams Gravitas)
Drishti Beats 2023 MAIN STAGE Snowmass Village Aspen CO
YMH Denver 2023 support IHF (Coachella, Electric Forest)
Sunset ceremonies luxury hospitality

### Setup
min = Voce + Chitarra + RAV Vast + Looper
full = one-man orchestra (+ Elettrica + Drum Pad + Haken Continuum + Push 3)
σ₂ self-contained: no backline, no sound engineer
Sound healing: self-taught, 4y luxury hotels, NON certificato

### Positioning (σ₂)
MAI "Sarò in [luogo]" → "Disponibile per booking 2026"
Wellness → "Sound Journey Facilitator"
Festival → workshop + performance
Venue → versatilità setup

---

## VINCOLI PIATTAFORMA

### 4 Pillars
tech          2x/wk Twitter,LinkedIn,YT    #buildinpublic #AI #jsOM
music_prod    2x/wk Twitter,IG,TikTok      #ableton #livelooping #musictech  ← BRIDGE
live_perf     3x/wk IG,TikTok,YT           #busker #ravvast #handpan #flutur
nature_auth   2x/wk IG,Twitter             #fieldrecording #musicianlife
σ₂ max 2 giorni consecutivi → checkConsecutivePillarRule()

### Platform Rules
Twitter  3-5/day  9-11AM  σ₂ links IN REPLY mai nel tweet | Threads per tech
IG Feed  4-5/wk   Gio21   3-5 hashtags | SHARES > Saves > Comments | 48h critical
IG Reels 3-5/wk   18-21   hook 3 sec
YT Short 3-5/wk   Mar18   crosspost Reels
IG API budget: 10/wk (50% post, 50% analysis)

### KPIs (priority order)
Share >3% → Save >5% → Comments → 48h engagement

### Narrative
Parallel paths (tech + music) → Saturday crossover | Mon=setup Sat=payoff

---

## OUTREACH (σ₂ vincoli)

Phase1 cold OK: jazz, small hotels, rooftop
Phase2 cold+warm: beach lounges, wellness
σ₂ Phase3 NO cold: premium clubs (Scorpios), luxury (Borgo Egnazia), major festivals

### Video Assets → reply rate
V.1 efthymia             wellness/spa    10% σ₂ BEST
V.2 rocca-transcendence  jazz/music      —
V.3 rocca-father-ocean   beach clubs     —
V.4 rocca-chase-the-sun  italian beach   0% rethink
V.5 who-is-flutur        festivals/press —
σ₂ DO NOT USE: rocca-full-set

---

## SCRIPTS → RELAZIONI

X.1 send-outreach.ts      → M.7 → gmail-sender → S.1:email (max 20/batch)
X.2 analytics-snapshot.ts  → {M.1,M.2} → persistence → M.3
X.3 morning-check.ts       → Gmail API → classify → persist(dedup) → M.13(auto-briefing) → S.1 → Telegram (launchd 8:30)
X.4 youtube-oauth-setup.ts → browser OAuth → S.3 (3 keys)
X.5 draft-post.ts          → M.6 → S.1:post_draft
X.6 sync-supabase.ts       → S.2 ↔ S.1:content
X.7 archive-insights.ts    → M.4 → S.1:audience_snapshot
X.8 editorial-briefing.ts  → M.5 (corridor analysis)
X.9 software-strategy.ts   → E.2 [pitch|targets|github|roadmap|thread]

## OBJECTIVES 2026
1. LIVE ACT (Primary): booking costante, gig/mese, inquiry rate
2. SOFTWARE (6-7 Fig): jsOM exit → Lovable/Vercel/YC
3. BRAND: "Flutur" riconosciuto in nicchie music + tech

## CONTENT WORKFLOW
States: PLAN → ANALYZE → OPTIMIZE → POST → MONITOR → LEARN
npx tsx src/digital-department/workflow.ts [status|next]
