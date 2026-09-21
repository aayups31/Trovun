import type { Metadata } from 'next';
import { ArrowLeft, ArrowRight, BadgeCheck, Search, ShieldCheck } from 'lucide-react';
import Image from '@/components/ui/ResilientImage';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { JsonLd } from '@/features/seo/components/JsonLd';
import {
  ITEM_SEARCH_TARGETS,
  categoryHref,
  getItemSearchTarget,
  getItemsForCategory,
  getSearchCategory,
  itemHref,
} from '@/features/seo/search-targets';
import { absoluteUrl, SITE_URL } from '@/lib/site';

type ItemPageProps = {
  params: Promise<{ item: string }>;
};

export const dynamicParams = false;

export function generateStaticParams() {
  return ITEM_SEARCH_TARGETS.map((item) => ({ item: item.slug }));
}

export async function generateMetadata({ params }: ItemPageProps): Promise<Metadata> {
  const { item: itemSlug } = await params;
  const item = getItemSearchTarget(itemSlug);
  if (!item) return {};

  const canonical = itemHref(item.slug);

  return {
    title: item.title,
    description: item.description,
    alternates: {
      canonical,
    },
    openGraph: {
      title: `${item.title} | Trovun`,
      description: item.description,
      url: canonical,
    },
  };
}

