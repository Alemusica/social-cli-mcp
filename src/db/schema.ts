// src/db/schema.ts
import {
  pgTable, pgEnum, text, integer, real, boolean,
  timestamp, jsonb, uniqueIndex, index, primaryKey,
} from "drizzle-orm/pg-core";
import { vector } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// ── Enums ──────────────────────────────────────

export const platformEnum = pgEnum("platform", [
  "twitter", "instagram", "tiktok", "youtube", "facebook",
]);

export const venueStatusEnum = pgEnum("venue_status", [
  "prospect", "contacted", "responded", "booked", "declined", "cold",
]);

export const emailTypeEnum = pgEnum("email_type", [
  "initial", "followup", "response", "manual_reply",
]);

export const replyTypeEnum = pgEnum("reply_type", [
  "human_reply", "auto_reply", "bounce",
]);

export const commitmentTypeEnum = pgEnum("commitment_type", [
  "gig", "hold", "personal", "travel",
]);

// ── Tenant ─────────────────────────────────────

export const tenant = pgTable("tenant", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  platforms: text("platforms").array().default(sql`'{}'::text[]`),
  config: jsonb("config").default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// ── Venue ──────────────────────────────────────

export const venue = pgTable("venue", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text("tenant_id").notNull().references(() => tenant.id),
  name: text("name").notNull(),
  type: text("type").notNull(),
  location: text("location").notNull(),
  country: text("country").notNull(),
  region: text("region"),
  capacity: integer("capacity"),
  contactEmail: text("contact_email"),
  contactName: text("contact_name"),
  website: text("website"),
  instagram: text("instagram"),
  status: venueStatusEnum("status").default("prospect"),
  tier: integer("tier").default(2),
  notes: text("notes"),
  vibe: text("vibe").array().default(sql`'{}'::text[]`),
  liveMusicDetails: jsonb("live_music_details"),
  previousArtists: text("previous_artists").array().default(sql`'{}'::text[]`),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
}, (t) => [
  index("idx_venue_tenant_status").on(t.tenantId, t.status),
  index("idx_venue_tenant_country").on(t.tenantId, t.country),
  index("idx_venue_tenant_region").on(t.tenantId, t.region),
]);

// ── Post ───────────────────────────────────────

export const post = pgTable("post", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text("tenant_id").notNull().references(() => tenant.id),
  platform: platformEnum("platform").notNull(),
  externalId: text("external_id").notNull(),
  content: text("content").notNull(),
  mediaPaths: text("media_paths").array().default(sql`'{}'::text[]`),
  postedAt: timestamp("posted_at", { withTimezone: true }).notNull(),
  likes: integer("likes").default(0),
  comments: integer("comments").default(0),
  shares: integer("shares").default(0),
  reach: integer("reach").default(0),
  impressions: integer("impressions").default(0),
  engagementRate: real("engagement_rate").default(0),
  url: text("url"),
  pillar: text("pillar"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
}, (t) => [
  index("idx_post_tenant_platform").on(t.tenantId, t.platform),
  index("idx_post_tenant_date").on(t.tenantId, t.postedAt),
]);

// ── Hashtag ────────────────────────────────────

export const hashtag = pgTable("hashtag", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text("tenant_id").notNull().references(() => tenant.id),
  name: text("name").notNull(),
  totalUses: integer("total_uses").default(0),
  avgEngagement: real("avg_engagement").default(0),
  category: text("category"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
}, (t) => [
  uniqueIndex("idx_hashtag_tenant_name").on(t.tenantId, t.name),
]);

// ── Email (Outreach) ───────────────────────────

export const email = pgTable("email", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text("tenant_id").notNull().references(() => tenant.id),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  toAddress: text("to_address").notNull(),
  sentAt: timestamp("sent_at", { withTimezone: true }).defaultNow(),
  emailType: emailTypeEnum("email_type").default("initial"),
  responseReceived: boolean("response_received").default(false),
  responseAt: timestamp("response_at", { withTimezone: true }),
  responseSentiment: text("response_sentiment"),
  feedback: text("feedback"),
  messageId: text("message_id"),
  gmailThreadId: text("gmail_thread_id"),
  venueId: text("venue_id").references(() => venue.id),
  batchId: text("batch_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
}, (t) => [
  index("idx_email_tenant_date").on(t.tenantId, t.sentAt),
  uniqueIndex("idx_email_message_id").on(t.messageId),
]);

// ── Outreach Reply ─────────────────────────────

export const outreachReply = pgTable("outreach_reply", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text("tenant_id").notNull().references(() => tenant.id),
  gmailMessageId: text("gmail_message_id").unique(),
  gmailThreadId: text("gmail_thread_id"),
  fromAddress: text("from_address"),
  fromName: text("from_name"),
  subject: text("subject"),
  bodyPreview: text("body_preview"),
  replyType: replyTypeEnum("reply_type"),
  venueId: text("venue_id").references(() => venue.id),
  receivedAt: timestamp("received_at", { withTimezone: true }),
  processed: boolean("processed").default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
}, (t) => [
  index("idx_reply_tenant_venue").on(t.tenantId, t.venueId),
]);

