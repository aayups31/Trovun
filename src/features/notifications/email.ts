export type MessageEmailJob = {
  id: string;
  conversation_id: string;
  recipient_email: string;
  lease: string;
};

export type EmailConfig = { apiKey: string; from: string; siteUrl: string };

export function messageEmail(job: MessageEmailJob, config: EmailConfig) {
  const inbox = new URL(
    `/messages?conversation=${encodeURIComponent(job.conversation_id)}`,
    config.siteUrl,
  ).href;
  const profile = new URL('/profile#notifications', config.siteUrl).href;
  const escape = (value: string) =>
    value.replace(
      /[&<>"']/g,
      (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!,
    );
  return {
    from: config.from,
    to: [job.recipient_email],
    subject: 'You have a new message on Trovun',
    text: `Your people are a little closer. You have an unread message on Trovun.\n\nRead and reply: ${inbox}\n\nTurn off message emails in your profile: ${profile}\nPlease reply in Trovun, not to this email.`,
    html: `<html><body style="margin:0;background:#0b1319;font-family:Arial,sans-serif;color:#f3efe6"><table role="presentation" width="100%"><tr><td align="center" style="padding:48px 24px"><table role="presentation" style="max-width:520px;width:100%"><tr><td><p style="color:#f4d675;font-size:15px;font-weight:bold;letter-spacing:2px">TROVUN</p><h1 style="font-size:32px;line-height:1.15;margin:32px 0 20px">A message from<br>your people.</h1><p style="color:#bcc3c6;line-height:1.7">You have an unread message in your campus marketplace. Open the conversation to read and reply.</p><p style="margin:32px 0"><a href="${escape(inbox)}" style="display:inline-block;background:#f4d675;color:#101820;padding:16px 24px;border-radius:24px;text-decoration:none;font-weight:bold">Open conversation &rarr;</a></p><p style="color:#9da8ad;font-size:13px;line-height:1.7">Please reply in Trovun, not to this email.<br><a href="${escape(profile)}" style="color:#c6cacc">Turn off message emails in your profile</a></p></td></tr></table></td></tr></table></body></html>`,
  };
}

export async function sendMessageEmail(
  job: MessageEmailJob,
  config: EmailConfig,
  request: typeof fetch = fetch,
) {
  const response = await request('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': `trovun-message-${job.id}`,
    },
    body: JSON.stringify(messageEmail(job, config)),
    signal: AbortSignal.timeout(8_000),
  });
  // Never log the provider response: it can contain private recipient details.
  if (!response.ok) throw new Error(`Email provider returned ${response.status}`);
}

export type EmailQueue = {
  claim: () => PromiseLike<{
    data: Array<Omit<MessageEmailJob, 'lease'> & { lease: string | null }> | null;
    error: unknown;
  }>;
  eligible: (id: string) => PromiseLike<{ data: boolean | null; error: unknown }>;
  finish: (
    id: string,
    lease: string,
    outcome: 'sent' | 'cancelled' | 'retry',
  ) => PromiseLike<{ error: unknown }>;
};

export async function processMessageEmailQueue(
  queue: EmailQueue,
  config: EmailConfig,
  request: typeof fetch = fetch,
) {
  const { data: jobs, error } = await queue.claim();
  if (error) throw new Error('Could not claim message email jobs');
  let sent = 0;
  let failed = 0;
  for (const job of jobs ?? []) {
    if (!job.lease) continue;
    let outcome: 'sent' | 'cancelled' | 'retry' = 'retry';
    try {
      const eligible = await queue.eligible(job.id);
      if (eligible.error) throw new Error('Could not check notification preference');
      if (!eligible.data) outcome = 'cancelled';
      else {
        await sendMessageEmail({ ...job, lease: job.lease }, config, request);
        outcome = 'sent';
        sent += 1;
      }
    } catch {
      failed += 1;
    }
    const finished = await queue.finish(job.id, job.lease, outcome);
    if (finished.error) throw new Error('Could not acknowledge message email job');
  }
  return { configured: true, sent, failed };
}
