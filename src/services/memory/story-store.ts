/**
 * Story Fragment Persistence — Editorial Department (Drizzle)
 *
 * Biographical source material: life events, turning points, reflections.
 * These are the RAW NARRATIVE — story_arc handles weekly distribution,
 * story_fragment holds what actually happened.
 *
 * Integration:
 *   fragment → memoryLink (entities touched)
 *   fragment → channelsSuitable / published flag (publication tracking)
 *
 * Migrated from: src/db/story-store.ts
 * Change: SurrealDB getDb() → Drizzle ORM, tenantId required
 */

import { db } from "../../db/client.js";
import { storyFragment, memoryLink } from "../../db/schema.js";
import { eq, and, desc, sql } from "drizzle-orm";
import { createLogger } from "../../lib/logger.js";

const log = createLogger("story-store");

// ── Types ────────────────────────────────────────────────────

export type StoryTheme =
  | "origin"           // where it all started
  | "transformation"   // turning points
  | "credential"       // proof of capability
  | "struggle"         // honest difficulty
  | "discovery"        // finding something new
  | "craft"            // the making, the process
  | "connection"       // people, places, moments
  | "philosophy";      // beliefs, worldview

export interface StoryFragment {
  title: string;
  body: string;
  period?: string;          // "2019-2021", "summer 2023"
  location?: string;        // "Athens", "Denver"
  theme: StoryTheme;
  emotionalTone?: string;   // reflective, triumphant, vulnerable, raw
  entities?: string[];      // entity IDs
  channelsSuitable?: string[]; // instagram, book, website, interview
  sigma?: "σ₁" | "σ₂";
  bookChapter?: string;
  source?: string;          // voice note, interview, written, Claude session
}

// ── Functions ────────────────────────────────────────────────

export async function saveFragment(
  tenantId: string,
  fragment: StoryFragment,
): Promise<string> {
  const [record] = await db
    .insert(storyFragment)
    .values({
      tenantId,
      title: fragment.title,
      body: fragment.body,
      theme: fragment.theme,
      period: fragment.period,
      location: fragment.location,
      entities: fragment.entities || [],
      channelsSuitable: fragment.channelsSuitable || [],
      source: fragment.source,
      published: false,
    })
    .returning({ id: storyFragment.id });

  const fragmentId = record.id;

  // Create memory_links for entity cross-referencing
  for (const entityId of fragment.entities || []) {
    await db.insert(memoryLink).values({
      tenantId,
      fromDept: "editorial",
      toEntity: entityId,
      signalType: "observation",
      content: `Story: ${fragment.title} (${fragment.theme})`,
      sigma: fragment.sigma || "σ₁",
    });
  }

  log.info("saveFragment", { id: fragmentId, title: fragment.title, theme: fragment.theme });
  return fragmentId;
}

export async function getFragmentsByTheme(
  tenantId: string,
  theme: StoryTheme,
): Promise<any[]> {
  return db
    .select()
    .from(storyFragment)
    .where(and(
      eq(storyFragment.tenantId, tenantId),
      eq(storyFragment.theme, theme),
    ))
    .orderBy(desc(storyFragment.createdAt));
}

export async function getFragmentsForChannel(
  tenantId: string,
  channel: string,
): Promise<any[]> {
  return db
    .select()
    .from(storyFragment)
    .where(and(
      eq(storyFragment.tenantId, tenantId),
      sql`${storyFragment.channelsSuitable} @> ARRAY[${channel}]::text[]`,
      eq(storyFragment.published, false),
    ))
    .orderBy(desc(storyFragment.createdAt));
}

export async function getUnpublishedFragments(tenantId: string): Promise<any[]> {
  return db
    .select()
    .from(storyFragment)
    .where(and(
      eq(storyFragment.tenantId, tenantId),
      eq(storyFragment.published, false),
    ))
    .orderBy(desc(storyFragment.createdAt));
}

export async function markPublished(
  tenantId: string,
  fragmentId: string,
): Promise<void> {
  await db
    .update(storyFragment)
    .set({ published: true })
    .where(and(
      eq(storyFragment.tenantId, tenantId),
      eq(storyFragment.id, fragmentId),
    ));
}

export async function getFragmentsByEntity(
  tenantId: string,
  entityId: string,
): Promise<any[]> {
  return db
    .select()
    .from(storyFragment)
    .where(and(
      eq(storyFragment.tenantId, tenantId),
      sql`${storyFragment.entities} @> ARRAY[${entityId}]::text[]`,
    ))
    .orderBy(desc(storyFragment.createdAt));
}

export async function getAllFragments(tenantId: string): Promise<any[]> {
  return db
    .select()
    .from(storyFragment)
    .where(eq(storyFragment.tenantId, tenantId))
    .orderBy(desc(storyFragment.createdAt));
}

// ── storyStore namespace ────────────────────────────────────

export const storyStore = {
  save: saveFragment,
  byTheme: getFragmentsByTheme,
  forChannel: getFragmentsForChannel,
  unpublished: getUnpublishedFragments,
  markPublished,
  byEntity: getFragmentsByEntity,
  all: getAllFragments,
};
