# Orchestration Flow - Multi-Agent System

## Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              USER INPUT                                      │
│         "Questa settimana focus su jsOM launch e sunrise sessions"          │
└────────────────────────────────────┬────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         1. INTERVIEWER                                       │
│                                                                             │
│   npx tsx src/agents/interviewer.ts weekly                                  │
│                                                                             │
│   Domande rapide:                                                           │
│   • "Qual è la priorità questa settimana?"                                  │
│   • "Tech o music focus?"                                                   │
│   • "Novità o eventi in arrivo?"                                            │
│                                                                             │
│   Output: InterviewInsight → SurrealDB interview_session                    │
└────────────────────────────────────┬────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         2. STORY DIRECTOR                                    │
│                                                                             │
│   npx tsx src/agents/story-director.ts plan "focus jsOM + sunrise"          │
│                                                                             │
│   • Analizza interview insights                                             │
│   • Decide arco narrativo settimanale                                       │
│   • Definisce parallel paths (tech/music/hybrid)                            │
│   • Identifica crossover sabato                                             │
│                                                                             │
│   Output: StoryArc + NarrativePaths → SurrealDB story_arc, narrative_path   │
└────────────────────────────────────┬────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         3. EDITORIAL PLANNER                                 │
│                                                                             │
│   npx tsx src/agents/editorial-planner.ts today                             │
│                                                                             │
│   • Traduce narrativa → calendario concreto                                 │
│   • Assegna contenuti a giorni/orari                                        │
│   • Bilancia pillars nella settimana                                        │
│   • Determina cosa postare OGGI                                             │
│                                                                             │
│   Output: DailyPlan → platform_content ready                                │
└────────────────────────────────────┬────────────────────────────────────────┘
                                     │
                    ┌────────────────┼────────────────┐
                    │                │                │
                    ▼                ▼                ▼
┌───────────────────────┐ ┌──────────────────────┐ ┌──────────────────────┐
│   TWITTER AGENT       │ │   INSTAGRAM AGENT    │ │   YOUTUBE AGENT      │
│                       │ │                      │ │                      │
│ • Threads             │ │ • Reels (hook 3s)    │ │ • Shorts crosspost   │
│ • NO link in main     │ │ • Carousels          │ │ • Long-form monthly  │
│ • Link in REPLY       │ │ • 3-5 hashtag        │ │                      │
│ • Max 2 hashtag       │ │ • Stories daily      │ │                      │
│ • 5-10 post/day       │ │                      │ │                      │
└───────────────────────┘ └──────────────────────┘ └──────────────────────┘
                    │                │                │
                    └────────────────┼────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         4. MANUAL POSTING                                    │
│                                                                             │
│   User copia contenuto e posta manualmente                                  │
│   (API budget limitato - 10 calls/week self-imposed)                        │
└────────────────────────────────────┬────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         5. ANALYTICS & FEEDBACK                              │
│                                                                             │
│   npx tsx src/agents/interviewer.ts feedback                                │
│                                                                             │
│   • Raccoglie feedback post-pubblicazione                                   │
│   • Monitora performance (share rate > save rate)                           │
│   • Aggiorna hashtag_analysis con risultati                                 │
│   • Informa Story Director per prossima settimana                           │
│                                                                             │
│   Output: Performance data → feedback loop                                  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Daily Workflow

### Mattina (08:00-09:00)
```bash
# 1. Check piano del giorno
npx tsx src/agents/editorial-planner.ts today

# 2. Quick check-in (opzionale)
npx tsx src/agents/interviewer.ts daily
```

### Durante il giorno
```bash
# Vedere prossimo post
npx tsx src/agents/editorial-planner.ts next

# Generare tweet se serve
npx tsx src/agents/interviewer.ts tweets
```

### Sera (dopo posting)
```bash
# Raccogliere feedback
npx tsx src/agents/interviewer.ts feedback
```

---

## Weekly Workflow

### Domenica/Lunedì - Planning
```bash
# 1. Raccolta storie e idee
npx tsx src/agents/interviewer.ts stories
npx tsx src/agents/interviewer.ts weekly

# 2. Genera piano settimanale
npx tsx src/agents/story-director.ts plan "tema della settimana"

# 3. Verifica overview
npx tsx src/agents/editorial-planner.ts week
```

### Fine settimana - Review
```bash
# Status sistema
npx tsx src/agents/orchestrator.ts status

# Feedback globale
npx tsx src/agents/interviewer.ts feedback
```

---

## SurrealDB Data Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              SURREAL DB                                      │
│                     localhost:8000 (ns: social, db: analytics)              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  interview_session ──────────► story_arc ◄────────── narrative_path        │
│         │                          │                        │               │
│         │                          │                        │               │
│         ▼                          ▼                        ▼               │
│  content_ideas              platform_content ◄──── hashtag_analysis        │
│                                    │                                        │
│                                    │                                        │
│                                    ▼                                        │
│                            post_performance                                 │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Key Queries

```sql
-- Piano di oggi
SELECT * FROM platform_content
WHERE day_of_week = "wednesday" AND status != "published"

-- Arco attivo
SELECT * FROM story_arc WHERE status = "active"

-- Top hashtag per ottimizzazione
SELECT hashtag_name, engagement_score
FROM hashtag_analysis
ORDER BY engagement_score DESC LIMIT 5

-- Insights recenti
SELECT * FROM interview_session
WHERE status = "completed"
ORDER BY started_at DESC LIMIT 3
```

---

## Auto-Refinement Loop

```
Performance Drop Detected
         │
         ▼
┌─────────────────────┐
│ Analytics Agent     │
│ detects low shares  │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│ Interviewer asks:   │
│ "Vuoi cambiare      │
│  direzione?"        │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│ Story Director      │
│ adjusts narrative   │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│ Editorial Planner   │
│ updates calendar    │
└─────────────────────┘
```

---

## API Budget Strategy

| Resource | Budget | Usage |
|----------|--------|-------|
| Instagram API | 10 calls/week | 50% posting, 50% analysis |
| Claude API | Unlimited | Agents, generation, insights |
| SurrealDB | Unlimited | All queries |

### Conservation Rules
1. **Batch analysis**: Run hashtag analysis once/week
2. **Manual posting**: User posts, agents prepare content
3. **Selective monitoring**: Monitor only high-priority posts
4. **Cache insights**: Store in SurrealDB, reuse across agents

---

## Commands Reference

| Agent | Command | Purpose |
|-------|---------|---------|
| **Interviewer** | `daily` | Quick morning check-in |
| | `feedback` | Post-publish feedback |
| | `stories` | Mine content stories |
| | `weekly` | Weekly planning input |
| | `tweets` | Generate Twitter content |
| **Story Director** | `analyze` | Analyze current state |
| | `plan <brief>` | Generate weekly plan |
| | `chat` | Interactive conversation |
| **Editorial Planner** | `today` | Today's content plan |
| | `week` | Week overview |
| | `next` | Next post to publish |
| **Orchestrator** | `run [brief]` | Full weekly flow |
| | `status` | System status |

---

*"Layer su layer" - orchestrazione multi-agente per content coherent*
