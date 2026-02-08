/**
 * Analysis Session Queries
 * Track and manage analysis sessions for agent context
 */

import { getDb } from '../client.js';

export interface AnalysisSession {
  id?: string;
  session_name: string;
  description?: string;
  session_type: 'hashtag_research' | 'audience_snapshot' | 'editorial_prep' | 'general';
  agent_id?: string;
  api_calls_made: number;
  started_at: string;
  completed_at?: string;
  findings_summary?: string;
}

/**
 * Start a new analysis session
 */
export async function startSession(
  sessionName: string,
  sessionType: AnalysisSession['session_type'] = 'general',
  description?: string,
  agentId?: string
): Promise<string> {
  const db = await getDb();

  const result = await db.query<[{ id: string }[]]>(`
    CREATE analysis_session CONTENT {
      session_name: $name,
      session_type: $type,
      description: $desc,
      agent_id: $agent,
      api_calls_made: 0,
      started_at: time::now()
    }
  `, {
    name: sessionName,
    type: sessionType,
    desc: description,
    agent: agentId
  });

  const id = result[0]?.[0]?.id;
  console.log(`📊 Started analysis session: ${sessionName} (${id})`);
  return id;
}

/**
 * End an analysis session
 */
export async function endSession(
  sessionId: string,
  findingsSummary?: string
): Promise<void> {
  const db = await getDb();

  await db.query(`
    UPDATE $id SET
      completed_at = time::now(),
      findings_summary = $summary
  `, {
    id: sessionId,
    summary: findingsSummary
  });

  console.log(`✅ Completed analysis session: ${sessionId}`);
}

/**
 * Increment API call count for session
 */
export async function incrementApiCalls(sessionId: string): Promise<void> {
  const db = await getDb();

  await db.query(`
    UPDATE $id SET api_calls_made += 1
  `, { id: sessionId });
}

/**
 * Get latest session of a type
 */
export async function getLatestSession(
  sessionType?: AnalysisSession['session_type']
): Promise<AnalysisSession | null> {
  const db = await getDb();

  const query = sessionType
    ? `SELECT * FROM analysis_session WHERE session_type = $type ORDER BY started_at DESC LIMIT 1`
    : `SELECT * FROM analysis_session ORDER BY started_at DESC LIMIT 1`;

  const result = await db.query<[AnalysisSession[]]>(query, { type: sessionType });
  return result[0]?.[0] || null;
}

/**
 * Get all sessions within date range
 */
export async function getSessions(
  startDate?: Date,
  endDate?: Date
): Promise<AnalysisSession[]> {
  const db = await getDb();

  let query = 'SELECT * FROM analysis_session';
  const params: Record<string, any> = {};

  if (startDate && endDate) {
    query += ' WHERE started_at >= $start AND started_at <= $end';
    params.start = startDate.toISOString();
    params.end = endDate.toISOString();
  } else if (startDate) {
    query += ' WHERE started_at >= $start';
    params.start = startDate.toISOString();
  }

  query += ' ORDER BY started_at DESC';

  const result = await db.query<[AnalysisSession[]]>(query, params);
  return result[0] || [];
}
