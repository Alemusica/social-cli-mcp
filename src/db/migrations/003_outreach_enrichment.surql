-- =====================================================
-- Migration 003: Outreach System Enrichment
-- Adds reply tracking, video assets, outreach actions
-- Run: npx tsx src/db/apply-migration.ts src/db/migrations/003_outreach_enrichment.surql
-- =====================================================

-- ─── EMAIL TABLE: Add reply & follow-up tracking ───────────

DEFINE FIELD IF NOT EXISTS reply_received ON email TYPE bool DEFAULT false;
DEFINE FIELD IF NOT EXISTS reply_type ON email TYPE option<string>;
DEFINE FIELD IF NOT EXISTS reply_date ON email TYPE option<datetime>;
DEFINE FIELD IF NOT EXISTS reply_preview ON email TYPE option<string>;
DEFINE FIELD IF NOT EXISTS followup_sent ON email TYPE bool DEFAULT false;
DEFINE FIELD IF NOT EXISTS followup_sent_at ON email TYPE option<datetime>;
DEFINE FIELD IF NOT EXISTS followup2_sent ON email TYPE bool DEFAULT false;
DEFINE FIELD IF NOT EXISTS followup2_sent_at ON email TYPE option<datetime>;

DEFINE INDEX IF NOT EXISTS idx_email_reply ON email COLUMNS reply_received;
DEFINE INDEX IF NOT EXISTS idx_email_reply_type ON email COLUMNS reply_type;
DEFINE INDEX IF NOT EXISTS idx_email_followup ON email COLUMNS followup_sent;

-- ─── VENUE TABLE: Add outreach-relevant fields ─────────────
-- venue is SCHEMALESS, these define structured defaults

DEFINE FIELD IF NOT EXISTS booking_window ON venue TYPE option<string>;
DEFINE FIELD IF NOT EXISTS why_fit ON venue TYPE option<string>;
DEFINE FIELD IF NOT EXISTS social_proof_needed ON venue TYPE option<string>;
DEFINE FIELD IF NOT EXISTS source ON venue TYPE option<string>;

-- ─── NEW TABLE: video_asset ────────────────────────────────

DEFINE TABLE IF NOT EXISTS video_asset SCHEMAFULL;
DEFINE FIELD url ON video_asset TYPE string;
DEFINE FIELD title ON video_asset TYPE string;
DEFINE FIELD description ON video_asset TYPE option<string>;
DEFINE FIELD duration ON video_asset TYPE option<string>;
DEFINE FIELD video_type ON video_asset TYPE string DEFAULT "highlight";
DEFINE FIELD energy ON video_asset TYPE option<string>;
DEFINE FIELD mood ON video_asset TYPE array DEFAULT [];
DEFINE FIELD instruments ON video_asset TYPE array DEFAULT [];
DEFINE FIELD style ON video_asset TYPE array DEFAULT [];
DEFINE FIELD best_for ON video_asset TYPE array DEFAULT [];
DEFINE FIELD pitch_angle ON video_asset TYPE option<string>;
DEFINE FIELD cultural_context ON video_asset TYPE option<string>;
DEFINE FIELD source_session ON video_asset TYPE option<string>;
DEFINE FIELD created_at ON video_asset TYPE datetime DEFAULT time::now();

DEFINE INDEX IF NOT EXISTS idx_video_type ON video_asset COLUMNS video_type;

-- ─── NEW TABLE: outreach_action ────────────────────────────

