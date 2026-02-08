/**
 * V7 Monad Writer — Session → V7 compressed text
 *
 * Serializes an agent session into V7 monade format.
 * V7 = tessuto collassato: entities appear when they first ACT,
 * σ₀ omitted, σ₁ slotted, σ₂ verbatim.
 *
 * Also persists to SurrealDB (agent_session + memory_link tables).
 */

import { getDb } from '../../db/client.js';
import type {
  AgentSessionData,
  AgentSessionRecord,
  V7Monad,
  V7Entity,
  V7Decision,
  V7Observation,
  V7Action,
  Department,
  MemoryLinkRecord,
} from './types.js';

// ═══════════════════════════════════════════════════════════════
// V7 TEXT SERIALIZER
// ═══════════════════════════════════════════════════════════════

function generateSessionId(): string {
  const now = new Date();
  const date = now.toISOString().split('T')[0].replace(/-/g, '_');
  const rand = Math.random().toString(36).slice(2, 6);
  return `${date}_${rand}`;
}

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

  return lines.join('\n');
}

function serializeDecision(d: V7Decision): string {
  const entityRefs = d.entities.length > 0 ? ` → ${d.entities.join(', ')}` : '';
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

/**
 * Serialize a session into V7 monad text.
 */
export function serializeToV7(session: AgentSessionData): string {
  const date = new Date().toISOString().split('T')[0];
  const lines: string[] = [];

  // Header
  lines.push(`# v7.0 | ${session.agentId} | ${session.department} | ${date}`);
  lines.push('');

  // Entities
  if (session.entitiesTouched.length > 0) {
    lines.push('## Entities');
    for (const e of session.entitiesTouched) {
      lines.push(serializeEntity(e));
    }
    lines.push('');
  }

  // Decisions (σ₂)
  if (session.decisions.length > 0) {
    lines.push('## Decisions');
    for (const d of session.decisions) {
      lines.push(serializeDecision(d));
    }
    lines.push('');
  }

  // Observations (σ₁ + σ₂)
  if (session.observations.length > 0) {
    lines.push('## Observations');
    for (const o of session.observations) {
      lines.push(serializeObservation(o));
    }
    lines.push('');
  }

  // Actions
  if (session.actions.length > 0) {
    lines.push('## Actions');
    for (const a of session.actions) {
      lines.push(serializeAction(a));
    }
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Parse V7 monad text back into structured form.
 */
export function parseV7(text: string, agentId: string, department: Department): V7Monad {
  const lines = text.split('\n');
  const entities: V7Entity[] = [];
  const decisions: V7Decision[] = [];
  const observations: V7Observation[] = [];
  const actions: V7Action[] = [];

  let currentSection = '';
  let currentEntity: V7Entity | null = null;
  let sessionId = '';
  let date = '';

  for (const line of lines) {
    const trimmed = line.trim();

    // Header
    if (trimmed.startsWith('# v7.0')) {
      const parts = trimmed.split('|').map(s => s.trim());
      sessionId = parts[1] || agentId;
      date = parts[3] || new Date().toISOString().split('T')[0];
      continue;
    }

    // Section markers
    if (trimmed.startsWith('## Entities')) { currentSection = 'entities'; continue; }
    if (trimmed.startsWith('## Decisions')) { currentSection = 'decisions'; continue; }
    if (trimmed.startsWith('## Observations')) { currentSection = 'observations'; continue; }
    if (trimmed.startsWith('## Actions')) { currentSection = 'actions'; continue; }

    if (!trimmed) {
      if (currentEntity) {
        entities.push(currentEntity);
        currentEntity = null;
      }
      continue;
    }

    if (currentSection === 'entities') {
      if (trimmed.startsWith('E ')) {
        // Save previous entity
        if (currentEntity) entities.push(currentEntity);

        // Parse: E "label" :type @context [id]
        const labelMatch = trimmed.match(/E\s+"([^"]+)"\s+:(\S+)/);
        const contextMatch = trimmed.match(/@(\S+)/);
        const idMatch = trimmed.match(/\[([^\]]+)\]/);

        currentEntity = {
          id: idMatch?.[1] || '',
          type: labelMatch?.[2] || '',
          label: labelMatch?.[1] || '',
          context: contextMatch?.[1],
          attrs: {},
          sigma2: [],
        };
      } else if (currentEntity && trimmed.startsWith('.')) {
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx > 0) {
          const key = trimmed.slice(1, eqIdx).trim();
          const val = trimmed.slice(eqIdx + 1).trim();
          currentEntity.attrs[key] = val;
        }
      } else if (currentEntity && trimmed.startsWith('σ₂')) {
        currentEntity.sigma2.push(trimmed.slice(3).trim());
      }
    }

    if (currentSection === 'decisions' && trimmed.startsWith('σ₂')) {
      const arrowIdx = trimmed.indexOf('→');
      const content = arrowIdx > 0 ? trimmed.slice(3, arrowIdx).trim() : trimmed.slice(3).trim();
      const entityRefs = arrowIdx > 0 ? trimmed.slice(arrowIdx + 1).trim().split(',').map(s => s.trim()) : [];
      decisions.push({ content, entities: entityRefs, date });
    }

    if (currentSection === 'observations') {
      if (trimmed.startsWith('σ₂') || trimmed.startsWith('σ₁')) {
        const sigma = trimmed.startsWith('σ₂') ? 'σ₂' as const : 'σ₁' as const;
        observations.push({ content: trimmed.slice(3).trim(), sigma });
      }
    }

    if (currentSection === 'actions' && trimmed.startsWith('X ')) {
      const arrowIdx = trimmed.indexOf('→');
      const eqIdx = trimmed.indexOf('=', arrowIdx > 0 ? arrowIdx : 0);
      let desc = trimmed.slice(2);
      let target: string | undefined;
      let result: string | undefined;

      if (arrowIdx > 0) {
        desc = trimmed.slice(2, arrowIdx).trim();
        target = eqIdx > arrowIdx
          ? trimmed.slice(arrowIdx + 1, eqIdx).trim()
          : trimmed.slice(arrowIdx + 1).trim();
      }
      if (eqIdx > 0 && eqIdx !== arrowIdx) {
        result = trimmed.slice(eqIdx + 1).trim();
      }

      actions.push({ description: desc, target, result, date });
    }
  }

  // Push last entity if any
  if (currentEntity) entities.push(currentEntity);

  return {
    version: '7.0',
    agentId,
    sessionId,
    department,
    date,
    entities,
    decisions,
    observations,
    actions,
    raw: text,
  };
}

