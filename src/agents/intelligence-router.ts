/**
 * Intelligence Router — Event→Action Dispatcher
 *
 * When events happen (reply received, gig confirmed, morning check),
 * this router determines what intelligence to generate and which
 * departments to activate.
 *
 * Architecture:
 *   Event (e.g. "reply from Portugal venue")
 *     → Router classifies event
 *       → Dispatches to department modules
 *         → Each module produces IntelligenceBriefing
 *           → Briefings persisted to memory_link (σ₂ decisions)
 *           → Briefings returned for display / Telegram
 *
 * Integration points:
 *   - morning-check.ts → calls routeReplyEvent() after detecting replies
 *   - Claude Code sessions → calls generateBriefing() on demand
 *   - Any script → calls routeEvent() with typed event
 */

import { getDb } from '../db/client.js';

// ── Event Types ──

export type EventType =
  | 'reply_received'
  | 'email_sent'
  | 'gig_confirmed'
  | 'research_completed'
  | 'morning_check'
  | 'session_start';

export interface IntelligenceEvent {
  type: EventType;
  venue?: string;
  venueEmail?: string;
  country?: string;
  replyType?: 'human_reply' | 'auto_reply' | 'bounce';
  replyPreview?: string;
  metadata?: Record<string, any>;
}

// ── Briefing Output ──

export interface LogisticsBriefing {
  travelRequired: boolean;
  origin: string;           // "Varese, Italy"
  destination: string;      // "Comporta, Portugal"
  country: string;
  estimatedFlightCost: string;
  estimatedBaggageCost: string;
  estimatedAccommodation: string;
  estimatedTransportLocal: string;
  totalEstimate: { min: number; max: number };
  breakEven: { gigs: number; feePerGig: number };
  equipmentNotes: string;
}

export interface ClusterBriefing {
  nearbyVenues: {
    name: string;
    location: string;
    distanceFromTarget: string;
    email: string | null;
    status: 'contacted' | 'replied' | 'uncontacted' | 'bounced';
    category: string;
  }[];
  clusterViability: 'strong' | 'moderate' | 'weak';
  contactable: number;
  totalInArea: number;
  recommendation: string;
}

export interface ConversationBriefing {
  venue: string;
  email: string;
  status: string;
  messageCount: number;
  lastMessageDirection: 'sent' | 'received';
  lastMessagePreview: string;
  daysSinceLastActivity: number;
  suggestedAction: string;
}

export interface IntelligenceBriefing {
  event: IntelligenceEvent;
  timestamp: string;
  logistics?: LogisticsBriefing;
  cluster?: ClusterBriefing;
  conversation?: ConversationBriefing;
  recommendations: string[];
  urgency: 'high' | 'medium' | 'low';
}

// ── Home base (σ₂) ──

const HOME_BASE = {
  city: 'Varese',
  country: 'Italy',
  nearestAirports: ['MXP', 'BGY'],
};

// Countries reachable without flight (driving/train reasonable)
const NO_FLIGHT_COUNTRIES = new Set(['Italy', 'italy', 'Switzerland', 'switzerland']);

// ── Core Router ──

/**
 * Route an event through the intelligence system.
 * Returns a briefing with logistics, cluster, and conversation intelligence.
 */
export async function routeEvent(event: IntelligenceEvent): Promise<IntelligenceBriefing> {
  const briefing: IntelligenceBriefing = {
    event,
    timestamp: new Date().toISOString(),
    recommendations: [],
    urgency: 'low',
  };

  switch (event.type) {
    case 'reply_received':
      await handleReplyReceived(event, briefing);
      break;
    case 'morning_check':
      await handleMorningCheck(event, briefing);
      break;
    case 'session_start':
      await handleSessionStart(event, briefing);
      break;
    default:
      // Other event types — generate basic briefing
      break;
  }

  // Persist briefing as memory_link
  await persistBriefing(briefing);

  return briefing;
}

/**
 * Convenience: route a reply event directly from morning-check or conversation-store.
 */
