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
DEFINE TABLE venue SCHEMAFULL;
DEFINE FIELD name ON venue TYPE string;
DEFINE FIELD type ON venue TYPE string; -- beach_club, festival, hotel, etc
DEFINE FIELD location ON venue TYPE string;
DEFINE FIELD country ON venue TYPE string;
DEFINE FIELD capacity ON venue TYPE option<int>;
DEFINE FIELD contact_email ON venue TYPE option<string>;
DEFINE FIELD contact_name ON venue TYPE option<string>;
DEFINE FIELD website ON venue TYPE option<string>;
DEFINE FIELD instagram ON venue TYPE option<string>;
DEFINE FIELD status ON venue TYPE string DEFAULT "prospect"; -- prospect, contacted, responded, booked, declined
DEFINE FIELD tier ON venue TYPE int DEFAULT 2; -- 1=priority, 2=standard, 3=backup
DEFINE FIELD notes ON venue TYPE option<string>;
DEFINE FIELD created_at ON venue TYPE datetime DEFAULT time::now();
DEFINE FIELD updated_at ON venue TYPE datetime VALUE time::now();

DEFINE INDEX idx_venue_status ON venue COLUMNS status;
DEFINE INDEX idx_venue_tier ON venue COLUMNS tier;

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
