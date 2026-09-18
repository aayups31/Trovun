import Image from '@/components/ui/ResilientImage';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

import { getMarketplaceCategoryPresentation } from '../category-presentation';
import type { MarketplaceCategory } from '../types';
import { marketplaceCategoryHref, marketplaceHref } from '../url';

type CategoryFiltersProps = {
  categories: MarketplaceCategory[];
  activeCategory: string | null;
  query: string;
};

export function CategoryFilters({ categories, activeCategory, query }: CategoryFiltersProps) {
  return (
    <nav
      aria-label="Listing categories"
      className="mx-auto max-w-um-content px-4 pt-5 sm:px-6 sm:pt-6 lg:px-8"
    >
      <div className="mb-3.5 flex items-center justify-between gap-4 sm:mb-4">
        <h2 className="text-sm font-semibold tracking-[-0.015em] text-white/72">
          Find your kind of thing
        </h2>
        <Link
          aria-current={!activeCategory ? 'page' : undefined}
          className="group/all inline-flex min-h-10 items-center gap-2 rounded-full px-2 text-xs font-semibold text-white/48 transition duration-160 hover:text-white focus-visible:ring-2 focus-visible:ring-um-gold-300"
          href={marketplaceHref({ query })}
        >
          All listings
          <ArrowRight
            aria-hidden="true"
            className="size-3.5 transition-transform duration-160 group-hover/all:translate-x-0.5"
          />
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        {categories.map((category) => (
          <CategoryLink
            active={activeCategory === category.slug}
            href={marketplaceCategoryHref(category.slug, { query })}
            key={category.id}
            label={category.label}
            slug={category.slug}
          />
        ))}
      </div>
    </nav>
  );
}

type CategoryLinkProps = {
  href: string;
  active: boolean;
  label: string;
  slug: string;
};

function CategoryLink({ href, active, label, slug }: CategoryLinkProps) {
  const presentation = getMarketplaceCategoryPresentation(slug);

  return (
    <Link
      aria-current={active ? 'page' : undefined}
      aria-label={label}
      className={`group/category relative isolate min-h-[6.8rem] overflow-hidden rounded-[0.9rem] border bg-[#090d13] shadow-[0_18px_46px_rgba(0,0,0,0.2)] transition duration-500 ease-um-out focus-visible:z-20 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-um-gold-300 sm:min-h-[8.5rem] sm:rounded-[1.1rem] ${
        active
          ? 'border-um-gold-300/45 shadow-[0_20px_56px_rgba(158,117,12,0.14)]'
          : 'border-white/[0.07] hover:-translate-y-1 hover:border-white/[0.16] hover:shadow-[0_26px_64px_rgba(0,0,0,0.3)]'
      }`}
      href={href}
    >
      <Image
        alt=""
        className={`object-cover opacity-[0.8] saturate-[0.78] transition duration-1000 ease-um-out group-hover/category:scale-[1.045] group-hover/category:opacity-[0.76] group-focus-visible/category:scale-[1.045] group-focus-visible/category:opacity-[0.76] ${presentation.imagePosition}`}
        fill
        quality={75}
        sizes="(min-width: 1320px) 302px, (min-width: 1024px) calc(25vw - 28px), (min-width: 640px) calc(25vw - 24px), calc(50vw - 22px)"
        src={presentation.image}
      />
      <span
        aria-hidden="true"
        className="absolute inset-0 bg-[linear-gradient(0deg,rgba(4,7,12,0.3)_0%,rgba(4,7,12,0.25)_58%,rgba(4,7,12,0.16)_100%)]"
      />
      <span
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-t from-[#071015]/90 via-transparent to-transparent"
      />
      <span
        aria-hidden="true"
        className={`absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t ${presentation.accent} via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover/category:opacity-100 group-focus-visible/category:opacity-100`}
      />

      <span className="absolute inset-0 z-10 flex items-end justify-between gap-2 p-4 sm:p-5">
        <span className="block text-[1rem] font-bold leading-tight tracking-[-0.03em] text-white sm:text-[1.2rem]">
          {label}
        </span>
        <ArrowRight
          aria-hidden="true"
          className="size-4 shrink-0 text-um-gold-300 opacity-80 transition-transform duration-300 group-hover/category:translate-x-1"
          strokeWidth={1.8}
        />
      </span>
    </Link>
  );
}
