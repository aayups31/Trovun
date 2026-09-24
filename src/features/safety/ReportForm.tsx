'use client';
import { useState } from 'react';
import { submitReport } from './actions';
export function ReportForm({
  subject = 'other',
  referenceId = null,
}: {
  subject?: string;
  referenceId?: string | null;
}) {
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  return (
    <form
      className="mt-6 space-y-5"
      onSubmit={async (event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        setBusy(true);
        setMessage('');
        try {
          const result = await submitReport({
            subject: data.get('subject'),
            referenceId,
            details: data.get('details'),
          });
          setMessage(result.message);
          setSent(result.ok);
        } catch {
          setMessage('Your report could not be submitted. Please try again.');
        } finally {
          setBusy(false);
        }
      }}
    >
      <label className="block">
        What is this about?
        <select
          name="subject"
          defaultValue={subject}
          disabled={busy || sent}
          className="mt-2 block w-full rounded-lg bg-slate-900 p-3 text-white"
        >
          {referenceId && (subject === 'listing' || subject === 'conversation') && (
            <option value={subject}>
              {subject === 'listing' ? 'This listing' : 'This conversation'}
            </option>
          )}
          <option value="other">Safety or community concern</option>
          <option value="privacy">Privacy, access or deletion request</option>
          <option value="appeal">Moderation appeal</option>
        </select>
      </label>
      <label className="block">
        Details
        <textarea
          required
          minLength={10}
          maxLength={2000}
          name="details"
          disabled={busy || sent}
          rows={6}
          className="mt-2 block w-full rounded-lg bg-slate-900 p-3 text-white"
        />
      </label>
      <p className="text-sm text-white/60">
        Include the issue and relevant context. Never include passwords, banking details or identity
        documents. Reports go to authorized moderators, not the reported user. This form is not
        monitored for emergencies.
      </p>
      <button
        disabled={busy || sent}
        className="min-h-11 rounded-full bg-um-gold-300 px-6 py-3 font-semibold text-black disabled:opacity-50"
      >
        {sent ? 'Report received' : busy ? 'Sending…' : 'Submit report'}
      </button>
      <p role="status">{message}</p>
    </form>
  );
}
