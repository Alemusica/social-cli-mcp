/**
 * Supabase Client - Photo Storage & AI Labeling
 *
 * Supabase handles:
 * - File storage (photos/videos)
 * - AI labeling via Edge Functions
 * - User annotations
 *
 * SurrealDB handles:
 * - Graph relations (photo->taken_at->gig->venue)
 * - Content metadata for editorial planning
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getFromKeychain } from '../core/index.js';

let supabaseClient: SupabaseClient | null = null;

export interface PhotoRecord {
  id: string;
  storage_path: string;
  filename: string;
  bucket: string;

  // AI-generated labels
  ai_labels: string[];
  ai_description: string | null;
  ai_objects: string[];
  ai_colors: string[];
  ai_mood: string | null;

  // User annotations
  user_title: string | null;
  user_description: string | null;
  user_tags: string[];
  user_story: string | null;  // Personal story behind the photo

  // Metadata
  taken_at: string | null;
  location: string | null;
  camera_model: string | null;
  width: number | null;
  height: number | null;

  // Sync
  surreal_content_id: string | null;  // Link to SurrealDB content table
  synced_at: string | null;

  created_at: string;
  updated_at: string;
}

/**
 * Get Supabase client (singleton)
 */
export function getSupabase(): SupabaseClient {
  if (supabaseClient) return supabaseClient;

  const url = getFromKeychain('SUPABASE_URL');
  const key = getFromKeychain('SUPABASE_ANON_KEY');

  if (!url || !key) {
    throw new Error(
      'SUPABASE_URL and SUPABASE_ANON_KEY required in Keychain.\n' +
      'Add with: security add-generic-password -a social-cli-mcp -s SUPABASE_URL -w "https://xxx.supabase.co" -U'
    );
  }

  supabaseClient = createClient(url, key);
  return supabaseClient;
}

/**
 * Upload photo to Supabase Storage
 */
export async function uploadPhoto(
  filePath: string,
  bucket = 'photos'
): Promise<{ path: string; id: string } | null> {
  const fs = await import('fs');
  const path = await import('path');

  const supabase = getSupabase();
  const filename = path.basename(filePath);
  const fileBuffer = fs.readFileSync(filePath);

  // Generate unique path: year/month/filename
  const now = new Date();
  const storagePath = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${Date.now()}-${filename}`;

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(storagePath, fileBuffer, {
      contentType: getMimeType(filename),
      upsert: false,
    });

  if (error) {
    console.error('Upload error:', error);
    return null;
  }

  // Create photo record in database
  const { data: photoRecord, error: dbError } = await supabase
    .from('photos')
    .insert({
      storage_path: storagePath,
      filename,
      bucket,
      ai_labels: [],
      ai_objects: [],
      ai_colors: [],
      user_tags: [],
    })
    .select('id')
    .single();

  if (dbError) {
    console.error('DB insert error:', dbError);
    return null;
  }

  return {
    path: storagePath,
    id: photoRecord.id,
  };
}

/**
 * Get photo with all metadata
 */
export async function getPhoto(id: string): Promise<PhotoRecord | null> {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('photos')
    .select('*')
    .eq('id', id)
    .single();

  if (error) return null;
  return data as PhotoRecord;
}

/**
 * Update user annotations
 */
export async function annotatePhoto(
  id: string,
  annotations: {
    title?: string;
    description?: string;
    tags?: string[];
    story?: string;
    location?: string;
    taken_at?: string;
  }
): Promise<boolean> {
  const supabase = getSupabase();

  const { error } = await supabase
    .from('photos')
    .update({
      user_title: annotations.title,
      user_description: annotations.description,
      user_tags: annotations.tags,
      user_story: annotations.story,
      location: annotations.location,
      taken_at: annotations.taken_at,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  return !error;
}

/**
 * Get photos pending AI labeling
 */
export async function getPhotosNeedingLabels(limit = 10): Promise<PhotoRecord[]> {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('photos')
    .select('*')
    .is('ai_description', null)
    .order('created_at', { ascending: true })
    .limit(limit);

  if (error) return [];
  return data as PhotoRecord[];
}

/**
 * Get photos not synced to SurrealDB
 */
export async function getPhotosNeedingSync(limit = 50): Promise<PhotoRecord[]> {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('photos')
    .select('*')
    .is('surreal_content_id', null)
    .order('created_at', { ascending: true })
    .limit(limit);

  if (error) return [];
  return data as PhotoRecord[];
}

/**
 * Mark photo as synced to SurrealDB
 */
export async function markPhotoSynced(
  supabaseId: string,
  surrealContentId: string
): Promise<boolean> {
  const supabase = getSupabase();

  const { error } = await supabase
    .from('photos')
    .update({
      surreal_content_id: surrealContentId,
      synced_at: new Date().toISOString(),
    })
    .eq('id', supabaseId);

  return !error;
}

/**
 * Search photos by tags/labels
 */
export async function searchPhotos(query: {
  tags?: string[];
  aiLabels?: string[];
  location?: string;
  dateFrom?: string;
  dateTo?: string;
}): Promise<PhotoRecord[]> {
  const supabase = getSupabase();

  let queryBuilder = supabase.from('photos').select('*');

  if (query.tags?.length) {
    queryBuilder = queryBuilder.contains('user_tags', query.tags);
  }

  if (query.aiLabels?.length) {
    queryBuilder = queryBuilder.contains('ai_labels', query.aiLabels);
  }

  if (query.location) {
    queryBuilder = queryBuilder.ilike('location', `%${query.location}%`);
  }

  if (query.dateFrom) {
    queryBuilder = queryBuilder.gte('taken_at', query.dateFrom);
  }

  if (query.dateTo) {
    queryBuilder = queryBuilder.lte('taken_at', query.dateTo);
  }

  const { data, error } = await queryBuilder.limit(100);

  if (error) return [];
  return data as PhotoRecord[];
}

/**
 * Get public URL for a photo
 */
export function getPhotoUrl(storagePath: string, bucket = 'photos'): string {
  const supabase = getSupabase();

  const { data } = supabase.storage
    .from(bucket)
    .getPublicUrl(storagePath);

  return data.publicUrl;
}

// Helper: Get MIME type from filename
function getMimeType(filename: string): string {
  const ext = filename.toLowerCase().split('.').pop();
  const mimeTypes: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    heic: 'image/heic',
    mp4: 'video/mp4',
    mov: 'video/quicktime',
  };
  return mimeTypes[ext || ''] || 'application/octet-stream';
}
