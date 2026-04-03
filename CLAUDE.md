# v9.0 | flutur-cc | 2026-04-03

## GRAFO

S.1 "Neon PostgreSQL" :rdbms+vector @localhost:5433 (Docker pgvector/pg16) | Neon in prod
  .schema → src/db/schema.ts (Drizzle ORM, 27 tables + 3 junction + pgvector)
  .migrations → src/db/migrations/ (drizzle-kit generate/push)
  .client → src/db/client.ts (node-postgres pool + withTenant RLS)
  .multi-tenant → tenant_id + RLS policies (FORCE ROW LEVEL SECURITY)
  .backup → scripts/backup.sh (daily 4AM launchd, 30-day rotation)

S.2 "Supabase" :storage+ai | file storage + Claude Vision labeling
  .schema → supabase/migrations/001_photos_schema.sql
  .sync → npx tsx scripts/sync-supabase-photos.ts [import|label|sync|status]

S.3 "Keychain" :credentials service="social-cli-mcp"
  .api → src/config/credentials.ts | getFromKeychain() setInKeychain() loadCredentialsToEnv()
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
  .limit = 55/day
  .log → S.1:send_log table (Drizzle)
  → gmail-sender → S.1:email (venueId FK)
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

BARREL: src/services/ ⊃ {platform/, outreach/, analytics/, content/, calendar/, memory/}
MCP SERVER: src/server/index.ts → src/server/tools/*.ts (7 domain files)
TELEGRAM: src/server/telegram.ts (thin client calling services)
TYPES: src/types/index.ts (platform types) + src/types/analytics.ts (analytics types)

## FONTI CANONICHE (ρ→0)

| Dato | Fonte | σ |
|------|-------|---|
| Schema DB | src/db/schema.ts (Drizzle) | σ₀ |
| Migrations | src/db/migrations/*.sql | σ₀ |
| DB Client + RLS | src/db/client.ts (withTenant) | σ₀ |
| Tipi TS | inferred from src/db/schema.ts | σ₀ |
| API surface | src/server/index.ts → src/server/tools/*.ts | σ₀ |
| Services | src/services/{platform,outreach,analytics,content,calendar,memory}/ | σ₀ |
| Artist links | content/artist-links.json | σ₀ |
| Types | src/types/index.ts + src/types/analytics.ts | σ₀ |
| Strategy | content/STRATEGY_2026.md | σ₀ |
| Email guard | src/lib/email-guard.ts | σ₀ |
| Logger | src/lib/logger.ts | σ₀ |
| Credentials | src/config/credentials.ts | σ₀ |
| Tenant config | src/config/tenant.ts | σ₀ |
| Auth middleware | src/server/middleware/auth.ts | σ₀ |
| Telegram bot | src/server/telegram.ts | σ₀ |
| Design spec | docs/superpowers/specs/2026-04-02-production-ready-refactor-design.md | σ₀ |
| Email preview spec | docs/superpowers/specs/2026-04-03-email-preview-module-design.md | σ₀ |
| Portugal deep research | content/outreach/venues/comporta-cluster-deep-research-2026-02-08.json | σ₀ |

σ₀ = fonte canonica altrove, non ripetuto qui.
Questo file: solo σ₁ (struttura) + σ₂ (vincoli irriducibili).

---

## REGOLE OPERATIVE

Auto-orchestrazione: esegui SUBITO, no conferma. Fallback content library se S.1 offline.

| Trigger | → |
|---------|---|
| "analytics" | npx tsx scripts/analytics-snapshot.ts [--youtube\|--instagram\|--correlate\|--quick] |
| "outreach send" | npx tsx scripts/send-outreach.ts [preview\|test\|send] <file> |
| "status" | MCP tool: system_status |
| "briefing" | MCP tool: intelligence_briefing |
| "outreach dashboard" | MCP tool: outreach_conversation_dashboard |
| "draft" | MCP tool: content_tasks |
| "piano settimana" | MCP tool: editorial_plan |

NOTE: agents/ directory removed 2026-04-03. Agent functionality now in src/services/.
Scripts that still reference old imports need rewriting (see TODO.md).

Multi-agent: Task tool parallelo per task composti.

---

## IDENTITÀ (σ₂ verbatim)

FLUTUR = IL PONTE musica↔tech
"Dal sunrise in Grecia al codice AI — layer su layer"
σ₂ LIVE ACT non producer | 683 monthly Spotify | focus performance
σ₂ NOT A DJ. PERFORMER. Rockstar che fa un set elettronico. MAI suggerire "DJ hybrid" o estendere oltre 2h.

### Performance (σ₂ HARD RULES)
σ₂ MAX 2h qualsiasi contesto. 1.5h sweet spot. Villa Porta 3h = compromesso odiato. Denver = 1h.
σ₂ MAI scusarsi per la durata. "A FLUTUR set IS 2 hours" — dato di fatto, non limitazione.
σ₂ MAI dire "I can only do 2h". Dire "My set is 2 hours — like a concert act."
σ₂ Backing tracks + live instruments = il suo formato. NON è DJing. È performance con tela sonora.

### 3 Performance Tiers (1 brand, 3 prodotti)

| Tier | Nome | Contesto | Durata | Fee | Video | Credential lead |
|------|------|----------|--------|-----|-------|-----------------|
| A | The Show | music venue, festival, concert | 1-1.5h | €600-1200 | GGT / Who Is Flutur | Drishti Beats main stage |
| B | Sunset Session | beach club, hotel, rooftop | 1.5-2h | €400-800 | Father Ocean highlight | Villa Porta 4y |
| C | Sound Journey | wellness, retreat, ceremony | 1-2h | €300-600 | Efthymia | RAV Vast endorsed |

### Duration Framing (σ₂ per contesto)
Beach club: "You wouldn't book a rockstar for 4h. Headline slot. Your house DJ handles before/after."
Wellness: "Sound journeys are 1-2h — grounding, journey, integration. Longer = lose the container."
Hotel: "Curated experience with beginning, climax, resolution — like a film, not a playlist."
Price: €400/2h = €200/ora. DJ €400/4h = €100/ora. Il doppio al minuto perché è live.

### Credential Map (σ₂ — cosa enfatizzare per chi)

| Venue type | Lead | Supporting | Video | MAI menzionare |
|------------|------|-----------|-------|----------------|
| Beach club | Villa Porta 4y | GGT text, self-contained | Father Ocean HL | Sound healing, endorsed |
| Rooftop | Villa Porta 4y | GGT text, Maggiore | Father Ocean HL | Wellness, ceremony |
| Hotel luxury | Villa Porta 4y | Self-contained | Father Ocean HL | Busking, street origins |
| Music venue (bar/club) | Villa Porta 4y + Drishti Beats | GGT text, YMH Denver | Father Ocean HL | Wellness, healing, Efthymia |
| Music venue (acoustic/listening) | Villa Porta 4y | RAV Vast endorsed, GGT text | Transcendence | DJ energy, electronic |
| Concert venue (sala) | Drishti Beats + GGT text | Villa Porta, YMH Denver | Transcendence | Wellness, healing |
| Wellness/retreat | RAV Vast endorsed | 4y facilitating | Efthymia | GGT (troppo mainstream), DJ energy |
| Ecstatic dance | RAV Vast solo | 4y ceremony | Transcendence | GGT, luxury |
| Agency | Full package | Tutto | Who Is Flutur | Niente — mostra versatilità |

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
σ₂ "one-person show" o "self-contained" — MAI "one-man band" (suona scrappy) o "solo artist" (suona stripped)
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

σ₂ MAI mandare email senza preview + approvazione esplicita di Alessio.
Workflow: genera batch → mostra preview (venue, categorie, video, body) → Alessio approva/modifica → SOLO ALLORA manda.
Eccezione: morning-check LEGGE inbox, non manda.

Phase1 cold OK: jazz, small hotels, rooftop
Phase2 cold+warm: beach lounges, wellness
σ₂ Phase3 NO cold: premium clubs (Scorpios), luxury (Borgo Egnazia), major festivals

### Video Assets → venue type mapping (σ₂ — REVISED 2026-02-10)
V.3 father-ocean-HL      **PRIMARY COLD EMAIL VIDEO** | beach club/hotel/rooftop/music venue/bar
                         σ₂ Default per OGNI cold email. Impatto immediato, mostra il prodotto sul floor.
V.2 transcendence        ecstatic dance / concert venue / acoustic venue | mostra range RAV→house (3min)
V.1 efthymia             **SECOND CONTACT / warm leads ONLY** | 6min troppo lungo per cold
                         Cold OK SOLO per: wellness/retreat/ceremony + venue tipo Jericoacoara (bohemian/spiritual)
                         σ₂ MAI come cold email lead per music venue, bar, club, hotel generico
                         "Jericoacoara test": venue bohemian/spirituale/alternativa → Efthymia OK. Altrimenti → Father Ocean HL.
V.4 father-ocean-FULL    warm leads, second contact    — | Tier B follow-up
V.5 who-is-flutur        agency/press/festival         — | Tier A
V.6 ggt-clip             **MAI LINKARE COME VIDEO.** Solo testo nel body: "Greece's Got Talent — 4 YES"
                         σ₂ TV cut ha sacrificato la performance. 1:30 non mostra profondità reale.
V.7 sunset-session       luxury venue                  — | Tier B luxury
σ₂ DO NOT USE: rocca-full-set, rocca-chase-the-sun (0% reply)
σ₂ LEZIONE 2026-02-10: Efthymia è trascendentale ma non mostra "il prodotto sul floor".
   Father Ocean HL mostra esattamente cosa ottieni prenotando Flutur. Efthymia mostra chi è Flutur.

### Categorizzazione Venue (σ₂ — LEZIONE 2026-02-08)
σ₂ MAI categorizzare per solo nome o category field. SEMPRE usare live_music_details.
Pesi: live_music_details=10, previous_artists=7-9, notes=6, name=6-8, category=5
Se confidence < 60% → flag per review manuale.
Se venue ha "sound healing|sound journey|handpan|meditation|breathwork|yoga" → Tier C (Sound Journey) + Efthymia
Se venue ha "ecstatic dance|conscious gathering" → festival_set + Transcendence
ERRORE PRECEDENTE: 5 venue wellness ricevettero Father Ocean invece di Efthymia (2026-02-08, Portugal batch).

---

## SCRIPTS

X.1 send-outreach.ts        → services/outreach/pipeline → lib/email-guard → S.1:email (max 20/batch) ⚠️ NEEDS REWRITE
X.2 analytics-snapshot.ts   → services/analytics/ → S.1 ⚠️ NEEDS REWRITE
X.3 migrate-from-surreal.ts → SurrealDB HTTP → Drizzle/Neon (one-shot)
X.4 youtube-oauth-setup.ts  → browser OAuth → S.3 (3 keys)
X.5 sync-supabase-photos.ts → S.2 ↔ S.1:content
X.6 memory-context.ts       → services/memory/ ⚠️ NEEDS REWRITE
X.7 backup.sh               → pg_dump → gzip → R2 (launchd 4AM)

## OBJECTIVES 2026
1. LIVE ACT (Primary): booking costante, gig/mese, inquiry rate
2. SOFTWARE (6-7 Fig): jsOM exit → Lovable/Vercel/YC
3. BRAND: "Flutur" riconosciuto in nicchie music + tech

## CONTENT WORKFLOW
States: PLAN → ANALYZE → OPTIMIZE → POST → MONITOR → LEARN
Via MCP tools: content_tasks, editorial_plan, post_twitter, post_instagram, post_all
