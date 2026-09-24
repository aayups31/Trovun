import Link from 'next/link';
import { ArrowRight, Search, X } from 'lucide-react';
import { SmartSearch } from '@/features/ai/SmartSearch';

import { marketplaceHref, marketplaceScopedHref } from '../url';

type MarketplaceSearchProps = {
  query: string;
  category: string | null;
  scopePath?: string;
};

export function MarketplaceSearch({ query, category, scopePath }: MarketplaceSearchProps) {
  const action = scopePath ?? '/marketplace';
  const clearHref = scopePath
    ? marketplaceScopedHref(scopePath, {})
    : marketplaceHref({ category });

  return (
    <div className="w-full">
      <form
        action={action}
        method="get"
        role="search"
        className="group/search flex w-full items-center gap-1 rounded-[0.85rem] border border-white/[0.12] bg-[#05080d]/68 p-1 shadow-[0_18px_50px_rgba(0,0,0,0.22)] backdrop-blur-xl transition duration-220 ease-um-out focus-within:border-um-gold-400/48 focus-within:bg-[#05080d]/84"
      >
        <Search
          aria-hidden="true"
          className="ml-3 size-5 shrink-0 text-um-gold-300 sm:ml-4"
          strokeWidth={1.8}
        />
        <label className="sr-only" htmlFor="marketplace-search">
          Search listings by title, description, or category
        </label>
        <input
          autoComplete="off"
          className="h-11 min-w-0 flex-1 scroll-mt-24 appearance-none border-0 bg-transparent px-1 text-[0.98rem] font-medium text-white outline-none placeholder:font-normal placeholder:text-white/38 sm:h-12 sm:px-2 sm:text-base"
          defaultValue={query}
          id="marketplace-search"
          maxLength={80}
          name="q"
          placeholder="Search Waterloo"
          type="search"
        />
        {category && !scopePath ? <input name="category" type="hidden" value={category} /> : null}
        {query ? (
          <Link
            aria-label="Clear search"
            className="grid size-11 shrink-0 place-items-center rounded-[0.65rem] text-white/58 transition duration-160 ease-um-out hover:bg-white/[0.08] hover:text-white focus-visible:ring-2 focus-visible:ring-um-gold-300"
            href={clearHref}
          >
            <X aria-hidden="true" className="size-[1.125rem]" strokeWidth={1.9} />
          </Link>
        ) : null}
        <button
          aria-label="Search listings"
          className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-[0.62rem] bg-um-gold-300 px-3.5 text-sm font-bold text-um-ink-950 transition duration-160 ease-um-out hover:bg-um-gold-200 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black sm:h-11 sm:px-4"
          type="submit"
        >
          <span className="hidden sm:inline">Search</span>
          <ArrowRight aria-hidden="true" className="size-4" strokeWidth={2.1} />
          <span className="sr-only sm:hidden">Search</span>
        </button>
      </form>
      <SmartSearch
        key={category ?? scopePath ?? 'all'}
        category={
          category ??
          (scopePath?.startsWith('/marketplace/categories/')
            ? scopePath.split('/').pop()
            : undefined)
        }
      />
    </div>
  );
}
