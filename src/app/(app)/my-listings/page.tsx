import Image from '@/components/ui/ResilientImage';
import Link from 'next/link';
import type { Metadata } from 'next';
import {
  Archive,
  Armchair,
  BadgeCheck,
  BookOpenText,
  FileEdit,
  ImageIcon,
  MonitorSmartphone,
  Plus,
  Radio,
  Shapes,
  Shirt,
  Store,
  type LucideIcon,
} from 'lucide-react';

import { ListingManagementActions } from '@/features/listings/components/ListingManagementActions';
import { getManagedListings, type ManagedListing } from '@/features/listings/editor-queries';
import { requireStudentSeller } from '@/lib/auth/session';
import { cn } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'My listings',
  description: 'Manage your Trovun drafts and published listings.',
};

export const dynamic = 'force-dynamic';

const GROUPS = [
  { status: 'draft' as const, label: 'Drafts', icon: FileEdit },
  { status: 'published' as const, label: 'Live', icon: Radio },
  { status: 'sold' as const, label: 'Sold', icon: BadgeCheck },
  { status: 'archived' as const, label: 'Archived', icon: Archive },
];

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  electronics: MonitorSmartphone,
  books: BookOpenText,
  household: Armchair,
  'household-items': Armchair,
  clothing: Shirt,
};