DEFINE TABLE IF NOT EXISTS outreach_action SCHEMAFULL;
DEFINE FIELD action_type ON outreach_action TYPE string;
DEFINE FIELD batch ON outreach_action TYPE option<string>;
DEFINE FIELD status ON outreach_action TYPE string DEFAULT "pending";
DEFINE FIELD priority ON outreach_action TYPE int DEFAULT 3;
DEFINE FIELD due_date ON outreach_action TYPE option<datetime>;
DEFINE FIELD notes ON outreach_action TYPE option<string>;
DEFINE FIELD completed_at ON outreach_action TYPE option<datetime>;
DEFINE FIELD website ON outreach_action TYPE option<string>;
DEFINE FIELD phone ON outreach_action TYPE option<string>;
DEFINE FIELD instagram_handle ON outreach_action TYPE option<string>;
DEFINE FIELD created_at ON outreach_action TYPE datetime DEFAULT time::now();
DEFINE FIELD updated_at ON outreach_action TYPE datetime VALUE time::now();

DEFINE INDEX IF NOT EXISTS idx_action_status ON outreach_action COLUMNS status;
DEFINE INDEX IF NOT EXISTS idx_action_priority ON outreach_action COLUMNS priority;
DEFINE INDEX IF NOT EXISTS idx_action_type ON outreach_action COLUMNS action_type;

-- ─── NEW RELATION: email_includes_video ────────────────────

DEFINE TABLE IF NOT EXISTS email_includes_video TYPE RELATION IN email OUT video_asset;
DEFINE FIELD selected_reason ON email_includes_video TYPE option<string>;

-- ─── NEW RELATION: action_for_venue ────────────────────────

DEFINE TABLE IF NOT EXISTS action_for_venue TYPE RELATION IN outreach_action OUT venue;

-- ─── FUNCTIONS ─────────────────────────────────────────────

-- Full outreach pipeline status
DEFINE FUNCTION fn::outreach_status() {
    LET $total = (SELECT count() FROM email GROUP ALL)[0].count;
    LET $bounced = (SELECT count() FROM email WHERE bounced = true GROUP ALL)[0].count;
    LET $human = (SELECT count() FROM email WHERE reply_type = "human" GROUP ALL)[0].count;
    LET $auto = (SELECT count() FROM email WHERE reply_type = "auto" GROUP ALL)[0].count;
    LET $mailinblack = (SELECT count() FROM email WHERE reply_type = "mailinblack" GROUP ALL)[0].count;
    LET $fu1 = (SELECT count() FROM email WHERE followup_sent = true GROUP ALL)[0].count;
    LET $fu2 = (SELECT count() FROM email WHERE followup2_sent = true GROUP ALL)[0].count;
    LET $delivered = $total - $bounced;
    RETURN {
        total_sent: $total,
        bounced: $bounced,
        delivered: $delivered,
        human_replies: $human,
        auto_replies: $auto,
        mailinblack: $mailinblack,
        followup1_sent: $fu1,
        followup2_sent: $fu2,
        response_rate: IF $delivered > 0 THEN math::round(($human / $delivered) * 10000) / 100 ELSE 0 END,
        awaiting_reply: $delivered - $human - $auto - $mailinblack
    };
};

-- Venues needing follow-up
DEFINE FUNCTION fn::venues_need_followup() {
    RETURN (
        SELECT
            tracking_id,
            to_address,
            sent_at,
            follow_up_due,
            followup_sent,
            followup2_sent,
            ->sent_to->venue.name AS venue_name,
            ->sent_to->venue.country AS venue_country
        FROM email
        WHERE bounced = false
          AND reply_received = false
          AND followup2_sent = false
        ORDER BY follow_up_due ASC
    );
};

-- Pending manual actions
DEFINE FUNCTION fn::pending_actions() {
    RETURN (
        SELECT
            *,
            ->action_for_venue->venue.name AS venue_name
        FROM outreach_action
        WHERE status = "pending"
        ORDER BY priority ASC
    );
};

-- Video effectiveness tracking
DEFINE FUNCTION fn::video_effectiveness() {
    RETURN (
        SELECT
            <-email_includes_video<-email AS emails,
            title,
            count(<-email_includes_video<-email) AS times_used,
            count(<-email_includes_video<-email WHERE reply_type = "human") AS human_replies
        FROM video_asset
    );
};
