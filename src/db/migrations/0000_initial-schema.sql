CREATE TYPE "public"."commitment_type" AS ENUM('gig', 'hold', 'personal', 'travel');--> statement-breakpoint
CREATE TYPE "public"."email_type" AS ENUM('initial', 'followup', 'response', 'manual_reply');--> statement-breakpoint
CREATE TYPE "public"."platform" AS ENUM('twitter', 'instagram', 'tiktok', 'youtube', 'facebook');--> statement-breakpoint
CREATE TYPE "public"."reply_type" AS ENUM('human_reply', 'auto_reply', 'bounce');--> statement-breakpoint
CREATE TYPE "public"."venue_status" AS ENUM('prospect', 'contacted', 'responded', 'booked', 'declined', 'cold');--> statement-breakpoint
CREATE TABLE "agent_session" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"agent_id" text NOT NULL,
	"department" text NOT NULL,
	"trigger" text,
	"entities_touched" text[] DEFAULT '{}'::text[],
	"decisions" jsonb,
	"observations" jsonb,
	"actions" jsonb,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "audience_snapshot" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"platform" "platform" NOT NULL,
	"followers" integer,
	"reach" integer,
	"impressions" integer,
	"engagement" real,
	"data" jsonb,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "brand_identity" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"data" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "calendar_entry" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"date" text NOT NULL,
	"type" "commitment_type" NOT NULL,
	"venue" text,
	"market" text,
	"fee" real,
	"notes" text,
	"gig_id" text,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "content" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"type" text NOT NULL,
	"file_path" text NOT NULL,
	"file_name" text NOT NULL,
	"file_size" integer,
	"width" integer,
	"height" integer,
	"duration" integer,
	"title" text,
	"description" text,
	"location" text,
	"location_lat" real,
	"location_lng" real,
	"taken_at" timestamp with time zone,
	"camera" text,
	"category" text,
	"tags" text[] DEFAULT '{}'::text[],
	"used_count" integer DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "content_task" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"type" text NOT NULL,
	"description" text NOT NULL,
	"status" text DEFAULT 'pending',
	"platform" text,
	"gig_id" text,
	"due_date" text,
	"data" jsonb,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "credentials_status" (
	"id" text PRIMARY KEY DEFAULT 'current' NOT NULL,
	"tenant_id" text NOT NULL,
	"status" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "dept_memory" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"department" text NOT NULL,
	"content" jsonb NOT NULL,
	"merged_from" text[] DEFAULT '{}'::text[],
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "email" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"subject" text NOT NULL,
	"body" text NOT NULL,
	"to_address" text NOT NULL,
	"sent_at" timestamp with time zone DEFAULT now(),
	"email_type" "email_type" DEFAULT 'initial',
	"response_received" boolean DEFAULT false,
	"response_at" timestamp with time zone,
	"response_sentiment" text,
	"feedback" text,
	"message_id" text,
	"gmail_thread_id" text,
	"venue_id" text,
	"batch_id" text,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "gig" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"date" text NOT NULL,
	"venue" text NOT NULL,
	"venue_id" text,
	"market" text,
	"country" text,
	"fee" real,
	"status" text DEFAULT 'confirmed',
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "hashtag" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"name" text NOT NULL,
	"total_uses" integer DEFAULT 0,
	"avg_engagement" real DEFAULT 0,
	"category" text,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "hashtag_analysis" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"hashtag" text NOT NULL,
	"media_count" integer,
	"top_posts" jsonb,
	"reach_estimate" integer,
	"data" jsonb,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "hashtag_pair" (
	"hashtag_a" text NOT NULL,
	"hashtag_b" text NOT NULL,
	"co_occurrence" integer DEFAULT 0,
	"correlation" real DEFAULT 0,
	CONSTRAINT "hashtag_pair_hashtag_a_hashtag_b_pk" PRIMARY KEY("hashtag_a","hashtag_b")
);
--> statement-breakpoint
CREATE TABLE "memory_link" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"from_dept" text NOT NULL,
	"to_entity" text NOT NULL,
	"content" text NOT NULL,
	"sigma" text,
	"signal_type" text,
	"embedding" vector(384),
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "outreach_batch" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"status" text DEFAULT 'preview' NOT NULL,
	"input_file" text,
	"email_count" integer DEFAULT 0,
	"sent_count" integer DEFAULT 0,
	"data" jsonb,
	"created_at" timestamp with time zone DEFAULT now(),
	"approved_at" timestamp with time zone,
	"sent_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "outreach_reply" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"gmail_message_id" text,
	"gmail_thread_id" text,
	"from_address" text,
	"from_name" text,
	"subject" text,
	"body_preview" text,
	"reply_type" "reply_type",
	"venue_id" text,
	"received_at" timestamp with time zone,
	"processed" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "outreach_reply_gmail_message_id_unique" UNIQUE("gmail_message_id")
);
--> statement-breakpoint
CREATE TABLE "post" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"platform" "platform" NOT NULL,
	"external_id" text NOT NULL,
	"content" text NOT NULL,
	"media_paths" text[] DEFAULT '{}'::text[],
	"posted_at" timestamp with time zone NOT NULL,
	"likes" integer DEFAULT 0,
	"comments" integer DEFAULT 0,
	"shares" integer DEFAULT 0,
	"reach" integer DEFAULT 0,
	"impressions" integer DEFAULT 0,
	"engagement_rate" real DEFAULT 0,
	"url" text,
	"pillar" text,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "post_content" (
	"post_id" text NOT NULL,
	"content_id" text NOT NULL,
	"usage_type" text DEFAULT 'primary',
	CONSTRAINT "post_content_post_id_content_id_pk" PRIMARY KEY("post_id","content_id")
);
--> statement-breakpoint
CREATE TABLE "post_draft" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"platform" "platform",
	"content" text NOT NULL,
	"pillar" text,
	"status" text DEFAULT 'draft',
	"priority" integer DEFAULT 5,
	"scheduled_for" timestamp with time zone,
	"data" jsonb,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "post_hashtag" (
	"post_id" text NOT NULL,
	"hashtag_id" text NOT NULL,
	"position" integer DEFAULT 0,
	CONSTRAINT "post_hashtag_post_id_hashtag_id_pk" PRIMARY KEY("post_id","hashtag_id")
);
--> statement-breakpoint
CREATE TABLE "send_log" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"to_address" text NOT NULL,
	"venue" text,
	"sent_date" text NOT NULL,
	"sent_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "session_log" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"title" text NOT NULL,
	"trigger" text,
	"actions" text[] DEFAULT '{}'::text[],
	"decisions" text[] DEFAULT '{}'::text[],
	"entities" text[] DEFAULT '{}'::text[],
	"files" jsonb,
	"next_steps" text[] DEFAULT '{}'::text[],
	"summary" text,
	"embedding" vector(384),
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "story_fragment" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"theme" text,
	"period" text,
	"location" text,
	"entities" text[] DEFAULT '{}'::text[],
	"channels_suitable" text[] DEFAULT '{}'::text[],
	"source" text,
	"published" boolean DEFAULT false,
	"embedding" vector(384),
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "tenant" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"platforms" text[] DEFAULT '{}'::text[],
	"config" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "venue" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"location" text NOT NULL,
	"country" text NOT NULL,
	"region" text,
	"capacity" integer,
	"contact_email" text,
	"contact_name" text,
	"website" text,
	"instagram" text,
	"status" "venue_status" DEFAULT 'prospect',
	"tier" integer DEFAULT 2,
	"notes" text,
	"vibe" text[] DEFAULT '{}'::text[],
	"live_music_details" jsonb,
	"previous_artists" text[] DEFAULT '{}'::text[],
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "web_research" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"query" text NOT NULL,
	"source_type" text,
	"topic" text,
	"findings" text,
	"entities" text[] DEFAULT '{}'::text[],
	"urls" text[] DEFAULT '{}'::text[],
	"decisions" text[] DEFAULT '{}'::text[],
	"still_valid" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "yt_analytics_snapshot" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"subscribers" integer,
	"total_views" integer,
	"video_count" integer,
	"data" jsonb,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "yt_video_country" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"video_id" text NOT NULL,
	"video_title" text,
	"country" text NOT NULL,
	"views" integer DEFAULT 0,
	"watch_time_minutes" real DEFAULT 0,
	"snapshot_id" text,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "agent_session" ADD CONSTRAINT "agent_session_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audience_snapshot" ADD CONSTRAINT "audience_snapshot_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brand_identity" ADD CONSTRAINT "brand_identity_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calendar_entry" ADD CONSTRAINT "calendar_entry_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calendar_entry" ADD CONSTRAINT "calendar_entry_gig_id_gig_id_fk" FOREIGN KEY ("gig_id") REFERENCES "public"."gig"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content" ADD CONSTRAINT "content_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_task" ADD CONSTRAINT "content_task_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_task" ADD CONSTRAINT "content_task_gig_id_gig_id_fk" FOREIGN KEY ("gig_id") REFERENCES "public"."gig"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credentials_status" ADD CONSTRAINT "credentials_status_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dept_memory" ADD CONSTRAINT "dept_memory_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email" ADD CONSTRAINT "email_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email" ADD CONSTRAINT "email_venue_id_venue_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venue"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gig" ADD CONSTRAINT "gig_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gig" ADD CONSTRAINT "gig_venue_id_venue_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venue"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hashtag" ADD CONSTRAINT "hashtag_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hashtag_analysis" ADD CONSTRAINT "hashtag_analysis_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hashtag_pair" ADD CONSTRAINT "hashtag_pair_hashtag_a_hashtag_id_fk" FOREIGN KEY ("hashtag_a") REFERENCES "public"."hashtag"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hashtag_pair" ADD CONSTRAINT "hashtag_pair_hashtag_b_hashtag_id_fk" FOREIGN KEY ("hashtag_b") REFERENCES "public"."hashtag"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memory_link" ADD CONSTRAINT "memory_link_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outreach_batch" ADD CONSTRAINT "outreach_batch_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outreach_reply" ADD CONSTRAINT "outreach_reply_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outreach_reply" ADD CONSTRAINT "outreach_reply_venue_id_venue_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venue"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post" ADD CONSTRAINT "post_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_content" ADD CONSTRAINT "post_content_post_id_post_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."post"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_content" ADD CONSTRAINT "post_content_content_id_content_id_fk" FOREIGN KEY ("content_id") REFERENCES "public"."content"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_draft" ADD CONSTRAINT "post_draft_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_hashtag" ADD CONSTRAINT "post_hashtag_post_id_post_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."post"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_hashtag" ADD CONSTRAINT "post_hashtag_hashtag_id_hashtag_id_fk" FOREIGN KEY ("hashtag_id") REFERENCES "public"."hashtag"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "send_log" ADD CONSTRAINT "send_log_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_log" ADD CONSTRAINT "session_log_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_fragment" ADD CONSTRAINT "story_fragment_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "venue" ADD CONSTRAINT "venue_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "web_research" ADD CONSTRAINT "web_research_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "yt_analytics_snapshot" ADD CONSTRAINT "yt_analytics_snapshot_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "yt_video_country" ADD CONSTRAINT "yt_video_country_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "yt_video_country" ADD CONSTRAINT "yt_video_country_snapshot_id_yt_analytics_snapshot_id_fk" FOREIGN KEY ("snapshot_id") REFERENCES "public"."yt_analytics_snapshot"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_audience_tenant_platform_date" ON "audience_snapshot" USING btree ("tenant_id","platform","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_calendar_tenant_date_type" ON "calendar_entry" USING btree ("tenant_id","date","type");--> statement-breakpoint
CREATE INDEX "idx_content_tenant_type" ON "content" USING btree ("tenant_id","type");--> statement-breakpoint
CREATE INDEX "idx_content_tenant_category" ON "content" USING btree ("tenant_id","category");--> statement-breakpoint
CREATE INDEX "idx_email_tenant_date" ON "email" USING btree ("tenant_id","sent_at");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_email_message_id" ON "email" USING btree ("message_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_hashtag_tenant_name" ON "hashtag" USING btree ("tenant_id","name");--> statement-breakpoint
CREATE INDEX "idx_memory_tenant_entity" ON "memory_link" USING btree ("tenant_id","to_entity");--> statement-breakpoint
CREATE INDEX "idx_memory_tenant_sigma" ON "memory_link" USING btree ("tenant_id","sigma");--> statement-breakpoint
CREATE INDEX "idx_memory_embedding" ON "memory_link" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "idx_reply_tenant_venue" ON "outreach_reply" USING btree ("tenant_id","venue_id");--> statement-breakpoint
CREATE INDEX "idx_post_tenant_platform" ON "post" USING btree ("tenant_id","platform");--> statement-breakpoint
CREATE INDEX "idx_post_tenant_date" ON "post" USING btree ("tenant_id","posted_at");--> statement-breakpoint
CREATE INDEX "idx_session_tenant_date" ON "session_log" USING btree ("tenant_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_session_embedding" ON "session_log" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "idx_venue_tenant_status" ON "venue" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "idx_venue_tenant_country" ON "venue" USING btree ("tenant_id","country");--> statement-breakpoint
CREATE INDEX "idx_venue_tenant_region" ON "venue" USING btree ("tenant_id","region");