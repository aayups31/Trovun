'use server';

import { revalidatePath } from 'next/cache';
import { getCurrentIdentity } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';

export async function updateMessageEmailPreference(enabled: unknown) {
  if (typeof enabled !== 'boolean')
    return { ok: false, message: 'Choose a valid notification preference.' };
  const identity = await getCurrentIdentity();
  if (!identity) return { ok: false, message: 'Sign in again to update notifications.' };
  const db = await createClient();
  const { error } = await db
    .from('notification_preferences')
    .upsert({ user_id: identity.id, message_emails_enabled: enabled });
  if (error) return { ok: false, message: 'Could not save your preference. Please try again.' };
  revalidatePath('/profile');
  return {
    ok: true,
    message: enabled ? 'Message emails turned on.' : 'Message emails turned off.',
  };
}