export async function routeReplyEvent(
  venue: string,
  venueEmail: string,
  replyType: 'human_reply' | 'auto_reply' | 'bounce',
  replyPreview: string,
): Promise<IntelligenceBriefing> {
  // Determine country from venue DB record
  const country = await getVenueCountry(venueEmail);

  return routeEvent({
    type: 'reply_received',
    venue,
    venueEmail,
    country: country || undefined,
    replyType,
    replyPreview,
  });
}

// ── Event Handlers ──

async function handleReplyReceived(event: IntelligenceEvent, briefing: IntelligenceBriefing) {
  const { venue, venueEmail, country, replyType } = event;

  if (replyType === 'bounce') {
    briefing.urgency = 'low';
    briefing.recommendations.push(`Bounced email to ${venue}. Mark as invalid and find alternative contact.`);
    return;
  }

  if (replyType === 'auto_reply') {
    briefing.urgency = 'low';
    briefing.recommendations.push(`Auto-reply from ${venue}. No action needed — wait for human response.`);
    return;
  }

  // Human reply — full intelligence
  briefing.urgency = 'high';

  // 1. Conversation context
  if (venueEmail) {
    briefing.conversation = await buildConversationBriefing(venue || '', venueEmail);
  }

  // 2. Logistics (if travel required)
  if (country && !NO_FLIGHT_COUNTRIES.has(country)) {
    briefing.logistics = buildLogisticsBriefing(country, venue || '');
    briefing.recommendations.push(
      `TRAVEL REQUIRED: ${country}. Estimated cost: €${briefing.logistics.totalEstimate.min}-${briefing.logistics.totalEstimate.max}. ` +
      `Need ${briefing.logistics.breakEven.gigs} gigs at €${briefing.logistics.breakEven.feePerGig} to break even.`
    );
  }

  // 3. Cluster opportunities
  if (venueEmail) {
    briefing.cluster = await buildClusterBriefing(venueEmail, country || '');
    if (briefing.cluster.clusterViability !== 'weak') {
      briefing.recommendations.push(
        `CLUSTER: ${briefing.cluster.contactable} contactable venues near ${venue} (${briefing.cluster.totalInArea} total). ` +
        `${briefing.cluster.recommendation}`
      );
    }
  }

  // 4. Action recommendation
  if (briefing.conversation?.suggestedAction) {
    briefing.recommendations.push(briefing.conversation.suggestedAction);
  }
}

async function handleMorningCheck(_event: IntelligenceEvent, briefing: IntelligenceBriefing) {
  // Check for pending actions across all conversations
  const db = await getDb();

  const [activeConvos] = await db.query(`
    SELECT venue, from_email, reply_type, preview, received_at
    FROM outreach_reply
    WHERE reply_type = 'human_reply'
    ORDER BY received_at DESC
    LIMIT 10
  `);

  const replies = (activeConvos as any[]) || [];
  if (replies.length > 0) {
    briefing.urgency = 'medium';
    briefing.recommendations.push(`${replies.length} human replies in system. Check conversation dashboard for action items.`);
  }
}

async function handleSessionStart(_event: IntelligenceEvent, briefing: IntelligenceBriefing) {
  const db = await getDb();

  // Load recent σ₂ decisions
  const [decisions] = await db.query(`
    SELECT content, to_entity, created_at FROM memory_link
    WHERE sigma = 'σ₂' AND signal_type = 'decision'
    ORDER BY created_at DESC LIMIT 10
  `);

  // Check for pending reply actions
  const [pendingReplies] = await db.query(`
    SELECT venue, from_email, reply_type, received_at FROM outreach_reply
    WHERE reply_type = 'human_reply'
    ORDER BY received_at DESC LIMIT 5
  `);

  const recentDecisions = (decisions as any[]) || [];
  const pending = (pendingReplies as any[]) || [];

  if (recentDecisions.length > 0) {
    briefing.recommendations.push(`${recentDecisions.length} recent σ₂ decisions. Latest: ${recentDecisions[0]?.content?.slice(0, 100)}`);
  }

  if (pending.length > 0) {
    briefing.urgency = 'medium';
    briefing.recommendations.push(`${pending.length} venues with human replies need attention.`);
  }
}

