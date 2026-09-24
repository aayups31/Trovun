'use server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import type { SupabaseClient } from '@supabase/supabase-js';
import { requireModerator } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';
import { processListingReviews } from './moderation';

export async function dismissAiReview(form: FormData) {
  await requireModerator('/moderation');
  const id = z.uuid().parse(form.get('id'));
  const fingerprint = z
    .string()
    .regex(/^[a-f0-9]{32}$/)
    .parse(form.get('fingerprint'));
  const db = (await createClient()) as unknown as SupabaseClient;
  const { error } = await db
    .from('ai_listing_reviews')
    .update({ reviewed: true })
    .eq('listing_id', id)
    .eq('fingerprint', fingerprint)
    .eq('state', 'done');
  if (error) throw new Error('Could not mark review complete.');
  revalidatePath('/moderation');
}
export async function runAiReviews() {
  await requireModerator('/moderation');
  await processListingReviews();
  revalidatePath('/moderation');
}
