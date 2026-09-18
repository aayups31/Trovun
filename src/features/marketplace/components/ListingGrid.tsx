import { ListingCard } from '@/features/listings/components/ListingCard';

import type { MarketplaceListing } from '../types';

type ListingGridProps = {
  listings: MarketplaceListing[];
  prioritizeFirst?: boolean;
};

export function ListingGrid({ listings, prioritizeFirst = false }: ListingGridProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 lg:gap-5 xl:grid-cols-4 xl:gap-6">
      {listings.map((listing, index) => (
        <ListingCard key={listing.id} listing={listing} priority={prioritizeFirst && index < 2} />
      ))}
    </div>
  );
}
