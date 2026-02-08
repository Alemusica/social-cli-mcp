-- =====================================================
-- Migration 002: Add Analysis Tables
-- Run: surreal import --conn http://localhost:8000 --user root --pass root --ns social --db analytics 002_add_analysis_tables.surql
-- =====================================================

-- Analysis Session - Groups related API calls and analysis
DEFINE TABLE IF NOT EXISTS analysis_session SCHEMAFULL;
DEFINE FIELD session_name ON analysis_session TYPE string;
DEFINE FIELD description ON analysis_session TYPE option<string>;
DEFINE FIELD session_type ON analysis_session TYPE string DEFAULT "general";
DEFINE FIELD agent_id ON analysis_session TYPE option<string>;
DEFINE FIELD api_calls_made ON analysis_session TYPE int DEFAULT 0;
DEFINE FIELD started_at ON analysis_session TYPE datetime DEFAULT time::now();
DEFINE FIELD completed_at ON analysis_session TYPE option<datetime>;
DEFINE FIELD findings_summary ON analysis_session TYPE option<string>;

DEFINE INDEX IF NOT EXISTS idx_session_name ON analysis_session COLUMNS session_name;
DEFINE INDEX IF NOT EXISTS idx_session_type ON analysis_session COLUMNS session_type;
DEFINE INDEX IF NOT EXISTS idx_session_date ON analysis_session COLUMNS started_at;

-- API Snapshot
DEFINE TABLE IF NOT EXISTS api_snapshot SCHEMAFULL;
DEFINE FIELD api_name ON api_snapshot TYPE string;
DEFINE FIELD endpoint ON api_snapshot TYPE string;
DEFINE FIELD parameters ON api_snapshot TYPE option<object>;
DEFINE FIELD response ON api_snapshot TYPE object;
DEFINE FIELD api_version ON api_snapshot TYPE string DEFAULT "v24.0";
DEFINE FIELD success ON api_snapshot TYPE bool DEFAULT true;
DEFINE FIELD error_message ON api_snapshot TYPE option<string>;
DEFINE FIELD captured_at ON api_snapshot TYPE datetime DEFAULT time::now();
DEFINE FIELD expires_at ON api_snapshot TYPE option<datetime>;

DEFINE INDEX IF NOT EXISTS idx_snapshot_api ON api_snapshot COLUMNS api_name;
DEFINE INDEX IF NOT EXISTS idx_snapshot_date ON api_snapshot COLUMNS captured_at;

-- Hashtag Analysis
DEFINE TABLE IF NOT EXISTS hashtag_analysis SCHEMAFULL;
DEFINE FIELD hashtag_name ON hashtag_analysis TYPE string;
DEFINE FIELD instagram_id ON hashtag_analysis TYPE option<string>;
DEFINE FIELD avg_likes ON hashtag_analysis TYPE int DEFAULT 0;
DEFINE FIELD avg_comments ON hashtag_analysis TYPE int DEFAULT 0;
DEFINE FIELD engagement_score ON hashtag_analysis TYPE int DEFAULT 0;
DEFINE FIELD top_posts_analyzed ON hashtag_analysis TYPE int DEFAULT 0;
DEFINE FIELD sample_posts ON hashtag_analysis TYPE array DEFAULT [];
DEFINE FIELD recommendation ON hashtag_analysis TYPE option<string>;
DEFINE FIELD analyzed_at ON hashtag_analysis TYPE datetime DEFAULT time::now();
DEFINE FIELD rate_limit_week ON hashtag_analysis TYPE option<int>;

DEFINE INDEX IF NOT EXISTS idx_hashtag_analysis_name ON hashtag_analysis COLUMNS hashtag_name UNIQUE;
DEFINE INDEX IF NOT EXISTS idx_hashtag_analysis_score ON hashtag_analysis COLUMNS engagement_score;
DEFINE INDEX IF NOT EXISTS idx_hashtag_analysis_date ON hashtag_analysis COLUMNS analyzed_at;

