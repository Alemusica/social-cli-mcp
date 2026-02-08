-- Supabase Schema: Photos Table
-- Run this in Supabase SQL Editor or via migrations

-- Create photos table
CREATE TABLE IF NOT EXISTS photos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  storage_path TEXT NOT NULL,
  filename TEXT NOT NULL,
  bucket TEXT DEFAULT 'photos',

  -- AI-generated labels (from Edge Function)
  ai_labels TEXT[] DEFAULT '{}',
  ai_description TEXT,
  ai_objects TEXT[] DEFAULT '{}',
  ai_colors TEXT[] DEFAULT '{}',
  ai_mood TEXT,

  -- User annotations
  user_title TEXT,
  user_description TEXT,
  user_tags TEXT[] DEFAULT '{}',
  user_story TEXT,  -- Personal story behind the photo

  -- Metadata
  taken_at TIMESTAMPTZ,
  location TEXT,
  camera_model TEXT,
  width INTEGER,
  height INTEGER,

  -- Sync with SurrealDB
  surreal_content_id TEXT,  -- Links to SurrealDB content table
  synced_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for sync queries
CREATE INDEX IF NOT EXISTS idx_photos_needs_sync
  ON photos (created_at)
  WHERE surreal_content_id IS NULL;

-- Index for AI labeling queries
CREATE INDEX IF NOT EXISTS idx_photos_needs_labels
  ON photos (created_at)
  WHERE ai_description IS NULL;

-- Index for tag searches
CREATE INDEX IF NOT EXISTS idx_photos_user_tags ON photos USING GIN (user_tags);
CREATE INDEX IF NOT EXISTS idx_photos_ai_labels ON photos USING GIN (ai_labels);

-- Index for location searches
CREATE INDEX IF NOT EXISTS idx_photos_location ON photos (location);

-- Enable Row Level Security (optional - adjust as needed)
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;

-- Allow public read access (adjust based on your needs)
CREATE POLICY "Allow public read" ON photos
  FOR SELECT USING (true);

-- Allow authenticated users to insert/update
CREATE POLICY "Allow authenticated insert" ON photos
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow authenticated update" ON photos
  FOR UPDATE USING (true);

-- Create storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('photos', 'photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policy: allow public read
CREATE POLICY "Public read for photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'photos');

-- Storage policy: allow authenticated upload
CREATE POLICY "Allow authenticated upload"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'photos');

-- Function to auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
CREATE TRIGGER photos_updated_at
  BEFORE UPDATE ON photos
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Comment on table
COMMENT ON TABLE photos IS 'Photo storage with AI labeling and user annotations. Syncs to SurrealDB for graph relations.';
