/**
 * Content Drafter - Interview-based Post Generation
 *
 * Instead of inventing details, this module:
 * 1. Pulls real context from SurrealDB (photos, gigs, metadata)
 * 2. Asks targeted questions to gather authentic details
 * 3. Generates 3+ draft variations based on your answers
 *
 * Usage:
 *   import { ContentDrafter } from './core/content-drafter.js';
 *
 *   const drafter = new ContentDrafter();
 *   const session = await drafter.startSession(contentId);
 *   // Returns questions to ask
 *   const drafts = await drafter.generateDrafts(session, answers);
 */

import { getDb } from '../db/client.js';
import { getPillarHashtags, determinePillarFromContent, type PillarKey } from './pillar-helpers.js';

export interface ContentContext {
  id: string;
  file_path: string;
  file_name: string;
  type: string;
  location?: string;
  location_lat?: number;
  location_lng?: number;
  taken_at?: string;
  category?: string;
  tags?: string[];
  mood?: string;
  quality_score?: number;
  suggested_caption?: string;
  best_for?: string[];
  pillar?: string; // New: suggested pillar based on content
  // Related gig if any
  related_gig?: {
    name: string;
    date: string;
    type: string;
    city: string;
    country: string;
    venue_name: string;
    story_context: string;
    key_moment: string;
  };
}

export interface DraftQuestion {
  id: string;
  question: string;
  context: string; // Why we're asking this
  type: 'text' | 'choice' | 'multiselect';
  options?: string[];
  required: boolean;
}

export interface DraftSession {
  content: ContentContext;
  questions: DraftQuestion[];
  platform: string;
  contentType: string;
}

export interface PostDraft {
  id: string;
  style: string; // 'storytelling' | 'minimal' | 'poetic' | 'educational'
  caption: string;
  hashtags: string[];
  cta?: string; // Call to action
  notes: string; // Why this approach
}

export interface DraftResult {
  content: ContentContext;
  answers: Record<string, string>;
  drafts: PostDraft[];
}

/**
 * Generate questions based on content context
 */
export function generateQuestions(
  content: ContentContext,
  platform: string,
  contentType: string
): DraftQuestion[] {
  const questions: DraftQuestion[] = [];

  // Q1: What's the real story?
  questions.push({
    id: 'story',
    question: content.related_gig
      ? `Questa foto è di ${content.related_gig.venue_name || content.related_gig.city}. Qual è il momento/storia dietro questo scatto?`
      : `Cosa stava succedendo quando hai fatto questa foto${content.location ? ` a ${content.location}` : ''}?`,
    context: 'Per raccontare qualcosa di autentico, non inventato',
    type: 'text',
    required: true,
  });

  // Q2: Emotion/feeling (based on mood if exists)
  if (content.mood) {
    questions.push({
      id: 'emotion',
      question: `L'analisi dice mood "${content.mood}". È accurato? Come ti sentivi davvero in quel momento?`,
      context: 'Per trasmettere emozione autentica',
      type: 'text',
      required: true,
    });
  } else {
    questions.push({
      id: 'emotion',
      question: 'Che emozione/sensazione vuoi trasmettere con questo post?',
      context: 'Per definire il tono del caption',
      type: 'choice',
      options: ['Serenità/pace', 'Energia/gioia', 'Nostalgia/riflessione', 'Gratitudine', 'Altro (specifica)'],
      required: true,
    });
  }

  // Q3: Audience connection (IT-GR corridor specific)
  questions.push({
    id: 'audience_connection',
    question: 'C\'è qualcosa che collega Italia e Grecia in questo contenuto? Un tema universale?',
    context: 'Il tuo pubblico è 53% IT + 15% GR. Contenuti che collegano le due culture hanno più impatto.',
    type: 'text',
    required: false,
  });

  // Q4: Platform-specific question
  if (platform === 'instagram') {
    if (contentType === 'story') {
      questions.push({
        id: 'cta_intent',
        question: 'Vuoi che la story porti a qualcosa? (link, risposta, swipe up concept)',
        context: 'Stories funzionano meglio con un\'azione implicita',
        type: 'choice',
        options: ['No, solo condivisione', 'Stimolare risposte/DM', 'Anticipare contenuto futuro', 'Altro'],
        required: false,
      });
    } else if (contentType === 'carousel') {
      questions.push({
        id: 'carousel_narrative',
        question: 'Se fosse un carousel, quale storia racconteresti in sequenza?',
        context: 'Carousel = mini-documentario. Prima slide = hook, ultima = payoff.',
        type: 'text',
        required: false,
      });
    }
  } else if (platform === 'twitter') {
    questions.push({
      id: 'thread_angle',
      question: 'C\'è un insight/lezione che puoi condividere legato a questo momento?',
      context: 'Twitter premia contenuto di valore e opinioni autentiche',
      type: 'text',
      required: false,
    });
  }

  // Q5: What NOT to say (anti-hallucination)
  questions.push({
    id: 'avoid',
    question: 'C\'è qualcosa che NON devo scrivere o inventare su questo momento?',
    context: 'Per evitare dettagli falsi nel caption',
    type: 'text',
    required: false,
  });

  return questions;
}

