import Link from 'next/link';
import { ChevronLeft, ChevronRight, FileClock, ListRestart, LockKeyhole } from 'lucide-react';

import type { ModerationAuditEvent } from '../queries';

type ModerationAuditLogProps = {
  currentModeratorId: string;
  events: ModerationAuditEvent[];
  page: number;
  totalEvents: number;
  totalPages: number;
};

const auditDateFormatter = new Intl.DateTimeFormat('en-CA', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'America/Toronto',
});

export function ModerationAuditLog({
  currentModeratorId,
  events,
  page,
  totalEvents,
  totalPages,
}: ModerationAuditLogProps) {
  if (totalEvents === 0) {
    return <EmptyAuditLog />;
  }

  if (events.length === 0) {
    return <EmptyAuditPage />;
  }

  return (
    <div>
      <div className="overflow-hidden rounded-[1.05rem] border border-white/[0.075] bg-[#0d131d] shadow-[0_18px_48px_rgba(0,0,0,0.16)]">
        <div className="flex items-center justify-between gap-4 border-b border-white/[0.075] bg-white/[0.018] px-5 py-4 sm:px-6">
          <p className="flex items-center gap-2 text-xs font-semibold text-white/52">
            <LockKeyhole
              aria-hidden="true"
              className="size-3.5 text-um-gold-300/74"
              strokeWidth={1.9}
            />
            Immutable history
          </p>
          <p className="font-mono text-[0.61rem] tabular-nums tracking-[0.1em] text-white/28">
            {totalEvents} {totalEvents === 1 ? 'record' : 'records'}
          </p>
        </div>

        <div className="divide-y divide-white/[0.075] md:hidden">
          {events.map((event) => (
            <AuditCard currentModeratorId={currentModeratorId} event={event} key={event.id} />
          ))}
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[58rem] border-collapse text-left">
            <caption className="sr-only">
              Append-only log of listing removals performed by Trovun moderators
            </caption>
            <thead>
              <tr className="border-b border-white/[0.075] bg-white/[0.018] font-condensed text-[0.62rem] font-bold uppercase tracking-[0.14em] text-white/30">
                <th className="px-6 py-3.5" scope="col">
                  Recorded
                </th>
                <th className="px-5 py-3.5" scope="col">
                  Listing
                </th>
                <th className="px-5 py-3.5" scope="col">
                  Action
                </th>
                <th className="px-5 py-3.5" scope="col">
                  Reason
                </th>
                <th className="px-6 py-3.5" scope="col">
                  Moderator
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.075]">
              {events.map((event) => (
                <tr className="align-top transition-colors hover:bg-white/[0.018]" key={event.id}>
                  <td className="whitespace-nowrap px-6 py-5 text-xs text-white/34">
                    <AuditTime value={event.createdAt} />
                  </td>
                  <td className="max-w-56 px-5 py-5">
                    <p className="line-clamp-2 text-sm font-semibold leading-5 text-[#f0ece4]">
                      {event.listingTitle}
                    </p>
                    <p className="mt-1.5 font-mono text-[0.6rem] tracking-[0.03em] text-white/24">
                      Audit #{event.id}
                      {event.listingId ? ` · Listing ${shortReference(event.listingId)}` : ''}
                    </p>
                  </td>
                  <td className="px-5 py-5">
                    <ActionBadge action={event.action} />
                  </td>
                  <td className="max-w-xl px-5 py-5 text-sm leading-6 text-white/58">
                    {event.reason}
                  </td>
                  <td className="whitespace-nowrap px-6 py-5 text-xs font-medium text-white/34">
                    {moderatorLabel(event.moderatorId, currentModeratorId)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <AuditPagination page={page} totalPages={totalPages} />
    </div>
  );
}

function AuditCard({
  currentModeratorId,
  event,
}: {
  currentModeratorId: string;
  event: ModerationAuditEvent;
}) {
  return (
    <article className="p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[0.68rem] text-white/32">
            <AuditTime value={event.createdAt} />
          </p>
          <h3 className="mt-2 text-base font-bold leading-6 text-[#f0ece4]">
            {event.listingTitle}
          </h3>
        </div>
        <ActionBadge action={event.action} />
      </div>

      <div className="mt-4 border-l border-um-gold-300/55 bg-white/[0.025] px-4 py-3 text-sm leading-6 text-white/58">
        {event.reason}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-[0.64rem] text-white/26">
        <p className="font-mono">
          Audit #{event.id}
          {event.listingId ? ` · Listing ${shortReference(event.listingId)}` : ''}
        </p>
        <p className="font-medium">{moderatorLabel(event.moderatorId, currentModeratorId)}</p>
      </div>
    </article>
  );
}

function ActionBadge({ action }: { action: ModerationAuditEvent['action'] }) {
  return (
    <span className="inline-flex min-h-7 shrink-0 items-center rounded-full bg-red-400/[0.08] px-2.5 text-[0.64rem] font-bold text-red-200 ring-1 ring-inset ring-red-200/10">
      {action === 'listing_removed' ? 'Removed' : action}
    </span>
  );
}

function AuditTime({ value }: { value: string }) {
  const date = new Date(value);
  const label = Number.isNaN(date.getTime()) ? 'Time unavailable' : auditDateFormatter.format(date);

  return <time dateTime={value}>{label}</time>;
}

function AuditPagination({ page, totalPages }: { page: number; totalPages: number }) {
  if (totalPages <= 1) return null;

  return (
    <nav
      aria-label="Moderation audit pages"
      className="mt-5 flex items-center justify-between gap-4 border-t border-white/[0.075] pt-5"
    >
      {page > 1 ? (
        <Link
          className="inline-flex min-h-10 items-center gap-1.5 rounded-full px-3.5 text-xs font-semibold text-white/46 ring-1 ring-inset ring-white/[0.08] transition-colors duration-220 ease-um-out hover:bg-white/[0.045] hover:text-white"
          href={auditPageHref(page - 1)}
        >
          <ChevronLeft aria-hidden="true" className="size-3.5" />
          Previous
        </Link>
      ) : (
        <span aria-hidden="true" />
      )}

      {page < totalPages ? (
        <Link
          className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-um-gold-300 px-3.5 text-xs font-bold text-um-ink-950 transition-colors duration-220 ease-um-out hover:bg-um-gold-200"
          href={auditPageHref(page + 1)}
        >
          Next
          <ChevronRight aria-hidden="true" className="size-3.5" />
        </Link>
      ) : (
        <span aria-hidden="true" />
      )}
    </nav>
  );
}

function EmptyAuditLog() {
  return (
    <div className="grid min-h-[20rem] place-items-center rounded-[1.05rem] border border-white/[0.075] bg-[#0d131d] px-6 py-14 text-center">
      <div>
        <span className="mx-auto grid size-11 place-items-center rounded-full bg-white/[0.045] text-um-gold-300 ring-1 ring-inset ring-white/[0.07]">
          <FileClock aria-hidden="true" className="size-5" strokeWidth={1.7} />
        </span>
        <h3 className="mt-5 text-xl font-bold tracking-[-0.03em] text-[#f0ece4]">
          No removals recorded.
        </h3>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-white/36">
          The audit begins when a moderator removes a listing with a recorded reason.
        </p>
      </div>
    </div>
  );
}

function EmptyAuditPage() {
  return (
    <div className="grid min-h-[20rem] place-items-center rounded-[1.05rem] border border-white/[0.075] bg-[#0d131d] px-6 py-14 text-center">
      <div>
        <span className="mx-auto grid size-11 place-items-center rounded-full bg-white/[0.045] text-um-gold-300 ring-1 ring-inset ring-white/[0.07]">
          <ListRestart aria-hidden="true" className="size-5" strokeWidth={1.7} />
        </span>
        <h3 className="mt-5 text-xl font-bold tracking-[-0.03em] text-[#f0ece4]">
          This page is empty.
        </h3>
        <Link
          className="mt-6 inline-flex min-h-10 items-center rounded-full bg-um-gold-300 px-4 text-xs font-bold text-um-ink-950 transition-colors duration-220 ease-um-out hover:bg-um-gold-200"
          href="/moderation"
        >
          First audit page
        </Link>
      </div>
    </div>
  );
}

function moderatorLabel(moderatorId: string | null, currentModeratorId: string) {
  if (!moderatorId) return 'Account unavailable';
  if (moderatorId === currentModeratorId) return 'You';
  return `Moderator ${shortReference(moderatorId)}`;
}

function shortReference(value: string) {
  return `…${value.slice(-6)}`;
}

function auditPageHref(page: number) {
  return page <= 1 ? '/moderation' : `/moderation?page=${page}`;
}
