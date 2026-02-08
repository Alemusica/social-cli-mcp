# Piano di Riorganizzazione: social-cli-mcp

> Data: 2026-01-21
> Obiettivo: Struttura dati accessibile ad agenti AI, tracciabile, versionata

---

## Problema Attuale

### 1. Dati Sparsi
```
Hashtag analysis → content/posts/hashtag-analysis.md (markdown)
Audience data → research.md files (markdown)
Editorial plan → instagram-posts-ready.json (JSON)
Schema DB → src/db/schema.surql (vuoto, non popolato)
```

### 2. Nessun Timestamp/Versioning
- Le analisi API non hanno timestamp
- Non c'è storico delle metriche (followers oggi vs ieri)
- Agente nuovo non sa se i dati sono freschi o vecchi

### 3. Struttura Confusa
```
content/
├── outreach/           # Venue contacts
├── music/              # Music strategy
├── posts/              # Instagram posts + hashtag analysis (???)
├── EDITORIAL_PLAN.md   # Strategy doc mixed with operational data
```

---

## Soluzione: Knowledge Graph in SurrealDB

### Principio Guida
> **Tutto ciò che viene dall'API → SurrealDB con timestamp**
> **Markdown/JSON → Solo per documentazione human-readable**

---

## Nuove Tabelle SurrealDB

### 1. `api_snapshot` - Ogni chiamata API

```surql
DEFINE TABLE api_snapshot SCHEMAFULL;
DEFINE FIELD api_name ON api_snapshot TYPE string;        -- "instagram_insights", "hashtag_search"
DEFINE FIELD endpoint ON api_snapshot TYPE string;        -- "/me/insights", "/ig_hashtag_search"
DEFINE FIELD parameters ON api_snapshot TYPE object;      -- {hashtag: "busker", limit: 25}
DEFINE FIELD response ON api_snapshot TYPE object;        -- Raw API response
DEFINE FIELD captured_at ON api_snapshot TYPE datetime DEFAULT time::now();
DEFINE FIELD expires_at ON api_snapshot TYPE option<datetime>;
DEFINE FIELD version ON api_snapshot TYPE string DEFAULT "v24.0";

DEFINE INDEX idx_snapshot_api ON api_snapshot COLUMNS api_name, captured_at;
```

### 2. `hashtag_analysis` - Analisi Hashtag

```surql
DEFINE TABLE hashtag_analysis SCHEMAFULL;
DEFINE FIELD hashtag_name ON hashtag_analysis TYPE string;
DEFINE FIELD instagram_id ON hashtag_analysis TYPE string;
DEFINE FIELD avg_likes ON hashtag_analysis TYPE int;
DEFINE FIELD avg_comments ON hashtag_analysis TYPE int;
DEFINE FIELD engagement_score ON hashtag_analysis TYPE int;
DEFINE FIELD top_posts_analyzed ON hashtag_analysis TYPE int;
DEFINE FIELD sample_posts ON hashtag_analysis TYPE array DEFAULT [];
DEFINE FIELD analyzed_at ON hashtag_analysis TYPE datetime DEFAULT time::now();
DEFINE FIELD rate_limit_used ON hashtag_analysis TYPE int;    -- X/30 this week

DEFINE INDEX idx_hashtag_name ON hashtag_analysis COLUMNS hashtag_name UNIQUE;
DEFINE INDEX idx_hashtag_score ON hashtag_analysis COLUMNS engagement_score;
```

### 3. `audience_snapshot` - Snapshot Audience

```surql
DEFINE TABLE audience_snapshot SCHEMAFULL;
DEFINE FIELD platform ON audience_snapshot TYPE string;
DEFINE FIELD followers ON audience_snapshot TYPE int;
DEFINE FIELD posts_count ON audience_snapshot TYPE int;
DEFINE FIELD reach_28d ON audience_snapshot TYPE int;
DEFINE FIELD profile_views_28d ON audience_snapshot TYPE int;
DEFINE FIELD top_countries ON audience_snapshot TYPE array;   -- [{country: "IT", count: 738}]
DEFINE FIELD top_cities ON audience_snapshot TYPE array;
DEFINE FIELD age_gender ON audience_snapshot TYPE array;
DEFINE FIELD captured_at ON audience_snapshot TYPE datetime DEFAULT time::now();

DEFINE INDEX idx_audience_platform ON audience_snapshot COLUMNS platform, captured_at;
```

### 4. `post_draft` - Post Pronti (Pre-Pubblicazione)