/**
 * Generate 3+ draft variations based on answers
 */
export function generateDrafts(
  content: ContentContext,
  answers: Record<string, string>,
  platform: string,
  targetPillar?: string
): PostDraft[] {
  const drafts: PostDraft[] = [];

  const story = answers.story || '';
  const emotion = answers.emotion || '';
  const connection = answers.audience_connection || '';
  const avoid = answers.avoid || '';

  // Use target pillar or content's suggested pillar
  const pillar = targetPillar || content.pillar || 'unknown';

  // Determine hashtags based on pillar and content
  const pillarHashtags = getPillarHashtags(pillar);
  const baseHashtags = content.tags?.slice(0, 2) || [];
  const brandHashtags = ['flutur'];

  // Add category-specific hashtags
  if (content.category === 'busking' || content.category === 'sunset') {
    brandHashtags.push('ravvast', 'handpan');
  }

  // Draft 1: Storytelling - narrative focus
  drafts.push({
    id: 'storytelling',
    style: 'storytelling',
    caption: buildStorytellingCaption(story, emotion, content.location, pillar),
    hashtags: [...brandHashtags, ...pillarHashtags, ...baseHashtags].slice(0, 5),
    notes: `Approccio narrativo: racconta il momento come una storia. Allineato con pillar "${pillar}".`,
  });

  // Draft 2: Minimal - let the image speak
  drafts.push({
    id: 'minimal',
    style: 'minimal',
    caption: buildMinimalCaption(emotion, content.location),
    hashtags: brandHashtags.slice(0, 3),
    notes: 'Approccio minimalista: lascia che l\'immagine parli. Può aumentare commenti perché invita all\'interpretazione.',
  });

  // Draft 3: Poetic/Reflective
  drafts.push({
    id: 'poetic',
    style: 'poetic',
    caption: buildPoeticCaption(emotion, connection, content.mood),
    hashtags: [...brandHashtags, 'musicianlife'].slice(0, 4),
    notes: 'Approccio poetico: tono riflessivo che risuona con il pubblico "mindful". Ottimo per domenica sera.',
  });

  // Draft 4: Educational/Behind-the-scenes (if applicable)
  if (content.category === 'behind_scenes' || content.category === 'studio' || content.category === 'instrument_closeup') {
    drafts.push({
      id: 'educational',
      style: 'educational',
      caption: buildEducationalCaption(story, content.category),
      hashtags: [...brandHashtags, 'musicproduction', 'behindthescenes'].slice(0, 5),
      notes: 'Approccio educational: condividi un insight sul processo. Genera save e share.',
    });
  }

  // Draft 5: Bridge IT-GR (if connection exists)
  if (connection && connection.trim().length > 10) {
    drafts.push({
      id: 'bridge',
      style: 'bridge',
      caption: buildBridgeCaption(story, connection, content.location),
      hashtags: [...brandHashtags, 'italygreece'].slice(0, 4),
      notes: 'Approccio "ponte": collega le due culture del tuo pubblico. Alto potenziale di engagement.',
    });
  }

  return drafts;
}

// Caption builders
function buildStorytellingCaption(story: string, emotion: string, location?: string, pillar?: string): string {
  const locationPart = location ? `\n\n📍 ${location}` : '';

  if (!story || story.length < 10) {
    return `[Racconta il momento qui - cosa stava succedendo?]${locationPart}`;
  }

  // Add pillar-specific angle to story
  let pillarHook = '';
  if (pillar === 'tech') {
    pillarHook = 'From code to sound:\n';
  } else if (pillar === 'music_production') {
    pillarHook = 'Layer by layer:\n';
  }

  // Structure: Hook → Story → Emotion
  return `${story}\n\n${emotion ? `${emotion}.` : ''}${locationPart}`;
}

