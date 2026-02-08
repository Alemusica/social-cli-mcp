/**
 * INTERVIEWER - User Feedback & Story Collector Agent
 *
 * Ruolo: Fa domande rapide all'utente per raccogliere:
 * - Feedback su post recenti
 * - Storie passate da raccontare
 * - Evoluzioni del brand/progetti
 * - Input per il piano editoriale
 *
 * Comunica con:
 * - Story Director (fornisce context narrativo)
 * - Editorial Planner (fornisce idee content)
 * - Analytics (correla feedback con performance)
 *
 * @see ARCHITECTURE.md per design completo
 * @see CLAUDE.md per documentazione sistema
 */

import Anthropic from "@anthropic-ai/sdk";
import * as readline from "readline";
import { db } from "../core/index.js";

// =====================================================
// TYPES
// =====================================================

export interface InterviewSession {
  id: string;
  started_at: Date;
  topic: InterviewTopic;
  responses: QuestionResponse[];
  insights: string[];
  status: "active" | "completed" | "paused";
}

export type InterviewTopic =
  | "post_feedback"
  | "story_collection"
  | "weekly_planning"
  | "brand_evolution"
  | "content_ideas"
  | "quick_check";

export interface QuestionResponse {
  question: string;
  answer: string;
  timestamp: Date;
  follow_up_needed: boolean;
}

export interface InterviewInsight {
  topic: string;
  key_points: string[];
  content_ideas: string[];
  narrative_hooks: string[];
  action_items: string[];
}

// =====================================================
// QUESTION TEMPLATES
// =====================================================

const QUESTION_TEMPLATES: Record<InterviewTopic, string[]> = {
  post_feedback: [
    "Come è andato l'ultimo post? Reazioni interessanti?",
    "Hai ricevuto DM o commenti memorabili?",
    "Qualcosa ti ha sorpreso nelle reazioni?",
    "C'è stato un momento 'aha' con l'audience?",
  ],
  story_collection: [
    "Raccontami un momento recente che vorresti condividere",
    "C'è una storia del passato che non hai mai raccontato?",
    "Qual è stato l'ultimo momento 'wow' con la musica?",
    "Cosa ti ha ispirato questa settimana?",
  ],
  weekly_planning: [
    "Qual è la priorità questa settimana?",
    "Ci sono eventi o date importanti in arrivo?",
    "Su cosa vuoi che l'audience si concentri?",
    "Tech o music focus questa settimana?",
  ],
  brand_evolution: [
    "Come sta evolvendo il tuo messaggio?",
    "C'è qualcosa che vuoi cambiare nel tono?",
    "Nuovi progetti che vuoi anticipare?",
    "Come ti senti rispetto alla direzione attuale?",
  ],
  content_ideas: [
    "Hai visto contenuti che ti hanno ispirato?",
    "C'è un formato che vorresti provare?",
    "Quale storia non hai ancora raccontato bene?",
    "Cosa chiedono di più i tuoi follower?",
  ],
  quick_check: [
    "Come va? Tutto ok per postare oggi?",
    "Novità dell'ultimo momento?",
    "Confermi il piano per oggi?",
  ],
};

// =====================================================
// INTERVIEWER AGENT
// =====================================================

export class Interviewer {
  private client: Anthropic;
  private currentSession: InterviewSession | null = null;
  private rl: readline.Interface | null = null;

  constructor() {
    this.client = new Anthropic();
  }

  /**
   * Start interview session
   */
  async startSession(topic: InterviewTopic): Promise<void> {
    this.currentSession = {
      id: `interview_${Date.now()}`,
      started_at: new Date(),
      topic,
      responses: [],
      insights: [],
      status: "active",
    };

    console.log();
    console.log("=".repeat(50));
    console.log(`INTERVIEWER - ${topic.replace("_", " ").toUpperCase()}`);
    console.log("=".repeat(50));
    console.log("(Rispondi brevemente, 'skip' per saltare, 'done' per finire)");
    console.log();
  }

