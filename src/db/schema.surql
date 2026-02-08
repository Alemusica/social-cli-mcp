-- =====================================================
-- SOCIAL CLI MCP - Knowledge Graph Schema
-- =====================================================
-- Run: surreal import --conn http://localhost:8000 --user root --pass root --ns social --db analytics schema.surql

-- =====================================================
-- TABLES: Core Entities
-- =====================================================

-- Social Media Posts
DEFINE TABLE post SCHEMAFULL;
DEFINE FIELD platform ON post TYPE string ASSERT $value IN ["twitter", "instagram", "tiktok", "youtube"];
DEFINE FIELD external_id ON post TYPE string;
DEFINE FIELD content ON post TYPE string;
DEFINE FIELD media_paths ON post TYPE array DEFAULT [];
DEFINE FIELD posted_at ON post TYPE datetime;
DEFINE FIELD likes ON post TYPE int DEFAULT 0;
DEFINE FIELD comments ON post TYPE int DEFAULT 0;
DEFINE FIELD shares ON post TYPE int DEFAULT 0;
DEFINE FIELD reach ON post TYPE int DEFAULT 0;
DEFINE FIELD impressions ON post TYPE int DEFAULT 0;
DEFINE FIELD engagement_rate ON post TYPE float DEFAULT 0;
DEFINE FIELD url ON post TYPE option<string>;
DEFINE FIELD created_at ON post TYPE datetime DEFAULT time::now();
DEFINE FIELD updated_at ON post TYPE datetime VALUE time::now();

DEFINE INDEX idx_post_platform ON post COLUMNS platform;
DEFINE INDEX idx_post_external ON post COLUMNS external_id;
DEFINE INDEX idx_post_date ON post COLUMNS posted_at;

-- Hashtags
DEFINE TABLE hashtag SCHEMAFULL;
DEFINE FIELD name ON hashtag TYPE string;
DEFINE FIELD total_uses ON hashtag TYPE int DEFAULT 0;
DEFINE FIELD avg_engagement ON hashtag TYPE float DEFAULT 0;
DEFINE FIELD category ON hashtag TYPE option<string>;
DEFINE FIELD created_at ON hashtag TYPE datetime DEFAULT time::now();

DEFINE INDEX idx_hashtag_name ON hashtag COLUMNS name UNIQUE;

-- Venues (for outreach)
DEFINE TABLE venue SCHEMALESS;
DEFINE FIELD name ON venue TYPE string;
DEFINE FIELD type ON venue TYPE string; -- beach_club, festival, hotel, etc
DEFINE FIELD location ON venue TYPE string;
DEFINE FIELD country ON venue TYPE string;
DEFINE FIELD region ON venue TYPE option<string>; -- Amalfi, Sicily, etc
DEFINE FIELD capacity ON venue TYPE option<int>;
DEFINE FIELD contact_email ON venue TYPE option<string>;
DEFINE FIELD contact_name ON venue TYPE option<string>;
DEFINE FIELD website ON venue TYPE option<string>;
DEFINE FIELD instagram ON venue TYPE option<string>;
DEFINE FIELD status ON venue TYPE string DEFAULT "prospect"; -- prospect, contacted, responded, booked, declined
DEFINE FIELD tier ON venue TYPE int DEFAULT 2; -- 1=priority, 2=standard, 3=backup
DEFINE FIELD notes ON venue TYPE option<string>;
DEFINE FIELD vibe ON venue TYPE array DEFAULT []; -- [sunset, luxury, jazz, etc]
DEFINE FIELD created_at ON venue TYPE datetime DEFAULT time::now();
DEFINE FIELD updated_at ON venue TYPE datetime VALUE time::now();

DEFINE INDEX idx_venue_status ON venue COLUMNS status;
DEFINE INDEX idx_venue_tier ON venue COLUMNS tier;
DEFINE INDEX idx_venue_country ON venue COLUMNS country;
DEFINE INDEX idx_venue_region ON venue COLUMNS region;

-- Outreach Emails
DEFINE TABLE email SCHEMAFULL;
DEFINE FIELD subject ON email TYPE string;
DEFINE FIELD body ON email TYPE string;
DEFINE FIELD to_address ON email TYPE string;
DEFINE FIELD sent_at ON email TYPE datetime DEFAULT time::now();
DEFINE FIELD email_type ON email TYPE string DEFAULT "initial"; -- initial, followup, response
DEFINE FIELD response_received ON email TYPE bool DEFAULT false;
DEFINE FIELD response_at ON email TYPE option<datetime>;
DEFINE FIELD response_sentiment ON email TYPE option<string>; -- positive, neutral, negative
DEFINE FIELD feedback ON email TYPE option<string>;
DEFINE FIELD message_id ON email TYPE option<string>;

DEFINE INDEX idx_email_date ON email COLUMNS sent_at;

-- Content Library (photos, videos)
DEFINE TABLE content SCHEMAFULL;
DEFINE FIELD type ON content TYPE string; -- image, video, audio
DEFINE FIELD file_path ON content TYPE string;
DEFINE FIELD file_name ON content TYPE string;
DEFINE FIELD file_size ON content TYPE option<int>;
DEFINE FIELD width ON content TYPE option<int>;
DEFINE FIELD height ON content TYPE option<int>;
DEFINE FIELD duration ON content TYPE option<int>; -- seconds for video
DEFINE FIELD title ON content TYPE option<string>;
DEFINE FIELD description ON content TYPE option<string>;
DEFINE FIELD location ON content TYPE option<string>; -- GPS reverse geocoded
DEFINE FIELD location_lat ON content TYPE option<float>;
DEFINE FIELD location_lng ON content TYPE option<float>;
DEFINE FIELD taken_at ON content TYPE option<datetime>;
DEFINE FIELD camera ON content TYPE option<string>;
DEFINE FIELD category ON content TYPE option<string>; -- landscape, busking, studio, travel, etc
DEFINE FIELD tags ON content TYPE array DEFAULT [];
DEFINE FIELD used_count ON content TYPE int DEFAULT 0;
DEFINE FIELD created_at ON content TYPE datetime DEFAULT time::now();

DEFINE INDEX idx_content_type ON content COLUMNS type;
DEFINE INDEX idx_content_location ON content COLUMNS location;
DEFINE INDEX idx_content_category ON content COLUMNS category;

-- =====================================================
-- TABLES: Graph Relations
-- =====================================================

-- Post uses Hashtag
DEFINE TABLE uses_hashtag TYPE RELATION IN post OUT hashtag;
DEFINE FIELD position ON uses_hashtag TYPE int DEFAULT 0;

-- Email sent to Venue
DEFINE TABLE sent_to TYPE RELATION IN email OUT venue;
DEFINE FIELD campaign ON sent_to TYPE option<string>;

-- Post uses Content
DEFINE TABLE uses_content TYPE RELATION IN post OUT content;
DEFINE FIELD usage_type ON uses_content TYPE string DEFAULT "primary";

-- Hashtag correlates with Hashtag (co-occurrence)
DEFINE TABLE correlates_with TYPE RELATION IN hashtag OUT hashtag;
DEFINE FIELD co_occurrence ON correlates_with TYPE int DEFAULT 0;
DEFINE FIELD correlation ON correlates_with TYPE float DEFAULT 0;

-- Post mentions Venue
DEFINE TABLE mentions TYPE RELATION IN post OUT venue;

-- =====================================================
-- ANALYTICS FUNCTIONS
-- =====================================================

-- Function to calculate hashtag performance
DEFINE FUNCTION fn::hashtag_stats($tag: string) {
    LET $h = (SELECT * FROM hashtag WHERE name = $tag);
    LET $posts = (SELECT engagement_rate FROM post WHERE ->uses_hashtag->hashtag.name CONTAINS $tag);
    RETURN {
        name: $tag,
        uses: count($posts),
        avg_engagement: math::mean($posts.engagement_rate),
        max_engagement: math::max($posts.engagement_rate)
    };
};

-- Function to get venue outreach status
DEFINE FUNCTION fn::venue_status($venue_id: record) {
    LET $emails = (SELECT * FROM email WHERE ->sent_to->venue = $venue_id);
    RETURN {
        emails_sent: count($emails),
        last_contact: math::max($emails.sent_at),
        has_response: count($emails WHERE response_received = true) > 0
    };
};

