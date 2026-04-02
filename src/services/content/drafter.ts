/**
 * Content Drafter — Interview-based Post Generation (Drizzle)
 *
 * Instead of inventing details, this module:
 * 1. Pulls real context from Postgres via Drizzle (content, gig tables)
 * 2. Asks targeted questions to gather authentic details
 * 3. Generates 3+ draft variations based on answers
 *
 * Migrated from: src/core/content-drafter.ts
 * Change: SurrealDB getDb() → Drizzle ORM + tenantId param
 */

import { db } from "../../db/client.js";
import { content, gig, postDraft } from "../../db/schema.js";
import { eq, and, gte, lte, gt, eq as drizzleEq } from "drizzle-orm";
import {
  getPillarHashtags,
  determinePillarFromContent,
  type PillarKey,
} from "../../core/pillar-helpers.js";
import { createLogger } from "../../lib/logger.js";

const log = createLogger("content-drafter");

// ── Types ────────────────────────────────────────────────────

export interface ContentContext {
  id: string;
  filePath: string;
  fileName: string;
  type: string;
  location?: string | null;
  locationLat?: number | null;
  locationLng?: number | null;
  takenAt?: string | null;
  category?: string | null;
  tags?: string[];
  mood?: string | null;
  qualityScore?: number;
  suggestedCaption?: string | null;
  bestFor?: string[];
  pillar?: string;
  relatedGig?: {
    name: string;
    date: string;
    type: string;
    city: string;
    country: string;
    venueName: string;
  } | null;
}

export interface DraftQuestion {
  id: string;
  question: string;
  context: string;
  type: "text" | "choice" | "multiselect";
  options?: string[];
  required: boolean;
}

export interface DraftSession {
  content: ContentContext;
  questions: DraftQuestion[];
  platform: string;
  contentType: string;
}

export interface PostDraftResult {
  id: string;
  style: string;
  caption: string;
  hashtags: string[];
  cta?: string;
  notes: string;
}

export interface DraftResult {
  content: ContentContext;
  answers: Record<string, string>;
  drafts: PostDraftResult[];
}

// ── Question Generation ──────────────────────────────────────

export function generateQuestions(
  contentCtx: ContentContext,
  platform: string,
  contentType: string
): DraftQuestion[] {
  const questions: DraftQuestion[] = [];

  questions.push({
    id: "story",
    question: contentCtx.relatedGig
      ? `Questa foto è di ${contentCtx.relatedGig.venueName || contentCtx.relatedGig.city}. Qual è il momento/storia dietro questo scatto?`
      : `Cosa stava succedendo quando hai fatto questa foto${contentCtx.location ? ` a ${contentCtx.location}` : ""}?`,
    context: "Per raccontare qualcosa di autentico, non inventato",
    type: "text",
    required: true,
  });

  if (contentCtx.mood) {
    questions.push({
      id: "emotion",
      question: `L'analisi dice mood "${contentCtx.mood}". È accurato? Come ti sentivi davvero in quel momento?`,
      context: "Per trasmettere emozione autentica",
      type: "text",
      required: true,
    });
  } else {
    questions.push({
      id: "emotion",
      question: "Che emozione/sensazione vuoi trasmettere con questo post?",
      context: "Per definire il tono del caption",
      type: "choice",
      options: [
        "Serenità/pace",
        "Energia/gioia",
        "Nostalgia/riflessione",
        "Gratitudine",
        "Altro (specifica)",
      ],
      required: true,
    });
  }

  questions.push({
    id: "audience_connection",
    question:
      "C'è qualcosa che collega Italia e Grecia in questo contenuto? Un tema universale?",
    context:
      "Il tuo pubblico è 53% IT + 15% GR. Contenuti che collegano le due culture hanno più impatto.",
    type: "text",
    required: false,
  });

  if (platform === "instagram") {
    if (contentType === "story") {
      questions.push({
        id: "cta_intent",
        question:
          "Vuoi che la story porti a qualcosa? (link, risposta, swipe up concept)",
        context: "Stories funzionano meglio con un'azione implicita",
        type: "choice",
        options: [
          "No, solo condivisione",
          "Stimolare risposte/DM",
          "Anticipare contenuto futuro",
          "Altro",
        ],
        required: false,
      });
    } else if (contentType === "carousel") {
      questions.push({
        id: "carousel_narrative",
        question:
          "Se fosse un carousel, quale storia racconteresti in sequenza?",
        context:
          "Carousel = mini-documentario. Prima slide = hook, ultima = payoff.",
        type: "text",
        required: false,
      });
    }
  } else if (platform === "twitter") {
    questions.push({
      id: "thread_angle",
      question:
        "C'è un insight/lezione che puoi condividere legato a questo momento?",
      context: "Twitter premia contenuto di valore e opinioni autentiche",
      type: "text",
      required: false,
    });
  }

  // Guard: Cosa NON devo inventare?
  questions.push({
    id: "avoid",
    question:
      "C'è qualcosa che NON devo scrivere o inventare su questo momento?",
    context: "Per evitare dettagli falsi nel caption",
    type: "text",
    required: false,
  });

  return questions;
}