```surql
DEFINE TABLE post_draft SCHEMAFULL;
DEFINE FIELD title ON post_draft TYPE string;
DEFINE FIELD platform ON post_draft TYPE string;
DEFINE FIELD post_type ON post_draft TYPE string;             -- carousel, reel, single
DEFINE FIELD caption ON post_draft TYPE string;
DEFINE FIELD hashtags ON post_draft TYPE array;
DEFINE FIELD media_files ON post_draft TYPE array;            -- [{path: "...", order: 1}]
DEFINE FIELD scheduled_for ON post_draft TYPE option<datetime>;
DEFINE FIELD best_time ON post_draft TYPE option<string>;
DEFINE FIELD status ON post_draft TYPE string DEFAULT "draft"; -- draft, ready, scheduled, published
DEFINE FIELD priority ON post_draft TYPE string DEFAULT "MEDIUM";
DEFINE FIELD target_audience ON post_draft TYPE array;
DEFINE FIELD story_context ON post_draft TYPE option<object>;
DEFINE FIELD privacy_notes ON post_draft TYPE option<string>;
DEFINE FIELD created_at ON post_draft TYPE datetime DEFAULT time::now();
DEFINE FIELD updated_at ON post_draft TYPE datetime VALUE time::now();

DEFINE INDEX idx_draft_status ON post_draft COLUMNS status;
DEFINE INDEX idx_draft_scheduled ON post_draft COLUMNS scheduled_for;
```

### 5. `analysis_session` - Sessione di Analisi

```surql
DEFINE TABLE analysis_session SCHEMAFULL;
DEFINE FIELD session_name ON analysis_session TYPE string;    -- "editorial_prep_2026_01_21"
DEFINE FIELD description ON analysis_session TYPE string;
DEFINE FIELD agent_id ON analysis_session TYPE option<string>;
DEFINE FIELD api_calls_made ON analysis_session TYPE int DEFAULT 0;
DEFINE FIELD started_at ON analysis_session TYPE datetime DEFAULT time::now();
DEFINE FIELD completed_at ON analysis_session TYPE option<datetime>;
DEFINE FIELD findings_summary ON analysis_session TYPE option<string>;

DEFINE INDEX idx_session_date ON analysis_session COLUMNS started_at;
```

### 6. Relazioni

```surql
-- Hashtag analysis belongs to session
DEFINE TABLE analyzed_in TYPE RELATION IN hashtag_analysis OUT analysis_session;

-- Post draft uses hashtag analysis
DEFINE TABLE uses_hashtag_analysis TYPE RELATION IN post_draft OUT hashtag_analysis;
DEFINE FIELD selected_at ON uses_hashtag_analysis TYPE datetime DEFAULT time::now();

-- API snapshot belongs to session
DEFINE TABLE captured_in TYPE RELATION IN api_snapshot OUT analysis_session;
```

---

## Nuova Struttura Cartelle

```
social-cli-mcp/
├── src/
│   ├── db/
│   │   ├── schema.surql           # Schema completo (aggiornato)
│   │   ├── migrations/            # NEW: Schema migrations
│   │   │   ├── 001_initial.surql
│   │   │   ├── 002_add_analysis.surql
│   │   │   └── 003_add_snapshots.surql
│   │   ├── client.ts
│   │   ├── queries/               # NEW: Reusable queries
│   │   │   ├── hashtags.ts        # getHashtagAnalysis(), saveHashtagAnalysis()
│   │   │   ├── audience.ts        # getLatestAudience(), saveAudienceSnapshot()
│   │   │   ├── posts.ts           # getDrafts(), updateDraftStatus()
│   │   │   └── sessions.ts        # startSession(), endSession()
│   │   └── seed/                  # NEW: Initial data
│   │       └── hashtags-initial.json
│   │
│   ├── analysis/                  # NEW: Analysis scripts
│   │   ├── run-hashtag-analysis.ts
│   │   ├── run-audience-snapshot.ts
│   │   └── run-full-analysis.ts   # Combined analysis session
│   │
│   └── ...existing files...
│
├── content/
│   ├── strategy/                  # NEW: Strategy docs only
│   │   ├── music/
│   │   │   ├── brand-identity.md
│   │   │   └── target-audience.md
│   │   ├── software/
│   │   │   └── brand-identity.md
│   │   └── m-shaped-mind.json
│   │
│   ├── outreach/                  # Keep as-is (venue data)
│   │   └── ...
│   │
│   └── editorial/                 # RENAMED from posts/
│       ├── README.md
│       ├── week-01/               # Organized by week
│       │   ├── post_1_ggt/
│       │   │   ├── caption.txt
│       │   │   ├── notes.md       # Human notes (not API data)
│       │   │   └── images/
│       │   └── post_2_lanzarote/
│       └── week-02/
│
├── exports/                       # NEW: Human-readable exports from DB
│   ├── hashtag-report-2026-01-21.md
│   ├── audience-report-2026-01-21.md
│   └── weekly-summary.md
│
└── ...
```

---

## Workflow per Agenti

### 1. Nuovo Agente Arriva → Cosa Fa?

```typescript
// 1. Check latest analysis session
const session = await db.query(`
  SELECT * FROM analysis_session
  ORDER BY started_at DESC LIMIT 1
