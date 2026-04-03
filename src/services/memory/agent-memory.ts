/**
 * Agent Memory — V7 Monade Persistence (Drizzle)
 *
 * Consolidates writer.ts + reader.ts + fuser.ts from src/agents/memory/.
 *
 * V7 classifies information by entropy:
 *   σ₀ = predictable, reconstructable → omit from monad
 *   σ₁ = structural, key facts/relations → slot format
 *   σ₂ = irriducible, must preserve verbatim → decisions, constraints
 *
 * Fusion protocol:
 *   1. Entities: Union by ID. Same entity → keep newer attrs, MERGE sigma2
 *   2. Decisions (σ₂): Always keep ALL — irriducible, never drop. Deduplicate exact matches.
 *   3. Observations: Newer contradicts older → keep newer. Otherwise union.
 *   4. Actions: Chronological union, deduplicate by (description + target).
 *
 * Migrated from: src/agents/memory/{writer,reader,fuser}.ts
 * Change: SurrealDB getDb() → Drizzle ORM, tenantId required
 */

import { db } from "../../db/client.js";
import { agentSession, deptMemory, memoryLink } from "../../db/schema.js";
import { eq, and, desc, gte, inArray } from "drizzle-orm";
import { createLogger } from "../../lib/logger.js";

const log = createLogger("agent-memory");

const FUSION_THRESHOLD = 5;

// ── Types (re-exported from types.ts) ────────────────────────

export type Department =
  | "marketing"
  | "engineering"
  | "reception"
  | "logistics"
  | "editorial"
  | "brand";

export const AGENT_DEPARTMENT: Record<string, Department> = {
  "story-director": "editorial",
  "editorial-planner": "editorial",
  "interviewer": "editorial",
  "narrative-collector": "editorial",
  "daily-brief": "reception",
  "software-strategy": "engineering",
  "orchestrator": "logistics",
  "morning-check": "reception",
  "outreach": "marketing",
  "analytics": "reception",
  "research": "reception",
  "brand-guardian": "brand",
  "brand-narrator": "brand",
  "fis-agent": "reception",
};

export type SigmaLevel = "σ₀" | "σ₁" | "σ₂";

export interface V7Entity {
  id: string;
  type: string;
  label: string;
  context?: string;
  attrs: Record<string, string>;
  sigma2: string[];
}

export interface V7Decision {
  content: string;
  entities: string[];
  rationale?: string;
  date: string;
}

export interface V7Observation {
  content: string;
  sigma: "σ₁" | "σ₂";
  topic?: string;
}

export interface V7Action {
  description: string;
  target?: string;
  result?: string;
  date: string;
}

export interface V7Monad {
  version: "7.0";
  agentId: string;
  sessionId: string;
  department: Department;
  date: string;
  entities: V7Entity[];
  decisions: V7Decision[];
  observations: V7Observation[];
  actions: V7Action[];
  raw: string;
}

export interface AgentSessionData {
  agentId: string;
  department: Department;
  trigger: string;
  entitiesTouched: V7Entity[];
  decisions: V7Decision[];
  observations: V7Observation[];
  actions: V7Action[];
}

export interface EntityMemory {
  entity: V7Entity;
  decisions: V7Decision[];
  observations: V7Observation[];
  actions: V7Action[];
  departments: Department[];
}

export interface DeptMemorySummary {
  department: Department;
  sessionCount: number;
  entityCount: number;
  sigma2Count: number;
  lastUpdated: string;
  monad: V7Monad;
}

// ═══════════════════════════════════════════════════════════════
// V7 TEXT SERIALIZER
// ═══════════════════════════════════════════════════════════════

function serializeEntity(e: V7Entity): string {
  let line = `E "${e.label}" :${e.type}`;
  if (e.context) line += ` @${e.context}`;
  line += ` [${e.id}]`;

  const lines = [line];
  for (const [key, val] of Object.entries(e.attrs)) {
    lines.push(`  .${key} = ${val}`);
  }
  for (const s2 of e.sigma2) {
    lines.push(`  σ₂ ${s2}`);
  }
  return lines.join("\n");
}