-- =====================================================
-- EXTENDED TABLES: Growth & Strategy
-- =====================================================

-- Content Pillars (Strategic content categories)
DEFINE TABLE content_pillar SCHEMAFULL;
DEFINE FIELD name ON content_pillar TYPE string;
DEFINE FIELD description ON content_pillar TYPE string;
DEFINE FIELD hashtags ON content_pillar TYPE array DEFAULT [];
DEFINE FIELD target_audience ON content_pillar TYPE array DEFAULT [];
DEFINE FIELD posting_frequency ON content_pillar TYPE option<string>;
DEFINE FIELD best_formats ON content_pillar TYPE array DEFAULT [];
DEFINE FIELD created_at ON content_pillar TYPE datetime DEFAULT time::now();

DEFINE INDEX idx_pillar_name ON content_pillar COLUMNS name UNIQUE;

-- Trends (Tracked trends for content strategy)
DEFINE TABLE trend SCHEMAFULL;
DEFINE FIELD name ON trend TYPE string;
DEFINE FIELD platform ON trend TYPE string;
DEFINE FIELD category ON trend TYPE option<string>; -- audio, format, hashtag, topic
DEFINE FIELD description ON trend TYPE option<string>;
DEFINE FIELD relevance_score ON trend TYPE int DEFAULT 5; -- 1-10 for Flutur brand
DEFINE FIELD expires_at ON trend TYPE option<datetime>;
DEFINE FIELD source_url ON trend TYPE option<string>;
DEFINE FIELD discovered_at ON trend TYPE datetime DEFAULT time::now();

DEFINE INDEX idx_trend_platform ON trend COLUMNS platform;
DEFINE INDEX idx_trend_relevance ON trend COLUMNS relevance_score;

-- Best Practices (Algorithm & strategy insights)
DEFINE TABLE best_practice SCHEMAFULL;
DEFINE FIELD title ON best_practice TYPE string;
DEFINE FIELD platform ON best_practice TYPE string;
DEFINE FIELD category ON best_practice TYPE string; -- timing, hashtags, format, engagement
DEFINE FIELD insight ON best_practice TYPE string;
DEFINE FIELD source ON best_practice TYPE option<string>;
DEFINE FIELD valid_until ON best_practice TYPE option<datetime>;
DEFINE FIELD created_at ON best_practice TYPE datetime DEFAULT time::now();

DEFINE INDEX idx_practice_platform ON best_practice COLUMNS platform;
DEFINE INDEX idx_practice_category ON best_practice COLUMNS category;

-- Profile Growth Tracking
DEFINE TABLE profile_snapshot SCHEMAFULL;
DEFINE FIELD platform ON profile_snapshot TYPE string;
DEFINE FIELD username ON profile_snapshot TYPE string;
DEFINE FIELD followers ON profile_snapshot TYPE int DEFAULT 0;
DEFINE FIELD following ON profile_snapshot TYPE int DEFAULT 0;
DEFINE FIELD posts_count ON profile_snapshot TYPE int DEFAULT 0;
DEFINE FIELD engagement_rate ON profile_snapshot TYPE option<float>;
DEFINE FIELD recorded_at ON profile_snapshot TYPE datetime DEFAULT time::now();

DEFINE INDEX idx_profile_platform ON profile_snapshot COLUMNS platform;
DEFINE INDEX idx_profile_date ON profile_snapshot COLUMNS recorded_at;

-- Audio/Field Recordings
DEFINE TABLE audio SCHEMAFULL;
DEFINE FIELD filename ON audio TYPE string;
DEFINE FIELD file_path ON audio TYPE option<string>;
DEFINE FIELD duration_seconds ON audio TYPE option<int>;
DEFINE FIELD type ON audio TYPE string; -- field_recording, track, sample, binaural
DEFINE FIELD recorded_at ON audio TYPE option<datetime>;
DEFINE FIELD equipment ON audio TYPE array DEFAULT []; -- ["KU100", "Sound Devices"]
DEFINE FIELD location_name ON audio TYPE option<string>;
DEFINE FIELD location_lat ON audio TYPE option<float>;
DEFINE FIELD location_lng ON audio TYPE option<float>;
DEFINE FIELD description ON audio TYPE option<string>;
DEFINE FIELD tags ON audio TYPE array DEFAULT [];
DEFINE FIELD usable_for ON audio TYPE array DEFAULT []; -- ["reel", "ambient", "intro"]
DEFINE FIELD created_at ON audio TYPE datetime DEFAULT time::now();

DEFINE INDEX idx_audio_type ON audio COLUMNS type;
DEFINE INDEX idx_audio_location ON audio COLUMNS location_name;

-- Gigs/Events (Past & Future)
DEFINE TABLE gig SCHEMAFULL;
DEFINE FIELD name ON gig TYPE string;
DEFINE FIELD date ON gig TYPE option<datetime>;
DEFINE FIELD type ON gig TYPE string; -- concert, busking, tv_appearance, dj_set, workshop
DEFINE FIELD city ON gig TYPE option<string>;
DEFINE FIELD country ON gig TYPE option<string>;
DEFINE FIELD venue_name ON gig TYPE option<string>;
DEFINE FIELD description ON gig TYPE option<string>;
DEFINE FIELD earnings ON gig TYPE option<float>;
DEFINE FIELD currency ON gig TYPE option<string>;
DEFINE FIELD story_context ON gig TYPE option<string>; -- For narrative posts
DEFINE FIELD key_moment ON gig TYPE option<string>;
DEFINE FIELD created_at ON gig TYPE datetime DEFAULT time::now();

DEFINE INDEX idx_gig_date ON gig COLUMNS date;
DEFINE INDEX idx_gig_type ON gig COLUMNS type;

-- Editorial Calendar
DEFINE TABLE editorial_slot SCHEMAFULL;
DEFINE FIELD scheduled_date ON editorial_slot TYPE datetime;
DEFINE FIELD platform ON editorial_slot TYPE string;
DEFINE FIELD post_type ON editorial_slot TYPE string; -- feed, reel, story, carousel
DEFINE FIELD status ON editorial_slot TYPE string DEFAULT "planned"; -- planned, ready, published
DEFINE FIELD title ON editorial_slot TYPE option<string>;
DEFINE FIELD notes ON editorial_slot TYPE option<string>;
DEFINE FIELD created_at ON editorial_slot TYPE datetime DEFAULT time::now();

DEFINE INDEX idx_editorial_date ON editorial_slot COLUMNS scheduled_date;
DEFINE INDEX idx_editorial_status ON editorial_slot COLUMNS status;

-- =====================================================
-- EXTENDED RELATIONS
-- =====================================================

-- Post follows Trend
DEFINE TABLE follows_trend TYPE RELATION IN post OUT trend;

-- Post belongs to Content Pillar
DEFINE TABLE belongs_to_pillar TYPE RELATION IN post OUT content_pillar;

-- Content taken at Gig
DEFINE TABLE taken_at_gig TYPE RELATION IN content OUT gig;

-- Audio used in Post
DEFINE TABLE uses_audio TYPE RELATION IN post OUT audio;

-- Gig at Venue
DEFINE TABLE performed_at TYPE RELATION IN gig OUT venue;

-- Editorial Slot linked to Post
DEFINE TABLE slot_for TYPE RELATION IN editorial_slot OUT post;

-- =====================================================
-- EXTENDED ANALYTICS FUNCTIONS
-- =====================================================

-- Function to get content pillar performance
DEFINE FUNCTION fn::pillar_performance($pillar: string) {
    LET $posts = (SELECT * FROM post WHERE ->belongs_to_pillar->content_pillar.name = $pillar);
    RETURN {
        pillar: $pillar,
        total_posts: count($posts),
        avg_engagement: math::mean($posts.engagement_rate),
        total_reach: math::sum($posts.reach)
    };
};

-- Function to get profile growth
DEFINE FUNCTION fn::profile_growth($platform: string, $days: int) {
    LET $snapshots = (SELECT * FROM profile_snapshot WHERE platform = $platform ORDER BY recorded_at DESC LIMIT $days);
    RETURN {
        platform: $platform,
        current_followers: $snapshots[0].followers,
        growth: $snapshots[0].followers - $snapshots[-1].followers,
        avg_engagement: math::mean($snapshots.engagement_rate)
    };
};

