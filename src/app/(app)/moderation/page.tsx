import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowUpRight, ClipboardList, Eye, Inbox, ShieldCheck } from 'lucide-react';

import { ModerationAuditLog } from '@/features/moderation/components/ModerationAuditLog';
import { getModerationWorkspace } from '@/features/moderation/queries';
import { requireModerator } from '@/lib/auth/session';
import { ReportQueue } from '@/features/safety/ReportQueue';
import { ReviewQueue } from '@/features/ai/ReviewQueue';

export const metadata: Metadata = {
  title: 'Moderation | Trovun',
  description: 'Secure listing moderation and removal history for Trovun moderators.',
  robots: { follow: false, index: false },
};

export const dynamic = 'force-dynamic';

type ModerationPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ModerationPage({ searchParams }: ModerationPageProps) {
  const viewer = await requireModerator('/moderation');
  const params = await searchParams;
  const page = parseAuditPage(params.page);
  const data = await getModerationWorkspace(page);

  return (
    <div className="min-h-[calc(100vh-4.35rem)] bg-[#080c13] pb-24 text-um-text-strong lg:pb-28">
      <header className="border-b border-white/[0.075] bg-[radial-gradient(circle_at_84%_12%,rgba(231,188,53,0.075),transparent_26rem)]">
        <div className="mx-auto flex max-w-um-content flex-col gap-6 px-4 py-9 sm:flex-row sm:items-end sm:justify-between sm:px-6 sm:py-11 lg:px-8">
          <div>
            <p className="font-condensed flex items-center gap-2 text-[0.66rem] font-bold uppercase tracking-[0.19em] text-um-gold-300/78">
              <ShieldCheck aria-hidden="true" className="size-3.5" strokeWidth={1.9} />
              Restricted workspace
            </p>
            <h1 className="mt-2 text-[clamp(2.55rem,5vw,4.35rem)] font-bold leading-[0.96] tracking-[-0.052em] text-[#f0ece4]">
              Moderation.
            </h1>
            <p className="mt-3 text-xs font-medium text-white/35">
              Drafts stay private. Every removal stays recorded.
            </p>
          </div>

          <Link
            className="group inline-flex min-h-11 w-fit shrink-0 items-center justify-center gap-2 rounded-full bg-um-gold-300 px-5 text-sm font-bold text-um-ink-950 shadow-[0_12px_32px_rgba(201,152,18,0.14)] transition-[background-color,box-shadow,transform] duration-220 ease-um-out hover:-translate-y-px hover:bg-um-gold-200 hover:shadow-[0_15px_38px_rgba(201,152,18,0.2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            href="/marketplace"
          >
            Review listings
            <ArrowUpRight
              aria-hidden="true"
              className="size-4 transition-transform duration-220 ease-um-out group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
            />
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-um-content px-4 sm:px-6 lg:px-8">
        <section aria-labelledby="moderation-overview-heading" className="pt-8 sm:pt-10">
          <h2 className="sr-only" id="moderation-overview-heading">
            Moderation overview
          </h2>

          <div className="grid overflow-hidden rounded-[1.05rem] border border-white/[0.075] bg-[#0d131d] sm:grid-cols-3 sm:divide-x sm:divide-white/[0.075]">
            <OverviewCard
              icon={Eye}
              label="Published"
              value={data.currentListingCount.toLocaleString('en-CA')}
            />
            <OverviewCard
              icon={ClipboardList}
              label="Removal records"
              value={data.totalEvents.toLocaleString('en-CA')}
            />
            <OverviewCard icon={Inbox} label="Reports" value="Review below" />
          </div>
        </section>

        <ReportQueue />
        <ReviewQueue />
        <section aria-labelledby="moderation-audit-heading" className="mt-12 sm:mt-14 lg:mt-16">
          <div className="mb-5 flex flex-col gap-3 border-b border-white/[0.075] pb-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="font-condensed text-[0.64rem] font-bold uppercase tracking-[0.18em] text-um-gold-300/72">
                Append-only
              </p>
              <h2
                className="mt-1 text-2xl font-bold tracking-[-0.04em] text-[#f0ece4] sm:text-3xl"
                id="moderation-audit-heading"
              >
                Removal audit
              </h2>
            </div>
            <p className="font-mono text-[0.61rem] uppercase tracking-[0.12em] text-white/28">
              Waterloo local time
            </p>
          </div>

          <ModerationAuditLog
            currentModeratorId={viewer.id}
            events={data.events}
            page={data.page}
            totalEvents={data.totalEvents}
            totalPages={data.totalPages}
          />
        </section>
      </div>
    </div>
  );
}

type OverviewCardProps = {
  icon: typeof Eye;
  label: string;
  value: string;
};

function OverviewCard({ icon: Icon, label, value }: OverviewCardProps) {
  return (
    <article className="flex min-h-[6.75rem] items-center justify-between gap-5 border-b border-white/[0.075] p-5 last:border-b-0 sm:border-b-0 sm:px-6">
      <div className="flex items-center gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-white/[0.045] text-white/42 ring-1 ring-inset ring-white/[0.07]">
          <Icon aria-hidden="true" className="size-4" strokeWidth={1.8} />
        </span>
        <h3 className="text-xs font-semibold text-white/48">{label}</h3>
      </div>
      <strong className="text-xl font-bold tabular-nums tracking-[-0.035em] text-[#f0ece4]">
        {value}
      </strong>
    </article>
  );
}

function parseAuditPage(value: string | string[] | undefined) {
  const firstValue = Array.isArray(value) ? value[0] : value;
  const page = Number.parseInt(firstValue ?? '1', 10);
  return Number.isNaN(page) ? 1 : page;
}
