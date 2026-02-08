# FLUTUR Agent Architecture
## Multi-Department Orchestration System

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         STORY DIRECTOR (Supervisor)                         │
│                                                                             │
│   "Qual è l'arco narrativo questa settimana? Quali emozioni evocare?"      │
│   "Come connetto jsOM launch con sunrise Grecia? Layer su layer..."        │
│                                                                             │
│   Chiede all'utente quando serve decisione narrativa importante            │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    │               │               │
                    ▼               ▼               ▼
┌─────────────────────┐ ┌─────────────────────┐ ┌─────────────────────┐
│  DEPT: Editorial    │ │  DEPT: Platform     │ │  DEPT: Analytics    │
│  Planning           │ │  Publishing         │ │  & Learning         │
│                     │ │                     │ │                     │
│  • Story arcs       │ │  • X/Twitter agent  │ │  • Performance      │
│  • Content calendar │ │  • IG Reels agent   │ │  • Hashtag intel    │
│  • Pillar balance   │ │  • YouTube agent    │ │  • Audience data    │
│  • Narrative paths  │ │  • Stories agent    │ │  • A/B results      │
└─────────────────────┘ └─────────────────────┘ └─────────────────────┘
          │                       │                       │
          └───────────────────────┼───────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         KNOWLEDGE GRAPH (SurrealDB)                         │
│                                                                             │
│   content ←→ gigs ←→ venues ←→ hashtag_analysis ←→ post_performance       │
│   story_arcs ←→ narrative_paths ←→ platform_adaptations                    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Department 1: Story Director (Supervisor)

**Ruolo**: Decide l'arco narrativo, chiede all'utente per decisioni importanti, orchestra i dipartimenti.

**Capacità**:
- Analizza il "divenire" della narrazione (cosa è stato detto, cosa manca)
- Identifica momenti chiave per content (anniversari, lanci, eventi)
- Propone narrative paths parallele per settimana
- CHIEDE all'utente quando serve decisione creativa

**Input dal utente**:
```
"Questa settimana voglio raccontare il viaggio Grecia → GGT"
"jsOM launch imminente, prepara hype"
"Mood introspettivo, focus nature"
```

**Output**:
```yaml
week_narrative:
  theme: "Origins - Layer su Layer"
  arc: "Dal busking alla tech, stesso principio: costruire layer"
  paths:
    - music_path: "Sunrise Grecia → GGT → oggi"
    - tech_path: "jsOM = layering UI come layering musica"
    - hybrid: "Sabato crossover: looping = AI layers"
```

---

## Department 2: Editorial Planning

**Ruolo**: Traduce la narrativa in piano editoriale concreto.

**Capacità**:
- Bilancia i 4 pillars nella settimana
- Assegna contenuti a giorni/orari ottimali
- Gestisce parallel paths senza overlap confusionario
- Adatta caption al pillar del giorno

**Schema Parallel Paths**:
```
LUNEDÌ      MARTEDÌ     MERCOLEDÌ   GIOVEDÌ     VENERDÌ     SABATO      DOMENICA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TECH PATH   ─────────────────────────────────────────────────────────▶
            jsOM        Process     Thread      Demo        Launch
            teaser      BTS         deep-dive   video       post

MUSIC PATH  ─────────────────────────────────────────────────────────▶
            -           Looping     Kids        -           Sunset      Journey
                        clip        moment                  Reel        reflection

HYBRID      ─────────────────────────────────────────────────────────▶
            -           -           -           -           -           CROSSOVER
                                                                        "Layers"
```

---

## Department 3: Platform Publishing

### Sub-agents per piattaforma:

**X/Twitter Agent**:
- Threads per tech (jsOM)
- Quick clips per music
- Engagement replies
- **NO LINK nel post principale** (link nel reply)

**Instagram Agent**:
- Reels verticali (hook 3 sec)
- Carousels per storytelling
- Stories per engagement (polls)
- 3-5 hashtag rilevanti + keywords caption

**YouTube Agent**:
- Shorts (crosspost da Reels)
- Long-form mensile
- Premiere per eventi

**Stories Agent**:
- Daily engagement
- Behind-the-scenes
- Polls "quale location prossima?"
- Swipe-up (se disponibile)

