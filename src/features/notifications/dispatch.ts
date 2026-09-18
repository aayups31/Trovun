import 'server-only';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/database.types';
import { processMessageEmailQueue } from './email';

export async function dispatchMessageEmails() {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.MESSAGE_EMAIL_FROM;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!apiKey || !from || !siteUrl || !url || !key)
    return { configured: false, sent: 0, failed: 0 };
  const origin = new URL(siteUrl);
  if (
    origin.protocol !== 'https:' &&
    !(process.env.NODE_ENV !== 'production' && origin.hostname === 'localhost')
  ) {
    throw new Error('Message emails require an HTTPS site URL');
  }
  const db = createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return processMessageEmailQueue(
    {
      claim: () => db.rpc('claim_message_emails'),
      eligible: (id) => db.rpc('message_email_is_eligible', { job_id: id }),
      finish: (id, lease, outcome) =>
        db.rpc('finish_message_email', { job_id: id, job_lease: lease, outcome }),
    },
    { apiKey, from, siteUrl: origin.origin },
  );
}
