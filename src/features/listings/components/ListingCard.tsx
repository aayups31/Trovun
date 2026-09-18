import Image from '@/components/ui/ResilientImage';
import Link from 'next/link';
import { ArrowUpRight, ImageIcon, MapPin } from 'lucide-react';
import { formatCondition, formatPostedTime, formatPrice } from '@/features/marketplace/format';
import type { MarketplaceListing } from '@/features/marketplace/types';
import { WaterlooVerificationBadge } from '@/features/profiles/components/WaterlooVerificationBadge';

export function ListingCard({
  listing,
  priority = false,
}: {
  listing: MarketplaceListing;
  priority?: boolean;
}) {
  const cover = listing.images[0];
  const condition = formatCondition(listing.condition);
  const postedAt = listing.publishedAt ?? listing.createdAt;
  const postedTime = formatPostedTime(postedAt);
  return (
    <article className="um-listing-card um-find-card group min-w-0 overflow-hidden rounded-2xl p-1.5 transition-[transform,border-color,box-shadow] duration-500 hover:-translate-y-1 sm:p-2">
      <Link
        href={`/listings/${listing.id}`}
        aria-label={`View ${listing.title}`}
        className="relative block aspect-[1.12] overflow-hidden rounded-xl bg-[#19232a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-um-gold-300"
      >
        {cover?.url ? (
          <Image
            alt={listing.title}
            src={cover.url}
            fill
            priority={priority}
            sizes="(min-width: 1280px) 300px, (min-width: 1024px) 33vw, 50vw"
            className="object-contain object-center"
          />
        ) : (
          <div aria-hidden="true" className="grid h-full place-items-center text-white/35">
            <ImageIcon size={28} />
          </div>
        )}
        <span
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/25 to-transparent"
        />
        <span className="absolute bottom-2.5 left-2.5 rounded-full bg-[#f3efe6] px-3 py-1.5 text-sm font-bold tracking-tight text-[#15222b] shadow-sm sm:text-base">
          {formatPrice(listing.priceCents)}
        </span>
        {listing.featuredAt && (
          <span className="absolute left-2.5 top-2.5 rounded-full bg-um-gold-300 px-2.5 py-1 text-[10px] font-bold text-um-ink-950">
            Featured
          </span>
        )}
        <span
          aria-hidden="true"
          className="absolute bottom-2.5 right-2.5 hidden size-9 items-center justify-center rounded-full bg-[#112027]/75 text-white backdrop-blur-md transition-colors group-hover:bg-um-gold-300 group-hover:text-[#112027] sm:flex"
        >
          <ArrowUpRight size={17} />
        </span>
      </Link>
      <div className="px-1.5 pb-2 pt-3 sm:px-2 sm:pb-2.5 sm:pt-4">
        <div className="mb-2 flex items-center justify-between gap-2 text-[9px] font-semibold uppercase tracking-[.09em] text-white/40 sm:text-[10px]">
          <span className="truncate">{listing.category?.label ?? 'Campus find'}</span>
          {listing.openToOffers && (
            <span className="shrink-0 text-um-gold-200/80">Offers welcome</span>
          )}
        </div>
        <h3 className="line-clamp-2 min-h-[2.6em] text-[.94rem] font-semibold leading-[1.3] tracking-[-.025em] text-[#f3efe6] sm:text-base">
          <Link
            href={`/listings/${listing.id}`}
            className="rounded-sm transition-colors hover:text-um-gold-200 focus-visible:ring-2 focus-visible:ring-um-gold-300"
          >
            {listing.title}
          </Link>
        </h3>
        <div className="mt-2 flex min-w-0 items-center gap-1 text-[10px] text-white/45 sm:gap-1.5 sm:text-xs">
          <MapPin aria-hidden="true" className="size-3 shrink-0" />
          <span className="truncate">{listing.pickupArea || 'Pickup arranged'}</span>
        </div>
        <div className="mt-3 flex items-center justify-between gap-2 border-t border-white/[0.065] pt-3 text-[10px] text-white/45 sm:text-[11px]">
          {listing.seller ? (
            <Link
              href={`/profile/${listing.seller.id}`}
              className="flex min-w-0 items-center gap-1.5 rounded-sm hover:text-white focus-visible:ring-2 focus-visible:ring-um-gold-300"
            >
              <span className="truncate">{listing.seller.fullName.split(' ')[0]}</span>
              <WaterlooVerificationBadge iconOnly size="xs" />
            </Link>
          ) : (
            <span>Waterloo student</span>
          )}
          {postedTime ? (
            <time className="shrink-0" dateTime={postedAt}>
              {postedTime}
            </time>
          ) : (
            <span>{condition}</span>
          )}
        </div>
      </div>
    </article>
  );
}
