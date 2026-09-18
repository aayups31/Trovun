import 'server-only';
import { createClient } from '@/lib/supabase/server';

export async function getMessageEmailPreference(userId: string) {
  const db = await createClient();
  const { data, error } = await db
    .from('notification_preferences')
    .select('message_emails_enabled')
    .eq('user_id', userId)
    .maybeSingle();
  return { enabled: data?.message_emails_enabled ?? true, available: !error };
}
