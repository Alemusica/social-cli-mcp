/**
 * STORY DIRECTOR - Supervisor Agent
 *
 * Ruolo: Decide l'arco narrativo settimanale, chiede all'utente per decisioni
 * creative importanti, e orchestra i dipartimenti (Editorial, Platform, Analytics).
 *
 * Capacità:
 * - Analizza il "divenire" della narrazione (cosa è stato detto, cosa manca)
 * - Identifica momenti chiave per content (anniversari, lanci, eventi)
 * - Propone narrative paths parallele per settimana
 * - CHIEDE all'utente quando serve decisione creativa
 *
 * @see ARCHITECTURE.md per design completo
 * @see CLAUDE.md per documentazione sistema
 */

import Anthropic from "@anthropic-ai/sdk";
import { db, getActiveArc, getUnusedContent, getTopHashtags, getUpcomingGigs, getRecentPerformance } from "../core/index.js";

// =====================================================
// TYPES
// =====================================================

export interface StoryArc {
  name: string;
  theme: string;
  description?: string;
  week_start: Date;
  week_end: Date;
  pillars: string[];
  user_brief?: string;
  crossover_concept?: string;
  status: "planned" | "active" | "completed" | "archived";
}

export interface NarrativePath {
  path_type: "tech" | "music" | "hybrid";
  name?: string;
  description?: string;
  target_platforms: string[];
  day_schedule: Record<string, string>; // {monday: "teaser", wednesday: "BTS"}
}

export interface WeeklyPlan {
  arc: StoryArc;
  paths: NarrativePath[];
  content_calendar: ContentSlot[];
}

export interface ContentSlot {
  day: string;
  time: string;
  platform: string;
  content_type: string;
  path_type: string;
  title: string;
  notes?: string;
}

export interface UserQuestion {
  question: string;
  context: string;
  options?: string[];
  required: boolean;
}

// =====================================================
// STORY DIRECTOR AGENT
// =====================================================

export class StoryDirector {
  private client: Anthropic;
  private conversationHistory: Anthropic.MessageParam[] = [];

  constructor() {
    this.client = new Anthropic();
  }