// ── Outreach Batch ─────────────────────────────

export const outreachBatch = pgTable("outreach_batch", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text("tenant_id").notNull().references(() => tenant.id),
  status: text("status").notNull().default("preview"),
  inputFile: text("input_file"),
  emailCount: integer("email_count").default(0),
  sentCount: integer("sent_count").default(0),
  data: jsonb("data"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  sentAt: timestamp("sent_at", { withTimezone: true }),
});

// ── Content Library ────────────────────────────

export const content = pgTable("content", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text("tenant_id").notNull().references(() => tenant.id),
  type: text("type").notNull(),
  filePath: text("file_path").notNull(),
  fileName: text("file_name").notNull(),
  fileSize: integer("file_size"),
  width: integer("width"),
  height: integer("height"),
  duration: integer("duration"),
  title: text("title"),
  description: text("description"),
  location: text("location"),
  locationLat: real("location_lat"),
  locationLng: real("location_lng"),
  takenAt: timestamp("taken_at", { withTimezone: true }),
  camera: text("camera"),
  category: text("category"),
  tags: text("tags").array().default(sql`'{}'::text[]`),
  usedCount: integer("used_count").default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
}, (t) => [
  index("idx_content_tenant_type").on(t.tenantId, t.type),
  index("idx_content_tenant_category").on(t.tenantId, t.category),
]);

// ── Gig ────────────────────────────────────────
// Defined before calendarEntry to resolve forward reference