  /**
   * Ask a single question and get response
   */
  private async askQuestion(question: string): Promise<string> {
    return new Promise((resolve) => {
      if (!this.rl) {
        this.rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout,
        });
      }

      this.rl.question(`❓ ${question}\n→ `, (answer) => {
        resolve(answer.trim());
      });
    });
  }

  /**
   * Run quick interview (3-4 questions)
   */
  async runQuickInterview(topic: InterviewTopic): Promise<InterviewInsight> {
    await this.startSession(topic);

    const questions = QUESTION_TEMPLATES[topic];
    const responses: QuestionResponse[] = [];

    // Ask 3-4 questions max
    const questionsToAsk = questions.slice(0, Math.min(4, questions.length));

    for (const question of questionsToAsk) {
      const answer = await this.askQuestion(question);

      if (answer.toLowerCase() === "done") {
        break;
      }

      if (answer.toLowerCase() !== "skip" && answer.length > 0) {
        responses.push({
          question,
          answer,
          timestamp: new Date(),
          follow_up_needed: false,
        });
      }
    }

    // Close readline
    if (this.rl) {
      this.rl.close();
      this.rl = null;
    }

    // Generate insights from responses
    const insight = await this.generateInsights(topic, responses);

    // Save to database
    await this.saveSession(responses, insight);

    return insight;
  }

  /**
   * Generate insights from interview responses using Claude
   */
  private async generateInsights(
    topic: InterviewTopic,
    responses: QuestionResponse[]
  ): Promise<InterviewInsight> {
    if (responses.length === 0) {
      return {
        topic,
        key_points: [],
        content_ideas: [],
        narrative_hooks: [],
        action_items: [],
      };
    }

    const prompt = `Sei l'Interviewer agent per FLUTUR. Analizza queste risposte e genera insight per il content team.

TOPIC: ${topic}

RISPOSTE:
${responses.map((r) => `Q: ${r.question}\nA: ${r.answer}`).join("\n\n")}

BRAND CONTEXT:
- FLUTUR fa live looping con RAV Vast
- Sviluppa jsOM (tool AI per UI designers)
- Pillars: Tech Innovation, Live Looping, Nature/Travel, Authentic Process
- Target: SHARES > Saves (2026 algorithm)

Genera output in JSON:
{
  "topic": "${topic}",
  "key_points": ["punto chiave 1", "punto chiave 2"],
  "content_ideas": ["idea post 1", "idea post 2"],
  "narrative_hooks": ["hook narrativo 1 per caption/thread"],
  "action_items": ["cosa fare subito"]
}`;

    const response = await this.client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }

    return {
      topic,
      key_points: responses.map((r) => r.answer),
      content_ideas: [],
      narrative_hooks: [],
      action_items: [],
    };
  }

  /**
   * Save interview session to SurrealDB
   */
  private async saveSession(
    responses: QuestionResponse[],
    insight: InterviewInsight
  ): Promise<void> {
    const session = this.currentSession;
    if (!session) return;

    try {
      await db.query(`
        CREATE interview_session CONTENT {
          session_id: "${session.id}",
          topic: "${session.topic}",
          started_at: "${session.started_at.toISOString()}",
          responses: ${JSON.stringify(responses)},
          insights: ${JSON.stringify(insight)},
          status: "completed"
        }
      `);
    } catch {
      // Table might not exist, that's ok
    }

    console.log();
    console.log("=".repeat(50));
    console.log("INSIGHTS GENERATI:");
    console.log("=".repeat(50));

    if (insight.key_points.length > 0) {
      console.log("\n📌 Key Points:");
      insight.key_points.forEach((p) => console.log(`   • ${p}`));
    }

    if (insight.content_ideas.length > 0) {
      console.log("\n💡 Content Ideas:");
      insight.content_ideas.forEach((i) => console.log(`   • ${i}`));
    }

    if (insight.narrative_hooks.length > 0) {
      console.log("\n🎣 Narrative Hooks:");
      insight.narrative_hooks.forEach((h) => console.log(`   • ${h}`));
    }

    if (insight.action_items.length > 0) {
      console.log("\n✅ Action Items:");
      insight.action_items.forEach((a) => console.log(`   • ${a}`));
    }

    console.log();
  }

  /**
   * Quick daily check-in (2-3 questions)
   */
  async dailyCheckIn(): Promise<InterviewInsight> {
    console.log("\n☀️ DAILY CHECK-IN\n");
    return this.runQuickInterview("quick_check");
  }

  /**
   * Post-publish feedback collection
   */
  async collectPostFeedback(): Promise<InterviewInsight> {
    console.log("\n📊 POST FEEDBACK\n");
    return this.runQuickInterview("post_feedback");
  }

  /**
   * Story mining session
   */
  async mineStories(): Promise<InterviewInsight> {
    console.log("\n📖 STORY COLLECTION\n");
    return this.runQuickInterview("story_collection");
  }

  /**
   * Weekly planning input
   */
  async weeklyPlanning(): Promise<InterviewInsight> {
    console.log("\n📅 WEEKLY PLANNING\n");
    return this.runQuickInterview("weekly_planning");
  }

  /**
   * Generate Twitter content from recent insights
   */
  async generateTwitterContent(): Promise<string[]> {
    // Get recent interview insights
    const recentInsights = await db.query<any>(`
      SELECT * FROM interview_session
      WHERE status = "completed"
      ORDER BY started_at DESC
      LIMIT 3
    `);

    // Get brand context
    const prompt = `Sei il content writer per FLUTUR. Genera 3 tweet per Twitter/X basati su questi insight recenti.

RECENT INSIGHTS:
${JSON.stringify(recentInsights, null, 2)}

BRAND:
- FLUTUR: live looping con RAV Vast + sviluppo jsOM
- Tono: onesto, poetico, zero assertività
- NO links nel tweet principale (link in reply)
- Max 1-2 hashtag: #buildinpublic #jsOM

FORMATI EFFICACI:
1. Hook + storia breve + domanda
2. Lista numerata (3-5 punti)
3. Observation + reflection
4. Before/After transformation

Genera 3 tweet pronti da postare (max 280 char ciascuno):`;

    const response = await this.client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";

    // Parse tweets from response
    const tweets = text
      .split(/\d\.\s/)
      .filter((t) => t.trim().length > 0)
      .map((t) => t.trim());

    return tweets.slice(0, 3);
  }
}

