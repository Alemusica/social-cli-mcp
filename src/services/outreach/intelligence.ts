/**
 * Intelligence Router — Event->Action Dispatcher (Drizzle)
 *
 * When events happen (reply received, gig confirmed, morning check),
 * this router determines what intelligence to generate and which
 * departments to activate.
 *
 * Architecture:
 *   Event (e.g. "reply from Portugal venue")
 *     -> Router classifies event
 *       -> Dispatches to department modules
 *         -> Each module produces IntelligenceBriefing
 *           -> Briefings persisted to memory_link
 *           -> Briefings returned for display / Telegram
 *
 * Migrated from: src/agents/intelligence-router.ts
 * Change: SurrealDB getDb() -> Drizzle ORM
 */

import { db } from "../../db/client.js";
import { email, outreachReply, venue, memoryLink } from "../../db/schema.js";
import { eq, and, ilike, desc, sql } from "drizzle-orm";
import { createLogger } from "../../lib/logger.js";
import {
  buildLogisticsBriefing,
  buildClusterBriefing,
  HOME_BASE,
  NO_FLIGHT_COUNTRIES,
  type LogisticsBriefing,
  type ClusterBriefing,
} from "./logistics.js";

const log = createLogger("intelligence-router");

// ── Event Types ──

export type EventType =
  | "reply_received"
  | "email_sent"
  | "gig_confirmed"
  | "research_completed"
  | "morning_check"
  | "session_start";

export interface IntelligenceEvent {
  type: EventType;
  venue?: string;
  venueEmail?: string;
  country?: string;
  replyType?: "human_reply" | "auto_reply" | "bounce";
  replyPreview?: string;
  metadata?: Record<string, any>;
}

// ── Briefing Output ──

export type { LogisticsBriefing, ClusterBriefing };

export interface ConversationBriefing {
  venue: string;
  email: string;
  status: string;
  messageCount: number;
  lastMessageDirection: "sent" | "received";
  lastMessagePreview: string;
  daysSinceLastActivity: number;
  suggestedAction: string;
}

export interface BrandReview {
  pass: boolean;
  issues: { check: string; found: string; rule: string }[];
  suggestions: string[];
}

export interface IntelligenceBriefing {
  event: IntelligenceEvent;
  timestamp: string;
  logistics?: LogisticsBriefing;
  cluster?: ClusterBriefing;
  conversation?: ConversationBriefing;
  brand?: BrandReview;
  recommendations: string[];
  urgency: "high" | "medium" | "low";
}

// ── Core Router ──

/**
 * Route an event through the intelligence system.
 * Returns a briefing with logistics, cluster, and conversation intelligence.
 */
export async function routeEvent(
  event: IntelligenceEvent,
  tenantId: string,
): Promise<IntelligenceBriefing> {
  const briefing: IntelligenceBriefing = {
    event,
    timestamp: new Date().toISOString(),
    recommendations: [],
    urgency: "low",
  };

  switch (event.type) {
    case "reply_received":
      await handleReplyReceived(event, briefing, tenantId);
      break;
    case "morning_check":
      await handleMorningCheck(event, briefing, tenantId);
      break;
    case "email_sent":
      await handleEmailSent(event, briefing, tenantId);
      break;
    case "session_start":
      await handleSessionStart(event, briefing, tenantId);
      break;
    default:
      break;
  }

  // Persist briefing as memory_link
  await persistBriefing(briefing, tenantId);

  return briefing;
}

/**
 * Convenience: route a reply event directly from morning-check or conversation-store.
 */
export async function routeReplyEvent(
  venueName: string,
  venueEmail: string,
  replyType: "human_reply" | "auto_reply" | "bounce",
  replyPreview: string,
  tenantId: string,
): Promise<IntelligenceBriefing> {
  const country = await getVenueCountry(venueEmail, tenantId);

  return routeEvent(
    {
      type: "reply_received",
      venue: venueName,
      venueEmail,
      country: country || undefined,
      replyType,
      replyPreview,
    },
    tenantId,
  );
}

// ── Event Handlers ──