export const gig = pgTable("gig", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text("tenant_id").notNull().references(() => tenant.id),
  date: text("date").notNull(),
  venue: text("venue").notNull(),
  venueId: text("venue_id").references(() => venue.id),
  market: text("market"),
  country: text("country"),
  fee: real("fee"),
  status: text("status").default("confirmed"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// ── Calendar ───────────────────────────────────

export const calendarEntry = pgTable("calendar_entry", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text("tenant_id").notNull().references(() => tenant.id),
  date: text("date").notNull(),
  type: commitmentTypeEnum("type").notNull(),
  venue: text("venue"),
  market: text("market"),
  fee: real("fee"),
  notes: text("notes"),
  gigId: text("gig_id").references(() => gig.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
}, (t) => [
  uniqueIndex("idx_calendar_tenant_date_type").on(t.tenantId, t.date, t.type),
]);

// ── Session Log (Memory) ───────────────────────

export const sessionLog = pgTable("session_log", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text("tenant_id").notNull().references(() => tenant.id),
  title: text("title").notNull(),
  trigger: text("trigger"),
  actions: text("actions").array().default(sql`'{}'::text[]`),
  decisions: text("decisions").array().default(sql`'{}'::text[]`),
  entities: text("entities").array().default(sql`'{}'::text[]`),
  files: jsonb("files"),
  nextSteps: text("next_steps").array().default(sql`'{}'::text[]`),
  summary: text("summary"),
  embedding: vector("embedding", { dimensions: 384 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
}, (t) => [
  index("idx_session_tenant_date").on(t.tenantId, t.createdAt),
  index("idx_session_embedding").using("hnsw", t.embedding.op("vector_cosine_ops")),
]);

// ── Memory Link (Cross-Entity Intelligence) ────

export const memoryLink = pgTable("memory_link", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text("tenant_id").notNull().references(() => tenant.id),
  fromDept: text("from_dept").notNull(),
  toEntity: text("to_entity").notNull(),
  content: text("content").notNull(),
  sigma: text("sigma"),
  signalType: text("signal_type"),
  embedding: vector("embedding", { dimensions: 384 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
}, (t) => [
  index("idx_memory_tenant_entity").on(t.tenantId, t.toEntity),
  index("idx_memory_tenant_sigma").on(t.tenantId, t.sigma),
  index("idx_memory_embedding").using("hnsw", t.embedding.op("vector_cosine_ops")),
]);

// ── Story Fragment (Editorial) ─────────────────

export const storyFragment = pgTable("story_fragment", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text("tenant_id").notNull().references(() => tenant.id),
  title: text("title").notNull(),
  body: text("body").notNull(),
  theme: text("theme"),
  period: text("period"),
  location: text("location"),
  entities: text("entities").array().default(sql`'{}'::text[]`),
  channelsSuitable: text("channels_suitable").array().default(sql`'{}'::text[]`),
  source: text("source"),
  published: boolean("published").default(false),
  embedding: vector("embedding", { dimensions: 384 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// ── Web Research (Cache) ───────────────────────

export const webResearch = pgTable("web_research", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text("tenant_id").notNull().references(() => tenant.id),
  query: text("query").notNull(),
  sourceType: text("source_type"),
  topic: text("topic"),
  findings: text("findings"),
  entities: text("entities").array().default(sql`'{}'::text[]`),
  urls: text("urls").array().default(sql`'{}'::text[]`),
  decisions: text("decisions").array().default(sql`'{}'::text[]`),
  stillValid: boolean("still_valid").default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// ── Agent Session (V7 Monade) ──────────────────

export const agentSession = pgTable("agent_session", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text("tenant_id").notNull().references(() => tenant.id),
  agentId: text("agent_id").notNull(),
  department: text("department").notNull(),
  trigger: text("trigger"),
  entitiesTouched: text("entities_touched").array().default(sql`'{}'::text[]`),
  decisions: jsonb("decisions"),
  observations: jsonb("observations"),
  actions: jsonb("actions"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// ── Department Memory ──────────────────────────

export const deptMemory = pgTable("dept_memory", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text("tenant_id").notNull().references(() => tenant.id),
  department: text("department").notNull(),
  content: jsonb("content").notNull(),
  mergedFrom: text("merged_from").array().default(sql`'{}'::text[]`),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// ── Audience Snapshot ──────────────────────────

export const audienceSnapshot = pgTable("audience_snapshot", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text("tenant_id").notNull().references(() => tenant.id),
  platform: platformEnum("platform").notNull(),
  followers: integer("followers"),
  reach: integer("reach"),
  impressions: integer("impressions"),
  engagement: real("engagement"),
  data: jsonb("data"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
}, (t) => [
  index("idx_audience_tenant_platform_date").on(t.tenantId, t.platform, t.createdAt),
]);

// ── YouTube Analytics ──────────────────────────

export const ytAnalyticsSnapshot = pgTable("yt_analytics_snapshot", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text("tenant_id").notNull().references(() => tenant.id),
  subscribers: integer("subscribers"),
  totalViews: integer("total_views"),
  videoCount: integer("video_count"),
  data: jsonb("data"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const ytVideoCountry = pgTable("yt_video_country", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text("tenant_id").notNull().references(() => tenant.id),
  videoId: text("video_id").notNull(),
  videoTitle: text("video_title"),
  country: text("country").notNull(),
  views: integer("views").default(0),
  watchTimeMinutes: real("watch_time_minutes").default(0),
  snapshotId: text("snapshot_id").references(() => ytAnalyticsSnapshot.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// ── Hashtag Analysis ───────────────────────────

export const hashtagAnalysis = pgTable("hashtag_analysis", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text("tenant_id").notNull().references(() => tenant.id),
  hashtag: text("hashtag").notNull(),
  mediaCount: integer("media_count"),
  topPosts: jsonb("top_posts"),
  reachEstimate: integer("reach_estimate"),
  data: jsonb("data"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// ── Credentials Status ─────────────────────────

export const credentialsStatus = pgTable("credentials_status", {
  id: text("id").primaryKey().default("current"),
  tenantId: text("tenant_id").notNull().references(() => tenant.id),
  status: jsonb("status").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// ── Brand Identity ─────────────────────────────

export const brandIdentity = pgTable("brand_identity", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text("tenant_id").notNull().references(() => tenant.id),
  data: jsonb("data").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// ── Post Draft ─────────────────────────────────

export const postDraft = pgTable("post_draft", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text("tenant_id").notNull().references(() => tenant.id),
  platform: platformEnum("platform"),
  content: text("content").notNull(),
  pillar: text("pillar"),
  status: text("status").default("draft"),
  priority: integer("priority").default(5),
  scheduledFor: timestamp("scheduled_for", { withTimezone: true }),
  data: jsonb("data"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// ── Content Task (Orchestrator) ────────────────

export const contentTask = pgTable("content_task", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text("tenant_id").notNull().references(() => tenant.id),
  type: text("type").notNull(),
  description: text("description").notNull(),
  status: text("status").default("pending"),
  platform: text("platform"),
  gigId: text("gig_id").references(() => gig.id),
  dueDate: text("due_date"),
  data: jsonb("data"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// ── Send Log (Email Guard) ─────────────────────

export const sendLog = pgTable("send_log", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text("tenant_id").notNull().references(() => tenant.id),
  toAddress: text("to_address").notNull(),
  venue: text("venue"),
  sentDate: text("sent_date").notNull(),
  sentAt: timestamp("sent_at", { withTimezone: true }).defaultNow(),
});

// ── Junction Tables ────────────────────────────

export const postHashtag = pgTable("post_hashtag", {
  postId: text("post_id").notNull().references(() => post.id),
  hashtagId: text("hashtag_id").notNull().references(() => hashtag.id),
  position: integer("position").default(0),
}, (t) => [
  primaryKey({ columns: [t.postId, t.hashtagId] }),
]);

export const postContent = pgTable("post_content", {
  postId: text("post_id").notNull().references(() => post.id),
  contentId: text("content_id").notNull().references(() => content.id),
  usageType: text("usage_type").default("primary"),
}, (t) => [
  primaryKey({ columns: [t.postId, t.contentId] }),
]);

export const hashtagPair = pgTable("hashtag_pair", {
  hashtagA: text("hashtag_a").notNull().references(() => hashtag.id),
  hashtagB: text("hashtag_b").notNull().references(() => hashtag.id),
  coOccurrence: integer("co_occurrence").default(0),
  correlation: real("correlation").default(0),
}, (t) => [
  primaryKey({ columns: [t.hashtagA, t.hashtagB] }),
]);
