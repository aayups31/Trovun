import Link from 'next/link';
import { ArrowUpRight, Check, MapPin, ShieldCheck, X } from 'lucide-react';
import Image from '@/components/ui/ResilientImage';
import { getTorontoGreeting } from '../format';
import type { MarketplacePageData } from '../types';
import { marketplaceHref } from '../url';
import { CategoryFilters } from './CategoryFilters';
import { ListingGrid } from './ListingGrid';
import { MarketplaceEmptyState } from './MarketplaceEmptyState';
import { MarketplacePagination } from './MarketplacePagination';
import { MarketplaceSearch } from './MarketplaceSearch';
import styles from './MarketplaceSurface.module.css';

type Props = {
  data: MarketplacePageData;
  canSell: boolean;
  firstName?: string | null;
  didPublish?: boolean;
  restrictionNotice?: { title: string; message: string } | null;
};

export function MarketplaceSurface({
  data,
  canSell,
  firstName,
  didPublish,
  restrictionNotice,
}: Props) {
  const activeCategory = data.categories.find((item) => item.slug === data.category);
  const filtered = Boolean(data.query || data.category);
  return (
    <div className={styles.marketplace}>
      <section className={styles.welcome} aria-labelledby="marketplace-heading">
        <div className={styles.intro}>
          <p className={styles.eyebrow}>
            <span aria-hidden="true" />{' '}
            {firstName ? `${getTorontoGreeting()}, ${firstName}` : 'Your Waterloo marketplace'}
          </p>
          <h1 id="marketplace-heading">
            {activeCategory ? (
              activeCategory.label
            ) : (
              <>
                Good finds.
                <br />
                <em>Your Waterloo.</em>
              </>
            )}
          </h1>
          <p className={styles.description}>
            {activeCategory
              ? 'A little something for your next chapter. Find it with your Waterloo people.'
              : 'For late nights at DP and fresh starts on co-op. Good things, from your Waterloo people.'}
          </p>
          <MarketplaceSearch category={data.category} query={data.query} />
          <div className={styles.trust}>
            <span>
              <ShieldCheck size={14} aria-hidden="true" /> Waterloo students
            </span>
            <span>
              <MapPin size={14} aria-hidden="true" /> Pick up nearby
            </span>
          </div>
        </div>
        <div className={styles.spotlight} data-product-surface>
          <Image
            src="/waterloo/waterloo-sign-winter.webp"
            alt="University of Waterloo sign in front of Dana Porter Library at sunset"
            fill
            priority
            sizes="(min-width: 1320px) 551px, (min-width: 1024px) calc(44vw - 28px), (min-width: 640px) calc(47vw - 37px), 1px"
            className="object-cover object-[35%_center]"
          />
          <div className={styles.spotlightShade} />
          <span className={styles.spotlightLabel}>University of Waterloo</span>
          <div className={styles.spotlightCaption}>
            <p>
              Your campus. Your people.
              <br />
              <em>Black and gold. All yours.</em>
            </p>
            {canSell && (
              <Link href="/listings/new" aria-label="Sell an item" className={styles.sellCircle}>
                <ArrowUpRight aria-hidden="true" size={22} />
              </Link>
            )}
          </div>
        </div>
      </section>

      {(didPublish || restrictionNotice) && (
        <div className={styles.notice} role="status">
          <Check size={18} aria-hidden="true" />
          {didPublish ? (
            'Your listing is live. Let the good finds begin.'
          ) : (
            <span>
              {restrictionNotice?.title} {restrictionNotice?.message}
            </span>
          )}
        </div>
      )}

      <CategoryFilters
        activeCategory={data.category}
        categories={data.categories}
        query={data.query}
      />

      <section aria-labelledby="marketplace-results-heading" className={styles.results}>
        <div className={styles.resultsHeading}>
          <div>
            <p className={styles.eyebrow}>Around Ring Road</p>
            <h2 id="marketplace-results-heading">
              {data.query
                ? `Results for “${data.query}”`
                : activeCategory
                  ? `Explore ${activeCategory.label.toLowerCase()}`
                  : 'Fresh on campus'}
            </h2>
          </div>
          <div className={styles.resultsMeta}>
            <p role="status">
              {data.total} {data.total === 1 ? 'find' : 'finds'} <span>· Newest first</span>
            </p>
            {filtered && (
              <Link href={marketplaceHref({})}>
                <X size={14} aria-hidden="true" /> Clear filters
              </Link>
            )}
          </div>
        </div>
        {data.listings.length ? (
          <>
            <ListingGrid listings={data.listings} prioritizeFirst />
            <MarketplacePagination
              category={data.category}
              page={data.page}
              query={data.query}
              totalPages={data.totalPages}
            />
          </>
        ) : (
          <MarketplaceEmptyState
            canSell={canSell}
            filtered={filtered}
            emptyPage={data.total > 0}
            firstPageHref={marketplaceHref({ query: data.query, category: data.category })}
          />
        )}
      </section>
      {canSell && (
        <section className={styles.passOn}>
          <div>
            <p className={styles.eyebrow}>Make a little room</p>
            <h2>
              Heading out on co-op?
              <br />
              Leave a good find behind.
            </h2>
          </div>
          <Link href="/listings/new">
            Sell an item <ArrowUpRight aria-hidden="true" size={18} />
          </Link>
        </section>
      )}
    </div>
  );
}