// ── Caption Builders ─────────────────────────────────────────

function buildStorytellingCaption(
  story: string,
  emotion: string,
  location?: string | null,
  pillar?: string
): string {
  const locationPart = location ? `\n\n📍 ${location}` : "";

  if (!story || story.length < 10) {
    return `[Racconta il momento qui - cosa stava succedendo?]${locationPart}`;
  }

  return `${story}\n\n${emotion ? `${emotion}.` : ""}${locationPart}`;
}

function buildMinimalCaption(
  emotion: string,
  location?: string | null
): string {
  const emotions: Record<string, string> = {
    "Serenità/pace": ".",
    "Energia/gioia": "✨",
    "Nostalgia/riflessione": "...",
    Gratitudine: "🙏",
  };

  const suffix = emotions[emotion] || "";
  const locationPart = location ? `📍 ${location}` : "";

  return locationPart ? `${locationPart} ${suffix}`.trim() : suffix || ".";
}

function buildPoeticCaption(
  emotion: string,
  connection: string,
  mood?: string | null
): string {
  const moodPhrases: Record<string, string> = {
    serene: "Nel silenzio, tutto parla.",
    energetic: "L'energia non mente mai.",
    intimate: "Alcuni momenti non hanno bisogno di parole.",
    majestic: "Certi orizzonti ti cambiano dentro.",
    contemplative: "A volte fermarsi è l'unico modo per andare avanti.",
    joyful: "La gioia è sempre inaspettata.",
    mysterious: "I misteri migliori non hanno risposta.",
  };

  const phrase = mood ? moodPhrases[mood] || "" : "";

  if (connection && connection.length > 10) {
    return `${phrase}\n\n${connection}`;
  }

  return phrase || "[Scrivi qualcosa di poetico sul momento]";
}

function buildEducationalCaption(story: string, category?: string | null): string {
  const intros: Record<string, string> = {
    behind_scenes: "Dietro le quinte →",
    studio: "Dal mio studio:",
    instrument_closeup: "Il suono nasce qui:",
  };

  const intro = category ? intros[category] || "" : "";

  if (!story || story.length < 10) {
    return `${intro}\n\n[Condividi un insight sul processo/strumento]`;
  }

  return `${intro}\n\n${story}`;
}

function buildBridgeCaption(
  story: string,
  connection: string,
  location?: string | null
): string {
  const locationPart = location ? `\n\n📍 ${location}` : "";
  return `${connection}\n\n${story || ""}${locationPart}`.trim();
}

// ── Draft Generation ─────────────────────────────────────────

export function generateDrafts(
  contentCtx: ContentContext,
  answers: Record<string, string>,
  platform: string,
  targetPillar?: string
): PostDraftResult[] {
  const drafts: PostDraftResult[] = [];

  const story = answers.story || "";
  const emotion = answers.emotion || "";
  const connection = answers.audience_connection || "";

  const pillar = targetPillar || contentCtx.pillar || "unknown";
  const pillarHashtags = getPillarHashtags(pillar);
  const baseHashtags = (contentCtx.tags || []).slice(0, 2);
  const brandHashtags = ["flutur"];

  if (
    contentCtx.category === "busking" ||
    contentCtx.category === "sunset"
  ) {
    brandHashtags.push("ravvast", "handpan");
  }

  drafts.push({
    id: "storytelling",
    style: "storytelling",
    caption: buildStorytellingCaption(
      story,
      emotion,
      contentCtx.location,
      pillar
    ),
    hashtags: [...brandHashtags, ...pillarHashtags, ...baseHashtags].slice(
      0,
      5
    ),
    notes: `Approccio narrativo: racconta il momento come una storia. Allineato con pillar "${pillar}".`,
  });

  drafts.push({
    id: "minimal",
    style: "minimal",
    caption: buildMinimalCaption(emotion, contentCtx.location),
    hashtags: brandHashtags.slice(0, 3),
    notes:
      "Approccio minimalista: lascia che l'immagine parli. Può aumentare commenti perché invita all'interpretazione.",
  });

  drafts.push({
    id: "poetic",
    style: "poetic",
    caption: buildPoeticCaption(emotion, connection, contentCtx.mood),
    hashtags: [...brandHashtags, "musicianlife"].slice(0, 4),
    notes:
      "Approccio poetico: tono riflessivo che risuona con il pubblico \"mindful\". Ottimo per domenica sera.",
  });

  if (
    contentCtx.category === "behind_scenes" ||
    contentCtx.category === "studio" ||
    contentCtx.category === "instrument_closeup"
  ) {
    drafts.push({
      id: "educational",
      style: "educational",
      caption: buildEducationalCaption(story, contentCtx.category),
      hashtags: [
        ...brandHashtags,
        "musicproduction",
        "behindthescenes",
      ].slice(0, 5),
      notes:
        "Approccio educational: condividi un insight sul processo. Genera save e share.",
    });
  }

  if (connection && connection.trim().length > 10) {
    drafts.push({
      id: "bridge",
      style: "bridge",
      caption: buildBridgeCaption(story, connection, contentCtx.location),
      hashtags: [...brandHashtags, "italygreece"].slice(0, 4),
      notes:
        "Approccio \"ponte\": collega le due culture del tuo pubblico. Alto potenziale di engagement.",
    });
  }

  return drafts;
}

