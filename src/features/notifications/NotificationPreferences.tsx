'use client';

import { useState, useTransition } from 'react';
import * as Switch from '@radix-ui/react-switch';
import { Mail } from 'lucide-react';
import { updateMessageEmailPreference } from './actions';

export function NotificationPreferences({
  enabled,
  available,
}: {
  enabled: boolean;
  available: boolean;
}) {
  const [checked, setChecked] = useState(enabled);
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState('');
  const [failed, setFailed] = useState(false);
  return (
    <section
      id="notifications"
      aria-labelledby="notifications-heading"
      className="mx-auto max-w-um-content scroll-mt-28 px-4 pt-6 sm:px-6 lg:px-8"
    >
      <div className="max-w-xl rounded-xl border border-white/[0.08] bg-white/[0.025] px-4 py-3">
        <h2 id="notifications-heading" className="sr-only">
          Notifications
        </h2>
        <div className="flex items-center justify-between gap-5">
          <div>
            <label
              htmlFor="message-email-preference"
              className="flex items-center gap-2 text-sm font-medium text-white"
            >
              <Mail className="size-4 text-white/50" aria-hidden="true" /> Message emails
            </label>
            <p
              id="message-email-description"
              className="mt-1 text-xs leading-relaxed text-white/55"
            >
              Email me about unread messages.
            </p>
          </div>
          <Switch.Root
            id="message-email-preference"
            aria-describedby="message-email-description"
            checked={checked}
            disabled={pending || !available}
            onCheckedChange={(next) =>
              startTransition(async () => {
                setFeedback('');
                try {
                  const result = await updateMessageEmailPreference(next);
                  if (result.ok) setChecked(next);
                  setFailed(!result.ok);
                  setFeedback(result.message);
                } catch {
                  setFailed(true);
                  setFeedback('Could not save your preference. Please try again.');
                }
              })
            }
            className="relative h-7 w-12 shrink-0 rounded-full bg-white/20 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-um-gold-300 focus-visible:ring-offset-4 focus-visible:ring-offset-[#111c23] disabled:opacity-40 data-[state=checked]:bg-um-gold-300"
          >
            <Switch.Thumb className="block size-5 translate-x-1 rounded-full bg-white transition-transform data-[state=checked]:translate-x-6 data-[state=checked]:bg-[#111c23]" />
          </Switch.Root>
        </div>
        <p
          role={failed ? 'alert' : 'status'}
          className={`text-xs ${failed ? 'mt-2 text-red-300' : feedback || pending || !available ? 'mt-2 text-white/50' : 'sr-only'}`}
        >
          {!available
            ? 'Notification settings are temporarily unavailable.'
            : pending
              ? 'Saving preference…'
              : feedback}
        </p>
      </div>
    </section>
  );
}
