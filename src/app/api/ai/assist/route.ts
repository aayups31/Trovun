import { NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getViewer } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';
import { assistanceInput, searchInput } from '@/features/ai/contracts';
import { assistMarketplace } from '@/features/ai/server';
import { smartSearch } from '@/features/ai/smart-search';
import { listingPhotoUrls } from '@/features/ai/photos';

export const runtime = 'nodejs';
export const maxDuration = 30;
const reply = (body: unknown, status = 200) =>
  NextResponse.json(body, { status, headers: { 'Cache-Control': 'private, no-store' } });

export async function POST(request: Request) {
  try {
    if (request.headers.get('origin') !== new URL(request.url).origin)
      return reply({ error: 'Request could not be verified.' }, 403);
    const viewer = await getViewer();
    if (
      !viewer ||
      viewer.profile.role !== 'student' ||
      !viewer.profile.email_verified ||
      !viewer.profile.onboarding_completed_at
    )
      return reply({ error: 'Sign in with a verified student account.' }, 401);
    if (!process.env.OPENAI_API_KEY)
      return reply(
        { error: 'AI help is temporarily unavailable. You can continue without it.' },
        503,
      );
    const raw = await request.text();
    if (raw.length > 7000) return reply({ error: 'Please shorten the item details.' }, 413);
    let body: unknown;
    try {
      body = JSON.parse(raw);
    } catch {
      return reply({ error: 'Invalid request.' }, 400);
    }
    const parsed = assistanceInput.or(searchInput).safeParse(body);
    if (!parsed.success)
      return reply(
        { error: 'Add an item title and keep the description under 5,000 characters.' },
        400,
      );
    const client = (await createClient()) as unknown as SupabaseClient;
    let photos: string[] = [];
    let itemFacts: { priceCents: number | null; condition: string | null } | undefined;
    let categories: Array<{ id: number; name: string }> = [];
    if (parsed.data.purpose === 'buyer' && parsed.data.listingId) {
      const { data: listing, error: listingError } = await client
        .from('listings')
        .select('title,description,price_cents,condition')
        .eq('id', parsed.data.listingId)
        .eq('status', 'published')
        .maybeSingle();
      if (listingError || !listing)
        return reply({ error: 'This listing is no longer available.' }, 404);
      parsed.data.title = listing.title;
      parsed.data.description = listing.description;
      itemFacts = { priceCents: listing.price_cents, condition: listing.condition };
    }
    if (parsed.data.purpose !== 'search' && parsed.data.includePhotos) {
      if (parsed.data.purpose !== 'listing' || !parsed.data.listingId)
        return reply({ error: 'Choose your own listing photos.' }, 400);
      const { data: listing, error: listingError } = await client
        .from('listings')
        .select('id')
        .eq('id', parsed.data.listingId)
        .eq('seller_id', viewer.id)
        .maybeSingle();
      if (listingError || !listing) return reply({ error: 'Listing unavailable.' }, 404);
      photos = await listingPhotoUrls(client, parsed.data.listingId);
      if (!photos.length) return reply({ error: 'Finish uploading a photo first.' }, 400);
    }
    const { data, error } = await client.rpc('consume_ai_allowance');
    // Persistent limits work across server instances. Fail closed if unavailable.
    if (error)
      return reply(
        { error: 'AI help is temporarily unavailable. You can continue without it.' },
        503,
      );
    if (!data) return reply({ error: 'AI usage limit reached. Please try again later.' }, 429);
    if (parsed.data.purpose === 'listing') {
      const result = await client
        .from('categories')
        .select('id,name')
        .eq('is_active', true)
        .order('sort_order');
      if (result.error)
        return reply({ error: 'Listing categories are unavailable. Try again shortly.' }, 503);
      categories = result.data ?? [];
    }
    if (parsed.data.purpose === 'search') return reply(await smartSearch(client, parsed.data));
    return reply(await assistMarketplace(parsed.data, photos, itemFacts, categories));
  } catch {
    return reply(
      { error: 'AI help could not finish. Please try again later; you can continue without it.' },
      503,
    );
  }
}