  /**
   * Analizza lo stato attuale e determina se serve input utente
   */
  async analyzeCurrentState(): Promise<{
    needsUserInput: boolean;
    question?: UserQuestion;
    analysis: string;
  }> {
    // Get current arc if exists
    const currentArc = await db.query<StoryArc>(
      "SELECT * FROM story_arc WHERE status = 'active' LIMIT 1"
    );

    // Get recent posts performance
    const recentPerformance = await db.query<any>(`
      SELECT platform, AVG(performance.engagement_rate) as avg_engagement
      FROM platform_content
      WHERE published_at != NONE
      GROUP BY platform
    `);

    // Get content library stats
    const contentStats = await db.query<any>(`
      SELECT category, count() as total
      FROM content
      GROUP BY category
    `);

    // Get upcoming gigs/events
    const upcomingEvents = await db.query<any>(`
      SELECT * FROM gig
      WHERE date > time::now()
      ORDER BY date LIMIT 5
    `);

    // Build context for analysis
    const context = {
      hasActiveArc: currentArc.length > 0,
      currentArc: currentArc[0] || null,
      recentPerformance,
      contentStats,
      upcomingEvents,
    };

    // Use Claude to analyze and decide
    const analysisPrompt = `Sei lo Story Director per FLUTUR, artista che fa live looping con RAV Vast e sviluppa tool AI come jsOM.

CONTESTO ATTUALE:
${JSON.stringify(context, null, 2)}

BRAND PILLARS:
1. Tech Innovation (jsOM, AI tools, build-in-public)
2. Live Looping Energy (Handpan/Rav Vast, sunrise sessions)
3. Nature & Travel (Field recording, landscapes)
4. Authentic Process (Behind-the-scenes, reflections)

REGOLE 2026:
- Instagram: 3-5 hashtag, SHARES > Saves > Comments > Likes
- X/Twitter: Links nel REPLY, non nel tweet principale
- Sabato = crossover tech + music

Analizza lo stato attuale e rispondi in JSON:
{
  "analysis": "breve analisi della situazione narrativa",
  "needsUserInput": true/false,
  "question": {
    "question": "domanda per l'utente se serve",
    "context": "perché chiedi",
    "options": ["opzione1", "opzione2"],
    "required": true/false
  },
  "suggestions": ["suggerimento1", "suggerimento2"]
}`;

    const response = await this.client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      messages: [{ role: "user", content: analysisPrompt }],
    });

    const responseText =
      response.content[0].type === "text" ? response.content[0].text : "";

    // Extract JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return {
        needsUserInput: true,
        analysis: "Impossibile analizzare lo stato attuale",
        question: {
          question: "Qual è il tema narrativo per questa settimana?",
          context: "Nessun arco narrativo attivo trovato",
          required: true,
        },
      };
    }

    const result = JSON.parse(jsonMatch[0]);
    return {
      needsUserInput: result.needsUserInput,
      question: result.question,
      analysis: result.analysis,
    };
  }

  /**
   * Genera piano settimanale basato su input utente
   */
  async generateWeeklyPlan(userBrief: string): Promise<WeeklyPlan> {
    // Calculate week boundaries
    const now = new Date();
    const monday = new Date(now);
    monday.setDate(now.getDate() - now.getDay() + 1);
    monday.setHours(0, 0, 0, 0);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    // Get available content
    const availableContent = await db.query<any>(`
      SELECT * FROM content
      WHERE used_count = 0
      ORDER BY taken_at DESC
      LIMIT 20
    `);

    // Get hashtag performance
    const topHashtags = await db.query<any>(`
      SELECT hashtag_name, engagement_score
      FROM hashtag_analysis
      ORDER BY engagement_score DESC
      LIMIT 10
    `);

    const planPrompt = `Sei lo Story Director per FLUTUR. L'utente ha dato questa direzione:

"${userBrief}"

CONTENUTI DISPONIBILI:
${JSON.stringify(availableContent.slice(0, 10), null, 2)}

TOP HASHTAGS:
${JSON.stringify(topHashtags, null, 2)}

REGOLE NARRATIVE:
1. Mai più di 2 giorni consecutivi stesso pillar
2. Sabato = crossover tech + music (HYBRID)
3. Domenica = reflection/sunset poetico
4. Lunedì = tech focus
5. Ogni contenuto deve essere adattato per più piattaforme

Genera un piano settimanale in JSON:
{
  "arc": {
    "name": "Nome arco es. 'Origins - Layer su Layer'",
    "theme": "tema principale",
    "description": "descrizione estesa",
    "pillars": ["tech", "music"],
    "crossover_concept": "come colleghiamo tech e music sabato"
  },
  "paths": [
    {
      "path_type": "tech",
      "name": "Nome path",
      "target_platforms": ["twitter", "instagram"],
      "day_schedule": {
        "monday": "teaser jsOM",
        "wednesday": "BTS processo",
        "friday": "demo video"
      }
    },
    {
      "path_type": "music",
      "name": "Nome path",
      "target_platforms": ["instagram", "youtube"],
      "day_schedule": {
        "tuesday": "looping clip",
        "thursday": "kids moment",
        "friday": "sunset reel"
      }
    }
  ],
  "content_calendar": [
    {
      "day": "monday",
      "time": "09:00",
      "platform": "twitter",
      "content_type": "thread",
      "path_type": "tech",
      "title": "jsOM teaser thread",
      "notes": "Hook: problema che risolve"
    }
  ]
}`;

    const response = await this.client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      messages: [{ role: "user", content: planPrompt }],
    });

    const responseText =
      response.content[0].type === "text" ? response.content[0].text : "";

    // Extract JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Failed to generate weekly plan");
    }

    const plan = JSON.parse(jsonMatch[0]);

    // Add dates to arc
    plan.arc.week_start = monday;
    plan.arc.week_end = sunday;
    plan.arc.user_brief = userBrief;
    plan.arc.status = "planned";

    return plan;
  }

  /**
   * Salva piano in SurrealDB
   */
  async savePlan(plan: WeeklyPlan): Promise<string> {
    // Create story arc
    const arcResult = await db.query<any>(`
      CREATE story_arc CONTENT {
        name: "${plan.arc.name}",
        theme: "${plan.arc.theme}",
        description: "${plan.arc.description || ""}",
        week_start: "${plan.arc.week_start.toISOString()}",
        week_end: "${plan.arc.week_end.toISOString()}",
        pillars: ${JSON.stringify(plan.arc.pillars)},
        user_brief: "${plan.arc.user_brief || ""}",
        crossover_concept: "${plan.arc.crossover_concept || ""}",
        status: "planned"
      }
    `);

    const arcId = arcResult[0]?.id;

    // Create narrative paths
    for (const path of plan.paths) {
      const pathResult = await db.query<any>(`
        CREATE narrative_path CONTENT {
          path_type: "${path.path_type}",
          name: "${path.name || ""}",
          target_platforms: ${JSON.stringify(path.target_platforms)},
          day_schedule: ${JSON.stringify(path.day_schedule)}
        }
      `);

      // Relate path to arc
      if (pathResult[0]?.id) {
        await db.query(`
          RELATE ${pathResult[0].id}->path_in_arc->${arcId}
        `);
      }
    }

    // Create platform content slots
    for (const slot of plan.content_calendar) {
      const contentId = await db.query(`
        CREATE platform_content CONTENT {
          platform: "${slot.platform}",
          content_type: "${slot.content_type}",
          title: "${slot.title}",
          caption: "",
          pillar: "${slot.pillar || 'unknown'}",
          scheduled_time: "${slot.time}",
          day_of_week: "${slot.day}",
          status: "draft"
        }
      `);

      // Create belongs_to_pillar relation if pillar is specified
      if (slot.pillar && slot.pillar !== 'unknown') {
        await db.query(`
          RELATE ${contentId}->belongs_to_pillar->content_pillar:${slot.pillar}
        `);
      }
    }

    return arcId;
  }

  /**
   * Attiva un arco narrativo
   */
  async activateArc(arcId: string): Promise<void> {
    // Deactivate any current active arc
    await db.query(`
      UPDATE story_arc SET status = "completed" WHERE status = "active"
    `);

    // Activate the new arc
    await db.query(`
      UPDATE ${arcId} SET status = "active"
    `);
  }

  /**
   * Main conversation loop con Claude
   */
  async chat(userMessage: string): Promise<string> {
    this.conversationHistory.push({
      role: "user",
      content: userMessage,
    });

    const systemPrompt = `Sei lo Story Director per FLUTUR, un artista che:
- Fa live looping con RAV Vast e handpan
- Sviluppa tool AI come jsOM
- Ha partecipato a Greece's Got Talent (4 YES)
- Ha 4 anni di residenza a Villa Porta

Il tuo ruolo è decidere la narrativa settimanale per i social media.

COMANDI DISPONIBILI:
- /analyze - Analizza stato attuale e suggerisci direzione
- /plan [brief] - Genera piano settimanale
- /save - Salva piano in database
- /activate [arc_id] - Attiva un arco narrativo
- /status - Mostra stato corrente

REGOLE:
1. Chiedi sempre all'utente per decisioni creative importanti
2. Bilancia i 4 pillars (Tech, Music, Nature, Process)
3. Sabato = crossover tech + music
4. Rispetta regole 2026 (3-5 hashtag IG, links in reply su X)`;

    const response = await this.client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      system: systemPrompt,
      messages: this.conversationHistory,
    });

    const assistantMessage =
      response.content[0].type === "text" ? response.content[0].text : "";

    this.conversationHistory.push({
      role: "assistant",
      content: assistantMessage,
    });

    return assistantMessage;
  }
}