function serializeDecision(d: V7Decision): string {
  const entityRefs = d.entities.length > 0 ? ` → ${d.entities.join(", ")}` : "";
  let line = `σ₂ ${d.content}${entityRefs}`;
  if (d.rationale) line += `\n  ← ${d.rationale}`;
  return line;
}

function serializeObservation(o: V7Observation): string {
  return `${o.sigma} ${o.content}`;
}

function serializeAction(a: V7Action): string {
  let line = `X ${a.description}`;
  if (a.target) line += ` → ${a.target}`;
  if (a.result) line += ` = ${a.result}`;
  return line;
}

export function serializeToV7(session: AgentSessionData): string {
  const date = new Date().toISOString().split("T")[0];
  const lines: string[] = [];

  lines.push(`# v7.0 | ${session.agentId} | ${session.department} | ${date}`);
  lines.push("");

  if (session.entitiesTouched.length > 0) {
    lines.push("## Entities");
    for (const e of session.entitiesTouched) lines.push(serializeEntity(e));
    lines.push("");
  }

  if (session.decisions.length > 0) {
    lines.push("## Decisions");
    for (const d of session.decisions) lines.push(serializeDecision(d));
    lines.push("");
  }

  if (session.observations.length > 0) {
    lines.push("## Observations");
    for (const o of session.observations) lines.push(serializeObservation(o));
    lines.push("");
  }

  if (session.actions.length > 0) {
    lines.push("## Actions");
    for (const a of session.actions) lines.push(serializeAction(a));
    lines.push("");
  }

  return lines.join("\n");
}

export function parseV7(text: string, agentId: string, department: Department): V7Monad {
  const lines = text.split("\n");
  const entities: V7Entity[] = [];
  const decisions: V7Decision[] = [];
  const observations: V7Observation[] = [];
  const actions: V7Action[] = [];

  let currentSection = "";
  let currentEntity: V7Entity | null = null;
  let sessionId = "";
  let date = "";

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith("# v7.0")) {
      const parts = trimmed.split("|").map(s => s.trim());
      sessionId = parts[1] || agentId;
      date = parts[3] || new Date().toISOString().split("T")[0];
      continue;
    }

    if (trimmed.startsWith("## Entities")) { currentSection = "entities"; continue; }
    if (trimmed.startsWith("## Decisions")) { currentSection = "decisions"; continue; }
    if (trimmed.startsWith("## Observations")) { currentSection = "observations"; continue; }
    if (trimmed.startsWith("## Actions")) { currentSection = "actions"; continue; }

    if (!trimmed) {
      if (currentEntity) { entities.push(currentEntity); currentEntity = null; }
      continue;
    }

    if (currentSection === "entities") {
      if (trimmed.startsWith("E ")) {
        if (currentEntity) entities.push(currentEntity);
        const labelMatch = trimmed.match(/E\s+"([^"]+)"\s+:(\S+)/);
        const contextMatch = trimmed.match(/@(\S+)/);
        const idMatch = trimmed.match(/\[([^\]]+)\]/);
        currentEntity = {
          id: idMatch?.[1] || "",
          type: labelMatch?.[2] || "",
          label: labelMatch?.[1] || "",
          context: contextMatch?.[1],
          attrs: {},
          sigma2: [],
        };
      } else if (currentEntity && trimmed.startsWith(".")) {
        const eqIdx = trimmed.indexOf("=");
        if (eqIdx > 0) {
          currentEntity.attrs[trimmed.slice(1, eqIdx).trim()] = trimmed.slice(eqIdx + 1).trim();
        }
      } else if (currentEntity && trimmed.startsWith("σ₂")) {
        currentEntity.sigma2.push(trimmed.slice(3).trim());
      }
    }

    if (currentSection === "decisions" && trimmed.startsWith("σ₂")) {
      const arrowIdx = trimmed.indexOf("→");
      const content = arrowIdx > 0 ? trimmed.slice(3, arrowIdx).trim() : trimmed.slice(3).trim();
      const entityRefs = arrowIdx > 0
        ? trimmed.slice(arrowIdx + 1).trim().split(",").map(s => s.trim())
        : [];
      decisions.push({ content, entities: entityRefs, date });
    }

    if (currentSection === "observations") {
      if (trimmed.startsWith("σ₂") || trimmed.startsWith("σ₁")) {
        const sigma = trimmed.startsWith("σ₂") ? "σ₂" as const : "σ₁" as const;
        observations.push({ content: trimmed.slice(3).trim(), sigma });
      }
    }

    if (currentSection === "actions" && trimmed.startsWith("X ")) {
      const arrowIdx = trimmed.indexOf("→");
      const eqIdx = trimmed.indexOf("=", arrowIdx > 0 ? arrowIdx : 0);
      let desc = trimmed.slice(2);
      let target: string | undefined;
      let result: string | undefined;
      if (arrowIdx > 0) {
        desc = trimmed.slice(2, arrowIdx).trim();
        target = eqIdx > arrowIdx
          ? trimmed.slice(arrowIdx + 1, eqIdx).trim()
          : trimmed.slice(arrowIdx + 1).trim();
      }
      if (eqIdx > 0 && eqIdx !== arrowIdx) result = trimmed.slice(eqIdx + 1).trim();
      actions.push({ description: desc, target, result, date });
    }
  }

  if (currentEntity) entities.push(currentEntity);

  return { version: "7.0", agentId, sessionId, department, date, entities, decisions, observations, actions, raw: text };
}

