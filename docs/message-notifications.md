# Message email notifications

The linked Supabase project has the notification migration, `message-emails` Edge Function, and the `trovun-message-emails` schedule installed. The worker runs every minute using a dedicated credential stored in Supabase Vault and Edge Function secrets. It is independent of the Next.js host.

## Activate delivery

1. Verify a sending domain in Resend and choose its sender address.
2. Add `RESEND_API_KEY` and `MESSAGE_EMAIL_FROM` (for example, `Trovun <messages@your-verified-domain>`) to `.env.local`. Set `MESSAGE_EMAIL_SITE_URL` if the public app URL differs from `https://www.trovun.ca`.
3. Run `npm run notifications:configure`. This installs those values as Supabase Function secrets using a private temporary file, then deletes the file. Credentials are never printed or committed.

Provider secrets were installed on September 16, 2026. The scheduled worker returned HTTP 200 with `{"configured":true,"sent":0,"failed":0}` on two consecutive runs after configuration. The profile preference already works. Actual inbox delivery has **not** yet been verified; these runs had no emails to send.

## Behavior

New messages enqueue one private job for the other participant, defaulting to email enabled. Delivery waits at least one minute, skips messages already read, and rechecks the preference immediately before sending. Rapid messages are combined; a conversation sends at most one notification per ten minutes. The email contains a link to the conversation, not its message contents. Every email links to the profile opt-out. A delivery already in flight may finish when the user turns emails off.

Workers claim jobs under leases. Retries use the same Resend idempotency key, back off, stop after five attempts, and expire before 24 hours. Recipient addresses come from confirmed database identities. Browsers cannot read the queue or invoke the delivery RPCs. Provider errors never fail the original chat message.

## Verification and operations

- `npm test` covers provider errors, opt-out/read suppression, lease ownership, links and the preference UI.
- `supabase/tests/database/008_message_notifications.test.sql` checks recipient derivation, preferences, RLS, read suppression, leasing and retries inside a rolled-back transaction. Run with `supabase db query --linked --file ...`.
- Supabase Dashboard → Integrations → Cron shows `trovun-message-emails`. Its HTTP responses appear in `net._http_response`; never expose Vault values in logs.
- `message_email_jobs` records `pending`, `processing`, `sent`, `cancelled`, or `failed`. Investigate repeated failures in Resend before requeueing jobs. Do not requeue after the 23-hour delivery window.
- The Next.js `/api/cron/message-emails` endpoint is an alternative scheduler target, secured by `CRON_SECRET`; the deployed Supabase schedule does not require it.

Implementation references: [Supabase scheduled functions](https://supabase.com/docs/guides/functions/schedule-functions), [Resend send-email API](https://resend.com/docs/api-reference/emails/send-email).
