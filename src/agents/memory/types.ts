/**
 * Agent Memory Types — V7 Monade Persistence
 *
 * V7 classifies information by entropy:
 *   σ₀ = predictable, reconstructable from DB → omit from monad
 *   σ₁ = structural, key facts/relations → slot format
 *   σ₂ = irriducible, must preserve verbatim → decisions, constraints, unique observations
 *
 * Fusion: two monads merge by UNION (sublinear growth).
 *   σ₂ from both sessions always kept.
 *   σ₁ contradictions → newer wins.
 *   σ₀ → discarded entirely.
 */

// ═══════════════════════════════════════════════════════════════
// DEPARTMENTS
// ═══════════════════════════════════════════════════════════════

export type Department = 'marketing' | 'engineering' | 'reception' | 'logistics' | 'editorial';

export const AGENT_DEPARTMENT: Record<string, Department> = {
  'story-director': 'editorial',
  'editorial-planner': 'editorial',
  'interviewer': 'editorial',
  'narrative-collector': 'editorial',
  'daily-brief': 'reception',
  'software-strategy': 'engineering',
  'orchestrator': 'logistics',
  'morning-check': 'reception',
  'outreach': 'marketing',
  'analytics': 'reception',
  'research': 'reception',
};

export type SigmaLevel = 'σ₀' | 'σ₁' | 'σ₂';

// ═══════════════════════════════════════════════════════════════
// V7 MONAD STRUCTURE (parsed form)
// ═══════════════════════════════════════════════════════════════

export interface V7Monad {
  version: '7.0';
  agentId: string;
  sessionId: string;
  department: Department;
  date: string;               // ISO date
  entities: V7Entity[];
  decisions: V7Decision[];    // σ₂ only — irriducible
  observations: V7Observation[];
  actions: V7Action[];
  raw: string;                // The actual V7 monad text
}

export interface V7Entity {
  id: string;                 // SurrealDB-style: "venue:afrogreco", "market:japan"
  type: string;               // :agency, :beach-club, :market, :person
  label: string;              // Human-readable name
  context?: string;           // @location or affiliation
  attrs: Record<string, string>;
  sigma2: string[];           // Irriducible facts about this entity
}

export interface V7Decision {
  content: string;            // Verbatim decision text (σ₂)
  entities: string[];         // Entity IDs affected
  rationale?: string;         // Why this was decided
  date: string;               // When decided
}

export interface V7Observation {
  content: string;
  sigma: 'σ₁' | 'σ₂';
  topic?: string;             // For contradiction detection during fusion
}

export interface V7Action {
  description: string;
  target?: string;            // Entity ID
  result?: string;
  date: string;
}

// ═══════════════════════════════════════════════════════════════
// SESSION DATA (input to writer)
// ═══════════════════════════════════════════════════════════════

export interface AgentSessionData {
  agentId: string;
  department: Department;
  trigger: string;            // What invoked this session ("daily-brief", "user:draft", etc.)
  entitiesTouched: V7Entity[];
  decisions: V7Decision[];
  observations: V7Observation[];
  actions: V7Action[];
}

// ═══════════════════════════════════════════════════════════════
// DB RECORDS
// ═══════════════════════════════════════════════════════════════

export interface AgentSessionRecord {
  id?: string;
  agent_id: string;
  department: Department;
  started_at: string;
  ended_at?: string;
  trigger: string;
  monad_text: string;
  entities_touched: string[];
  sigma2_count: number;
  status: 'active' | 'completed' | 'fused';
}

export interface DeptMemoryRecord {
  id?: string;
  department: Department;
  monad_text: string;
  session_count: number;
  last_fused: string;
  entities: string[];
  sigma2_decisions: string[];
}

export interface MemoryLinkRecord {
  id?: string;
  from_dept: Department | 'session' | 'identity';
  to_entity: string;
  signal_type: 'observation' | 'decision' | 'action' | 'session';
  content: string;
  sigma: SigmaLevel;
  created_at: string;
}

// ═══════════════════════════════════════════════════════════════
// QUERY RESULTS
// ═══════════════════════════════════════════════════════════════

export interface EntityMemory {
  entity: V7Entity;
  decisions: V7Decision[];
  observations: V7Observation[];
  actions: V7Action[];
  departments: Department[];  // Which departments have touched this entity
}

export interface DeptMemorySummary {
  department: Department;
  sessionCount: number;
  entityCount: number;
  sigma2Count: number;
  lastUpdated: string;
  monad: V7Monad;
}
