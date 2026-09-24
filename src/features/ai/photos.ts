import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';

// URLs are derived only from authorized database rows, never supplied by callers.
export async function listingPhotoUrls(client: SupabaseClient, listingId: string, limit = 3) {
  const { data, error } = await client
    .from('listing_images')
    .select('storage_path')
    .eq('listing_id', listingId)
    .eq('upload_status', 'uploaded')
    .order('position')
    .limit(limit);
  if (error) throw new Error('Photos unavailable');
  if (!data?.length) return [];
  const signed = await client.storage.from('listing-images').createSignedUrls(
    data.map((row) => row.storage_path),
    120,
  );
  if (signed.error || signed.data?.some((row) => !row.signedUrl))
    throw new Error('Photos unavailable');
  return (signed.data ?? []).flatMap((row) => (row.signedUrl ? [row.signedUrl] : []));
}