// ── Session API ───────────────────────────────────────────────

export async function startDraftSession(
  tenantId: string,
  contentId: string,
  platform: string = "instagram",
  contentType: string = "feed"
): Promise<DraftSession> {
  // Fetch content record
  const contentRows = await db
    .select()
    .from(content)
    .where(and(eq(content.tenantId, tenantId), eq(content.id, contentId)))
    .limit(1);

  const row = contentRows[0];
  if (!row) {
    throw new Error(`Content not found: ${contentId}`);
  }

  // Look for a gig on the same day as the content
  let relatedGig = null;
  if (row.takenAt) {
    const takenAt = new Date(row.takenAt);
    const dayBefore = new Date(takenAt);
    dayBefore.setDate(dayBefore.getDate() - 1);
    const dayAfter = new Date(takenAt);
    dayAfter.setDate(dayAfter.getDate() + 1);

    const gigRows = await db
      .select()
      .from(gig)
      .where(
        and(
          eq(gig.tenantId, tenantId),
          gte(gig.date, dayBefore.toISOString().split("T")[0]),
          lte(gig.date, dayAfter.toISOString().split("T")[0])
        )
      )
      .limit(1);

    if (gigRows[0]) {
      const g = gigRows[0];
      relatedGig = {
        name: g.venue,
        date: g.date,
        type: "gig",
        city: g.market || "",
        country: g.country || "",
        venueName: g.venue,
      };
    }
  }

  const contentCtx: ContentContext = {
    id: row.id,
    filePath: row.filePath,
    fileName: row.fileName,
    type: row.type,
    location: row.location,
    locationLat: row.locationLat,
    locationLng: row.locationLng,
    takenAt: row.takenAt?.toISOString() || null,
    category: row.category,
    tags: row.tags || [],
    pillar: row.category
      ? determinePillarFromContent(row.tags || [], row.category)
      : undefined,
    relatedGig,
  };

  const questions = generateQuestions(contentCtx, platform, contentType);

  return { content: contentCtx, questions, platform, contentType };
}

export async function completeDraftSession(
  session: DraftSession,
  answers: Record<string, string>
): Promise<DraftResult> {
  const drafts = generateDrafts(session.content, answers, session.platform);
  return { content: session.content, answers, drafts };
}

export async function getContentReadyForDrafting(
  tenantId: string,
  limit: number = 10
): Promise<ContentContext[]> {
  // Select content that has a category set and hasn't been used yet
  const rows = await db
    .select()
    .from(content)
    .where(
      and(
        eq(content.tenantId, tenantId),
        eq(content.usedCount, 0)
      )
    )
    .limit(limit);

  return rows
    .filter((r) => r.category !== null)
    .map((r) => ({
      id: r.id,
      filePath: r.filePath,
      fileName: r.fileName,
      type: r.type,
      location: r.location,
      locationLat: r.locationLat,
      locationLng: r.locationLng,
      takenAt: r.takenAt?.toISOString() || null,
      category: r.category,
      tags: r.tags || [],
      pillar: r.category
        ? determinePillarFromContent(r.tags || [], r.category)
        : undefined,
    }));
}

export async function markContentUsed(
  tenantId: string,
  contentId: string
): Promise<void> {
  const rows = await db
    .select({ usedCount: content.usedCount })
    .from(content)
    .where(and(eq(content.tenantId, tenantId), eq(content.id, contentId)))
    .limit(1);

  const current = rows[0]?.usedCount ?? 0;

  await db
    .update(content)
    .set({ usedCount: current + 1 })
    .where(and(eq(content.tenantId, tenantId), eq(content.id, contentId)));

  log.info("content marked used", { contentId });
}

// ── Save draft to DB ──────────────────────────────────────────

export async function saveDraft(
  tenantId: string,
  platform: "twitter" | "instagram" | "tiktok" | "youtube" | "facebook",
  draftResult: PostDraftResult,
  pillar?: string
): Promise<string> {
  const rows = await db
    .insert(postDraft)
    .values({
      tenantId,
      platform,
      content: draftResult.caption,
      pillar: pillar || null,
      status: "draft",
      data: {
        style: draftResult.style,
        hashtags: draftResult.hashtags,
        cta: draftResult.cta,
        notes: draftResult.notes,
      },
    })
    .returning({ id: postDraft.id });

  const id = rows[0]?.id;
  log.info("draft saved", { id, platform, style: draftResult.style });
  return id;
}

// ── Barrel object ─────────────────────────────────────────────

export const contentDrafter = {
  startSession: startDraftSession,
  complete: completeDraftSession,
  getReady: getContentReadyForDrafting,
  markUsed: markContentUsed,
  saveDraft,
  generateQuestions,
  generateDrafts,
};
