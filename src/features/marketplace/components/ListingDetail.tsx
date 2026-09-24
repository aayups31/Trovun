import Link from 'next/link';
import type { ReactNode } from 'react';
import { ArrowLeft, BadgeCheck, CalendarDays, Pencil, ShieldCheck, Tag } from 'lucide-react';

import { ListingManagementActions } from '@/features/listings/components/ListingManagementActions';
import { MessageSellerButton } from '@/features/messages/components/MessageSellerButton';
import { WaterlooVerificationBadge } from '@/features/profiles/components/WaterlooVerificationBadge';

import { ModeratorRemoveDialog } from '@/features/listings/components/ModeratorRemoveDialog';
import { formatCondition, formatPostedDate, formatPrice, getInitials } from '../format';
import type { MarketplaceListing, MarketplaceViewer } from '../types';
import { ListingGallery } from './ListingGallery';
import { MarketplaceAssistant } from '@/features/ai/MarketplaceAssistant';

type ListingDetailProps = {
  listing: MarketplaceListing;
  viewer: MarketplaceViewer | null;
  contactUnavailable?: boolean;
  publishSuccess?: boolean;
};

export function ListingDetail({
  listing,
  viewer,
  contactUnavailable = false,
  publishSuccess = false,
}: ListingDetailProps) {
  const isOwner = viewer?.id === listing.sellerId;
  const isModerator = viewer?.role === 'moderator';
  const canMessage = viewer?.role === 'student' && !isOwner && Boolean(listing.seller);
  const condition = formatCondition(listing.condition) ?? 'Not specified';
  const posted = formatPostedDate(listing.publishedAt ?? listing.createdAt) ?? 'Recently';

  return (
    <div className="min-h-[calc(100dvh-4rem)] text-um-text-strong">
      <div className="mx-auto max-w-um-content px-4 pb-32 pt-4 sm:px-6 lg:px-8 lg:pb-24 lg:pt-6">
        <div className="flex items-center gap-4">
          <Link
            className="inline-flex min-h-11 items-center gap-2 rounded-full px-1 text-sm font-semibold text-um-text-muted transition hover:text-um-text-strong focus-visible:ring-2 focus-visible:ring-um-gold-400"
            href="/marketplace"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Browse
          </Link>
        </div>

        {publishSuccess ? (
          <div
            aria-live="polite"
            className="mt-3 flex items-center gap-2.5 rounded-[0.8rem] border border-[#4da77b]/20 bg-[#133326]/55 px-4 py-3 text-sm text-[#a4e6c3]"
            role="status"
          >
            <BadgeCheck className="size-4 shrink-0" aria-hidden="true" />
            Your listing is live.
          </div>
        ) : null}

        {contactUnavailable ? (
          <div
            className="mt-3 rounded-[0.8rem] border border-um-gold-400/20 bg-um-gold-400/[0.07] px-4 py-3 text-sm text-um-gold-200"
            role="status"
          >
            Messaging has replaced email contact. Start a conversation below.
          </div>
        ) : null}

        <div className="mt-3 grid items-start gap-7 lg:grid-cols-[minmax(0,1.42fr)_minmax(20rem,0.58fr)] lg:gap-10">
          <div className="min-w-0">
            <ListingGallery listing={listing} />

            <section
              className="mt-8 border-t border-white/[0.08] pt-7"
              aria-labelledby="details-heading"
            >
              <p className="text-xs font-semibold text-white/46">About this item</p>
              <h2 className="sr-only" id="details-heading">
                About this item
              </h2>
              <div className="mt-3 max-w-3xl whitespace-pre-wrap break-words text-[0.96rem] leading-7 text-um-text">
                {listing.description}
              </div>
            </section>

            <div className="mt-8 flex items-start gap-3 border-t border-white/[0.08] py-6 text-sm text-um-text-muted">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-um-gold-300" aria-hidden="true" />
              <p>Meet somewhere public. Inspect the item before you exchange.</p>
            </div>
            {canMessage && (
              <MarketplaceAssistant
                purpose="buyer"
                listingId={listing.id}
                title={listing.title}
                description={listing.description}
              />
            )}
            <div className="flex flex-wrap gap-5 text-sm">
              <Link className="min-h-11 py-3 underline" href="/safety">
                Safety & privacy
              </Link>
              {canMessage && (
                <Link
                  className="min-h-11 py-3 underline"
                  href={`/safety/report?subject=listing&id=${listing.id}`}
                >
                  Report this listing
                </Link>
              )}
            </div>
          </div>

          <aside className="min-w-0 lg:sticky lg:top-24">
            <div className="um-product-panel um-campus-signal overflow-hidden rounded-[1.1rem] pl-0">
              <div className="p-5 pl-6 sm:p-6 sm:pl-7">
                <div className="flex items-center justify-between gap-4">
                  <p className="font-condensed truncate text-[0.64rem] font-bold uppercase tracking-[0.16em] text-white/42">
                    {listing.category?.label ?? 'Marketplace'}
                  </p>
                  {listing.featuredAt ? (
                    <span className="font-condensed shrink-0 text-[0.62rem] font-bold uppercase tracking-[0.14em] text-um-gold-300">
                      Campus pick
                    </span>
                  ) : null}
                </div>

                <h1 className="mt-3 break-words pb-1 text-[clamp(1.8rem,3.4vw,2.7rem)] font-bold leading-[1.08] tracking-[-0.045em] text-white">
                  {listing.title}
                </h1>
                <div className="mt-5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <p className="text-[1.9rem] font-bold tracking-[-0.05em] text-white">
                    {formatPrice(listing.priceCents)}
                  </p>
                  {listing.openToOffers ? (
                    <span className="text-xs font-semibold text-um-gold-300">Offers welcome</span>
                  ) : null}
                </div>

                <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-5 border-y border-white/[0.08] py-[1.125rem]">
                  <DetailItem
                    icon={<Tag className="size-3.5" />}
                    label="Condition"
                    value={condition}
                  />
                  <DetailItem label="Pickup" value={listing.pickupArea ?? 'Arrange in chat'} />
                  <DetailItem
                    icon={<CalendarDays className="size-3.5" />}
                    label="Listed"
                    value={posted}
                  />
                </dl>

                <SellerSummary listing={listing} />

                <div className="mt-6">
                  {isOwner ? (
                    <div>
                      <Link
                        className="flex min-h-12 w-full items-center justify-center gap-2 rounded-[0.8rem] bg-[#f5f1e8] px-4 text-sm font-black text-um-ink-950 transition hover:bg-[#fffdf8]"
                        href={`/listings/${listing.id}/edit`}
                      >
                        <Pencil className="size-4" aria-hidden="true" />
                        Edit listing
                      </Link>
                      <div className="mt-3 border-t border-white/[0.08] pt-3">
                        <ListingManagementActions
                          listingId={listing.id}
                          redirectAfterAction="/my-listings"
                          showView={false}
                          status="published"
                        />
                      </div>
                    </div>
                  ) : canMessage ? (
                    <MessageSellerButton listingId={listing.id} />
                  ) : (
                    <p className="rounded-[0.8rem] border border-white/[0.08] bg-white/[0.035] px-4 py-3 text-center text-xs leading-5 text-white/45">
                      Seller messaging is for Waterloo student accounts.
                    </p>
                  )}
                </div>

                {isModerator && !isOwner ? (
                  <ModeratorRemoveDialog listingId={listing.id} listingTitle={listing.title} />
                ) : null}
              </div>
            </div>
          </aside>
        </div>
      </div>

      {!isOwner && canMessage ? (
        <div className="fixed inset-x-3 bottom-[calc(var(--um-mobile-nav-height)+0.75rem)] z-30 lg:hidden">
          <div className="mx-auto max-w-lg rounded-[0.9rem] border border-white/[0.1] bg-[#0a111b]/94 p-2 shadow-[0_20px_60px_rgba(0,0,0,0.38)] backdrop-blur-xl">
            <MessageSellerButton listingId={listing.id} />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function DetailItem({ icon, label, value }: { icon?: ReactNode; label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="flex items-center gap-1.5 text-[0.68rem] font-medium text-white/36">
        {icon ? (
          <span className="text-um-gold-300/70" aria-hidden="true">
            {icon}
          </span>
        ) : null}
        {label}
      </dt>
      <dd className="mt-1.5 truncate text-sm font-semibold text-white/82" title={value}>
        {value}
      </dd>
    </div>
  );
}

function SellerSummary({ listing }: { listing: MarketplaceListing }) {
  const sellerName = listing.seller?.fullName ?? 'Waterloo student';
  const sellerDetails = [listing.seller?.program, listing.seller?.academicYear]
    .filter(Boolean)
    .join(' · ');
  const content = (
    <>
      <div className="grid size-10 shrink-0 place-items-center rounded-full border border-um-gold-300/22 bg-um-gold-300/[0.08] text-xs font-black text-um-gold-200">
        {getInitials(sellerName) || 'UW'}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-white">{sellerName}</p>
        <p className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-white/42">
          <WaterlooVerificationBadge iconOnly size="xs" />
          {sellerDetails || 'Waterloo student'}
        </p>
      </div>
    </>
  );

  return listing.seller ? (
    <Link
      className="mt-5 flex min-w-0 items-center gap-3 rounded-[0.7rem] transition-colors duration-200 hover:bg-white/[0.035] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-um-gold-300"
      href={`/profile/${listing.seller.id}`}
    >
      {content}
    </Link>
  ) : (
    <div className="mt-5 flex min-w-0 items-center gap-3">{content}</div>
  );
}