-- Function to get unused high-quality content
DEFINE FUNCTION fn::unused_content($min_quality: int) {
    RETURN (SELECT * FROM content WHERE used_count = 0 ORDER BY taken_at DESC);
};

-- =====================================================
-- ANALYSIS & TRACKING TABLES (Added 2026-01-21)
-- =====================================================

-- Analysis Session - Groups related API calls and analysis
DEFINE TABLE analysis_session SCHEMAFULL;
DEFINE FIELD session_name ON analysis_session TYPE string;
DEFINE FIELD description ON analysis_session TYPE option<string>;
DEFINE FIELD session_type ON analysis_session TYPE string DEFAULT "general"; -- hashtag_research, audience_snapshot, editorial_prep
DEFINE FIELD agent_id ON analysis_session TYPE option<string>;
DEFINE FIELD api_calls_made ON analysis_session TYPE int DEFAULT 0;
DEFINE FIELD started_at ON analysis_session TYPE datetime DEFAULT time::now();
DEFINE FIELD completed_at ON analysis_session TYPE option<datetime>;
DEFINE FIELD findings_summary ON analysis_session TYPE option<string>;

DEFINE INDEX idx_session_name ON analysis_session COLUMNS session_name;
DEFINE INDEX idx_session_type ON analysis_session COLUMNS session_type;
DEFINE INDEX idx_session_date ON analysis_session COLUMNS started_at;

-- API Snapshot - Raw API responses with timestamp
DEFINE TABLE api_snapshot SCHEMAFULL;
DEFINE FIELD api_name ON api_snapshot TYPE string;           -- instagram_insights, hashtag_search, audience_demographics
DEFINE FIELD endpoint ON api_snapshot TYPE string;           -- /me/insights, /ig_hashtag_search
DEFINE FIELD parameters ON api_snapshot TYPE option<object>; -- {hashtag: "busker", limit: 25}
DEFINE FIELD response ON api_snapshot TYPE object;           -- Raw API response
DEFINE FIELD api_version ON api_snapshot TYPE string DEFAULT "v24.0";
DEFINE FIELD success ON api_snapshot TYPE bool DEFAULT true;
DEFINE FIELD error_message ON api_snapshot TYPE option<string>;
DEFINE FIELD captured_at ON api_snapshot TYPE datetime DEFAULT time::now();
DEFINE FIELD expires_at ON api_snapshot TYPE option<datetime>;

DEFINE INDEX idx_snapshot_api ON api_snapshot COLUMNS api_name;
DEFINE INDEX idx_snapshot_date ON api_snapshot COLUMNS captured_at;

-- Hashtag Analysis - Processed hashtag performance data
DEFINE TABLE hashtag_analysis SCHEMAFULL;
DEFINE FIELD hashtag_name ON hashtag_analysis TYPE string;
DEFINE FIELD instagram_id ON hashtag_analysis TYPE option<string>;
DEFINE FIELD avg_likes ON hashtag_analysis TYPE int DEFAULT 0;
DEFINE FIELD avg_comments ON hashtag_analysis TYPE int DEFAULT 0;
DEFINE FIELD engagement_score ON hashtag_analysis TYPE int DEFAULT 0; -- likes + (comments * 2)
DEFINE FIELD top_posts_analyzed ON hashtag_analysis TYPE int DEFAULT 0;
DEFINE FIELD sample_posts ON hashtag_analysis TYPE array DEFAULT [];
DEFINE FIELD recommendation ON hashtag_analysis TYPE option<string>; -- keep, avoid, test
DEFINE FIELD analyzed_at ON hashtag_analysis TYPE datetime DEFAULT time::now();
DEFINE FIELD rate_limit_week ON hashtag_analysis TYPE option<int>; -- X/30 used this week

DEFINE INDEX idx_hashtag_analysis_name ON hashtag_analysis COLUMNS hashtag_name UNIQUE;
DEFINE INDEX idx_hashtag_analysis_score ON hashtag_analysis COLUMNS engagement_score;
DEFINE INDEX idx_hashtag_analysis_date ON hashtag_analysis COLUMNS analyzed_at;

-- Audience Snapshot - Detailed audience demographics
DEFINE TABLE audience_snapshot SCHEMAFULL;
DEFINE FIELD platform ON audience_snapshot TYPE string;
DEFINE FIELD username ON audience_snapshot TYPE string;
DEFINE FIELD followers ON audience_snapshot TYPE int DEFAULT 0;
DEFINE FIELD following ON audience_snapshot TYPE int DEFAULT 0;
DEFINE FIELD posts_count ON audience_snapshot TYPE int DEFAULT 0;
DEFINE FIELD reach_28d ON audience_snapshot TYPE option<int>;
DEFINE FIELD profile_views_28d ON audience_snapshot TYPE option<int>;
DEFINE FIELD website_clicks_28d ON audience_snapshot TYPE option<int>;
DEFINE FIELD top_countries ON audience_snapshot TYPE array DEFAULT [];   -- [{country: "IT", count: 738}]
DEFINE FIELD top_cities ON audience_snapshot TYPE array DEFAULT [];      -- [{city: "Milan", count: 54}]
DEFINE FIELD age_gender ON audience_snapshot TYPE array DEFAULT [];      -- [{age: "25-34", male: 192, female: 163}]
DEFINE FIELD engagement_rate ON audience_snapshot TYPE option<float>;
DEFINE FIELD captured_at ON audience_snapshot TYPE datetime DEFAULT time::now();

DEFINE INDEX idx_audience_platform ON audience_snapshot COLUMNS platform;
DEFINE INDEX idx_audience_date ON audience_snapshot COLUMNS captured_at;

-- Post Draft - Posts ready to be published
DEFINE TABLE post_draft SCHEMAFULL;
DEFINE FIELD title ON post_draft TYPE string;
DEFINE FIELD platform ON post_draft TYPE string;
DEFINE FIELD post_type ON post_draft TYPE string;             -- carousel, reel, single, story
DEFINE FIELD caption ON post_draft TYPE string;
DEFINE FIELD hashtags ON post_draft TYPE array DEFAULT [];
DEFINE FIELD media_files ON post_draft TYPE array DEFAULT []; -- [{path: "...", order: 1, description: "..."}]
DEFINE FIELD scheduled_for ON post_draft TYPE option<datetime>;
DEFINE FIELD best_time ON post_draft TYPE option<string>;     -- "18:00 CET Monday"
DEFINE FIELD status ON post_draft TYPE string DEFAULT "draft"; -- draft, ready, scheduled, published, archived
DEFINE FIELD priority ON post_draft TYPE string DEFAULT "MEDIUM"; -- HIGH, MEDIUM, LOW
DEFINE FIELD target_audience ON post_draft TYPE array DEFAULT [];
DEFINE FIELD story_context ON post_draft TYPE option<object>;
DEFINE FIELD privacy_notes ON post_draft TYPE option<string>;
DEFINE FIELD published_post_id ON post_draft TYPE option<string>; -- Link to actual post after publishing
DEFINE FIELD created_at ON post_draft TYPE datetime DEFAULT time::now();
DEFINE FIELD updated_at ON post_draft TYPE datetime VALUE time::now();

DEFINE INDEX idx_draft_status ON post_draft COLUMNS status;
DEFINE INDEX idx_draft_priority ON post_draft COLUMNS priority;
DEFINE INDEX idx_draft_scheduled ON post_draft COLUMNS scheduled_for;

-- =====================================================
-- ANALYSIS RELATIONS
-- =====================================================

-- API snapshot captured during session
DEFINE TABLE captured_in TYPE RELATION IN api_snapshot OUT analysis_session;

-- Hashtag analysis done during session
DEFINE TABLE analyzed_in TYPE RELATION IN hashtag_analysis OUT analysis_session;

-- Audience snapshot taken during session
DEFINE TABLE snapshot_in TYPE RELATION IN audience_snapshot OUT analysis_session;

-- Post draft uses hashtag analysis
DEFINE TABLE uses_hashtag_analysis TYPE RELATION IN post_draft OUT hashtag_analysis;
DEFINE FIELD selected_at ON uses_hashtag_analysis TYPE datetime DEFAULT time::now();
DEFINE FIELD reason ON uses_hashtag_analysis TYPE option<string>;