`);

// 2. Get audience data freshness
const audience = await db.query(`
  SELECT *, time::now() - captured_at AS age
  FROM audience_snapshot
  WHERE platform = "instagram"
  ORDER BY captured_at DESC LIMIT 1
`);

// 3. If data > 24h old, run fresh analysis
if (audience.age > duration::from::hours(24)) {
  await runAudienceSnapshot();
}

// 4. Get hashtag analyses
const hashtags = await db.query(`
  SELECT * FROM hashtag_analysis
  ORDER BY engagement_score DESC
`);
```

### 2. Naming Convention per Sessioni

```
Format: {tipo}_{data}_{descrizione}

Esempi:
- editorial_prep_2026_01_21
- hashtag_research_2026_01_21_music
- audience_weekly_2026_01_week_03
- outreach_followup_2026_01_21
```

### 3. MCP Tool Aggiornati

```typescript
// Nuovo tool: get_analysis_context
{
  name: "get_analysis_context",
  description: "Get latest analysis data with freshness info",
  inputSchema: {
    type: "object",
    properties: {
      include_hashtags: { type: "boolean" },
      include_audience: { type: "boolean" },
      max_age_hours: { type: "number", default: 24 }
    }
  }
}

// Nuovo tool: start_analysis_session
{
  name: "start_analysis_session",
  description: "Start a new analysis session to track API calls",
  inputSchema: {
    type: "object",
    properties: {
      session_name: { type: "string" },
      description: { type: "string" }
    },
    required: ["session_name"]
  }
}
```

---

## Piano di Migrazione

### Fase 1: Schema Update (30 min)
1. [ ] Aggiungere nuove tabelle a schema.surql
2. [ ] Creare file di migrazione
3. [ ] Applicare schema a SurrealDB

### Fase 2: Query Functions (1h)
1. [ ] Creare src/db/queries/*.ts
2. [ ] Implementare CRUD per ogni entità
3. [ ] Export functions nel client.ts

### Fase 3: Analysis Scripts (1h)
1. [ ] Creare src/analysis/run-hashtag-analysis.ts
2. [ ] Creare src/analysis/run-audience-snapshot.ts
3. [ ] Modificare test-hashtags.ts per salvare in DB

### Fase 4: MCP Integration (30 min)
1. [ ] Aggiungere nuovi tools al mcp-server.ts
2. [ ] Test con Claude

### Fase 5: Data Migration (30 min)
1. [ ] Importare dati esistenti da JSON/MD in DB
2. [ ] Verificare integrità

### Fase 6: Folder Reorganization (30 min)
1. [ ] Riorganizzare content/
2. [ ] Aggiornare symlinks
3. [ ] Aggiornare README

---

## Query Utili per Agenti

### "Quanto sono freschi i dati?"

```surql
SELECT
  "hashtag_analysis" AS table,
  count() AS records,
  math::max(analyzed_at) AS latest,
  time::now() - math::max(analyzed_at) AS age
FROM hashtag_analysis
GROUP ALL

UNION ALL

SELECT
  "audience_snapshot" AS table,
  count() AS records,
  math::max(captured_at) AS latest,
  time::now() - math::max(captured_at) AS age
FROM audience_snapshot
GROUP ALL
```

### "Quali hashtag performano meglio?"

```surql
SELECT hashtag_name, engagement_score, avg_likes, analyzed_at
FROM hashtag_analysis
WHERE analyzed_at > time::now() - 7d
ORDER BY engagement_score DESC
LIMIT 10
```

### "Qual è l'audience attuale?"

```surql
SELECT * FROM audience_snapshot
WHERE platform = "instagram"
ORDER BY captured_at DESC
LIMIT 1
```

### "Quali post sono pronti?"

```surql
SELECT * FROM post_draft
WHERE status = "ready"
ORDER BY priority DESC, scheduled_for ASC
```

---

## Nomenclatura Standard

| Tipo Dato | Nome Tabella | Nome Sessione Pattern |
|-----------|--------------|----------------------|
| Hashtag API | `hashtag_analysis` | `hashtag_research_{date}` |
| Audience API | `audience_snapshot` | `audience_weekly_{date}` |
| Post draft | `post_draft` | N/A |
| API raw | `api_snapshot` | Linked to session |
| Sessione | `analysis_session` | `{tipo}_{date}_{desc}` |

---

## Benefici

1. **Agente nuovo** → Query DB, trova dati freschi con timestamp
2. **Storico** → Vede evoluzione followers, engagement nel tempo
3. **Tracciabilità** → Ogni analisi legata a sessione con agent_id
4. **Export** → Markdown generato da DB, sempre aggiornato
5. **Rate limits** → Tracciati in DB, non si spreca quota

---

## Domande Aperte

1. Vuoi mantenere i file markdown come "export" dal DB o eliminarli del tutto?
2. Quanto storico tenere? (30 giorni? 90 giorni? tutto?)
3. Preferisci un dashboard web o solo CLI/MCP per visualizzare?

---

*Pronto per iniziare la migrazione?*
