import Link from 'next/link';

import { BrandMark } from '@/components/BrandMark';
import { SEARCH_CATEGORIES, categoryHref } from '@/features/seo/search-targets';

export function PublicMarketplaceFooter() {
  return (
    <footer className="border-t border-white/[0.08] bg-[#07090d]/90 text-white backdrop-blur-xl">
      <div className="mx-auto grid max-w-um-content gap-12 px-4 py-14 sm:px-6 md:grid-cols-[1fr_auto] lg:px-8 lg:py-16">
        <div>
          <BrandMark href="/" tone="light" />
          <p className="mt-5 max-w-md text-sm leading-6 text-white/42">
            Built for Waterloo students. Independent from the University of Waterloo.
          </p>
        </div>
        <nav aria-label="Marketplace categories">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-um-gold-300">
            Explore
          </p>
          <ul className="mt-3 grid grid-cols-2 gap-x-10 gap-y-0.5 text-sm text-white/52">
            {SEARCH_CATEGORIES.map((category) => (
              <li key={category.slug}>
                <Link
                  className="inline-flex min-h-9 items-center transition hover:text-white"
                  href={categoryHref(category.slug)}
                >
                  {category.shortName}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      <div className="mx-auto flex max-w-um-content items-center justify-between border-t border-white/[0.07] px-4 py-5 text-[0.7rem] text-white/30 sm:px-6 lg:px-8">
        <span>Trovun Waterloo</span>
        <span>Student to student</span>
      </div>
    </footer>
  );
}
