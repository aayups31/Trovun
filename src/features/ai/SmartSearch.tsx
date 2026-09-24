'use client';

import { useState } from 'react';
import Link from 'next/link';
import { z } from 'zod';
import { searchPlan } from './contracts';
import { AiPanel } from './AiPanel';

const resultSchema = z.object({
  plan: searchPlan,
  listings: z
    .array(
      z.object({
        id: z.uuid(),
        title: z.string(),
        price_cents: z.number().nullable(),
        condition: z.string().nullable(),
        category_name: z.string(),
      }),
    )
    .max(8),
});

export function SmartSearch({ category }: { category?: string | null }) {
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<z.infer<typeof resultSchema> | null>(null);
  async function search(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setResult(null);
    try {
      const response = await fetch('/api/ai/assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(25_000),
        body: JSON.stringify({ purpose: 'search', query, category: category ?? undefined }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Search unavailable.');
      setResult(resultSchema.parse(data));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Try regular search.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <AiPanel label="Find it for me" title="What are you looking for?">
      <form onSubmit={(event) => void search(event)} className="pb-4">
        <label className="block text-xs leading-5 text-white/60" htmlFor="smart-search">
          Optional AI search · Your request is sent to OpenAI. No personal details needed.{' '}
          <Link className="underline" href="/safety#ai">
            Privacy
          </Link>
        </label>
        <div className="mt-3 flex flex-wrap gap-2">
          <input
            disabled={busy}
            id="smart-search"
            required
            minLength={3}
            maxLength={300}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setResult(null);
            }}
            placeholder="A desk for my dorm under $80"
            className="min-h-11 min-w-0 flex-1 rounded-lg border border-white/20 bg-transparent px-3"
          />
          <button
            disabled={busy}
            className="min-h-11 rounded-lg bg-um-gold-300 px-4 font-semibold text-black disabled:opacity-50"
          >
            {busy ? 'Finding items…' : 'Find items'}
          </button>
        </div>
        {error && (
          <p role="alert" className="mt-3 text-red-300">
            {error} Regular search is still available above.
          </p>
        )}
        {result && (
          <div className="mt-4 space-y-3" aria-live="polite">
            <p>
              Searching for {result.plan.terms.join(' / ')}
              {result.plan.minPriceCents !== null
                ? ` · from $${(result.plan.minPriceCents / 100).toFixed(2)}`
                : ''}
              {result.plan.maxPriceCents !== null
                ? ` · up to $${(result.plan.maxPriceCents / 100).toFixed(2)}`
                : ''}{' '}
              CAD{category ? ' · within this category' : ''}.
            </p>
            <p className="text-xs text-white/60">
              {result.plan.note} Matches use listing text; confirm suitability with the seller.
            </p>
            {!result.listings.length ? (
              <p>No available matches. Try a broader item name or budget.</p>
            ) : (
              <ul className="divide-y divide-white/10">
                {result.listings.map((item) => (
                  <li key={item.id}>
                    <Link
                      className="flex min-h-14 items-center justify-between gap-4 py-3 hover:text-um-gold-300"
                      href={`/listings/${item.id}`}
                    >
                      <span>
                        {item.title}
                        <span className="block text-xs text-white/50">{item.category_name}</span>
                      </span>
                      <span className="shrink-0">
                        {item.price_cents === null
                          ? 'See listing'
                          : `$${(item.price_cents / 100).toFixed(2)}`}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </form>
    </AiPanel>
  );
}
