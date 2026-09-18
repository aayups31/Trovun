import Image from '@/components/ui/ResilientImage';
import Link from 'next/link';
import type { PublicListingShowcaseItem } from '@/features/marketplace/public-showcase';
import s from './Home.module.css';

const examples: PublicListingShowcaseItem[] = [
  {
    id: 'electronics',
    imageUrl: '/waterloo/category-electronics-photo-v3.webp',
    priceCents: 0,
    title: 'A better desk setup',
  },
  {
    id: 'books',
    imageUrl: '/waterloo/category-books-photo-v3.webp',
    priceCents: 0,
    title: 'Your next chapter',
  },
  {
    id: 'household-items',
    imageUrl: '/waterloo/category-household-photo-v3.webp',
    priceCents: 0,
    title: 'Make yourself at home',
  },
  {
    id: 'clothing',
    imageUrl: '/waterloo/category-clothing-photo-v3.webp',
    priceCents: 0,
    title: 'Something for the season',
  },
];

export function MarketplaceScrollShowcase({ listings }: { listings: PublicListingShowcaseItem[] }) {
  const isExample = listings.length === 0;
  const items = isExample ? examples : listings;
  return (
    <div className={s.listings} data-home-carousel>
      <div className={s.carouselStage} data-carousel-stage>
        <div
          className={s.carouselViewport}
          data-carousel-viewport
          tabIndex={0}
          role="region"
          aria-label="Campus finds"
        >
          <div className={s.listingGrid} data-home-listings>
            {items.map((listing, index) => (
              <div key={listing.id} data-home-listing>
                <Link
                  className={s.listingCard}
                  href={
                    isExample ? `/waterloo-marketplace/${listing.id}` : `/listings/${listing.id}`
                  }
                  prefetch={false}
                >
                  <div className={s.listingImage}>
                    {listing.imageUrl ? (
                      <Image
                        alt=""
                        src={listing.imageUrl}
                        fill
                        style={
                          isExample
                            ? undefined
                            : { objectFit: 'contain', objectPosition: 'center', transform: 'none' }
                        }
                        sizes="(max-width: 639px) 78vw, 320px"
                      />
                    ) : (
                      <span className={s.imagePlaceholder}>Trovun</span>
                    )}
                    {!isExample && (
                      <span className={s.listingPrice}>
                        {listing.priceCents === 0
                          ? 'Free'
                          : new Intl.NumberFormat('en-CA', {
                              style: 'currency',
                              currency: 'CAD',
                              maximumFractionDigits: listing.priceCents % 100 ? 2 : 0,
                            }).format(listing.priceCents / 100)}
                      </span>
                    )}
                  </div>
                  <div className={s.listingMeta}>
                    <small>{String(index + 1).padStart(2, '0')}</small>
                    <h3>{listing.title}</h3>
                    <span aria-hidden="true">↗</span>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        </div>
        <div className={s.carouselFoot}>
          <p className={s.galleryNote}>
            {isExample
              ? 'A few campus favourites. Find the one that’s you.'
              : 'A glimpse of what’s on campus. Sign in to see more.'}
          </p>
        </div>
      </div>
    </div>
  );
}
