import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { requireModerator } from '@/lib/auth/session';
import { reviewReport } from './actions';
export async function ReportQueue() {
  await requireModerator('/moderation');
  const client = (await createClient()) as unknown as SupabaseClient;
  const { data, error } = await client
    .from('safety_reports')
    .select('id,subject,reference_id,reporter_id,details,created_at')
    .eq('status', 'open')
    .order('created_at')
    .limit(50);
  return (
    <section className="mt-8 space-y-4" aria-label="Safety reports">
      <h2 className="text-2xl font-bold">Reports & requests</h2>
      {error ? (
        <p>Reports are temporarily unavailable.</p>
      ) : !data?.length ? (
        <p>No open reports.</p>
      ) : (
        data.map((row) => (
          <article key={row.id} className="rounded-xl border border-white/10 p-4">
            <p className="font-semibold capitalize">
              {row.subject} · {new Date(row.created_at).toLocaleDateString('en-CA')}
            </p>
            <p className="mt-2 whitespace-pre-wrap break-words">{row.details}</p>
            <p className="mt-2 break-all text-xs text-white/50">
              Reporter: {row.reporter_id ?? 'Deleted account'} · Reference:{' '}
              {row.reference_id ?? 'None'}
            </p>
            <form action={reviewReport}>
              <input type="hidden" name="id" value={row.id} />
              <button className="mt-3 min-h-11 rounded-lg border px-4">Mark reviewed</button>
            </form>
          </article>
        ))
      )}
    </section>
  );
}