-- Post draft based on audience snapshot
DEFINE TABLE targets_audience TYPE RELATION IN post_draft OUT audience_snapshot;

-- =====================================================
-- ANALYSIS FUNCTIONS
-- =====================================================

-- Get data freshness summary
DEFINE FUNCTION fn::data_freshness() {
    LET $hashtag = (SELECT math::max(analyzed_at) AS latest FROM hashtag_analysis);
    LET $audience = (SELECT math::max(captured_at) AS latest FROM audience_snapshot);
    LET $api = (SELECT math::max(captured_at) AS latest FROM api_snapshot);
    RETURN {
        hashtag_analysis: {
            latest: $hashtag[0].latest,
            age_hours: IF $hashtag[0].latest THEN duration::hours(time::now() - $hashtag[0].latest) ELSE NONE END
        },
        audience_snapshot: {
            latest: $audience[0].latest,
            age_hours: IF $audience[0].latest THEN duration::hours(time::now() - $audience[0].latest) ELSE NONE END
        },
        api_snapshot: {
            latest: $api[0].latest,
            age_hours: IF $api[0].latest THEN duration::hours(time::now() - $api[0].latest) ELSE NONE END
        }
    };
};

-- Get top performing hashtags
DEFINE FUNCTION fn::top_hashtags($limit: int) {
    RETURN (
        SELECT hashtag_name, engagement_score, avg_likes, avg_comments, analyzed_at
        FROM hashtag_analysis
        ORDER BY engagement_score DESC
        LIMIT $limit
    );
};

-- Get latest audience data
DEFINE FUNCTION fn::latest_audience($platform: string) {
    RETURN (
        SELECT *
        FROM audience_snapshot
        WHERE platform = $platform
        ORDER BY captured_at DESC
        LIMIT 1
    )[0];
};

-- Get ready posts
DEFINE FUNCTION fn::ready_posts() {
    RETURN (
        SELECT *
        FROM post_draft
        WHERE status IN ["ready", "scheduled"]
        ORDER BY priority DESC, scheduled_for ASC
    );
};

-- =====================================================
-- STORY ARCS & NARRATIVE PATHS (Added 2026-01-21)
-- Multi-Agent Orchestration for Parallel Narratives
-- =====================================================

-- Story Arc - Weekly narrative theme
DEFINE TABLE story_arc SCHEMAFULL;
DEFINE FIELD name ON story_arc TYPE string;                    -- "Origins - Layer su Layer"
DEFINE FIELD theme ON story_arc TYPE string;                   -- Main narrative theme
DEFINE FIELD description ON story_arc TYPE option<string>;     -- Extended description
DEFINE FIELD week_start ON story_arc TYPE datetime;            -- Monday of the week
DEFINE FIELD week_end ON story_arc TYPE datetime;              -- Sunday of the week
DEFINE FIELD pillars ON story_arc TYPE array DEFAULT [];       -- Pillars featured: ["tech", "music", "nature"]
DEFINE FIELD user_brief ON story_arc TYPE option<string>;      -- Original user input/direction
DEFINE FIELD status ON story_arc TYPE string DEFAULT "planned"; -- planned, active, completed, archived
DEFINE FIELD crossover_concept ON story_arc TYPE option<string>; -- How tech + music connect Saturday
DEFINE FIELD created_at ON story_arc TYPE datetime DEFAULT time::now();
DEFINE FIELD updated_at ON story_arc TYPE datetime VALUE time::now();

DEFINE INDEX idx_arc_week ON story_arc COLUMNS week_start;
DEFINE INDEX idx_arc_status ON story_arc COLUMNS status;
DEFINE INDEX idx_arc_name ON story_arc COLUMNS name;

-- Narrative Path - Parallel storyline within an arc
DEFINE TABLE narrative_path SCHEMAFULL;
DEFINE FIELD path_type ON narrative_path TYPE string;          -- "tech", "music", "hybrid"
DEFINE FIELD name ON narrative_path TYPE option<string>;       -- "jsOM Launch Journey"
DEFINE FIELD description ON narrative_path TYPE option<string>;
DEFINE FIELD target_platforms ON narrative_path TYPE array DEFAULT []; -- ["twitter", "instagram"]
DEFINE FIELD day_schedule ON narrative_path TYPE object;       -- {monday: "teaser", wednesday: "BTS", friday: "demo"}
DEFINE FIELD created_at ON narrative_path TYPE datetime DEFAULT time::now();

DEFINE INDEX idx_path_type ON narrative_path COLUMNS path_type;

-- Platform Content - Adapted content for each platform
DEFINE TABLE platform_content SCHEMAFULL;
DEFINE FIELD platform ON platform_content TYPE string;         -- "twitter", "instagram", "youtube"
DEFINE FIELD content_type ON platform_content TYPE string;     -- "thread", "reel", "carousel", "short", "story"
DEFINE FIELD title ON platform_content TYPE option<string>;
DEFINE FIELD caption ON platform_content TYPE string;
DEFINE FIELD hashtags ON platform_content TYPE array DEFAULT [];
DEFINE FIELD media_files ON platform_content TYPE array DEFAULT [];
DEFINE FIELD scheduled_for ON platform_content TYPE option<datetime>;
DEFINE FIELD scheduled_time ON platform_content TYPE option<string>; -- "19:00 CET"
DEFINE FIELD day_of_week ON platform_content TYPE option<string>;    -- "friday"
DEFINE FIELD status ON platform_content TYPE string DEFAULT "draft"; -- draft, ready, published
DEFINE FIELD published_at ON platform_content TYPE option<datetime>;
DEFINE FIELD external_id ON platform_content TYPE option<string>;    -- Platform post ID after publishing
DEFINE FIELD performance ON platform_content TYPE option<object>;    -- {likes: 0, shares: 0, saves: 0}
DEFINE FIELD created_at ON platform_content TYPE datetime DEFAULT time::now();
DEFINE FIELD updated_at ON platform_content TYPE datetime VALUE time::now();

DEFINE INDEX idx_platform_content_platform ON platform_content COLUMNS platform;
DEFINE INDEX idx_platform_content_status ON platform_content COLUMNS status;
DEFINE INDEX idx_platform_content_scheduled ON platform_content COLUMNS scheduled_for;

-- =====================================================
-- STORY ARC RELATIONS
-- =====================================================

-- Narrative path belongs to story arc
DEFINE TABLE path_in_arc TYPE RELATION IN narrative_path OUT story_arc;
DEFINE FIELD role ON path_in_arc TYPE option<string>; -- "primary", "secondary"

-- Post/content is part of story arc
DEFINE TABLE part_of_arc TYPE RELATION IN post OUT story_arc;
DEFINE FIELD contribution ON part_of_arc TYPE option<string>; -- "setup", "development", "payoff"

-- Post follows a narrative path
DEFINE TABLE follows_path TYPE RELATION IN post OUT narrative_path;
DEFINE FIELD day ON follows_path TYPE option<string>; -- "monday", "friday"

-- Platform content derived from source content
DEFINE TABLE adapted_from TYPE RELATION IN platform_content OUT content;
DEFINE FIELD adaptation_notes ON adapted_from TYPE option<string>;

-- Platform content follows narrative path
DEFINE TABLE platform_follows_path TYPE RELATION IN platform_content OUT narrative_path;

-- Platform content part of arc
DEFINE TABLE platform_in_arc TYPE RELATION IN platform_content OUT story_arc;

-- =====================================================
-- STORY ARC FUNCTIONS
-- =====================================================

-- Get current week's story arc
DEFINE FUNCTION fn::current_arc() {
    LET $now = time::now();
    RETURN (
        SELECT *
        FROM story_arc
        WHERE week_start <= $now AND week_end >= $now
        LIMIT 1
    )[0];
};

-- Get narrative paths for an arc
DEFINE FUNCTION fn::arc_paths($arc_id: record) {
    RETURN (
        SELECT *, <-path_in_arc<-narrative_path AS paths
        FROM story_arc
        WHERE id = $arc_id
    );
};