// ═══════════════════════════════════════════════════════════════
// WRITER — Session Persistence
// ═══════════════════════════════════════════════════════════════

/**
 * Save an agent session to the DB.
 * Creates agentSession record + memoryLink entries for cross-department queries.
 */
export async function saveSession(
  tenantId: string,
  session: AgentSessionData,
): Promise<string> {
  const monadText = serializeToV7(session);
  const entityIds = session.entitiesTouched.map(e => e.id);

  const [record] = await db.insert(agentSession).values({
    tenantId,
    agentId: session.agentId,
    department: session.department,
    trigger: session.trigger,
    entitiesTouched: entityIds,
    decisions: session.decisions as any,
    observations: session.observations as any,
    actions: session.actions as any,
  }).returning({ id: agentSession.id });

  const sessionId = record.id;
  const now = new Date().toISOString();

  // memory_links for σ₂ decisions
  for (const decision of session.decisions) {
    for (const entityId of decision.entities) {
      await db.insert(memoryLink).values({
        tenantId,
        fromDept: session.department,
        toEntity: entityId,
        signalType: "decision",
        content: decision.content,
        sigma: "σ₂",
      });
    }
  }

  // memory_links for σ₂ observations
  for (const obs of session.observations.filter(o => o.sigma === "σ₂")) {
    for (const entity of session.entitiesTouched) {
      await db.insert(memoryLink).values({
        tenantId,
        fromDept: session.department,
        toEntity: entity.id,
        signalType: "observation",
        content: obs.content,
        sigma: "σ₂",
      });
    }
  }

  // memory_links for actions
  for (const action of session.actions) {
    if (action.target) {
      await db.insert(memoryLink).values({
        tenantId,
        fromDept: session.department,
        toEntity: action.target,
        signalType: "action",
        content: `${action.description}${action.result ? " = " + action.result : ""}`,
        sigma: "σ₁",
      });
    }
  }

  // Trigger auto-fusion if threshold exceeded
  await maybeFuse(tenantId, session.department);

  log.info("saveSession", { agentId: session.agentId, department: session.department, entities: entityIds.length });
  return sessionId;
}