// =====================================================
// CLI INTERFACE
// =====================================================

async function main() {
  const director = new StoryDirector();
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log(`
STORY DIRECTOR - Supervisor Agent
==================================

Comandi:
  analyze              Analizza stato attuale
  plan <brief>         Genera piano settimanale
  chat                 Avvia conversazione interattiva

Esempio:
  npx tsx src/agents/story-director.ts analyze
  npx tsx src/agents/story-director.ts plan "Questa settimana focus su jsOM launch"
`);
    return;
  }

  const command = args[0];

  switch (command) {
    case "analyze": {
      console.log("Analizzando stato attuale...\n");
      const result = await director.analyzeCurrentState();
      console.log("ANALISI:", result.analysis);
      if (result.needsUserInput && result.question) {
        console.log("\nDOMANDA PER L'UTENTE:");
        console.log(`  ${result.question.question}`);
        console.log(`  Contesto: ${result.question.context}`);
        if (result.question.options) {
          console.log(`  Opzioni: ${result.question.options.join(", ")}`);
        }
      }
      break;
    }

    case "plan": {
      const brief = args.slice(1).join(" ");
      if (!brief) {
        console.log("Uso: story-director.ts plan <brief>");
        console.log('Esempio: plan "Focus su jsOM launch e sunrise sessions"');
        return;
      }
      console.log(`Generando piano per: "${brief}"\n`);
      const plan = await director.generateWeeklyPlan(brief);
      console.log("PIANO SETTIMANALE:");
      console.log(JSON.stringify(plan, null, 2));
      break;
    }

    case "chat": {
      console.log(
        "Story Director Chat (scrivi 'exit' per uscire)\n"
      );
      const readline = await import("readline");
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      const prompt = () => {
        rl.question("Tu: ", async (input) => {
          if (input.toLowerCase() === "exit") {
            rl.close();
            return;
          }
          const response = await director.chat(input);
          console.log(`\nStory Director: ${response}\n`);
          prompt();
        });
      };

      prompt();
      break;
    }

    default:
      console.log(`Comando sconosciuto: ${command}`);
  }
}

main().catch(console.error);