async function handleReplyReceived(
  event: IntelligenceEvent,
  briefing: IntelligenceBriefing,
  tenantId: string,
) {
  const { venue: venueName, venueEmail, country, replyType } = event;

  if (replyType === "bounce") {
    briefing.urgency = "low";
    briefing.recommendations.push(
      `Bounced email to ${venueName}. Mark as invalid and find alternative contact.`,
    );
    return;
  }

  if (replyType === "auto_reply") {
    briefing.urgency = "low";
    briefing.recommendations.push(
      `Auto-reply from ${venueName}. No action needed \u2014 wait for human response.`,
    );
    return;
  }

  // Human reply — full intelligence
  briefing.urgency = "high";

  // 1. Conversation context
  if (venueEmail) {
    briefing.conversation = await buildConversationBriefing(
      venueName || "",
      venueEmail,
      tenantId,
    );
  }

  // 2. Logistics (if travel required)
  if (country && !NO_FLIGHT_COUNTRIES.has(country)) {
    briefing.logistics = buildLogisticsBriefing(country, venueName || "");
    briefing.recommendations.push(
      `TRAVEL REQUIRED: ${country}. Estimated cost: \u20AC${briefing.logistics.totalEstimate.min}-${briefing.logistics.totalEstimate.max}. ` +
        `Need ${briefing.logistics.breakEven.gigs} gigs at \u20AC${briefing.logistics.breakEven.feePerGig} to break even.`,
    );
  }

  // 3. Cluster opportunities
  if (venueEmail) {
    briefing.cluster = await buildClusterBriefing(venueEmail, country || "", tenantId);
    if (briefing.cluster.clusterViability !== "weak") {
      briefing.recommendations.push(
        `CLUSTER: ${briefing.cluster.contactable} contactable venues near ${venueName} (${briefing.cluster.totalInArea} total). ` +
          `${briefing.cluster.recommendation}`,
      );
    }
  }

  // 4. Action recommendation
  if (briefing.conversation?.suggestedAction) {
    briefing.recommendations.push(briefing.conversation.suggestedAction);
  }
}

async function handleEmailSent(
  event: IntelligenceEvent,
  briefing: IntelligenceBriefing,
  _tenantId: string,
) {
  const { metadata } = event;
  const emailBody = metadata?.body || metadata?.subject || "";

  if (!emailBody) return;

  // Brand review is handled at a higher layer (brand-guardian).
  // Here we just flag if metadata includes brand review results.
  if (metadata?.brandReview) {
    briefing.brand = metadata.brandReview;
    if (!metadata.brandReview.pass) {
      briefing.urgency = "high";
      for (const issue of metadata.brandReview.issues || []) {
        briefing.recommendations.push(`BRAND: "${issue.found}" \u2014 ${issue.rule}`);
      }
    }
    for (const s of metadata.brandReview.suggestions || []) {
      briefing.recommendations.push(`BRAND suggestion: ${s}`);
    }
  }
}

async function handleMorningCheck(
  _event: IntelligenceEvent,
  briefing: IntelligenceBriefing,
  tenantId: string,
) {
  // Check for pending actions across all conversations
  const activeConvos = await db
    .select({
      fromAddress: outreachReply.fromAddress,
      replyType: outreachReply.replyType,
      bodyPreview: outreachReply.bodyPreview,
      receivedAt: outreachReply.receivedAt,
    })
    .from(outreachReply)
    .where(
      and(
        eq(outreachReply.tenantId, tenantId),
        eq(outreachReply.replyType, "human_reply"),
      ),
    )
    .orderBy(desc(outreachReply.receivedAt))
    .limit(10);

  if (activeConvos.length > 0) {
    briefing.urgency = "medium";
    briefing.recommendations.push(
      `${activeConvos.length} human replies in system. Check conversation dashboard for action items.`,
    );
  }
}

async function handleSessionStart(
  _event: IntelligenceEvent,
  briefing: IntelligenceBriefing,
  tenantId: string,
) {
  // Load recent sigma-2 decisions
  const decisions = await db
    .select({
      content: memoryLink.content,
      toEntity: memoryLink.toEntity,
      createdAt: memoryLink.createdAt,
    })
    .from(memoryLink)
    .where(
      and(
        eq(memoryLink.tenantId, tenantId),
        eq(memoryLink.sigma, "\u03C3\u2082"),
        eq(memoryLink.signalType, "decision"),
      ),
    )
    .orderBy(desc(memoryLink.createdAt))
    .limit(10);

  // Check for pending reply actions
  const pendingReplies = await db
    .select({
      fromAddress: outreachReply.fromAddress,
      replyType: outreachReply.replyType,
      receivedAt: outreachReply.receivedAt,
    })
    .from(outreachReply)
    .where(
      and(
        eq(outreachReply.tenantId, tenantId),
        eq(outreachReply.replyType, "human_reply"),
      ),
    )
    .orderBy(desc(outreachReply.receivedAt))
    .limit(5);

  if (decisions.length > 0) {
    briefing.recommendations.push(
      `${decisions.length} recent \u03C3\u2082 decisions. Latest: ${decisions[0]?.content?.slice(0, 100)}`,
    );
  }

  if (pendingReplies.length > 0) {
    briefing.urgency = "medium";
    briefing.recommendations.push(
      `${pendingReplies.length} venues with human replies need attention.`,
    );
  }
}