// ═══════════════════════════════════════════════════════════════
// READER — Query Functions
// ═══════════════════════════════════════════════════════════════

/**
 * What do we know about a specific entity across all departments?
 */
export async function getMemoryByEntity(
  tenantId: string,
  entityId: string,
): Promise<EntityMemory | null> {
  const links = await db
    .select()
    .from(memoryLink)
    .where(and(
      eq(memoryLink.tenantId, tenantId),
      eq(memoryLink.toEntity, entityId),
    ))
    .orderBy(desc(memoryLink.createdAt));

  if (links.length === 0) return null;

  // Get sessions that touched this entity
  const sessions = await db
    .select()
    .from(agentSession)
    .where(and(
      eq(agentSession.tenantId, tenantId),
      // Postgres array contains
      eq(agentSession.id, agentSession.id), // placeholder, see below
    ));

  // Build entity from decisions/observations
  const entity: V7Entity = {
    id: entityId,
    type: "unknown",
    label: entityId,
    attrs: {},
    sigma2: links.filter(l => l.sigma === "σ₂").map(l => l.content),
  };

  const decisions: V7Decision[] = links
    .filter(l => l.signalType === "decision")
    .map(l => ({
      content: l.content,
      entities: [entityId],
      date: l.createdAt?.toISOString() || "",
    }));

  const observations: V7Observation[] = links
    .filter(l => l.signalType === "observation")
    .map(l => ({
      content: l.content,
      sigma: l.sigma === "σ₂" ? "σ₂" as const : "σ₁" as const,
    }));

  const actions: V7Action[] = links
    .filter(l => l.signalType === "action")
    .map(l => ({
      description: l.content,
      target: entityId,
      date: l.createdAt?.toISOString() || "",
    }));

  const departments = [...new Set(links.map(l => l.fromDept as Department))];

  return { entity, decisions, observations, actions, departments };
}

/**
 * Get the fused working memory for a department.
 */
export async function getDeptMemory(
  tenantId: string,
  department: Department,
): Promise<V7Monad | null> {
  const records = await db
    .select()
    .from(deptMemory)
    .where(and(
      eq(deptMemory.tenantId, tenantId),
      eq(deptMemory.department, department),
    ))
    .orderBy(desc(deptMemory.createdAt))
    .limit(1);

  const record = records[0];
  if (!record?.content) return null;

  const content = record.content as any;
  if (content.raw) {
    return parseV7(content.raw, `dept:${department}`, department);
  }

  return null;
}

/**
 * Get recent sessions for a specific agent.
 */
export async function getRecentSessions(
  tenantId: string,
  agentId: string,
  limit: number = 5,
): Promise<any[]> {
  return db
    .select()
    .from(agentSession)
    .where(and(
      eq(agentSession.tenantId, tenantId),
      eq(agentSession.agentId, agentId),
    ))
    .orderBy(desc(agentSession.createdAt))
    .limit(limit);
}

/**
 * Get the most recent session for an agent (for continuity).
 */
export async function getLastSession(
  tenantId: string,
  agentId: string,
): Promise<any | null> {
  const sessions = await getRecentSessions(tenantId, agentId, 1);
  return sessions[0] || null;
}

/**
 * Get all σ₂ decisions from the last N days.
 */
export async function getRecentDecisions(
  tenantId: string,
  days: number = 7,
): Promise<V7Decision[]> {
  const since = new Date(Date.now() - days * 86400000);

  const links = await db
    .select()
    .from(memoryLink)
    .where(and(
      eq(memoryLink.tenantId, tenantId),
      eq(memoryLink.sigma, "σ₂"),
      eq(memoryLink.signalType, "decision"),
      gte(memoryLink.createdAt, since),
    ))
    .orderBy(desc(memoryLink.createdAt));

  return links.map(l => ({
    content: l.content,
    entities: [l.toEntity],
    date: l.createdAt?.toISOString() || "",
  }));
}

/**
 * Load memory context for an agent at bootstrap time.
 */