// =====================================================
// CLI INTERFACE
// =====================================================

async function main() {
  const interviewer = new Interviewer();
  const args = process.argv.slice(2);
  const command = args[0] || "help";

  switch (command) {
    case "daily":
      await interviewer.dailyCheckIn();
      break;

    case "feedback":
      await interviewer.collectPostFeedback();
      break;

    case "stories":
      await interviewer.mineStories();
      break;

    case "weekly":
      await interviewer.weeklyPlanning();
      break;

    case "tweets":
      console.log("\n🐦 GENERATING TWITTER CONTENT...\n");
      const tweets = await interviewer.generateTwitterContent();
      console.log("Generated Tweets:");
      tweets.forEach((t, i) => {
        console.log(`\n${i + 1}. ${t}`);
        console.log(`   [${t.length} chars]`);
      });
      break;

    case "help":
    default:
      console.log(`
INTERVIEWER - User Feedback & Story Collector
=============================================

Commands:
  daily      Quick daily check-in (2-3 questions)
  feedback   Collect post feedback
  stories    Mine stories for content
  weekly     Weekly planning input
  tweets     Generate Twitter content from insights

Examples:
  npx tsx src/agents/interviewer.ts daily
  npx tsx src/agents/interviewer.ts stories
  npx tsx src/agents/interviewer.ts tweets

This agent asks quick questions and generates:
- Key points for Story Director
- Content ideas for Editorial Planner
- Narrative hooks for captions
- Action items for immediate tasks
`);
  }
}

main().catch(console.error);