-- Get weekly content schedule
DEFINE FUNCTION fn::weekly_schedule($week_start: datetime) {
    LET $arc = (SELECT * FROM story_arc WHERE week_start = $week_start)[0];
    LET $content = (SELECT * FROM platform_content WHERE ->platform_in_arc->story_arc = $arc.id ORDER BY scheduled_for);
    RETURN {
        arc: $arc,
        content: $content,
        by_day: {
            monday: $content[WHERE day_of_week = "monday"],
            tuesday: $content[WHERE day_of_week = "tuesday"],
            wednesday: $content[WHERE day_of_week = "wednesday"],
            thursday: $content[WHERE day_of_week = "thursday"],
            friday: $content[WHERE day_of_week = "friday"],
            saturday: $content[WHERE day_of_week = "saturday"],
            sunday: $content[WHERE day_of_week = "sunday"]
        }
    };
};

-- Get path performance
DEFINE FUNCTION fn::path_performance($path_id: record) {
    LET $content = (SELECT * FROM platform_content WHERE ->platform_follows_path->narrative_path = $path_id);
    RETURN {
        path: $path_id,
        total_posts: count($content),
        published: count($content[WHERE status = "published"]),
        avg_engagement: math::mean($content.performance.engagement_rate)
    };
};

-- =====================================================
-- INTERVIEWER SESSIONS (Added 2026-01-21)
-- User Feedback & Story Collection
-- =====================================================

-- Interview Session - User feedback collection
DEFINE TABLE interview_session SCHEMAFULL;
DEFINE FIELD session_id ON interview_session TYPE string;
DEFINE FIELD topic ON interview_session TYPE string;       -- post_feedback, story_collection, weekly_planning, etc
DEFINE FIELD started_at ON interview_session TYPE datetime;
DEFINE FIELD responses ON interview_session TYPE array DEFAULT [];
DEFINE FIELD insights ON interview_session TYPE option<object>;
DEFINE FIELD status ON interview_session TYPE string DEFAULT "active"; -- active, completed, paused
DEFINE FIELD created_at ON interview_session TYPE datetime DEFAULT time::now();

DEFINE INDEX idx_interview_topic ON interview_session COLUMNS topic;
DEFINE INDEX idx_interview_date ON interview_session COLUMNS started_at;
DEFINE INDEX idx_interview_status ON interview_session COLUMNS status;

-- Get recent interview insights
DEFINE FUNCTION fn::recent_insights($limit: int) {
    RETURN (
        SELECT topic, insights, started_at
        FROM interview_session
        WHERE status = "completed" AND insights != NONE
        ORDER BY started_at DESC
        LIMIT $limit
    );
};

-- =====================================================
-- ARTIST PROFILE & SOFTWARE PROJECTS (Added 2026-01-22)
-- Central nodes for agent context retrieval
-- =====================================================

-- Artist Profile - Central identity node
DEFINE TABLE artist_profile SCHEMALESS;
DEFINE FIELD name ON artist_profile TYPE string;
DEFINE FIELD stage_name ON artist_profile TYPE string;
DEFINE FIELD based_in ON artist_profile TYPE option<string>;
DEFINE FIELD instruments ON artist_profile TYPE array DEFAULT [];
DEFINE FIELD genres ON artist_profile TYPE array DEFAULT [];
DEFINE FIELD endorsements ON artist_profile TYPE array DEFAULT [];
DEFINE FIELD credentials_for_outreach ON artist_profile TYPE array DEFAULT [];
DEFINE FIELD social ON artist_profile TYPE option<object>;
DEFINE FIELD content_pillars ON artist_profile TYPE array DEFAULT [];
DEFINE FIELD ideal_venues ON artist_profile TYPE option<object>;
DEFINE FIELD created_at ON artist_profile TYPE datetime DEFAULT time::now();
DEFINE FIELD updated_at ON artist_profile TYPE datetime VALUE time::now();

DEFINE INDEX idx_artist_stage_name ON artist_profile COLUMNS stage_name UNIQUE;

-- Software Project - For jsOM and other tech projects
DEFINE TABLE software_project SCHEMAFULL;
DEFINE FIELD name ON software_project TYPE string;
DEFINE FIELD repo_url ON software_project TYPE option<string>;
DEFINE FIELD description ON software_project TYPE string;
DEFINE FIELD status ON software_project TYPE string DEFAULT "active"; -- active, archived, acquired
DEFINE FIELD exit_potential ON software_project TYPE option<string>; -- "6-7 figures", etc
DEFINE FIELD target_acquirers ON software_project TYPE array DEFAULT []; -- ["Lovable", "Vercel", etc]
DEFINE FIELD github_stars ON software_project TYPE int DEFAULT 0;
DEFINE FIELD npm_downloads ON software_project TYPE int DEFAULT 0;
DEFINE FIELD tech_stack ON software_project TYPE array DEFAULT [];
DEFINE FIELD milestones ON software_project TYPE array DEFAULT []; -- [{date, achievement}]
DEFINE FIELD content_ideas ON software_project TYPE array DEFAULT []; -- For build-in-public
DEFINE FIELD created_at ON software_project TYPE datetime DEFAULT time::now();
DEFINE FIELD updated_at ON software_project TYPE datetime VALUE time::now();

DEFINE INDEX idx_project_name ON software_project COLUMNS name UNIQUE;
DEFINE INDEX idx_project_status ON software_project COLUMNS status;

-- Acquisition Target - Potential acquirers/incubators
DEFINE TABLE acquisition_target SCHEMAFULL;
DEFINE FIELD name ON acquisition_target TYPE string;
DEFINE FIELD type ON acquisition_target TYPE string; -- "acquirer", "incubator", "vc"
DEFINE FIELD website ON acquisition_target TYPE option<string>;
DEFINE FIELD contact_email ON acquisition_target TYPE option<string>;
DEFINE FIELD notes ON acquisition_target TYPE option<string>;
DEFINE FIELD priority ON acquisition_target TYPE int DEFAULT 2; -- 1=high, 2=medium, 3=low
DEFINE FIELD status ON acquisition_target TYPE string DEFAULT "prospect"; -- prospect, contacted, interested, passed
DEFINE FIELD created_at ON acquisition_target TYPE datetime DEFAULT time::now();

DEFINE INDEX idx_target_priority ON acquisition_target COLUMNS priority;
DEFINE INDEX idx_target_status ON acquisition_target COLUMNS status;

-- =====================================================
-- ARTIST & PROJECT RELATIONS
-- =====================================================

-- Artist creates software project
DEFINE TABLE creates TYPE RELATION IN artist_profile OUT software_project;
DEFINE FIELD role ON creates TYPE string DEFAULT "creator"; -- creator, contributor

-- Software project targets acquirer
DEFINE TABLE targets TYPE RELATION IN software_project OUT acquisition_target;
DEFINE FIELD pitch_sent ON targets TYPE bool DEFAULT false;
DEFINE FIELD pitch_date ON targets TYPE option<datetime>;
DEFINE FIELD response ON targets TYPE option<string>;

-- Artist performs at venue
DEFINE TABLE performs_at TYPE RELATION IN artist_profile OUT venue;
DEFINE FIELD performance_type ON performs_at TYPE option<string>; -- dj_set, live, sound_bath
DEFINE FIELD date ON performs_at TYPE option<datetime>;

-- Artist sends email (for outreach tracking)
DEFINE TABLE sends_email TYPE RELATION IN artist_profile OUT email;

-- =====================================================
-- OUTREACH EMAIL TRACKING EXTENSION
-- =====================================================

-- Tracking & outreach fields
DEFINE FIELD tracking_id ON email TYPE option<string>;  -- matches tracking.json id
DEFINE FIELD bounced ON email TYPE bool DEFAULT false;
DEFINE FIELD bounce_type ON email TYPE option<string>;  -- hard, soft
DEFINE FIELD bounce_reason ON email TYPE option<string>;
DEFINE FIELD bounce_detected_at ON email TYPE option<datetime>;
DEFINE FIELD follow_up_due ON email TYPE option<datetime>;
DEFINE FIELD campaign ON email TYPE option<string>;     -- batch identifier

-- Follow-up tracking
DEFINE FIELD followup_sent ON email TYPE bool DEFAULT false;
DEFINE FIELD followup_sent_at ON email TYPE option<datetime>;
DEFINE FIELD followup2_sent ON email TYPE bool DEFAULT false;
DEFINE FIELD followup2_sent_at ON email TYPE option<datetime>;