-- Audience Snapshot
DEFINE TABLE IF NOT EXISTS audience_snapshot SCHEMAFULL;
DEFINE FIELD platform ON audience_snapshot TYPE string;
DEFINE FIELD username ON audience_snapshot TYPE string;
DEFINE FIELD followers ON audience_snapshot TYPE int DEFAULT 0;
DEFINE FIELD following ON audience_snapshot TYPE int DEFAULT 0;
DEFINE FIELD posts_count ON audience_snapshot TYPE int DEFAULT 0;
DEFINE FIELD reach_28d ON audience_snapshot TYPE option<int>;
DEFINE FIELD profile_views_28d ON audience_snapshot TYPE option<int>;
DEFINE FIELD website_clicks_28d ON audience_snapshot TYPE option<int>;
DEFINE FIELD top_countries ON audience_snapshot TYPE array DEFAULT [];
DEFINE FIELD top_cities ON audience_snapshot TYPE array DEFAULT [];
DEFINE FIELD age_gender ON audience_snapshot TYPE array DEFAULT [];
DEFINE FIELD engagement_rate ON audience_snapshot TYPE option<float>;
DEFINE FIELD captured_at ON audience_snapshot TYPE datetime DEFAULT time::now();

DEFINE INDEX IF NOT EXISTS idx_audience_platform ON audience_snapshot COLUMNS platform;
DEFINE INDEX IF NOT EXISTS idx_audience_date ON audience_snapshot COLUMNS captured_at;

-- Post Draft
DEFINE TABLE IF NOT EXISTS post_draft SCHEMAFULL;
DEFINE FIELD title ON post_draft TYPE string;
DEFINE FIELD platform ON post_draft TYPE string;
DEFINE FIELD post_type ON post_draft TYPE string;
DEFINE FIELD caption ON post_draft TYPE string;
DEFINE FIELD hashtags ON post_draft TYPE array DEFAULT [];
DEFINE FIELD media_files ON post_draft TYPE array DEFAULT [];
DEFINE FIELD scheduled_for ON post_draft TYPE option<datetime>;
DEFINE FIELD best_time ON post_draft TYPE option<string>;
DEFINE FIELD status ON post_draft TYPE string DEFAULT "draft";
DEFINE FIELD priority ON post_draft TYPE string DEFAULT "MEDIUM";
DEFINE FIELD target_audience ON post_draft TYPE array DEFAULT [];
DEFINE FIELD story_context ON post_draft TYPE option<object>;
DEFINE FIELD privacy_notes ON post_draft TYPE option<string>;
DEFINE FIELD published_post_id ON post_draft TYPE option<string>;
DEFINE FIELD created_at ON post_draft TYPE datetime DEFAULT time::now();
DEFINE FIELD updated_at ON post_draft TYPE datetime VALUE time::now();

DEFINE INDEX IF NOT EXISTS idx_draft_status ON post_draft COLUMNS status;
DEFINE INDEX IF NOT EXISTS idx_draft_priority ON post_draft COLUMNS priority;
DEFINE INDEX IF NOT EXISTS idx_draft_scheduled ON post_draft COLUMNS scheduled_for;

-- Relations
DEFINE TABLE IF NOT EXISTS captured_in TYPE RELATION IN api_snapshot OUT analysis_session;
DEFINE TABLE IF NOT EXISTS analyzed_in TYPE RELATION IN hashtag_analysis OUT analysis_session;
DEFINE TABLE IF NOT EXISTS snapshot_in TYPE RELATION IN audience_snapshot OUT analysis_session;
DEFINE TABLE IF NOT EXISTS uses_hashtag_analysis TYPE RELATION IN post_draft OUT hashtag_analysis;
DEFINE FIELD selected_at ON uses_hashtag_analysis TYPE datetime DEFAULT time::now();
DEFINE FIELD reason ON uses_hashtag_analysis TYPE option<string>;
DEFINE TABLE IF NOT EXISTS targets_audience TYPE RELATION IN post_draft OUT audience_snapshot;