export async function loadAgentMemory(
  tenantId: string,
  agentId: string,
  department: Department,
): Promise<{
  deptMemory: V7Monad | null;
  recentSessions: any[];
  recentDecisions: V7Decision[];
}> {
  const [dept, sessions, decisions] = await Promise.all([
    getDeptMemory(tenantId, department),
    getRecentSessions(tenantId, agentId, 3),
    getRecentDecisions(tenantId, 7),
  ]);

  return { deptMemory: dept, recentSessions: sessions, recentDecisions: decisions };
}

// ═══════════════════════════════════════════════════════════════
// FUSER — V7 Monad Fusion
// ═══════════════════════════════════════════════════════════════

function dedup(arr: string[]): string[] {
  return [...new Set(arr)];
}

function dedupDecisions(decisions: V7Decision[]): V7Decision[] {
  const seen = new Set<string>();
  return decisions.filter(d => {
    const key = d.content.trim().toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function fuseObservations(old: V7Observation[], newer: V7Observation[]): V7Observation[] {
  const newerTopics = new Set(newer.filter(o => o.topic).map(o => o.topic!));
  const result = old.filter(o => !(o.topic && newerTopics.has(o.topic)));
  result.push(...newer);

  const seen = new Set<string>();
  return result.filter(o => {
    const key = o.content.trim().toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function dedupActions(actions: V7Action[]): V7Action[] {
  const seen = new Set<string>();
  return actions.filter(a => {
    const key = `${a.description}|${a.target || ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function regenerateV7Text(
  department: Department,
  date: string,
  entities: V7Entity[],
  decisions: V7Decision[],
  observations: V7Observation[],
  actions: V7Action[],
): string {
  const lines: string[] = [];
  lines.push(`# v7.0 | dept:${department} | fused | ${date}`);
  lines.push("");

  if (entities.length > 0) {
    lines.push("## Entities");
    for (const e of entities) {
      let line = `E "${e.label}" :${e.type}`;
      if (e.context) line += ` @${e.context}`;
      line += ` [${e.id}]`;
      lines.push(line);
      for (const [k, v] of Object.entries(e.attrs)) lines.push(`  .${k} = ${v}`);
      for (const s2 of e.sigma2) lines.push(`  σ₂ ${s2}`);
    }
    lines.push("");
  }

  if (decisions.length > 0) {
    lines.push("## Decisions");
    for (const d of decisions) {
      const refs = d.entities.length > 0 ? ` → ${d.entities.join(", ")}` : "";
      lines.push(`σ₂ ${d.content}${refs}`);
      if (d.rationale) lines.push(`  ← ${d.rationale}`);
    }
    lines.push("");
  }

  if (observations.length > 0) {
    lines.push("## Observations");
    for (const o of observations) lines.push(`${o.sigma} ${o.content}`);
    lines.push("");
  }

  if (actions.length > 0) {
    lines.push("## Actions");
    for (const a of actions) {
      let line = `X ${a.description}`;
      if (a.target) line += ` → ${a.target}`;
      if (a.result) line += ` = ${a.result}`;
      lines.push(line);
    }
    lines.push("");
  }

  return lines.join("\n");
}

/**
 * Fuse two V7 monads into one. mOld is existing memory, mNew is latest session.
 */
export function fuseMonads(mOld: V7Monad, mNew: V7Monad): V7Monad {
  const department = mNew.department;
  const date = mNew.date;

  const entityMap = new Map<string, V7Entity>();
  for (const e of mOld.entities) entityMap.set(e.id, { ...e });
  for (const e of mNew.entities) {
    const existing = entityMap.get(e.id);
    if (existing) {
      entityMap.set(e.id, {
        ...e,
        attrs: { ...existing.attrs, ...e.attrs },
        sigma2: dedup([...existing.sigma2, ...e.sigma2]),
      });
    } else {
      entityMap.set(e.id, { ...e });
    }
  }

  const decisions = dedupDecisions([...mOld.decisions, ...mNew.decisions]);
  const observations = fuseObservations(mOld.observations, mNew.observations);
  const actions = dedupActions([...mOld.actions, ...mNew.actions]);
  const entities = [...entityMap.values()];
  const raw = regenerateV7Text(department, date, entities, decisions, observations, actions);

  return {
    version: "7.0",
    agentId: `dept:${department}`,
    sessionId: `fused_${date.replace(/-/g, "_")}`,
    department,
    date,
    entities,
    decisions,
    observations,
    actions,
    raw,
  };
}

/**
 * Check if a department needs fusion and run it if threshold exceeded.
 */
export async function maybeFuse(tenantId: string, department: Department): Promise<boolean> {
  // Count completed sessions
  const sessions = await db
    .select()
    .from(agentSession)
    .where(and(
      eq(agentSession.tenantId, tenantId),
      eq(agentSession.department, department),
    ))
    .orderBy(agentSession.createdAt);

  const totalSessions = sessions.length;

  // Get current dept memory to know how many already fused
  const memRecords = await db
    .select()
    .from(deptMemory)
    .where(and(
      eq(deptMemory.tenantId, tenantId),
      eq(deptMemory.department, department),
    ))
    .orderBy(desc(deptMemory.createdAt))
    .limit(1);

  const currentMem = memRecords[0];
  const currentContent = currentMem?.content as any;
  const fusedCount = currentContent?.sessionCount || 0;
  const unfusedCount = totalSessions - fusedCount;

  if (unfusedCount < FUSION_THRESHOLD) return false;

  // Build initial monad
  let fused: V7Monad = currentContent?.raw
    ? parseV7(currentContent.raw, `dept:${department}`, department)
    : {
        version: "7.0",
        agentId: `dept:${department}`,
        sessionId: "fused_init",
        department,
        date: new Date().toISOString().split("T")[0],
        entities: [],
        decisions: [],
        observations: [],
        actions: [],
        raw: "",
      };

  const sessionsToFuse = sessions.slice(fusedCount);
  for (const session of sessionsToFuse) {
    if (!session.decisions && !session.observations && !session.actions) continue;

    // Build a minimal V7Monad from DB fields
    const sessionMonad: V7Monad = {
      version: "7.0",
      agentId: session.agentId,
      sessionId: session.id,
      department,
      date: session.createdAt?.toISOString().split("T")[0] || new Date().toISOString().split("T")[0],
      entities: [],
      decisions: (session.decisions as V7Decision[]) || [],
      observations: (session.observations as V7Observation[]) || [],
      actions: (session.actions as V7Action[]) || [],
      raw: "",
    };

    fused = fuseMonads(fused, sessionMonad);
  }

  const contentToSave = {
    raw: fused.raw,
    sessionCount: totalSessions,
    entities: fused.entities.map(e => e.id),
    sigma2: fused.decisions.map(d => d.content),
  };

  if (currentMem) {
    await db.insert(deptMemory).values({
      tenantId,
      department,
      content: contentToSave as any,
      mergedFrom: sessions.slice(fusedCount).map(s => s.id),
    });
  } else {
    await db.insert(deptMemory).values({
      tenantId,
      department,
      content: contentToSave as any,
      mergedFrom: sessions.slice(fusedCount).map(s => s.id),
    });
  }

  log.info("maybeFuse", {
    department,
    fused: sessionsToFuse.length,
    entities: fused.entities.length,
    sigma2: fused.decisions.length,
  });

  return true;
}

// ── Memory namespace ─────────────────────────────────────────

export const agentMemory = {
  save: saveSession,
  load: loadAgentMemory,
  fuse: maybeFuse,
  getByEntity: getMemoryByEntity,
  getDeptMemory,
  getRecentSessions,
  getLastSession,
  getRecentDecisions,
  parseV7,
  serializeToV7,
  fuseMonads,
  AGENT_DEPARTMENT,
};