-- Reply tracking (denormalized from outreach_reply for fast queries)
DEFINE FIELD reply_received ON email TYPE bool DEFAULT false;
DEFINE FIELD reply_type ON email TYPE option<string>;     -- human_reply, auto_reply
DEFINE FIELD reply_preview ON email TYPE option<string>;
DEFINE FIELD reply_date ON email TYPE option<datetime>;

-- Gmail API thread linking
DEFINE FIELD gmail_thread_id ON email TYPE option<string>;   -- Gmail thread ID (groups sent+reply)
DEFINE FIELD gmail_message_id ON email TYPE option<string>;  -- Gmail internal message ID

DEFINE INDEX idx_email_tracking ON email COLUMNS tracking_id;
DEFINE INDEX idx_email_bounced ON email COLUMNS bounced;
DEFINE INDEX idx_email_followup ON email COLUMNS followup_sent;
DEFINE INDEX idx_email_reply ON email COLUMNS reply_received;
DEFINE INDEX idx_email_reply_type ON email COLUMNS reply_type;
DEFINE INDEX idx_email_thread ON email COLUMNS gmail_thread_id;

-- =====================================================
-- AGENT RETRIEVAL FUNCTIONS
-- =====================================================

-- Get artist profile (single source of truth)
DEFINE FUNCTION fn::get_artist() {
    RETURN (SELECT * FROM artist_profile WHERE stage_name = "Flutur" LIMIT 1)[0];
};

-- Get software project by name
DEFINE FUNCTION fn::get_project($name: string) {
    RETURN (SELECT * FROM software_project WHERE name = $name LIMIT 1)[0];
};

-- Get outreach status summary
DEFINE FUNCTION fn::outreach_status() {
    LET $total = (SELECT count() FROM email GROUP ALL)[0].count;
    LET $bounced = (SELECT count() FROM email WHERE bounced = true GROUP ALL)[0].count;
    LET $responded = (SELECT count() FROM email WHERE response_received = true GROUP ALL)[0].count;
    LET $pending_followup = (SELECT count() FROM email WHERE follow_up_due <= time::now() AND response_received = false GROUP ALL)[0].count;
    RETURN {
        total_sent: $total,
        bounced: $bounced,
        responded: $responded,
        pending_followup: $pending_followup,
        response_rate: IF $total > 0 THEN ($responded / $total * 100) ELSE 0 END
    };
};

-- Get venues needing follow-up
DEFINE FUNCTION fn::venues_need_followup() {
    RETURN (
        SELECT
            venue.name,
            venue.country,
            email.sent_at,
            email.follow_up_due
        FROM email
        WHERE follow_up_due <= time::now()
          AND response_received = false
          AND bounced = false
        FETCH venue
        ORDER BY follow_up_due ASC
    );
};

-- Get content for specific location/category
DEFINE FUNCTION fn::content_for_post($location: option<string>, $category: option<string>) {
    RETURN (
        SELECT *
        FROM content
        WHERE (location = $location OR $location = NONE)
          AND (category = $category OR $category = NONE)
          AND used_count = 0
        ORDER BY taken_at DESC
        LIMIT 20
    );
};

-- =====================================================
-- CROSS-PLATFORM ANALYTICS (Added 2026-02-07)
-- YouTube + Instagram + EPK correlation engine
-- =====================================================

-- YouTube Channel Snapshot (daily)
DEFINE TABLE youtube_snapshot SCHEMALESS;
DEFINE FIELD channel_id ON youtube_snapshot TYPE string;
DEFINE FIELD date ON youtube_snapshot TYPE string;
DEFINE FIELD total_views ON youtube_snapshot TYPE int DEFAULT 0;
DEFINE FIELD total_subscribers ON youtube_snapshot TYPE int DEFAULT 0;
DEFINE FIELD total_videos ON youtube_snapshot TYPE int DEFAULT 0;
DEFINE FIELD views_last_28d ON youtube_snapshot TYPE int DEFAULT 0;
DEFINE FIELD watch_time_last_28d ON youtube_snapshot TYPE int DEFAULT 0;
DEFINE FIELD subscribers_gained_last_28d ON youtube_snapshot TYPE int DEFAULT 0;
DEFINE FIELD traffic_sources ON youtube_snapshot TYPE array DEFAULT [];
DEFINE FIELD captured_at ON youtube_snapshot TYPE datetime DEFAULT time::now();

DEFINE INDEX idx_yt_snapshot_date ON youtube_snapshot COLUMNS date;

-- YouTube Per-Video Snapshot
DEFINE TABLE youtube_video_snapshot SCHEMALESS;
DEFINE FIELD video_id ON youtube_video_snapshot TYPE string;
DEFINE FIELD title ON youtube_video_snapshot TYPE string;
DEFINE FIELD published_at ON youtube_video_snapshot TYPE option<string>;
DEFINE FIELD views ON youtube_video_snapshot TYPE int DEFAULT 0;
DEFINE FIELD likes ON youtube_video_snapshot TYPE int DEFAULT 0;
DEFINE FIELD comments ON youtube_video_snapshot TYPE int DEFAULT 0;
DEFINE FIELD watch_time_minutes ON youtube_video_snapshot TYPE int DEFAULT 0;
DEFINE FIELD avg_view_duration ON youtube_video_snapshot TYPE int DEFAULT 0;
DEFINE FIELD subscribers_gained ON youtube_video_snapshot TYPE int DEFAULT 0;
DEFINE FIELD snapshot_date ON youtube_video_snapshot TYPE string;
DEFINE FIELD captured_at ON youtube_video_snapshot TYPE datetime DEFAULT time::now();

DEFINE INDEX idx_yt_video_date ON youtube_video_snapshot COLUMNS snapshot_date;
DEFINE INDEX idx_yt_video_id ON youtube_video_snapshot COLUMNS video_id;

-- Instagram Media Snapshot (per-post metrics over time)
DEFINE TABLE instagram_media_snapshot SCHEMALESS;
DEFINE FIELD media_id ON instagram_media_snapshot TYPE string;
DEFINE FIELD media_type ON instagram_media_snapshot TYPE string;
DEFINE FIELD timestamp ON instagram_media_snapshot TYPE option<string>;
DEFINE FIELD permalink ON instagram_media_snapshot TYPE option<string>;
DEFINE FIELD likes ON instagram_media_snapshot TYPE int DEFAULT 0;
DEFINE FIELD comments ON instagram_media_snapshot TYPE int DEFAULT 0;
DEFINE FIELD shares ON instagram_media_snapshot TYPE int DEFAULT 0;
DEFINE FIELD saved ON instagram_media_snapshot TYPE int DEFAULT 0;
DEFINE FIELD reach ON instagram_media_snapshot TYPE int DEFAULT 0;
DEFINE FIELD impressions ON instagram_media_snapshot TYPE int DEFAULT 0;
DEFINE FIELD plays ON instagram_media_snapshot TYPE int DEFAULT 0;
DEFINE FIELD snapshot_date ON instagram_media_snapshot TYPE string;
DEFINE FIELD captured_at ON instagram_media_snapshot TYPE datetime DEFAULT time::now();

DEFINE INDEX idx_ig_media_date ON instagram_media_snapshot COLUMNS snapshot_date;
DEFINE INDEX idx_ig_media_id ON instagram_media_snapshot COLUMNS media_id;

-- EPK Web Analytics (Vercel - manual CSV import, no API)
DEFINE TABLE epk_analytics SCHEMALESS;
DEFINE FIELD date ON epk_analytics TYPE string;
DEFINE FIELD page_views ON epk_analytics TYPE int DEFAULT 0;
DEFINE FIELD visitors ON epk_analytics TYPE int DEFAULT 0;
DEFINE FIELD top_referrers ON epk_analytics TYPE array DEFAULT [];
DEFINE FIELD top_pages ON epk_analytics TYPE array DEFAULT [];
DEFINE FIELD countries ON epk_analytics TYPE array DEFAULT [];
DEFINE FIELD imported_at ON epk_analytics TYPE datetime DEFAULT time::now();

DEFINE INDEX idx_epk_date ON epk_analytics COLUMNS date;