async function buildConversationBriefing(
  venueName: string,
  venueEmail: string,
  tenantId: string,
): Promise<ConversationBriefing> {
  // Get sent emails to this address
  const sent = await db
    .select({
      subject: email.subject,
      sentAt: email.sentAt,
      emailType: email.emailType,
    })
    .from(email)
    .where(
      and(
        eq(email.tenantId, tenantId),
        ilike(email.toAddress, venueEmail.toLowerCase()),
      ),
    )
    .orderBy(email.sentAt);

  // Get replies from this domain
  const domain = venueEmail.split("@")[1]?.toLowerCase() || "";
  const replies = await db
    .select({
      bodyPreview: outreachReply.bodyPreview,
      receivedAt: outreachReply.receivedAt,
      replyType: outreachReply.replyType,
      fromAddress: outreachReply.fromAddress,
    })
    .from(outreachReply)
    .where(
      and(
        eq(outreachReply.tenantId, tenantId),
        ilike(outreachReply.fromAddress, `%${domain}`),
      ),
    )
    .orderBy(outreachReply.receivedAt);

  const totalMessages = sent.length + replies.length;
  const lastSent = sent[sent.length - 1];
  const lastReply = replies[replies.length - 1];

  let lastDir: "sent" | "received" = "sent";
  let lastPreview = "";
  let lastDate = new Date();

  if (lastReply && lastSent) {
    const replyDate = lastReply.receivedAt ? new Date(lastReply.receivedAt) : new Date();
    const sentDate = lastSent.sentAt ? new Date(lastSent.sentAt) : new Date();
    if (replyDate > sentDate) {
      lastDir = "received";
      lastPreview = lastReply.bodyPreview || "";
      lastDate = replyDate;
    } else {
      lastDir = "sent";
      lastPreview = lastSent.subject || "";
      lastDate = sentDate;
    }
  } else if (lastReply) {
    lastDir = "received";
    lastPreview = lastReply.bodyPreview || "";
    lastDate = lastReply.receivedAt ? new Date(lastReply.receivedAt) : new Date();
  } else if (lastSent) {
    lastDir = "sent";
    lastPreview = lastSent.subject || "";
    lastDate = lastSent.sentAt ? new Date(lastSent.sentAt) : new Date();
  }

  const daysSince = Math.floor((Date.now() - lastDate.getTime()) / 86400000);

  // Determine suggested action
  let suggestedAction = "";
  const hasHumanReply = replies.some((r) => r.replyType === "human_reply");

  if (hasHumanReply && lastDir === "received") {
    suggestedAction = `REPLY NEEDED: ${venueName} sent a human reply ${daysSince}d ago. Draft and send response.`;
  } else if (hasHumanReply && lastDir === "sent") {
    suggestedAction = `Ball in their court. Last message was ours (${daysSince}d ago). Wait or follow up if >7 days.`;
  } else if (!hasHumanReply && daysSince >= 7 && sent.length === 1) {
    suggestedAction = `No reply after ${daysSince} days. Send follow-up email.`;
  }

  return {
    venue: venueName || domain,
    email: venueEmail,
    status: hasHumanReply
      ? lastDir === "received"
        ? "awaiting_our_reply"
        : "awaiting_their_reply"
      : "no_reply",
    messageCount: totalMessages,
    lastMessageDirection: lastDir,
    lastMessagePreview: lastPreview.slice(0, 200),
    daysSinceLastActivity: daysSince,
    suggestedAction,
  };
}

// ── Helpers ──

async function getVenueCountry(venueEmail: string, tenantId: string): Promise<string | null> {
  const rows = await db
    .select({ country: venue.country })
    .from(venue)
    .where(
      and(
        eq(venue.tenantId, tenantId),
        ilike(venue.contactEmail, venueEmail.toLowerCase()),
      ),
    )
    .limit(1);

  return rows[0]?.country || null;
}