// ── Department Modules ──

function buildLogisticsBriefing(country: string, venue: string): LogisticsBriefing {
  // Cost estimates by region (σ₁ — updated periodically)
  const costByRegion: Record<string, {
    flight: [number, number]; baggage: [number, number];
    accommodation: [number, number]; localTransport: [number, number];
    fee: number;
  }> = {
    'Portugal': { flight: [100, 180], baggage: [100, 270], accommodation: [200, 400], localTransport: [100, 150], fee: 400 },
    'Greece': { flight: [80, 150], baggage: [100, 270], accommodation: [150, 350], localTransport: [80, 120], fee: 400 },
    'Spain': { flight: [60, 140], baggage: [100, 270], accommodation: [150, 350], localTransport: [80, 130], fee: 400 },
    'Indonesia': { flight: [400, 700], baggage: [100, 200], accommodation: [100, 250], localTransport: [50, 100], fee: 500 },
    'Croatia': { flight: [80, 160], baggage: [100, 270], accommodation: [120, 300], localTransport: [80, 120], fee: 400 },
    'France': { flight: [60, 130], baggage: [100, 270], accommodation: [200, 450], localTransport: [100, 150], fee: 450 },
    'Germany': { flight: [50, 120], baggage: [100, 270], accommodation: [120, 300], localTransport: [80, 120], fee: 400 },
  };

  const costs = costByRegion[country] || {
    flight: [100, 200], baggage: [100, 270], accommodation: [150, 400], localTransport: [80, 150], fee: 400,
  };

  const totalMin = costs.flight[0] + costs.baggage[0] + costs.accommodation[0] + costs.localTransport[0];
  const totalMax = costs.flight[1] + costs.baggage[1] + costs.accommodation[1] + costs.localTransport[1];
  const breakEvenGigs = Math.ceil(totalMax / costs.fee);

  return {
    travelRequired: true,
    origin: `${HOME_BASE.city}, ${HOME_BASE.country}`,
    destination: `${venue}, ${country}`,
    country,
    estimatedFlightCost: `€${costs.flight[0]}-${costs.flight[1]} RT`,
    estimatedBaggageCost: `€${costs.baggage[0]}-${costs.baggage[1]} (2-3 bags × 15-23kg)`,
    estimatedAccommodation: `€${costs.accommodation[0]}-${costs.accommodation[1]} (3-5 nights)`,
    estimatedTransportLocal: `€${costs.localTransport[0]}-${costs.localTransport[1]} (car rental)`,
    totalEstimate: { min: totalMin, max: totalMax },
    breakEven: { gigs: breakEvenGigs, feePerGig: costs.fee },
    equipmentNotes: 'RAV Vast can go cabin on easyJet (30×117×38cm). Min: 2 checked bags. Full rig: 3 bags.',
  };
}

