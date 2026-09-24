# AI and safety rollout

Compact wand buttons open optional listing help, item questions and smart search. Each request uses one server-only OpenAI Responses call. Published listings also receive private background flag checks for human moderators. No vector database or autonomous agent is used. Ordinary search, listing creation and messaging do not depend on AI.

## Features

- Listing help: improve supplied wording, ask for important missing details, or explicitly include the first three uploaded photos to draft visible item details. Photos must belong to the caller; the server derives short-lived signed URLs from authorized database rows. Users review and apply wording themselves. Changed source content invalidates the apply button.
- Buyer help: optional question grounded in the displayed listing text, or an item-specific inspection checklist. Unknown information should become a question for the seller, not an invented fact.
- Smart search: turn a request into item alternatives and explicit CAD price limits. The server applies these to real available listings, respects the selected category and returns at most eight results. The model never invents result cards. Dimensions and suitability still need confirmation.
- Moderation: text and up to eight published images are checked against the same policy as the safety page. Flags contain category, priority, uncertainty, evidence and reason. Only human moderators can see/dismiss them; the AI has no tools to change listings, ban people, send messages or approve items.

## Configuration

- Keep `OPENAI_API_KEY` server-only in local and hosting environments. Never use a `NEXT_PUBLIC_` prefix.
- `OPENAI_MODEL` is optional; the default is `gpt-4o-mini`, with low-detail photo inputs.
- Apply `20260923000100_safety_and_ai.sql` and `20260923000200_ai_listing_review.sql`. Both were applied to the linked project after rollback-only database checks on September 24, 2026. AI fails closed if its quota is unavailable; ordinary listing creation continues.
- Quotas: 20 requests per verified student per UTC database day, at least 10 seconds apart; 1,000 total requests per day. Failed provider requests consume quota. Set a project budget alert with OpenAI as well.
- Requests time out after 18 seconds and cap generated output at 1,200 tokens. No automatic retries.
- Background reviews have a separate cap of 200 attempts/day and three attempts/content version. Workers claim two jobs at a time under five-minute leases. Changed content invalidates stale results; unchanged content is not repeatedly scanned. Failed checks are never shown as clear.
- Safety reports reach `/moderation`. Assign a human to check this queue. It does not send email notifications or promise emergency response.

## Deployment and background retries

Deploy the Next.js changes with `OPENAI_API_KEY`, `SUPABASE_SECRET_KEY`, the public Supabase configuration and the public site URL. Successful listing publication, edits and image changes start background work with Next.js `after`, without waiting for AI before returning to the seller. Database triggers retain work even if that kick fails or a write bypasses the app.

For guaranteed retries while the app is idle, set a strong `CRON_SECRET` (at least 32 characters) in both the deployment and local configuration. After deploying, run `npm run ai:configure-reviews`. It checks that the protected route exists, then configures the linked project's Supabase Cron to call `/api/cron/listing-reviews` once per minute. The secret is stored in Vault, never in the cron command or logs. Existing Supabase Cron, Vault and pg_net integrations are required. Rerunning updates the named schedule rather than creating duplicates. The schedule has not been enabled from this local implementation session because the new Next.js route has not been deployed. Moderators can also process the next two pending checks from the private queue.

Existing listings are not bulk-scanned; new publications and content changes enqueue reviews. A failed review stays visible to moderators for manual inspection. The flag queue does not replace user reports or human review.

## Data and behavior

User-requested listing text, item questions, searches and explicitly selected drafting photos are sent to OpenAI. Published listing text/photos can also be sent for background checks. Obvious email, URL and phone text is filtered; this is not anonymization and does not redact photos. Private chats, profile data and meetup fields are not included. Requests set `store: false`; provider abuse-monitoring retention can still apply. Prompts and output are not logged. Counters older than seven days are cleaned on subsequent use.

Suggestions are validated and displayed as plain text. Users explicitly apply wording; concerns prevent applying the rewrite. Source text and images are treated as untrusted input. Reports are handled by humans, not sent to AI. Private moderation flags are retained with the current published content, replaced when that content changes, and removed when a listing is unpublished or deleted. The safety page and listing composer disclose these checks.

## Verification

`npm test`, `npm run typecheck`, `npm run lint` and `npm run build` cover local validation. `npm run test:ai:live` opts into three real API calls using synthetic text and a generated colour square only. It is skipped in the normal test suite. The live smoke test passed for structured vision drafts, price extraction and prohibited-item flags. `supabase/tests/database/009_ai_reviews.test.sql` uses rolled-back synthetic fixtures to check quotas, role isolation, leases, retries, stale-result rejection, deduplication and unchanged listing status. No real users are contacted by these tests.

## Policy source and outstanding operator decisions

The September 21 policy DOCX informs the web community rules and current data disclosures. The document itself is not served or downloaded. Formal contractual liability, indemnity and legal operator terms are not published as approved legal terms. The user has deferred operator name, monitored support/privacy contacts and mailing address. Complete those, the retention schedule and legal review before presenting a final legal agreement. No age threshold or legal compliance guarantee has been invented.

References: https://developers.openai.com/api/docs/guides/structured-outputs and https://developers.openai.com/api/docs/guides/your-data
