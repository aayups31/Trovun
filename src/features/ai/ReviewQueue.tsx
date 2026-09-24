import Link from 'next/link';
import type { SupabaseClient } from '@supabase/supabase-js';
import { requireModerator } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';
import { reviewOutput } from './moderation';
import { dismissAiReview, runAiReviews } from './review-actions';

export async function ReviewQueue() {
  await requireModerator('/moderation');
  const db = (await createClient()) as unknown as SupabaseClient;
  const { data, error } = await db
    .from('ai_listing_reviews')
    .select('listing_id,fingerprint,state,flags,checked_at,updated_at')
    .eq('reviewed', false)
    .or('state.neq.done,flags.neq.[]')
    .order('updated_at', { ascending: false })
    .limit(50);
  return (
    <section className="mt-8 space-y-4" aria-label="AI listing flags">
      <h2 className="text-2xl font-bold">AI listing flags</h2>
      <p className="text-sm text-white/60">
        Private suggestions for human review. No listing or account action is taken automatically.
        Checks can miss issues or flag permitted items.
      </p>
      <form action={runAiReviews}>
        <button className="min-h-11 rounded-lg border border-white/20 px-4">
          Process next two queued checks
        </button>
      </form>
      {error ? (
        <p>
          AI review queue is unavailable. Check the database migration and worker configuration.
        </p>
      ) : !data?.length ? (
        <p>No outstanding checks.</p>
      ) : (
        data.map((row) => {
          const parsed = reviewOutput.safeParse({ flags: row.flags });
          const flags = parsed.success ? parsed.data.flags : [];
          if (row.state === 'done' && !flags.length) return null;
          return (
            <article key={row.listing_id} className="rounded-xl border border-white/10 p-4">
              <Link href={`/listings/${row.listing_id}`} className="font-semibold underline">
                Open listing
              </Link>
              <p className="mt-2 text-xs text-white/60">
                {row.state === 'done'
                  ? 'Needs human review'
                  : row.state === 'failed'
                    ? 'Check failed after retries — inspect manually'
                    : 'Awaiting background check'}
              </p>
              {flags.map((flag, i) => (
                <div key={i} className="mt-3 space-y-1 border-t border-white/10 pt-3">
                  <p className="font-semibold">
                    {flag.category.replaceAll('_', ' ')} · {flag.priority} · {flag.certainty}
                  </p>
                  <p>{flag.reason}</p>
                  <p className="text-sm text-white/60">Evidence: {flag.evidence}</p>
                </div>
              ))}
              {row.state === 'done' && (
                <form action={dismissAiReview}>
                  <input type="hidden" name="id" value={row.listing_id} />
                  <input type="hidden" name="fingerprint" value={row.fingerprint} />
                  <button className="mt-4 min-h-11 rounded-lg border px-4">
                    Mark reviewed / dismiss flag
                  </button>
                </form>
              )}
            </article>
          );
        })
      )}
    </section>
  );
}