function buildMinimalCaption(emotion: string, location?: string): string {
  // Very short, evocative
  const emotions: Record<string, string> = {
    'Serenità/pace': '.',
    'Energia/gioia': '✨',
    'Nostalgia/riflessione': '...',
    'Gratitudine': '🙏',
  };

  const suffix = emotions[emotion] || '';
  const locationPart = location ? `📍 ${location}` : '';

  return locationPart ? `${locationPart} ${suffix}`.trim() : suffix || '.';
}

function buildPoeticCaption(emotion: string, connection: string, mood?: string): string {
  // Layer su layer style
  const moodPhrases: Record<string, string> = {
    serene: 'Nel silenzio, tutto parla.',
    energetic: 'L\'energia non mente mai.',
    intimate: 'Alcuni momenti non hanno bisogno di parole.',
    majestic: 'Certi orizzonti ti cambiano dentro.',
    contemplative: 'A volte fermarsi è l\'unico modo per andare avanti.',
    joyful: 'La gioia è sempre inaspettata.',
    mysterious: 'I misteri migliori non hanno risposta.',
  };

  const phrase = mood ? moodPhrases[mood] || '' : '';

  if (connection && connection.length > 10) {
    return `${phrase}\n\n${connection}`;
  }

  return phrase || '[Scrivi qualcosa di poetico sul momento]';
}

function buildEducationalCaption(story: string, category?: string): string {
  const intros: Record<string, string> = {
    behind_scenes: 'Dietro le quinte →',
    studio: 'Dal mio studio:',
    instrument_closeup: 'Il suono nasce qui:',
  };

  const intro = category ? intros[category] || '' : '';

  if (!story || story.length < 10) {
    return `${intro}\n\n[Condividi un insight sul processo/strumento]`;
  }

  return `${intro}\n\n${story}`;
}

function buildBridgeCaption(story: string, connection: string, location?: string): string {
  // IT-GR bridge style
  const locationPart = location ? `\n\n📍 ${location}` : '';

  return `${connection}\n\n${story || ''}${locationPart}`.trim();
}

/**
 * Start a drafting session for a content item
 */
export async function startDraftSession(
  contentId: string,
  platform: string = 'instagram',
  contentType: string = 'feed'
): Promise<DraftSession> {
  const db = await getDb();

  // Get content with related gig if any
  const result = await db.query<[ContentContext[]]>(`
    SELECT
      *,
      (SELECT * FROM gig WHERE
        date >= time::subtract($taken_at, 1d) AND
        date <= time::add($taken_at, 1d)
        LIMIT 1
      )[0] as related_gig
    FROM content
    WHERE id = $id
  `, { id: contentId });

  const content = result[0]?.[0];

  if (!content) {
    throw new Error(`Content not found: ${contentId}`);
  }

  const questions = generateQuestions(content, platform, contentType);

  return {
    content,
    questions,
    platform,
    contentType,
  };
}

/**
 * Complete a drafting session with answers
 */
export async function completeDraftSession(
  session: DraftSession,
  answers: Record<string, string>
): Promise<DraftResult> {
  const drafts = generateDrafts(session.content, answers, session.platform);

  return {
    content: session.content,
    answers,
    drafts,
  };
}

/**
 * Get content ready for drafting (has analysis but no post yet)
 */
export async function getContentReadyForDrafting(limit: number = 10): Promise<ContentContext[]> {
  const db = await getDb();

  const result = await db.query<[ContentContext[]]>(`
    SELECT * FROM content
    WHERE category IS NOT NONE
      AND quality_score >= 6
      AND used_count = 0
    ORDER BY quality_score DESC
    LIMIT $limit
  `, { limit });

  return result[0] || [];
}

/**
 * Mark content as used after posting
 */
export async function markContentUsed(contentId: string): Promise<void> {
  const db = await getDb();

  await db.query(`
    UPDATE $id SET used_count = used_count + 1
  `, { id: contentId });
}

// Export for direct use
export const contentDrafter = {
  startSession: startDraftSession,
  complete: completeDraftSession,
  getReady: getContentReadyForDrafting,
  markUsed: markContentUsed,
  generateQuestions,
  generateDrafts,
};