async function buildClusterBriefing(venueEmail: string, country: string): Promise<ClusterBriefing> {
  const db = await getDb();

  // Find venue location
  const [venueRows] = await db.query(`
    SELECT name, location, country FROM venue
    WHERE contact_email = $email
    LIMIT 1
  `, { email: venueEmail });
  const venueData = (venueRows as any[])?.[0];

  // Find nearby venues (same country)
  const targetCountry = country || venueData?.country || '';
  if (!targetCountry) {
    return { nearbyVenues: [], clusterViability: 'weak', contactable: 0, totalInArea: 0, recommendation: 'No country data available.' };
  }

  const [nearbyRows] = await db.query(`
    SELECT name, location, category, sub_category, contact_email, status FROM venue
    WHERE country = $country AND contact_email != $email
    ORDER BY name ASC
  `, { country: targetCountry, email: venueEmail });
  const nearby = (nearbyRows as any[]) || [];

  // Check which have been contacted
  const emails = nearby.filter(v => v.contact_email).map(v => v.contact_email);
  const [sentRows] = await db.query(`
    SELECT to_address, bounced, reply_received, reply_type FROM email
    WHERE to_address IN $emails
  `, { emails });
  const sentMap = new Map<string, any>();
  for (const s of (sentRows as any[]) || []) {
    sentMap.set(s.to_address, s);
  }

  const nearbyVenues = nearby.map(v => {
    const sent = sentMap.get(v.contact_email);
    let status: 'contacted' | 'replied' | 'uncontacted' | 'bounced' = 'uncontacted';
    if (sent?.bounced) status = 'bounced';
    else if (sent?.reply_received) status = 'replied';
    else if (sent) status = 'contacted';

    return {
      name: v.name,
      location: v.location || '',
      distanceFromTarget: '', // Would need geocoding for real distances
      email: v.contact_email || null,
      status,
      category: v.category || v.sub_category || '',
    };
  });

  const contactable = nearbyVenues.filter(v => v.email && v.status !== 'bounced').length;
  const totalInArea = nearbyVenues.length;
  const uncontacted = nearbyVenues.filter(v => v.email && v.status === 'uncontacted').length;

  let viability: 'strong' | 'moderate' | 'weak' = 'weak';
  if (contactable >= 10) viability = 'strong';
  else if (contactable >= 5) viability = 'moderate';

  let recommendation = '';
  if (viability === 'strong') {
    recommendation = `Strong cluster: ${uncontacted} uncontacted venues with email. Launch batch outreach to stack dates.`;
  } else if (viability === 'moderate') {
    recommendation = `Moderate cluster: ${uncontacted} uncontacted venues. Research more venues to strengthen the cluster.`;
  } else {
    recommendation = `Weak cluster: only ${contactable} contactable venues. Deep research needed before committing to travel.`;
  }

  return { nearbyVenues, clusterViability: viability, contactable, totalInArea, recommendation };
}

async function buildConversationBriefing(venue: string, email: string): Promise<ConversationBriefing> {
  const db = await getDb();

  // Get sent emails
  const [sentRows] = await db.query(`
    SELECT subject, sent_at, email_type FROM email
    WHERE to_address = $email
    ORDER BY sent_at ASC
  `, { email });
  const sent = (sentRows as any[]) || [];

  // Get replies
  const domain = email.split('@')[1]?.toLowerCase();
  const [replyRows] = await db.query(`
    SELECT preview, received_at, reply_type, from_email FROM outreach_reply
    WHERE from_domain = $domain
    ORDER BY received_at ASC
  `, { domain });
  const replies = (replyRows as any[]) || [];

  const totalMessages = sent.length + replies.length;
  const lastSent = sent[sent.length - 1];
  const lastReply = replies[replies.length - 1];

  let lastDir: 'sent' | 'received' = 'sent';
  let lastPreview = '';
  let lastDate = new Date();

  if (lastReply && lastSent) {
    const replyDate = new Date(lastReply.received_at);
    const sentDate = new Date(lastSent.sent_at);
    if (replyDate > sentDate) {
      lastDir = 'received';
      lastPreview = lastReply.preview || '';
      lastDate = replyDate;
    } else {
      lastDir = 'sent';
      lastPreview = lastSent.subject || '';
      lastDate = sentDate;
    }
  } else if (lastReply) {
    lastDir = 'received';
    lastPreview = lastReply.preview || '';
    lastDate = new Date(lastReply.received_at);
  } else if (lastSent) {
    lastDir = 'sent';
    lastPreview = lastSent.subject || '';
    lastDate = new Date(lastSent.sent_at);
  }

  const daysSince = Math.floor((Date.now() - lastDate.getTime()) / 86400000);

  // Determine suggested action
  let suggestedAction = '';
  const hasHumanReply = replies.some(r => r.reply_type === 'human_reply');

  if (hasHumanReply && lastDir === 'received') {
    suggestedAction = `REPLY NEEDED: ${venue} sent a human reply ${daysSince}d ago. Draft and send response.`;
  } else if (hasHumanReply && lastDir === 'sent') {
    suggestedAction = `Ball in their court. Last message was ours (${daysSince}d ago). Wait or follow up if >7 days.`;
  } else if (!hasHumanReply && daysSince >= 7 && sent.length === 1) {
    suggestedAction = `No reply after ${daysSince} days. Send follow-up email.`;
  }

  return {
    venue: venue || domain,
    email,
    status: hasHumanReply ? (lastDir === 'received' ? 'awaiting_our_reply' : 'awaiting_their_reply') : 'no_reply',
    messageCount: totalMessages,
    lastMessageDirection: lastDir,
    lastMessagePreview: lastPreview.slice(0, 200),
    daysSinceLastActivity: daysSince,
    suggestedAction,
  };
}

