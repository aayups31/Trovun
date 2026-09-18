import { createClient } from 'npm:@supabase/supabase-js@2.110.6';
import { processMessageEmailQueue } from '../../../src/features/notifications/email.ts';

// pg_cron authenticates with a dedicated secret kept in Vault, never a browser key.
Deno.serve(async (request: Request) => {
  const headers = { 'Cache-Control': 'private, no-store' };
  const secret = Deno.env.get('MESSAGE_EMAIL_CRON_SECRET');
  const provided = request.headers.get('authorization') ?? '';
  const expected = `Bearer ${secret ?? ''}`;
  const digest = async (value: string) =>
    new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)));
  const [a, b] = await Promise.all([digest(provided), digest(expected)]);
  let difference = 0;
  for (let i = 0; i < a.length; i++) difference |= a[i] ^ b[i];
  if (!secret || difference !== 0)
    return Response.json({ error: 'Unauthorized' }, { status: 401, headers });
  const apiKey = Deno.env.get('RESEND_API_KEY');
  const from = Deno.env.get('MESSAGE_EMAIL_FROM');
  const siteUrl = Deno.env.get('MESSAGE_EMAIL_SITE_URL');
  if (!apiKey || !from || !siteUrl)
    return Response.json({ configured: false }, { status: 503, headers });
  try {
    const origin = new URL(siteUrl);
    if (origin.protocol !== 'https:') throw new Error('HTTPS required');
    const db = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    const result = await processMessageEmailQueue(
      {
        claim: () => db.rpc('claim_message_emails'),
        eligible: (id) => db.rpc('message_email_is_eligible', { job_id: id }),
        finish: (id, lease, outcome) =>
          db.rpc('finish_message_email', { job_id: id, job_lease: lease, outcome }),
      },
      { apiKey, from, siteUrl: origin.origin },
    );
    return Response.json(result, { headers });
  } catch {
    return Response.json({ error: 'Notification processing failed' }, { status: 503, headers });
  }
});
