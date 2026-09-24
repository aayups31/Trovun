'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { z } from 'zod';
import { Check } from 'lucide-react';
import { AiPanel } from './AiPanel';
import { listingAutofillOutput } from './contracts';
import type { MarketplaceAssistantProps } from './MarketplaceAssistant';
import { centsToDollars, dollarsToCents } from '@/features/listings/schemas';

export function ListingAutofill({
  title,
  description,
  condition,
  currentPrice,
  listingId,
  photoRevision,
  onApply,
  onApplyPrice,
}: MarketplaceAssistantProps) {
  const [open, setOpen] = useState(false);
  const [includePhotos, setIncludePhotos] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<z.infer<typeof listingAutofillOutput> | null>(null);
  const [source, setSource] = useState('');
  const [price, setPrice] = useState('');
  const snapshot = JSON.stringify({
    title,
    description,
    condition,
    currentPrice,
    listingId,
    photoRevision,
    includePhotos,
  });
  const latest = useRef(snapshot);
  useEffect(() => {
    latest.current = snapshot;
  }, [snapshot]);
  const stale = source !== snapshot;
  const priceCents = dollarsToCents(price);

  async function autofill() {
    setBusy(true);
    setError('');
    setResult(null);
    const requested = snapshot;
    try {
      const response = await fetch('/api/ai/assist', {
        method: 'POST',
        signal: AbortSignal.timeout(25_000),
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          purpose: 'listing',
          title,
          description,
          condition: condition || null,
          listingId: listingId ?? undefined,
          includePhotos,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Autofill is unavailable.');
      const suggestion = listingAutofillOutput.parse(data);
      if (latest.current !== requested)
        throw new Error('Your details changed. Try autofill again to use the latest version.');
      if (suggestion.blocked) {
        setSource(requested);
        setResult(suggestion);
        return;
      }
      if (!onApply) throw new Error('Return to your listing to use autofill.');
      onApply(suggestion);
      setSource(
        JSON.stringify({
          title: suggestion.title,
          description: suggestion.description,
          condition,
          currentPrice,
          listingId,
          photoRevision,
          includePhotos,
        }),
      );
      setResult(suggestion);
      setPrice(centsToDollars(suggestion.suggestedPriceCents));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Autofill is unavailable.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <AiPanel
      label="Autofill listing"
      title="Autofill your listing"
      open={open}
      onOpenChange={setOpen}
    >
      <p className="mt-2 text-sm leading-6 text-white/65">
        Fill the title, a short description and category. Get a starting price to edit.
      </p>
      <p className="mt-2 text-xs leading-5 text-white/50">
        Item details and selected photos go to OpenAI.{' '}
        <Link className="underline" href="/safety#ai">
          Privacy
        </Link>
      </p>
      {listingId && photoRevision && (
        <label className="mt-3 flex min-h-11 items-center gap-3 text-sm">
          <input
            type="checkbox"
            checked={includePhotos}
            disabled={busy}
            onChange={(event) => setIncludePhotos(event.target.checked)}
          />
          Use my first three photos
        </label>
      )}
      <button
        type="button"
        onClick={() => void autofill()}
        disabled={
          busy || (title.trim().length < 3 && !(includePhotos && listingId && photoRevision))
        }
        className="mt-4 min-h-11 rounded-xl bg-um-gold-300 px-5 font-semibold text-black disabled:opacity-50"
      >
        {busy ? 'Filling your listing…' : result ? 'Try again' : 'Autofill & suggest price'}
      </button>
      {error && (
        <p className="mt-3 text-red-300" role="alert">
          {error}
        </p>
      )}
      {result && (
        <div className="mt-5 space-y-4" aria-live="polite">
          {result.blocked ? (
            <div>
              <p className="font-semibold">Review this item first</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-white/70">
                {result.concerns.map((concern, index) => (
                  <li key={index}>{concern}</li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-white/50">
                Your listing has not been changed.{' '}
                <Link href="/safety#prohibited-items" className="underline">
                  Listing rules
                </Link>
              </p>
            </div>
          ) : (
            <>
              <p className="flex items-center gap-2 text-sm">
                <Check className="size-4 text-um-gold-300" aria-hidden="true" />
                Details filled — review them before publishing.
              </p>
              {result.suggestedPriceCents !== null ? (
                <div className="rounded-xl border border-white/10 p-4">
                  <label className="block text-xs text-white/60" htmlFor="ai-suggested-price">
                    Suggested price · CAD
                  </label>
                  <div className="mt-2 flex items-center gap-2">
                    <span aria-hidden="true">$</span>
                    <input
                      id="ai-suggested-price"
                      inputMode="decimal"
                      autoComplete="off"
                      maxLength={12}
                      value={price}
                      onChange={(event) => setPrice(event.target.value)}
                      className="min-h-11 w-full min-w-0 rounded-lg border border-white/20 bg-transparent px-3 text-xl font-semibold"
                    />
                  </div>
                  <p className="mt-3 text-xs leading-5 text-white/60">
                    Rough starting estimate, not live market data. {result.priceReason}
                  </p>
                  {onApplyPrice && (
                    <button
                      type="button"
                      disabled={stale || priceCents === null || priceCents > 100_000_000}
                      className="mt-3 min-h-11 rounded-lg border border-um-gold-300/40 px-4 font-semibold text-um-gold-300 disabled:opacity-50"
                      onClick={() => {
                        if (priceCents !== null && !stale) {
                          onApplyPrice(priceCents);
                          setResult(null);
                          setOpen(false);
                        }
                      }}
                    >
                      Use price
                    </button>
                  )}
                </div>
              ) : (
                <p className="text-sm text-white/65">
                  {result.priceReason ||
                    'Add the exact model or edition for a useful price suggestion.'}
                </p>
              )}
              {result.checks.length > 0 && (
                <details className="text-xs text-white/60">
                  <summary className="min-h-11 cursor-pointer py-3">
                    Details still worth confirming
                  </summary>
                  <ul className="list-disc space-y-1 pl-5">
                    {result.checks.slice(0, 2).map((check, index) => (
                      <li key={index}>{check}</li>
                    ))}
                  </ul>
                </details>
              )}
              {stale && (
                <p className="text-xs text-white/60">
                  Item details changed. Generate a fresh price suggestion.
                </p>
              )}
            </>
          )}
        </div>
      )}
    </AiPanel>
  );
}