---

## Department 4: Analytics & Learning

**Ruolo**: Monitora performance, alimenta feedback loop.

**Metriche chiave**:
- Share rate (più importante nel 2026)
- Save rate
- First 48h engagement
- Hashtag performance
- Platform-specific metrics

**Feedback loop**:
```
Performance data → Story Director → Adjust next week narrative
```

---

## Implementation: Claude Code Agents

### Directory Structure:
```
src/agents/
├── story-director.ts      # Supervisor agent
├── editorial-planner.ts   # Content calendar
├── platform/
│   ├── twitter-agent.ts
│   ├── instagram-agent.ts
│   ├── youtube-agent.ts
│   └── stories-agent.ts
├── analytics-agent.ts
└── orchestrator.ts        # Main entry point
```

### Orchestrator Flow:
```typescript
// Pseudo-code
async function weeklyOrchestration() {
  // 1. Story Director analizza stato attuale
  const narrative = await storyDirector.analyzeCurrentState();

  // 2. Chiede all'utente se serve decisione
  if (narrative.needsUserInput) {
    const userDecision = await askUser(narrative.question);
    narrative.applyDecision(userDecision);
  }

  // 3. Editorial planning genera calendario
  const calendar = await editorialPlanner.generateWeek(narrative);

  // 4. Platform agents preparano content specifico
  const platformContent = await Promise.all([
    twitterAgent.adapt(calendar),
    instagramAgent.adapt(calendar),
    youtubeAgent.adapt(calendar),
  ]);

  // 5. Salva tutto in SurrealDB
  await saveToKnowledgeGraph(calendar, platformContent);

  // 6. Analytics monitora e fornisce feedback
  analyticsAgent.startMonitoring(platformContent);
}
```

---

## Narrative Coherence Rules

1. **Same story, different formats**: Un momento (es. GGT) diventa thread X + carousel IG + short YT
2. **Pillar rotation**: Mai più di 2 giorni consecutivi stesso pillar
3. **Hybrid bridging**: Sabato = crossover che collega tech + music
4. **Callback references**: "Come dicevo martedì..." per coesione
5. **Weekly arc**: Inizio settimana = setup, fine settimana = payoff

---

## User Touchpoints

Il sistema CHIEDE all'utente in questi momenti:

1. **Inizio settimana**: "Qual è il tema narrativo?"
2. **Prima di hybrid content**: "Come colleghi tech e music?"
3. **Dopo performance drop**: "Vuoi cambiare direzione?"
4. **Nuovi asset**: "Queste foto raccontano quale storia?"

---

## SurrealDB Schema Extension

```sql
-- Narrative arcs
DEFINE TABLE story_arc SCHEMAFULL;
DEFINE FIELD name ON story_arc TYPE string;
DEFINE FIELD theme ON story_arc TYPE string;
DEFINE FIELD start_date ON story_arc TYPE datetime;
DEFINE FIELD end_date ON story_arc TYPE datetime;
DEFINE FIELD pillars ON story_arc TYPE array;

-- Narrative paths (parallel storylines)
DEFINE TABLE narrative_path SCHEMAFULL;
DEFINE FIELD arc ON narrative_path TYPE record(story_arc);
DEFINE FIELD path_type ON narrative_path TYPE string; -- tech, music, hybrid
DEFINE FIELD posts ON narrative_path TYPE array;

-- Platform adaptations
DEFINE TABLE platform_content SCHEMAFULL;
DEFINE FIELD source_post ON platform_content TYPE record(content);
DEFINE FIELD platform ON platform_content TYPE string;
DEFINE FIELD adaptation ON platform_content TYPE object;
DEFINE FIELD published_at ON platform_content TYPE datetime;
DEFINE FIELD performance ON platform_content TYPE object;

-- Relations
DEFINE TABLE part_of_arc TYPE RELATION IN content OUT story_arc;
DEFINE TABLE follows_path TYPE RELATION IN content OUT narrative_path;
```

---

## Next Steps

1. [ ] Implementare Story Director agent
2. [ ] Creare schema SurrealDB per narrative arcs
3. [ ] Buildare platform adapters
4. [ ] Integrare con workflow esistente
5. [ ] Test con prima settimana narrativa
