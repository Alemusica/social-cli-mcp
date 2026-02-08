/**
 * Edge Function: AI Photo Labeling
 *
 * Analizza foto con Anthropic Claude Vision e salva labels in Supabase.
 *
 * Deploy:
 *   supabase functions deploy label-photo
 *
 * Environment variables (Supabase Dashboard > Edge Functions > Secrets):
 *   - ANTHROPIC_API_KEY
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LabelRequest {
  photoId: string;
}

interface AILabels {
  labels: string[];
  objects: string[];
  colors: string[];
  mood: string;
  description: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { photoId } = await req.json() as LabelRequest;

    if (!photoId) {
      return new Response(
        JSON.stringify({ error: 'photoId required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get photo from database
    const { data: photo, error: photoError } = await supabase
      .from('photos')
      .select('*')
      .eq('id', photoId)
      .single();

    if (photoError || !photo) {
      return new Response(
        JSON.stringify({ error: 'Photo not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get public URL of the photo
    const { data: urlData } = supabase.storage
      .from(photo.bucket)
      .getPublicUrl(photo.storage_path);

    const imageUrl = urlData.publicUrl;

    // Call Anthropic Claude Vision API
    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!anthropicKey) {
      return new Response(
        JSON.stringify({ error: 'ANTHROPIC_API_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const labels = await analyzeWithClaude(imageUrl, anthropicKey);

    // Update photo with AI labels
    const { error: updateError } = await supabase
      .from('photos')
      .update({
        ai_labels: labels.labels,
        ai_objects: labels.objects,
        ai_colors: labels.colors,
        ai_mood: labels.mood,
        ai_description: labels.description,
        updated_at: new Date().toISOString(),
      })
      .eq('id', photoId);

    if (updateError) {
      return new Response(
        JSON.stringify({ error: 'Failed to update photo', details: updateError }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        photoId,
        labels: labels.labels,
        description: labels.description,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

/**
 * Analyze image with Claude Vision
 */
async function analyzeWithClaude(imageUrl: string, apiKey: string): Promise<AILabels> {
  const prompt = `Analyze this image and provide:
1. labels: Array of 5-10 descriptive keywords (e.g., ["sunset", "beach", "silhouette", "music", "handpan"])
2. objects: Array of objects detected (e.g., ["person", "instrument", "ocean"])
3. colors: Array of dominant colors (e.g., ["orange", "purple", "gold"])
4. mood: Single word describing the mood (e.g., "peaceful", "energetic", "mystical")
5. description: One sentence describing what's happening in the image

Context: These photos are for an artist (FLUTUR) who plays RAV Vast/handpan, does live looping, and creates music. Many photos are from performances, sunsets, nature, or tech/music production.

Respond in JSON format only:
{
  "labels": [...],
  "objects": [...],
  "colors": [...],
  "mood": "...",
  "description": "..."
}`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'url',
                url: imageUrl,
              },
            },
            {
              type: 'text',
              text: prompt,
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Claude API error: ${error}`);
  }

  const result = await response.json();
  const content = result.content[0].text;

  // Parse JSON response
  try {
    // Extract JSON from response (in case of markdown code blocks)
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return JSON.parse(content);
  } catch {
    // Fallback if parsing fails
    return {
      labels: ['image'],
      objects: [],
      colors: [],
      mood: 'unknown',
      description: content.substring(0, 200),
    };
  }
}