// ── Helpers ──

async function getVenueCountry(email: string): Promise<string | null> {
  const db = await getDb();
  const [rows] = await db.query(`
    SELECT country FROM venue WHERE contact_email = $email LIMIT 1
  `, { email });
  return (rows as any[])?.[0]?.country || null;
}

async function persistBriefing(briefing: IntelligenceBriefing) {
  if (briefing.recommendations.length === 0) return;

  const db = await getDb();
  const id = `briefing_${Date.now()}`;
  const entity = briefing.event.venue
    ? `venue:${briefing.event.venue.toLowerCase().replace(/[^a-z0-9]/g, '_')}`
    : 'system:morning_check';

  await db.query(`
    UPSERT type::thing("memory_link", $id) SET
      from_dept = 'logistics',
      to_entity = $entity,
      signal_type = 'action',
      sigma = 'σ₁',
      content = $content,
      created_at = time::now()
  `, {
    id,
    entity,
    content: `Intelligence briefing [${briefing.urgency}]: ${briefing.recommendations.join(' | ')}`,
  });
}

// ── Formatters ──

/**
 * Format a briefing for Telegram notification.
 */
export function formatBriefingForTelegram(briefing: IntelligenceBriefing): string {
  const lines: string[] = [];
  const emoji = briefing.urgency === 'high' ? '🔴' : briefing.urgency === 'medium' ? '🟡' : '🟢';

  lines.push(`${emoji} *INTELLIGENCE BRIEFING*`);
  lines.push(`Event: ${briefing.event.type} — ${briefing.event.venue || 'system'}\n`);

  if (briefing.conversation) {
    const c = briefing.conversation;
    lines.push(`📧 *Conversation:* ${c.venue} (${c.email})`);
    lines.push(`   Status: ${c.status} | ${c.messageCount} messages | ${c.daysSinceLastActivity}d ago`);
    lines.push(`   Last: ${c.lastMessageDirection === 'sent' ? '→' : '←'} ${c.lastMessagePreview.slice(0, 100)}`);
    lines.push('');
  }

  if (briefing.logistics) {
    const l = briefing.logistics;
    lines.push(`✈️ *Logistics:* ${l.origin} → ${l.destination}`);
    lines.push(`   Flight: ${l.estimatedFlightCost}`);
    lines.push(`   Baggage: ${l.estimatedBaggageCost}`);
    lines.push(`   Accommodation: ${l.estimatedAccommodation}`);
    lines.push(`   Local transport: ${l.estimatedTransportLocal}`);
    lines.push(`   *TOTAL: €${l.totalEstimate.min}-${l.totalEstimate.max}*`);
    lines.push(`   Break-even: ${l.breakEven.gigs} gigs at €${l.breakEven.feePerGig}`);
    lines.push(`   ⚠️ ${l.equipmentNotes}`);
    lines.push('');
  }

  if (briefing.cluster) {
    const cl = briefing.cluster;
    lines.push(`📍 *Cluster [${cl.clusterViability}]:* ${cl.contactable} contactable / ${cl.totalInArea} total`);
    lines.push(`   ${cl.recommendation}`);
    if (cl.nearbyVenues.length > 0) {
      const uncontacted = cl.nearbyVenues.filter(v => v.status === 'uncontacted' && v.email);
      if (uncontacted.length > 0) {
        lines.push(`   Uncontacted with email:`);
        for (const v of uncontacted.slice(0, 5)) {
          lines.push(`     • ${v.name} (${v.location}) — ${v.category}`);
        }
        if (uncontacted.length > 5) lines.push(`     ... +${uncontacted.length - 5} more`);
      }
    }
    lines.push('');
  }

  if (briefing.recommendations.length > 0) {
    lines.push(`🎯 *Actions:*`);
    for (const r of briefing.recommendations) {
      lines.push(`   • ${r}`);
    }
  }

  return lines.join('\n');
}

