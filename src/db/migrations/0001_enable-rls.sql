-- Custom SQL migration file, put your code below! --

-- Enable RLS on all tenant-scoped tables
-- FORCE ROW LEVEL SECURITY ensures RLS applies even to the table owner (flutur user)
DO $$
DECLARE
  tbl text;
BEGIN
  FOR tbl IN
    SELECT unnest(ARRAY[
      'venue', 'post', 'hashtag', 'email', 'outreach_reply', 'outreach_batch',
      'content', 'calendar_entry', 'gig', 'session_log', 'memory_link',
      'story_fragment', 'web_research', 'agent_session', 'dept_memory',
      'audience_snapshot', 'yt_analytics_snapshot', 'yt_video_country',
      'hashtag_analysis', 'credentials_status', 'brand_identity',
      'post_draft', 'content_task', 'send_log'
    ])
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', tbl);
    EXECUTE format('
      CREATE POLICY tenant_read ON %I
        FOR SELECT USING (tenant_id = current_setting(''app.tenant_id'', true))
    ', tbl);
    EXECUTE format('
      CREATE POLICY tenant_write ON %I
        FOR INSERT WITH CHECK (tenant_id = current_setting(''app.tenant_id'', true))
    ', tbl);
    EXECUTE format('
      CREATE POLICY tenant_update ON %I
        FOR UPDATE USING (tenant_id = current_setting(''app.tenant_id'', true))
    ', tbl);
    EXECUTE format('
      CREATE POLICY tenant_delete ON %I
        FOR DELETE USING (tenant_id = current_setting(''app.tenant_id'', true))
    ', tbl);
  END LOOP;
END $$;

-- Tenant table has NO RLS — system reads it to resolve config
-- Junction tables inherit RLS via FK joins (no tenant_id column needed)
