import 'server-only';

import { createClient } from '@supabase/supabase-js';
import { unstable_cache } from 'next/cache';

import type { Database } from '@/lib/supabase/database.types';
import { getPublicSupabaseConfig } from '@/lib/supabase/env';

import { LISTING_IMAGE_BUCKET } from './constants';

export type PublicListingShowcaseItem = {
  id: string;
  imageUrl: string | null;
  priceCents: number;
  title: string;
};

type PublicListingRow = Pick<
  Database['public']['Views']['marketplace_listings']['Row'],
  'cover_image_path' | 'id' | 'price_cents' | 'title'
>;

function showcaseClient() {
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!secretKey) return null;
  const { url } = getPublicSupabaseConfig();
  return createClient<Database>(url, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// Cache listing metadata only: signed photo URLs must not outlive their tokens.
const loadPublicListingRows = unstable_cache(
  async (): Promise<PublicListingRow[]> => {
    const supabase = showcaseClient();
    if (!supabase) return [];
    const { data, error } = await supabase
      .from('marketplace_listings')
      .select('id,title,price_cents,cover_image_path')
      .not('cover_image_path', 'is', null)
      .order('published_at', { ascending: false })
      .limit(24);
    return error ? [] : (data ?? []);
  },
  ['public-listing-showcase-rows'],
  { revalidate: 10 * 60 },
);

export async function getPublicListingShowcase(): Promise<PublicListingShowcaseItem[]> {
  try {
    const supabase = showcaseClient();
    if (!supabase) return [];
    const rows = await loadPublicListingRows();
    if (!rows.length) return [];
    const paths = rows.flatMap((row) => (row.cover_image_path ? [row.cover_image_path] : []));
    const { data: signedImages } = await supabase.storage
      .from(LISTING_IMAGE_BUCKET)
      .createSignedUrls(paths, 60 * 30);
    const signedByPath = new Map(
      (signedImages ?? []).flatMap((image) =>
        image.path && image.signedUrl ? [[image.path, image.signedUrl] as const] : [],
      ),
    );
    return rows.map((row) => ({
      id: row.id,
      imageUrl: row.cover_image_path ? (signedByPath.get(row.cover_image_path) ?? null) : null,
      priceCents: row.price_cents ?? 0,
      title: row.title,
    }));
  } catch {
    return [];
  }
}