// ═══════════════════════════════════════════════════════════════
// PERSISTENCE
// ═══════════════════════════════════════════════════════════════

/**
 * Save an agent session to SurrealDB.
 * Creates agent_session record + memory_link entries for cross-department queries.
 */
export async function saveSession(session: AgentSessionData): Promise<string> {
  const db = await getDb();
  const sessionId = generateSessionId();
  const monadText = serializeToV7(session);
  const now = new Date().toISOString();

  const entityIds = session.entitiesTouched.map(e => e.id);
  const dbId = `${session.agentId.replace(/[^a-zA-Z0-9]/g, '_')}_${sessionId}`;

  // Save session record
  await db.query(`
    UPSERT type::thing("agent_session", $id) SET
      agent_id = $agentId,
      department = $dept,
      started_at = type::datetime($now),
      trigger = $trigger,
      monad_text = $monadText,
      entities_touched = $entities,
      sigma2_count = $sigma2Count,
      status = 'completed'
  `, {
    id: dbId,
    agentId: session.agentId,
    dept: session.department,
    now,
    trigger: session.trigger,
    monadText,
    entities: entityIds,
    sigma2Count: session.decisions.length,
  });

  // Create memory_links for cross-department intelligence
  for (const decision of session.decisions) {
    for (const entityId of decision.entities) {
      const linkId = `${session.department}_${entityId.replace(/[^a-zA-Z0-9]/g, '_')}_${sessionId}`;
      await db.query(`
        UPSERT type::thing("memory_link", $id) SET
          from_dept = $dept,
          to_entity = $entity,
          signal_type = 'decision',
          content = $content,
          sigma = 'σ₂',
          created_at = type::datetime($now)
      `, {
        id: linkId,
        dept: session.department,
        entity: entityId,
        content: decision.content,
        now,
      });
    }
  }

  // Links for σ₂ observations
  for (const obs of session.observations.filter(o => o.sigma === 'σ₂')) {
    for (const entity of session.entitiesTouched) {
      const linkId = `obs_${entity.id.replace(/[^a-zA-Z0-9]/g, '_')}_${sessionId}`;
      await db.query(`
        UPSERT type::thing("memory_link", $id) SET
          from_dept = $dept,
          to_entity = $entity,
          signal_type = 'observation',
          content = $content,
          sigma = 'σ₂',
          created_at = type::datetime($now)
      `, {
        id: linkId,
        dept: session.department,
        entity: entity.id,
        content: obs.content,
        now,
      });
    }
  }

  // Links for actions
  for (const action of session.actions) {
    if (action.target) {
      const linkId = `act_${action.target.replace(/[^a-zA-Z0-9]/g, '_')}_${sessionId}`;
      await db.query(`
        UPSERT type::thing("memory_link", $id) SET
          from_dept = $dept,
          to_entity = $entity,
          signal_type = 'action',
          content = $content,
          sigma = 'σ₁',
          created_at = type::datetime($now)
      `, {
        id: linkId,
        dept: session.department,
        entity: action.target,
        content: `${action.description}${action.result ? ' = ' + action.result : ''}`,
        now,
      });
    }
  }

  return sessionId;
}