/**
 * Format a briefing for console output.
 */
export function formatBriefingForConsole(briefing: IntelligenceBriefing): string {
  const lines: string[] = [];
  const bar = '═'.repeat(60);

  lines.push(bar);
  lines.push(`INTELLIGENCE BRIEFING [${briefing.urgency.toUpperCase()}]`);
  lines.push(`Event: ${briefing.event.type} — ${briefing.event.venue || 'system'}`);
  lines.push(bar);

  if (briefing.logistics) {
    const l = briefing.logistics;
    lines.push(`\n✈️  LOGISTICS: ${l.origin} → ${l.destination}`);
    lines.push(`    Flight:        ${l.estimatedFlightCost}`);
    lines.push(`    Baggage:       ${l.estimatedBaggageCost}`);
    lines.push(`    Accommodation: ${l.estimatedAccommodation}`);
    lines.push(`    Local:         ${l.estimatedTransportLocal}`);
    lines.push(`    ─────────────────────────`);
    lines.push(`    TOTAL:         €${l.totalEstimate.min}-${l.totalEstimate.max}`);
    lines.push(`    Break-even:    ${l.breakEven.gigs} gigs × €${l.breakEven.feePerGig}`);
    lines.push(`    Equipment:     ${l.equipmentNotes}`);
  }

  if (briefing.cluster) {
    const cl = briefing.cluster;
    lines.push(`\n📍  CLUSTER [${cl.clusterViability.toUpperCase()}]`);
    lines.push(`    ${cl.contactable} contactable / ${cl.totalInArea} total in ${briefing.event.country || 'area'}`);
    lines.push(`    ${cl.recommendation}`);

    const byStatus = {
      uncontacted: cl.nearbyVenues.filter(v => v.status === 'uncontacted' && v.email),
      contacted: cl.nearbyVenues.filter(v => v.status === 'contacted'),
      replied: cl.nearbyVenues.filter(v => v.status === 'replied'),
    };

    if (byStatus.uncontacted.length > 0) {
      lines.push(`\n    Uncontacted (${byStatus.uncontacted.length}):`);
      for (const v of byStatus.uncontacted.slice(0, 8)) {
        lines.push(`      • ${v.name.padEnd(35)} ${v.location?.padEnd(25) || ''} ${v.email}`);
      }
      if (byStatus.uncontacted.length > 8) lines.push(`      ... +${byStatus.uncontacted.length - 8} more`);
    }
  }

  if (briefing.conversation) {
    const c = briefing.conversation;
    lines.push(`\n📧  CONVERSATION: ${c.venue}`);
    lines.push(`    Email:  ${c.email}`);
    lines.push(`    Status: ${c.status} | ${c.messageCount} msgs | ${c.daysSinceLastActivity}d`);
    lines.push(`    Last:   ${c.lastMessageDirection === 'sent' ? '→ SENT' : '← RECEIVED'}`);
    lines.push(`    ${c.lastMessagePreview.slice(0, 150)}`);
  }

  if (briefing.recommendations.length > 0) {
    lines.push(`\n🎯  RECOMMENDED ACTIONS:`);
    for (let i = 0; i < briefing.recommendations.length; i++) {
      lines.push(`    ${i + 1}. ${briefing.recommendations[i]}`);
    }
  }

  lines.push('\n' + bar);
  return lines.join('\n');
}

// ── Export ──

export const intelligenceRouter = {
  route: routeEvent,
  routeReply: routeReplyEvent,
  formatTelegram: formatBriefingForTelegram,
  formatConsole: formatBriefingForConsole,
};