-- Cross-Platform Correlation Events
DEFINE TABLE analytics_correlation SCHEMALESS;
DEFINE FIELD date ON analytics_correlation TYPE string;
DEFINE FIELD trigger_info ON analytics_correlation TYPE option<object>;
DEFINE FIELD signals ON analytics_correlation TYPE array DEFAULT [];
DEFINE FIELD confidence ON analytics_correlation TYPE string DEFAULT "low";
DEFINE FIELD outcome ON analytics_correlation TYPE option<string>;
DEFINE FIELD notes ON analytics_correlation TYPE option<string>;
DEFINE FIELD detected_at ON analytics_correlation TYPE datetime DEFAULT time::now();

DEFINE INDEX idx_correlation_date ON analytics_correlation COLUMNS date;
DEFINE INDEX idx_correlation_confidence ON analytics_correlation COLUMNS confidence;

-- =====================================================
-- ANALYTICS FUNCTIONS (Cross-Platform)
-- =====================================================

-- Get YouTube video performance trend
DEFINE FUNCTION fn::youtube_video_trend($video_id: string, $days: int) {
    RETURN (
        SELECT video_id, title, views, likes, watch_time_minutes, snapshot_date
        FROM youtube_video_snapshot
        WHERE video_id = $video_id
        ORDER BY snapshot_date DESC
        LIMIT $days
    );
};

-- Get recent correlations
DEFINE FUNCTION fn::recent_correlations($limit: int) {
    RETURN (
        SELECT *
        FROM analytics_correlation
        WHERE confidence IN ["high", "medium"]
        ORDER BY detected_at DESC
        LIMIT $limit
    );
};

-- Get cross-platform summary for a date
DEFINE FUNCTION fn::daily_analytics($date: string) {
    LET $yt = (SELECT * FROM youtube_snapshot WHERE date = $date LIMIT 1)[0];
    LET $ig = (SELECT * FROM audience_snapshot WHERE string::startsWith(string::from::datetime(captured_at), $date) ORDER BY captured_at DESC LIMIT 1)[0];
    LET $epk = (SELECT * FROM epk_analytics WHERE date = $date LIMIT 1)[0];
    LET $emails = (SELECT count() FROM email WHERE string::startsWith(string::from::datetime(sent_at), $date) GROUP ALL)[0].count;
    RETURN {
        date: $date,
        youtube: $yt,
        instagram: $ig,
        epk: $epk,
        emails_sent: $emails
    };
};

-- =====================================================
-- AGENT MEMORY (V7 Monade Persistence)
-- =====================================================
-- Separate from analysis_session (API call tracking).
-- These tables track agent COGNITIVE sessions:
--   what was discussed, decided, observed, and acted on.
-- Memory format: V7 monade (tessuto collassato).

-- Per-invocation session record
DEFINE TABLE agent_session SCHEMAFULL;
DEFINE FIELD agent_id ON agent_session TYPE string;
DEFINE FIELD department ON agent_session TYPE string;
DEFINE FIELD started_at ON agent_session TYPE datetime;
DEFINE FIELD ended_at ON agent_session TYPE option<datetime>;
DEFINE FIELD trigger ON agent_session TYPE string;
DEFINE FIELD monad_text ON agent_session TYPE string;
DEFINE FIELD entities_touched ON agent_session TYPE array;
DEFINE FIELD sigma2_count ON agent_session TYPE int DEFAULT 0;
DEFINE FIELD status ON agent_session TYPE string DEFAULT 'active';
DEFINE INDEX idx_agent_session_agent ON agent_session FIELDS agent_id;
DEFINE INDEX idx_agent_session_dept ON agent_session FIELDS department;
DEFINE INDEX idx_agent_session_date ON agent_session FIELDS started_at;

-- Fused department memory (RNA working copy — DD-015)
-- One record per department. Updated by FUSE on threshold.
DEFINE TABLE dept_memory SCHEMAFULL;
DEFINE FIELD department ON dept_memory TYPE string;
DEFINE FIELD monad_text ON dept_memory TYPE string;
DEFINE FIELD session_count ON dept_memory TYPE int DEFAULT 0;
DEFINE FIELD last_fused ON dept_memory TYPE datetime;
DEFINE FIELD entities ON dept_memory TYPE array;
DEFINE FIELD sigma2_decisions ON dept_memory TYPE array;
DEFINE INDEX idx_dept_memory_dept ON dept_memory FIELDS department;

-- Cross-department intelligence links
-- When agent in dept X touches entity Y, a link is created
-- so other departments can query "who knows about Y?"
DEFINE TABLE memory_link SCHEMAFULL;
DEFINE FIELD from_dept ON memory_link TYPE string;
DEFINE FIELD to_entity ON memory_link TYPE string;
DEFINE FIELD signal_type ON memory_link TYPE string;
DEFINE FIELD content ON memory_link TYPE string;
DEFINE FIELD sigma ON memory_link TYPE string;
DEFINE FIELD created_at ON memory_link TYPE datetime;
DEFINE INDEX idx_memory_link_entity ON memory_link FIELDS to_entity;
DEFINE INDEX idx_memory_link_dept ON memory_link FIELDS from_dept;

-- Query: what does marketing know about Japan?
DEFINE FUNCTION fn::entity_memory($entity: string) {
    RETURN (
        SELECT * FROM memory_link
        WHERE to_entity = $entity
        ORDER BY created_at DESC
    );
};

-- Query: all σ₂ decisions in last N days
DEFINE FUNCTION fn::recent_decisions($days: int) {
    RETURN (
        SELECT * FROM memory_link
        WHERE sigma = 'σ₂'
        AND signal_type = 'decision'
        AND created_at >= time::now() - type::duration(string::concat($days, 'd'))
        ORDER BY created_at DESC
    );
};

-- =====================================================
-- SESSION NARRATIVE LOG (Human↔Claude Persistence)
-- =====================================================
-- Unlike agent_session (automated agent cognition),
-- session_log captures the USER↔CLAUDE conversation:
--   what was asked, what was done, what was decided.
--
-- Three access modes on one table:
--   SQL    → structured queries (by date, entity, trigger)
--   Graph  → entity relationships (session→touched→entity)
--   Vector → semantic search ("find sessions about pricing")

DEFINE TABLE session_log SCHEMAFULL;
DEFINE FIELD title ON session_log TYPE string;
DEFINE FIELD trigger_source ON session_log TYPE string;              -- "user request", "morning check", "follow-up"
DEFINE FIELD actions ON session_log TYPE array DEFAULT [];           -- ["Sent reply to Victoria", "Saved YT analytics"]
DEFINE FIELD decisions ON session_log TYPE array DEFAULT [];         -- σ₂: ["Gulf signal downgraded"]
DEFINE FIELD entities ON session_log TYPE array DEFAULT [];          -- ["market:gulf", "venue:afrogreco"]
DEFINE FIELD files ON session_log TYPE array DEFAULT [];             -- [{path, action}]
DEFINE FIELD next_steps ON session_log TYPE array DEFAULT [];        -- Open items for next session
DEFINE FIELD notes ON session_log TYPE option<string>;
DEFINE FIELD summary ON session_log TYPE option<string>;             -- One-paragraph narrative
DEFINE FIELD embedding ON session_log TYPE option<array<float>>;     -- Vector: semantic search
DEFINE FIELD started_at ON session_log TYPE datetime DEFAULT time::now();
DEFINE FIELD ended_at ON session_log TYPE option<datetime>;
DEFINE FIELD created_at ON session_log TYPE datetime DEFAULT time::now();

DEFINE INDEX idx_session_log_date ON session_log FIELDS created_at;
DEFINE INDEX idx_session_log_trigger ON session_log FIELDS trigger_source;
-- Vector index: HNSW for semantic similarity search on session summaries
-- Dimension 384 = sentence-transformers/all-MiniLM-L6-v2
DEFINE INDEX idx_session_log_embedding ON session_log FIELDS embedding HNSW DIMENSION 384 DIST COSINE;

-- Graph relation: session touched entity
DEFINE TABLE session_touched TYPE RELATION IN session_log OUT memory_link;
DEFINE FIELD context ON session_touched TYPE option<string>;         -- "discussed", "modified", "created"

-- =====================================================
-- VECTOR EXTENSION: memory_link semantic search
-- =====================================================
-- Adds embedding field to existing memory_link table
-- for semantic retrieval across all agent decisions