export default async function ItemSearchPage({ params }: ItemPageProps) {
  const { item: itemSlug } = await params;
  const item = getItemSearchTarget(itemSlug);
  if (!item) notFound();

  const category = getSearchCategory(item.category);
  if (!category) notFound();

  const canonical = itemHref(item.slug);
  const relatedItems = getItemsForCategory(category.slug)
    .filter((related) => related.slug !== item.slug)
    .slice(0, 4);

  return (
    <>
      <JsonLd
        data={[
          {
            '@context': 'https://schema.org',
            '@type': 'WebPage',
            '@id': `${absoluteUrl(canonical)}#page`,
            url: absoluteUrl(canonical),
            name: item.title,
            description: item.description,
            isPartOf: {
              '@id': `${SITE_URL}/#website`,
            },
            about: [item.name, category.name, 'University of Waterloo', 'student marketplace'],
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
                item: absoluteUrl(categoryHref(category.slug)),
              },
              {
                '@type': 'ListItem',
                position: 4,
                name: item.name,
                item: absoluteUrl(canonical),
              },
            ],
          },
        ]}
      />

      <section className="relative isolate overflow-hidden border-b border-white/[0.08]">
        <div aria-hidden="true" className="um-public-hero-field absolute inset-0 -z-20" />
        <div className="um-public-hero-grid grid min-h-[calc(100svh-4.5rem)] lg:grid-cols-[0.92fr_1.08fr]">
          <div className="um-public-hero-copy flex items-center px-5 py-14 sm:px-8 sm:py-20 lg:px-12 xl:px-16">
            <div className="max-w-[43rem]">
              <Link
                className="group inline-flex min-h-11 items-center gap-2 text-sm font-medium text-white/46 transition hover:text-white"
                href={categoryHref(category.slug)}
              >
                <ArrowLeft
                  aria-hidden="true"
                  className="size-4 transition-transform group-hover:-translate-x-0.5"
                />
                {category.name}
              </Link>

              <p className="mt-12 text-[0.66rem] font-semibold uppercase tracking-[0.19em] text-um-gold-300">
                Waterloo search guide · {category.shortName}
              </p>

              <h1 className="um-balanced um-display-safe mt-6 text-[clamp(2.9rem,5.25vw,5.35rem)] font-semibold leading-[1.02] tracking-[-0.042em] text-[#f6f1e8] sm:leading-[0.99]">
                {item.title}
              </h1>

              <p className="um-pretty mt-7 max-w-xl text-[1.03rem] leading-8 text-white/54 sm:text-lg">
                {item.description}
              </p>

              <Link
                className="group mt-9 inline-flex min-h-[3.15rem] items-center gap-3 rounded-full bg-um-gold-300 px-5 text-sm font-bold text-um-ink-950 transition hover:bg-[#ffe48d] focus-visible:ring-2 focus-visible:ring-white"
                href={`/login?next=${encodeURIComponent(`/marketplace?q=${item.query}`)}`}
                prefetch={false}
              >
                <Search aria-hidden="true" className="size-4" />
                Search {item.name.toLowerCase()}
                <ArrowRight
                  aria-hidden="true"
                  className="size-4 transition-transform group-hover:translate-x-0.5"
                />
              </Link>
            </div>
          </div>

          <div className="relative min-h-[30rem] overflow-hidden border-t border-white/[0.08] lg:min-h-full lg:border-l lg:border-t-0">
            <Image
              alt={`${category.name} in the Waterloo student marketplace`}
              className="object-cover"
              fill
              priority
              quality={84}
              sizes="(max-width: 1024px) 100vw, 54vw"
              src={category.image}
              style={{ objectPosition: category.imagePosition }}
            />
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-[linear-gradient(180deg,rgba(8,10,14,0.03),rgba(8,10,14,0.24)_52%,rgba(8,10,14,0.9)),linear-gradient(90deg,rgba(8,10,14,0.25),transparent_45%)]"
            />

            <div className="absolute inset-x-6 bottom-6 sm:inset-x-8 sm:bottom-8">
              <p className="text-[0.61rem] font-semibold uppercase tracking-[0.18em] text-um-gold-300">
                Common matches
              </p>
              <ul className="mt-3 flex flex-wrap gap-2">
                {item.examples.map((example) => (
                  <li
                    className="rounded-full border border-white/14 bg-black/30 px-3.5 py-2 text-xs text-white/66 backdrop-blur-md"
                    key={example}
                  >
                    {example}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#eee9df] text-[#11151c]">
        <div className="mx-auto grid max-w-um-content gap-12 px-5 py-20 sm:px-8 sm:py-24 lg:grid-cols-[1.08fr_0.92fr] lg:gap-20 lg:py-28">
          <article>
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[#8c6900]">
              Buying near campus
            </p>
            <h2 className="um-balanced mt-5 text-[clamp(2.7rem,4.7vw,4.5rem)] font-semibold leading-[0.98] tracking-[-0.055em]">
              Know what matters.
            </h2>
            <p className="um-pretty mt-7 max-w-3xl text-lg leading-8 text-black/56">
              {item.summary}
            </p>

            <div className="mt-10 flex flex-wrap gap-2 border-t border-black/12 pt-6">
              {item.examples.map((example) => (
                <span
                  className="rounded-full border border-black/12 bg-white/35 px-4 py-2 text-sm text-black/58"
                  key={example}
                >
                  {example}
                </span>
              ))}
            </div>
          </article>

          <aside className="self-start rounded-[1.4rem] bg-[#10141a] p-6 text-white shadow-um-md sm:p-8">
            <p className="text-[0.66rem] font-semibold uppercase tracking-[0.18em] text-um-gold-300">
              Before meeting
            </p>
            <ol className="mt-6 border-t border-white/[0.1]">
              {category.checklist.map((check) => (
                <li className="border-b border-white/[0.1] py-5" key={check}>
                  <p className="text-sm leading-6 text-white/54">{check}</p>
                </li>
              ))}
            </ol>

            <div className="mt-6 grid gap-4 text-sm leading-6 text-white/48 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              <p className="flex gap-3">
                <BadgeCheck aria-hidden="true" className="mt-1 size-4 shrink-0 text-um-gold-300" />
                Verified access before messaging.
              </p>
              <p className="flex gap-3">
                <ShieldCheck aria-hidden="true" className="mt-1 size-4 shrink-0 text-um-gold-300" />
                Inspect before exchanging.
              </p>
            </div>
          </aside>
        </div>
      </section>

      <section className="um-public-dark-section border-t border-white/[0.08]">
        <div className="mx-auto max-w-um-content px-5 py-16 sm:px-8 sm:py-20">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[0.66rem] font-semibold uppercase tracking-[0.18em] text-um-gold-300">
                More in {category.shortName}
              </p>
              <h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-[#f4efe6] sm:text-4xl">
                Keep looking
              </h2>
            </div>
            <Link
              className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-white/48 transition hover:text-white"
              href={categoryHref(category.slug)}
            >
              View category
              <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
          </div>

          <ul className="mt-8 grid border-t border-white/[0.1] sm:grid-cols-2 lg:grid-cols-4">
            {relatedItems.map((related) => (
              <li
                className="border-b border-white/[0.1] lg:border-r lg:last:border-r-0"
                key={related.slug}
              >
                <Link
                  className="group flex min-h-28 items-center justify-between gap-4 px-1 py-5 sm:px-5 lg:px-6"
                  href={itemHref(related.slug)}
                >
                  <span>
                    <span className="block font-semibold tracking-[-0.02em] text-white/62 transition group-hover:text-white">
                      {related.name}
                    </span>
                  </span>
                  <ArrowRight
                    aria-hidden="true"
                    className="size-4 shrink-0 text-um-gold-300/52 transition group-hover:translate-x-0.5 group-hover:text-um-gold-300"
                  />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}