export default async function MyListingsPage() {
  const viewer = await requireStudentSeller('/my-listings');
  const listings = await getManagedListings(viewer.id);
  const availableGroups = GROUPS.filter((group) =>
    listings.some((listing) => listing.status === group.status),
  );
  return (
    <div className="min-h-[calc(100vh-4rem)] pb-24 text-um-text-strong lg:pb-24">
      <header className="border-b border-white/[0.07]">
        <div className="mx-auto flex max-w-um-content items-center justify-between gap-5 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          <div className="um-campus-signal pl-4 sm:pl-5">
            <p className="text-[0.61rem] font-bold uppercase tracking-[0.17em] text-um-gold-300/78">
              Seller space
            </p>
            <h1 className="mt-1.5 text-[clamp(2rem,4vw,3.25rem)] font-bold leading-[1] tracking-[-0.045em] text-[#f0ece4]">
              Your listings
            </h1>
          </div>

          <Link
            className="inline-flex min-h-11 w-fit shrink-0 items-center justify-center gap-2 rounded-full bg-um-gold-300 px-5 text-sm font-bold text-um-ink-950 shadow-[0_12px_32px_rgba(201,152,18,0.14)] transition-[background-color,box-shadow,transform] duration-220 ease-um-out hover:-translate-y-px hover:bg-um-gold-200 hover:shadow-[0_15px_38px_rgba(201,152,18,0.2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            href="/listings/new"
          >
            <Plus aria-hidden="true" className="size-4" strokeWidth={2.1} />
            New listing
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-um-content px-4 sm:px-6 lg:px-8">
        {availableGroups.length > 0 ? (
          <nav
            aria-label="Listing status"
            className="flex gap-1 overflow-x-auto border-b border-white/[0.07] py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {availableGroups.map((group) => (
              <a
                className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full px-3 text-sm font-semibold text-white/48 transition hover:bg-white/[0.05] hover:text-white"
                href={`#${group.status}-heading`}
                key={group.status}
              >
                {group.label}
              </a>
            ))}
          </nav>
        ) : null}

        {listings.length === 0 ? (
          <EmptyListings />
        ) : (
          <div className="space-y-12 pt-8 sm:space-y-14 sm:pt-10 lg:space-y-16">
            {GROUPS.map((group) => {
              const groupListings = listings.filter((listing) => listing.status === group.status);
              if (groupListings.length === 0) return null;

              const Icon = group.icon;
              return (
                <section aria-labelledby={`${group.status}-heading`} key={group.status}>
                  <div className="mb-5 flex items-center gap-5">
                    <div className="flex items-center gap-2.5">
                      <Icon
                        aria-hidden="true"
                        className="size-4 text-um-gold-300/76"
                        strokeWidth={1.8}
                      />
                      <h2
                        className="text-lg font-bold tracking-[-0.025em] text-[#f0ece4]"
                        id={`${group.status}-heading`}
                      >
                        {group.label}
                      </h2>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4 xl:gap-5">
                    {groupListings.map((listing) => (
                      <ManagedListingCard key={listing.id} listing={listing} />
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function ManagedListingCard({ listing }: { listing: ManagedListing }) {
  const title = listing.title.trim() || 'Untitled draft';
  const CategoryIcon = listing.category
    ? (CATEGORY_ICONS[listing.category.slug] ?? Shapes)
    : Shapes;

  return (
    <article className="group min-w-0 overflow-hidden rounded-[0.9rem] border border-white/[0.08] bg-[#0b121c]/86 shadow-[0_16px_42px_rgba(0,0,0,0.14)] transition-[border-color,box-shadow,transform] duration-220 ease-um-out hover:-translate-y-0.5 hover:border-white/[0.15] hover:shadow-[0_22px_54px_rgba(0,0,0,0.22)]">
      <div className="relative aspect-[5/4] overflow-hidden bg-[#131b27]">
        {listing.coverUrl ? (
          <Image
            alt={`Cover for ${title}`}
            className="object-cover transition-transform duration-500 ease-um-out group-hover:scale-[1.018]"
            fill
            sizes="(min-width: 1280px) 22vw, (min-width: 1024px) 30vw, (min-width: 640px) 46vw, 100vw"
            src={listing.coverUrl}
            unoptimized
          />
        ) : (
          <div className="grid h-full place-items-center text-white/24">
            <ImageIcon aria-hidden="true" className="size-7" strokeWidth={1.4} />
          </div>
        )}

        <div
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/52 to-transparent"
        />
        <span
          className={cn(
            'font-condensed absolute left-3 top-3 rounded-full px-2.5 py-1 text-[0.61rem] font-bold uppercase tracking-[0.13em] shadow-[0_4px_16px_rgba(0,0,0,0.16)] backdrop-blur-md',
            statusBadgeClassName(listing.status),
          )}
        >
          {listing.status === 'published' ? 'Live' : listing.status}
        </span>
        <span className="absolute bottom-3 left-3 flex max-w-[calc(100%_-_1.5rem)] items-center gap-1.5 font-condensed text-[0.62rem] font-semibold uppercase tracking-[0.1em] text-white/72">
          <CategoryIcon aria-hidden="true" className="size-3.5 shrink-0" strokeWidth={1.8} />
          <span className="truncate">{listing.category?.name ?? 'Uncategorized'}</span>
        </span>
      </div>

      <div className="p-3 sm:p-4">
        <div className="flex items-start justify-between gap-4">
          <h3 className="line-clamp-2 min-w-0 text-[0.9rem] font-bold leading-5 tracking-[-0.02em] text-[#f0ece4] sm:text-[1rem] sm:leading-6">
            {title}
          </h3>
          <p className="shrink-0 text-sm font-bold tabular-nums text-[#f0ece4]">
            {formatManagedPrice(listing.priceCents)}
          </p>
        </div>

        <p className="mt-2 font-mono text-[0.62rem] tracking-[0.04em] text-white/30">
          {listing.status === 'published' && listing.publishedAt
            ? `Live ${formatDate(listing.publishedAt)}`
            : `Updated ${formatDate(listing.updatedAt)}`}
        </p>

        <div className="mt-4 border-t border-white/[0.075] pt-3">
          <ListingManagementActions listingId={listing.id} status={listing.status} />
        </div>
      </div>
    </article>
  );
}

function EmptyListings() {
  return (
    <section className="my-10 grid min-h-[24rem] place-items-center rounded-[1.25rem] border border-white/[0.075] bg-[#0d131d] px-6 py-14 text-center sm:my-12">
      <div>
        <span className="mx-auto grid size-11 place-items-center rounded-full bg-white/[0.045] text-um-gold-300 ring-1 ring-inset ring-white/[0.08]">
          <Store aria-hidden="true" className="size-5" strokeWidth={1.7} />
        </span>
        <h2 className="mt-5 text-2xl font-bold tracking-[-0.04em] text-[#f0ece4]">
          Nothing listed yet.
        </h2>
        <p className="mt-2 text-sm text-white/42">One clear photo is enough to begin.</p>
        <Link
          className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-full bg-um-gold-300 px-5 text-sm font-bold text-um-ink-950 transition-[background-color,transform] duration-220 ease-um-out hover:-translate-y-px hover:bg-um-gold-200"
          href="/listings/new"
        >
          <Plus aria-hidden="true" className="size-4" />
          New listing
        </Link>
      </div>
    </section>
  );
}

function statusBadgeClassName(status: ManagedListing['status']) {
  if (status === 'published') return 'bg-um-gold-300 text-um-ink-950';
  if (status === 'sold') return 'bg-white/[0.88] text-um-ink-950';
  if (status === 'archived') return 'bg-black/58 text-white/72 ring-1 ring-inset ring-white/10';
  return 'bg-[#111923]/86 text-um-gold-200 ring-1 ring-inset ring-um-gold-300/20';
}

function formatManagedPrice(priceCents: number | null) {
  if (priceCents === null) return '—';
  if (priceCents === 0) return 'Free';
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    maximumFractionDigits: priceCents % 100 === 0 ? 0 : 2,
  }).format(priceCents / 100);
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'recently';

  return new Intl.DateTimeFormat('en-CA', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() === new Date().getFullYear() ? undefined : 'numeric',
  }).format(date);
}
