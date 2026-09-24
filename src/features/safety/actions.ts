'use server';
import { z } from 'zod';
import type { SupabaseClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { requireMarketplaceViewer, requireModerator } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';

export async function submitReport(input: unknown) {
  await requireMarketplaceViewer('/safety/report');
  const parsed = z
    .object({
      subject: z.enum(['listing', 'conversation', 'privacy', 'appeal', 'other']),
      referenceId: z.uuid().nullable(),
      details: z.string().trim().min(10).max(2000),
    })
    .safeParse(input);
  if (!parsed.success)
    return { ok: false, message: 'Choose a report type and provide 10–2,000 characters.' };
  const client = (await createClient()) as unknown as SupabaseClient;
  const { error } = await client.rpc('submit_safety_report', {
    p_subject: parsed.data.subject,
    p_reference_id: parsed.data.referenceId,
    p_details: parsed.data.details,
  });
  if (error)
    return {
      ok: false,
      message:
        error.code === 'P0001'
          ? 'Please wait before submitting another report.'
          : 'Your report could not be submitted. Please try again.',
    };
  revalidatePath('/moderation');
  return {
    ok: true,
    message: 'Report received for moderator review. For immediate danger, call 911.',
  };
}

export async function reviewReport(form: FormData) {
  await requireModerator('/moderation');
  const id = z.uuid().parse(form.get('id'));
  const client = (await createClient()) as unknown as SupabaseClient;
  const { error } = await client.from('safety_reports').update({ status: 'reviewed' }).eq('id', id);
  if (error) throw new Error('Could not update report.');
  revalidatePath('/moderation');
}
