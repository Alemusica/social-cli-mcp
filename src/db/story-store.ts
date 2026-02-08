/**
 * Story Fragment Persistence — Editorial Department
 *
 * Biographical source material: life events, turning points, reflections.
 * These are the RAW NARRATIVE — story_arc handles weekly distribution,
 * story_fragment holds what actually happened.
 *
 * Integration:
 *   fragment → memory_link (entities touched)
 *   fragment → fragment_inspires → platform_content (when published)
 *   fragment → fragment_in_arc → story_arc (when used in weekly plan)
 */

import { getDb } from './client.js';

export interface StoryFragment {
  title: string;
  body: string;
  period?: string;        // "2019-2021", "summer 2023"
  location?: string;      // "Athens", "Denver"
  theme: StoryTheme;
  emotionalTone?: string; // reflective, triumphant, vulnerable, raw
  entities?: string[];    // entity IDs
  channelsSuitable?: string[]; // instagram, book, website, interview
  sigma?: 'σ₁' | 'σ₂';
  bookChapter?: string;
  source?: string;        // voice note, interview, written, Claude session
}

export type StoryTheme =
  | 'origin'           // where it all started
  | 'transformation'   // turning points
  | 'credential'       // proof of capability
  | 'struggle'         // honest difficulty
  | 'discovery'        // finding something new
  | 'craft'            // the making, the process
  | 'connection'       // people, places, moments
  | 'philosophy';      // beliefs, worldview

function fragmentId(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 60);
}

export async function saveFragment(fragment: StoryFragment): Promise<string> {
  const db = await getDb();
  const id = fragmentId(fragment.title);

  // Build SET clauses dynamically — SurrealDB option<T> needs NONE, not null
  const params: Record<string, any> = {
    id,
    title: fragment.title,
    body: fragment.body,
    theme: fragment.theme,
    entities: fragment.entities || [],
    channels: fragment.channelsSuitable || [],
    sigma: fragment.sigma || 'σ₁',
  };

  let setClauses = `
      title = $title,
      body = $body,
      theme = $theme,
      entities = $entities,
      channels_suitable = $channels,
      channels_published = [],
      sigma = $sigma,
      created_at = time::now()`;

  if (fragment.period) { setClauses += `, period = $period`; params.period = fragment.period; }
  if (fragment.location) { setClauses += `, location = $location`; params.location = fragment.location; }
  if (fragment.emotionalTone) { setClauses += `, emotional_tone = $tone`; params.tone = fragment.emotionalTone; }
  if (fragment.bookChapter) { setClauses += `, book_chapter = $chapter`; params.chapter = fragment.bookChapter; }
  if (fragment.source) { setClauses += `, source = $source`; params.source = fragment.source; }

  await db.query(`UPSERT type::thing("story_fragment", $id) SET ${setClauses}`, params);

  // Create memory_links for entity cross-referencing
  for (const entity of (fragment.entities || [])) {
    const linkId = `frag_${id}_${entity.replace(/[^a-zA-Z0-9]/g, '_')}`;
    await db.query(`
      UPSERT type::thing("memory_link", $linkId) SET
        from_dept = 'editorial',
        to_entity = $entity,
        signal_type = 'observation',
        content = $content,
        sigma = $sigma,
        created_at = time::now()
    `, {
      linkId,
      entity,
      content: `Story: ${fragment.title} (${fragment.theme})`,
      sigma: fragment.sigma || 'σ₁',
    });
  }

  return id;
}

export async function getFragmentsByTheme(theme: StoryTheme): Promise<any[]> {
  const db = await getDb();
  const [result] = await db.query(
    `SELECT * FROM story_fragment WHERE theme = $theme ORDER BY created_at DESC`,
    { theme },
  );
  return result as any[];
}

export async function getFragmentsForChannel(channel: string): Promise<any[]> {
  const db = await getDb();
  const [result] = await db.query(
    `SELECT * FROM story_fragment WHERE channels_suitable CONTAINS $channel AND !(channels_published CONTAINS $channel) ORDER BY created_at DESC`,
    { channel },
  );
  return result as any[];
}

export async function getUnpublishedFragments(): Promise<any[]> {
  const db = await getDb();
  const [result] = await db.query(
    `SELECT * FROM story_fragment WHERE array::len(channels_published) = 0 ORDER BY created_at DESC`,
  );
  return result as any[];
}

export async function markPublished(fragmentId: string, channel: string): Promise<void> {
  const db = await getDb();
  await db.query(`
    UPDATE type::thing("story_fragment", $id) SET
      channels_published += $channel
  `, { id: fragmentId, channel });
}

export async function getFragmentsByEntity(entityId: string): Promise<any[]> {
  const db = await getDb();
  const [result] = await db.query(
    `SELECT * FROM story_fragment WHERE entities CONTAINS $entity ORDER BY created_at DESC`,
    { entity: entityId },
  );
  return result as any[];
}

export async function getAllFragments(): Promise<any[]> {
  const db = await getDb();
  const [result] = await db.query(
    `SELECT * FROM story_fragment ORDER BY created_at DESC`,
  );
  return result as any[];
}

export const storyStore = {
  save: saveFragment,
  byTheme: getFragmentsByTheme,
  forChannel: getFragmentsForChannel,
  unpublished: getUnpublishedFragments,
  markPublished,
  byEntity: getFragmentsByEntity,
  all: getAllFragments,
};