DEFINE FIELD embedding ON memory_link TYPE option<array<float>>;
DEFINE INDEX idx_memory_link_embedding ON memory_link FIELDS embedding HNSW DIMENSION 384 DIST COSINE;

-- =====================================================
-- SESSION NARRATIVE FUNCTIONS
-- =====================================================

-- Get last N session logs (for context injection)
DEFINE FUNCTION fn::recent_sessions($limit: int) {
    RETURN (
        SELECT id, title, trigger_source, actions, decisions, entities, next_steps, summary, created_at
        FROM session_log
        ORDER BY created_at DESC
        LIMIT $limit
    );
};

-- Get sessions that touched a specific entity
DEFINE FUNCTION fn::sessions_for_entity($entity: string) {
    RETURN (
        SELECT id, title, actions, decisions, created_at
        FROM session_log
        WHERE entities CONTAINS $entity
        ORDER BY created_at DESC
        LIMIT 10
    );
};

-- Full memory context for session bootstrap:
-- Last 3 sessions + all active σ₂ decisions + shared entities
DEFINE FUNCTION fn::session_context() {
    LET $sessions = (SELECT id, title, trigger_source, actions, decisions, entities, next_steps, summary, created_at
        FROM session_log ORDER BY created_at DESC LIMIT 3);
    LET $decisions = (SELECT * FROM memory_link WHERE sigma = 'σ₂' AND signal_type = 'decision'
        ORDER BY created_at DESC LIMIT 30);
    LET $shared = (SELECT to_entity, count() AS link_count, array::group(from_dept) AS departments
        FROM memory_link GROUP BY to_entity ORDER BY link_count DESC LIMIT 10);
    RETURN {
        recent_sessions: $sessions,
        active_decisions: $decisions,
        convergence_points: $shared
    };
};

-- =====================================================
-- STORY FRAGMENTS (Added 2026-02-07)
-- Biographical source material — the life narrative
-- story_arc = weekly distribution plan
-- story_fragment = raw life story pieces (source reservoir)
-- =====================================================

DEFINE TABLE story_fragment SCHEMAFULL;
DEFINE FIELD title ON story_fragment TYPE string;                    -- "Busking in Monastiraki Square"
DEFINE FIELD body ON story_fragment TYPE string;                     -- Full narrative text
DEFINE FIELD period ON story_fragment TYPE option<string>;           -- "2019-2021", "summer 2023"
DEFINE FIELD location ON story_fragment TYPE option<string>;         -- "Athens", "Denver", "Lake Maggiore"
DEFINE FIELD theme ON story_fragment TYPE string;                    -- transformation, origin, credential, struggle, discovery, craft
DEFINE FIELD emotional_tone ON story_fragment TYPE option<string>;   -- reflective, triumphant, vulnerable, raw
DEFINE FIELD entities ON story_fragment TYPE array DEFAULT [];       -- ["venue:villa_porta", "person:nate_equanimous"]
DEFINE FIELD channels_suitable ON story_fragment TYPE array DEFAULT []; -- ["instagram", "book", "website", "interview"]
DEFINE FIELD channels_published ON story_fragment TYPE array DEFAULT []; -- Where it's already been told
DEFINE FIELD sigma ON story_fragment TYPE string DEFAULT 'σ₁';      -- σ₁ structural, σ₂ if identity-defining
DEFINE FIELD book_chapter ON story_fragment TYPE option<string>;     -- Future book chapter reference
DEFINE FIELD source ON story_fragment TYPE option<string>;           -- "voice note", "interview", "written", "Claude session"
DEFINE FIELD created_at ON story_fragment TYPE datetime DEFAULT time::now();
DEFINE FIELD updated_at ON story_fragment TYPE datetime VALUE time::now();

DEFINE INDEX idx_fragment_theme ON story_fragment COLUMNS theme;
DEFINE INDEX idx_fragment_period ON story_fragment COLUMNS period;
DEFINE INDEX idx_fragment_sigma ON story_fragment COLUMNS sigma;

-- Fragment can inspire platform content
DEFINE TABLE fragment_inspires TYPE RELATION IN story_fragment OUT platform_content;
DEFINE FIELD adaptation ON fragment_inspires TYPE option<string>;    -- How it was adapted

-- Fragment fits into a story arc
DEFINE TABLE fragment_in_arc TYPE RELATION IN story_fragment OUT story_arc;
DEFINE FIELD role ON fragment_in_arc TYPE option<string>;            -- "core", "supporting", "callback"

-- =====================================================
-- WEB RESEARCH PERSISTENCE (Added 2026-02-07)
-- Captures all web research done during Claude sessions
-- Prevents re-searching + builds knowledge base
-- =====================================================

DEFINE TABLE web_research SCHEMAFULL;
DEFINE FIELD query ON web_research TYPE string;                      -- Search query or URL fetched
DEFINE FIELD source_type ON web_research TYPE string;                -- "web_search", "web_fetch", "deep_research"
DEFINE FIELD topic ON web_research TYPE string;                      -- "venue:afrogreco", "market:japan", "competitor:monolink"
DEFINE FIELD findings ON web_research TYPE string;                   -- Key findings summary
DEFINE FIELD raw_data ON web_research TYPE option<string>;           -- Raw response (truncated if needed)
DEFINE FIELD entities ON web_research TYPE array DEFAULT [];         -- Related entity IDs
DEFINE FIELD decisions ON web_research TYPE array DEFAULT [];        -- σ₂ decisions derived from this research
DEFINE FIELD session_id ON web_research TYPE option<string>;         -- Claude session that produced this
DEFINE FIELD urls ON web_research TYPE array DEFAULT [];             -- Source URLs
DEFINE FIELD still_valid ON web_research TYPE bool DEFAULT true;     -- Mark false when outdated
DEFINE FIELD expires_at ON web_research TYPE option<datetime>;       -- Auto-invalidation date
DEFINE FIELD created_at ON web_research TYPE datetime DEFAULT time::now();

DEFINE INDEX idx_research_topic ON web_research COLUMNS topic;
DEFINE INDEX idx_research_source ON web_research COLUMNS source_type;
DEFINE INDEX idx_research_query ON web_research COLUMNS query;
DEFINE INDEX idx_research_valid ON web_research COLUMNS still_valid;

-- =====================================================
-- OUTREACH REPLY (Formalized 2026-02-08)
-- Persists every venue reply with Gmail Message-ID dedup
-- Replaces schemaless outreach_reply table
-- =====================================================

DEFINE TABLE outreach_reply SCHEMAFULL;
DEFINE FIELD venue ON outreach_reply TYPE string;
DEFINE FIELD from_email ON outreach_reply TYPE string;
DEFINE FIELD from_name ON outreach_reply TYPE option<string>;
DEFINE FIELD from_domain ON outreach_reply TYPE string;
DEFINE FIELD subject ON outreach_reply TYPE string;
DEFINE FIELD reply_type ON outreach_reply TYPE string;              -- human_reply, auto_reply, bounce
DEFINE FIELD preview ON outreach_reply TYPE option<string>;         -- Gmail snippet
DEFINE FIELD body_text ON outreach_reply TYPE option<string>;       -- Plain text (up to 2K chars)
DEFINE FIELD gmail_message_id ON outreach_reply TYPE option<string>; -- Gmail internal ID (dedup key)
DEFINE FIELD gmail_thread_id ON outreach_reply TYPE option<string>;
DEFINE FIELD internet_message_id ON outreach_reply TYPE option<string>; -- RFC 2822 Message-ID
DEFINE FIELD received_at ON outreach_reply TYPE option<datetime>;
DEFINE FIELD snapshot_date ON outreach_reply TYPE option<string>;   -- Legacy: date string from old morning check
DEFINE FIELD created_at ON outreach_reply TYPE datetime DEFAULT time::now();

DEFINE INDEX idx_reply_domain ON outreach_reply COLUMNS from_domain;
DEFINE INDEX idx_reply_type ON outreach_reply COLUMNS reply_type;
DEFINE INDEX idx_reply_gmail_id ON outreach_reply COLUMNS gmail_message_id UNIQUE;
DEFINE INDEX idx_reply_received ON outreach_reply COLUMNS received_at;