async function persistBriefing(briefing: IntelligenceBriefing, tenantId: string) {
  if (briefing.recommendations.length === 0) return;

  const entity = briefing.event.venue
    ? `venue:${briefing.event.venue.toLowerCase().replace(/[^a-z0-9]/g, "_")}`
    : "system:morning_check";

  try {
    await db.insert(memoryLink).values({
      tenantId,
      fromDept: "logistics",
      toEntity: entity,
      signalType: "action",
      sigma: "\u03C3\u2081",
      content: `Intelligence briefing [${briefing.urgency}]: ${briefing.recommendations.join(" | ")}`,
    });
  } catch (err) {
    log.warn("failed to persist briefing", { error: String(err) });
  }
}

// ── Formatters ──

/**
 * Format a briefing for Telegram notification.
 */
export function formatBriefingForTelegram(briefing: IntelligenceBriefing): string {
  const lines: string[] = [];
  const emoji =
    briefing.urgency === "high" ? "\uD83D\uDD34" : briefing.urgency === "medium" ? "\uD83D\uDFE1" : "\uD83D\uDFE2";

  lines.push(`${emoji} *INTELLIGENCE BRIEFING*`);
  lines.push(`Event: ${briefing.event.type} \u2014 ${briefing.event.venue || "system"}\n`);

  if (briefing.conversation) {
    const c = briefing.conversation;
    lines.push(`\uD83D\uDCE7 *Conversation:* ${c.venue} (${c.email})`);
    lines.push(`   Status: ${c.status} | ${c.messageCount} messages | ${c.daysSinceLastActivity}d ago`);
    lines.push(
      `   Last: ${c.lastMessageDirection === "sent" ? "\u2192" : "\u2190"} ${c.lastMessagePreview.slice(0, 100)}`,
    );
    lines.push("");
  }

  if (briefing.logistics) {
    const l = briefing.logistics;
    lines.push(`\u2708\uFE0F *Logistics:* ${l.origin} \u2192 ${l.destination}`);
    lines.push(`   Flight: ${l.estimatedFlightCost}`);
    lines.push(`   Baggage: ${l.estimatedBaggageCost}`);
    lines.push(`   Accommodation: ${l.estimatedAccommodation}`);
    lines.push(`   Local transport: ${l.estimatedTransportLocal}`);
    lines.push(`   *TOTAL: \u20AC${l.totalEstimate.min}-${l.totalEstimate.max}*`);
    lines.push(`   Break-even: ${l.breakEven.gigs} gigs at \u20AC${l.breakEven.feePerGig}`);
    lines.push(`   \u26A0\uFE0F ${l.equipmentNotes}`);
    lines.push("");
  }

  if (briefing.cluster) {
    const cl = briefing.cluster;
    lines.push(
      `\uD83D\uDCCD *Cluster [${cl.clusterViability}]:* ${cl.contactable} contactable / ${cl.totalInArea} total`,
    );
    lines.push(`   ${cl.recommendation}`);
    if (cl.nearbyVenues.length > 0) {
      const uncontacted = cl.nearbyVenues.filter((v) => v.status === "uncontacted" && v.email);
      if (uncontacted.length > 0) {
        lines.push(`   Uncontacted with email:`);
        for (const v of uncontacted.slice(0, 5)) {
          lines.push(`     \u2022 ${v.name} (${v.location}) \u2014 ${v.category}`);
        }
        if (uncontacted.length > 5) lines.push(`     ... +${uncontacted.length - 5} more`);
      }
    }
    lines.push("");
  }

  if (briefing.brand) {
    const b = briefing.brand;
    if (b.pass) {
      lines.push(`\u2705 *Brand review:* PASS`);
    } else {
      lines.push(`\u26A0\uFE0F *Brand review:* ${b.issues.length} issue(s)`);
      for (const issue of b.issues) {
        lines.push(`   \`${issue.found}\` \u2014 ${issue.rule}`);
      }
    }
    lines.push("");
  }

  if (briefing.recommendations.length > 0) {
    lines.push(`\uD83C\uDFAF *Actions:*`);
    for (const r of briefing.recommendations) {
      lines.push(`   \u2022 ${r}`);
    }
  }

  return lines.join("\n");
}

