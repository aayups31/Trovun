import type { Metadata } from 'next';
import { ArrowLeft, ArrowRight, Search } from 'lucide-react';
import Image from '@/components/ui/ResilientImage';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { JsonLd } from '@/features/seo/components/JsonLd';
import {
  SEARCH_CATEGORIES,
  categoryHref,
  getItemsForCategory,
  getSearchCategory,
  itemHref,
} from '@/features/seo/search-targets';
import { absoluteUrl, SITE_URL } from '@/lib/site';

type CategoryPageProps = {
  params: Promise<{ category: string }>;
};

export const dynamicParams = false;

export function generateStaticParams() {
  return SEARCH_CATEGORIES.map((category) => ({ category: category.slug }));
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { category: categorySlug } = await params;
  const category = getSearchCategory(categorySlug);
  if (!category) return {};

  const title = `${category.name} near the University of Waterloo`;
  const canonical = categoryHref(category.slug);

  return {
    title,
    description: category.description,
    alternates: {
      canonical,
    },
    openGraph: {
      title: `${title} | Trovun`,
      description: category.description,
      url: canonical,
      images: [
        {
          url: category.image,
          alt: `${category.name} in the Waterloo student marketplace`,
        },
      ],
    },
  };
}

export default async function CategorySearchPage({ params }: CategoryPageProps) {
  const { category: categorySlug } = await params;
  const category = getSearchCategory(categorySlug);
  if (!category) notFound();

  const items = getItemsForCategory(category.slug);
  const canonical = categoryHref(category.slug);

  return (
    <>
      <JsonLd
        data={[
          {
            '@context': 'https://schema.org',
            '@type': 'CollectionPage',
            '@id': `${absoluteUrl(canonical)}#page`,
            url: absoluteUrl(canonical),
            name: `${category.name} near the University of Waterloo`,
            description: category.description,
            isPartOf: {
              '@id': `${SITE_URL}/#website`,
            },
            about: [category.name, 'University of Waterloo', 'student marketplace'],
            mainEntity: {
              '@type': 'ItemList',
              itemListElement: items.map((item, index) => ({
                '@type': 'ListItem',
                position: index + 1,
                name: item.name,
                url: absoluteUrl(itemHref(item.slug)),
              })),
            },
          },
          {
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
              {
                '@type': 'ListItem',
                position: 1,
                name: 'Trovun',
                item: SITE_URL,
              },
              {
                '@type': 'ListItem',
                position: 2,
                name: 'Waterloo student marketplace',
                item: absoluteUrl('/waterloo-marketplace'),
              },
              {
                '@type': 'ListItem',
                position: 3,
                name: category.name,
                item: absoluteUrl(canonical),
              },
            ],
          },
        ]}
      />

      <section className="relative isolate overflow-hidden border-b border-white/[0.08]">
        <div aria-hidden="true" className="um-public-hero-field absolute inset-0 -z-20" />
        <div className="mx-auto grid min-h-[calc(100svh-4.5rem)] max-w-[92rem] lg:grid-cols-[0.86fr_1.14fr]">
          <div className="flex items-center px-5 py-14 sm:px-8 sm:py-20 lg:px-12 xl:px-16">
            <div className="w-full max-w-[40rem]">
              <Link
                className="group inline-flex min-h-11 items-center gap-2 text-sm font-medium text-white/46 transition hover:text-white"
                href="/waterloo-marketplace"
              >
                <ArrowLeft
                  aria-hidden="true"
                  className="size-4 transition-transform group-hover:-translate-x-0.5"
                />
                Waterloo marketplace
              </Link>

              <div className="mt-12 flex items-center gap-3 text-[0.66rem] font-semibold uppercase tracking-[0.19em] text-um-gold-300">
                <span aria-hidden="true" className="h-px w-8 bg-um-gold-300/65" />
                {category.shortName}
              </div>

              <h1 className="um-balanced um-display-safe mt-6 text-[clamp(3.1rem,5.9vw,5.9rem)] font-semibold leading-[1.01] tracking-[-0.044em] text-[#f6f1e8] sm:leading-[0.98]">
                {category.name}
                <span className="block text-white/38">for Waterloo.</span>
              </h1>

              <p className="um-pretty mt-7 max-w-xl text-[1.03rem] leading-8 text-white/54 sm:text-lg">
                {category.introduction}
              </p>

              <Link
                className="group mt-9 inline-flex min-h-[3.15rem] items-center gap-3 rounded-full bg-um-gold-300 px-5 text-sm font-bold text-um-ink-950 transition hover:bg-[#ffe48d] focus-visible:ring-2 focus-visible:ring-white"
                href={`/login?next=${encodeURIComponent(`/marketplace?category=${category.slug}`)}`}
                prefetch={false}
              >
                <Search aria-hidden="true" className="size-4" />
                Search live {category.shortName.toLowerCase()}
                <ArrowRight
                  aria-hidden="true"
                  className="size-4 transition-transform group-hover:translate-x-0.5"
                />
              </Link>
            </div>
          </div>

          <div className="relative min-h-[32rem] overflow-hidden border-t border-white/[0.08] lg:min-h-full lg:border-l lg:border-t-0">
            <Image
              alt={`${category.name} represented in the Waterloo marketplace`}
              className="object-cover"
              fill
              priority
              quality={92}
              sizes="(max-width: 1024px) 100vw, 58vw"
              src={category.image}
              style={{ objectPosition: category.imagePosition }}
            />
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-[linear-gradient(180deg,rgba(8,10,14,0.05),rgba(8,10,14,0.18)_48%,rgba(8,10,14,0.82)),linear-gradient(90deg,rgba(8,10,14,0.28),transparent_48%)]"
            />
            <div className="absolute inset-x-0 bottom-0 border-t border-white/[0.12] bg-[#090b10]/60 px-6 py-5 backdrop-blur-lg sm:px-8">
              <div>
                <p className="text-[0.61rem] font-semibold uppercase tracking-[0.18em] text-um-gold-300">
                  Around campus
                </p>
                <p className="mt-1 text-sm text-white/62">{category.description}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#eee9df] text-[#11151c]">
        <div className="mx-auto max-w-um-content px-5 py-20 sm:px-8 sm:py-24 lg:py-28">
          <div className="grid gap-10 lg:grid-cols-[0.66fr_1.34fr] lg:gap-16">
            <div>
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[#8c6900]">
                Popular searches
              </p>
              <h2 className="um-balanced mt-5 text-[clamp(2.65rem,4.8vw,4.5rem)] font-semibold leading-[0.98] tracking-[-0.055em]">
                Find the exact thing.
              </h2>
              <p className="mt-6 max-w-md text-base leading-7 text-black/50">
                Search guides lead into live listings once you sign in with your Waterloo account.
              </p>
            </div>

            <ol className="grid border-t border-black/12 sm:grid-cols-2">
              {items.map((item) => (
                <li
                  className="border-b border-black/12 sm:odd:border-r sm:odd:pr-7 sm:even:pl-7"
                  key={item.slug}
                >
                  <Link
                    className="group flex min-h-[6.6rem] items-center justify-between gap-5 py-5"
                    href={itemHref(item.slug)}
                  >
                    <span className="flex min-w-0 items-center">
                      <span className="text-lg font-semibold tracking-[-0.025em] transition group-hover:text-[#765900] sm:text-xl">
                        {item.name}
                      </span>
                    </span>
                    <ArrowRight
                      aria-hidden="true"
                      className="size-4 shrink-0 text-black/30 transition group-hover:translate-x-0.5 group-hover:text-black"
                    />
                  </Link>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <section className="um-public-dark-section border-t border-white/[0.08]">
        <div className="mx-auto grid max-w-um-content gap-10 px-5 py-20 sm:px-8 sm:py-24 lg:grid-cols-[0.7fr_1.3fr] lg:gap-16">
          <div>
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-um-gold-300">
              Before you exchange
            </p>
            <h2 className="um-balanced mt-5 text-[clamp(2.55rem,4.3vw,4rem)] font-semibold leading-[0.98] tracking-[-0.05em] text-[#f4efe6]">
              A better handoff starts here.
            </h2>
          </div>
          <ol className="border-t border-white/[0.1]">
            {category.checklist.map((check) => (
              <li className="border-b border-white/[0.1] py-6" key={check}>
                <p className="max-w-2xl text-sm leading-7 text-white/52">{check}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </>
  );
}
