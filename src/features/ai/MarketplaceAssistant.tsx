'use client';
import { useState } from 'react';
import Link from 'next/link';
import { assistanceOutput, type Assistance } from './contracts';
import { AiPanel } from './AiPanel';
import { ListingAutofill } from './ListingAutofill';

export type MarketplaceAssistantProps = {
  purpose: 'listing' | 'buyer';
  title: string;
  description: string;
  onApply?: (suggestion: Assistance) => void;
  onApplyPrice?: (cents: number) => void;
  condition?: 'new' | 'like_new' | 'good' | 'fair' | 'well_used' | '';
  currentPrice?: string;
  listingId?: string | null;
  photoRevision?: string;
};

export function MarketplaceAssistant(props: MarketplaceAssistantProps) {
  return props.purpose === 'listing' ? (
    <ListingAutofill {...props} />
  ) : (
    <BuyerAssistant {...props} />
  );
}

function BuyerAssistant({
  purpose,
  title,
  description,
  onApply,
  listingId,
  photoRevision,
}: {
  purpose: 'listing' | 'buyer';
  title: string;
  description: string;
  onApply?: (suggestion: Assistance) => void;
  listingId?: string | null;
  photoRevision?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Assistance | null>(null);
  const [error, setError] = useState('');
  const [source, setSource] = useState('');
  const [includePhotos, setIncludePhotos] = useState(false);
  const [question, setQuestion] = useState('');
  const [answeredQuestion, setAnsweredQuestion] = useState('');
  const snapshot = JSON.stringify({
    title,
    description,
    includePhotos,
    photoRevision,
    listingId,
    question,
  });
  const stale = source !== snapshot;
  async function run() {
    setBusy(true);
    setError('');
    setResult(null);
    setSource(snapshot);
    setAnsweredQuestion(question.trim());
    try {
      const response = await fetch('/api/ai/assist', {
        method: 'POST',
        signal: AbortSignal.timeout(25_000),
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          purpose,
          title,
          description,
          listingId: listingId ?? undefined,
          includePhotos: purpose === 'listing' && includePhotos,
          question: purpose === 'buyer' ? question : undefined,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'AI help is unavailable.');
      setResult(assistanceOutput.parse(data));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'AI help is unavailable.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <AiPanel
      label={purpose === 'listing' ? 'Help me list' : 'Ask about this item'}
      title={purpose === 'listing' ? 'A hand with your listing' : 'Know before you buy'}
    >
      <p className="mt-2 text-xs leading-5 text-white/60">
        Optional AI help sends these item details
        {purpose === 'buyer' ? ' and your question' : ' and photos only if selected'} to OpenAI.
        Remove personal details first. Chats and profile details are not sent.{' '}
        <Link className="underline" href="/safety#ai">
          Privacy details
        </Link>
      </p>
      {purpose === 'listing' && listingId && photoRevision && (
        <label className="mt-3 flex min-h-11 items-center gap-3">
          <input
            type="checkbox"
            checked={includePhotos}
            onChange={(event) => setIncludePhotos(event.target.checked)}
          />
          Use my first three uploaded photos to help draft the listing
        </label>
      )}
      {purpose === 'buyer' && (
        <label className="mt-4 block">
          <span className="text-xs text-white/60">
            Ask about the stated details, or leave blank for an inspection checklist
          </span>
          <input
            className="mt-2 min-h-11 w-full rounded-lg border border-white/20 bg-transparent px-3"
            maxLength={500}
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="Does it include a charger?"
          />
        </label>
      )}
      <button
        type="button"
        disabled={
          busy || (title.trim().length < 3 && !(includePhotos && listingId && photoRevision))
        }
        onClick={() => void run()}
        className="mt-3 min-h-11 rounded-lg border border-um-gold-300/30 px-4 font-semibold disabled:opacity-50"
      >
        {busy
          ? 'Working…'
          : purpose === 'listing'
            ? includePhotos
              ? 'Draft from details & photos'
              : 'Improve & check with AI'
            : question.trim()
              ? 'Ask about this item'
              : 'Make an inspection checklist'}
      </button>
      {error && (
        <p role="alert" className="mt-3 text-red-400">
          {error}
        </p>
      )}
      {result && (
        <div className="mt-4 space-y-3" aria-live="polite">
          <p className="text-xs text-white/60">
            AI suggestions can be wrong. Verify facts, recalls and safety yourself.
          </p>
          {(purpose === 'listing' || answeredQuestion) && (
            <>
              <p className="font-semibold">
                {purpose === 'buyer' ? 'Based on this listing' : result.title}
              </p>
              <p className="whitespace-pre-wrap">{result.description}</p>
            </>
          )}
          {result.concerns.length > 0 && (
            <div>
              <p className="font-semibold">Things to review</p>
              <ul className="ml-5 list-disc">
                {result.concerns.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
          )}
          {result.checks.length > 0 && (
            <div>
              <p className="font-semibold">
                {purpose === 'buyer' ? 'Ask or inspect' : 'Details to confirm'}
              </p>
              <ul className="ml-5 list-disc">
                {result.checks.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
          )}
          {onApply && (
            <button
              type="button"
              disabled={stale || result.concerns.length > 0}
              className="min-h-11 rounded-lg border px-4 disabled:opacity-50"
              onClick={() => {
                onApply(result);
                setResult(null);
              }}
            >
              Use suggested wording
            </button>
          )}
          {stale && (
            <p className="text-xs">
              The item details changed. Generate fresh suggestions before applying.
            </p>
          )}
        </div>
      )}
    </AiPanel>
  );
}