/**
 * Format a briefing for console output.
 */
export function formatBriefingForConsole(briefing: IntelligenceBriefing): string {
  const lines: string[] = [];
  const bar = "\u2550".repeat(60);

  lines.push(bar);
  lines.push(`INTELLIGENCE BRIEFING [${briefing.urgency.toUpperCase()}]`);
  lines.push(`Event: ${briefing.event.type} \u2014 ${briefing.event.venue || "system"}`);
  lines.push(bar);

  if (briefing.logistics) {
    const l = briefing.logistics;
    lines.push(`\n\u2708\uFE0F  LOGISTICS: ${l.origin} \u2192 ${l.destination}`);
    lines.push(`    Flight:        ${l.estimatedFlightCost}`);
    lines.push(`    Baggage:       ${l.estimatedBaggageCost}`);
    lines.push(`    Accommodation: ${l.estimatedAccommodation}`);
    lines.push(`    Local:         ${l.estimatedTransportLocal}`);
    lines.push(`    \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500`);
    lines.push(`    TOTAL:         \u20AC${l.totalEstimate.min}-${l.totalEstimate.max}`);
    lines.push(`    Break-even:    ${l.breakEven.gigs} gigs \u00D7 \u20AC${l.breakEven.feePerGig}`);
    lines.push(`    Equipment:     ${l.equipmentNotes}`);
  }

  if (briefing.cluster) {
    const cl = briefing.cluster;
    lines.push(`\n\uD83D\uDCCD  CLUSTER [${cl.clusterViability.toUpperCase()}]`);
    lines.push(
      `    ${cl.contactable} contactable / ${cl.totalInArea} total in ${briefing.event.country || "area"}`,
    );
    lines.push(`    ${cl.recommendation}`);

    const byStatus = {
      uncontacted: cl.nearbyVenues.filter((v) => v.status === "uncontacted" && v.email),
      contacted: cl.nearbyVenues.filter((v) => v.status === "contacted"),
      replied: cl.nearbyVenues.filter((v) => v.status === "replied"),
    };

    if (byStatus.uncontacted.length > 0) {
      lines.push(`\n    Uncontacted (${byStatus.uncontacted.length}):`);
      for (const v of byStatus.uncontacted.slice(0, 8)) {
        lines.push(
          `      \u2022 ${v.name.padEnd(35)} ${v.location?.padEnd(25) || ""} ${v.email}`,
        );
      }
      if (byStatus.uncontacted.length > 8)
        lines.push(`      ... +${byStatus.uncontacted.length - 8} more`);
    }
  }

  if (briefing.conversation) {
    const c = briefing.conversation;
    lines.push(`\n\uD83D\uDCE7  CONVERSATION: ${c.venue}`);
    lines.push(`    Email:  ${c.email}`);
    lines.push(`    Status: ${c.status} | ${c.messageCount} msgs | ${c.daysSinceLastActivity}d`);
    lines.push(`    Last:   ${c.lastMessageDirection === "sent" ? "\u2192 SENT" : "\u2190 RECEIVED"}`);
    lines.push(`    ${c.lastMessagePreview.slice(0, 150)}`);
  }

  if (briefing.brand) {
    const b = briefing.brand;
    if (b.pass) {
      lines.push(`\n\u2705  BRAND REVIEW: PASS`);
    } else {
      lines.push(`\n\u26A0\uFE0F   BRAND REVIEW: ${b.issues.length} ISSUE(S)`);
      for (const issue of b.issues) {
        lines.push(`    [${issue.check}] "${issue.found}"`);
        lines.push(`      \u2192 ${issue.rule}`);
      }
    }
    if (b.suggestions.length > 0) {
      for (const s of b.suggestions) {
        lines.push(`    \uD83D\uDCA1 ${s}`);
      }
    }
  }

  if (briefing.recommendations.length > 0) {
    lines.push(`\n\uD83C\uDFAF  RECOMMENDED ACTIONS:`);
    for (let i = 0; i < briefing.recommendations.length; i++) {
      lines.push(`    ${i + 1}. ${briefing.recommendations[i]}`);
    }
  }

  lines.push("\n" + bar);
  return lines.join("\n");
}

// ── Export ──

export const intelligenceRouter = {
  route: routeEvent,
  routeReply: routeReplyEvent,
  formatTelegram: formatBriefingForTelegram,
  formatConsole: formatBriefingForConsole,
};
