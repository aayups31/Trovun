import type { Metadata } from 'next';
import { ArrowRight, BadgeCheck, BookOpen, MapPin, Search } from 'lucide-react';
import Image from '@/components/ui/ResilientImage';
import Link from 'next/link';

import { JsonLd } from '@/features/seo/components/JsonLd';
import {
  SEARCH_CATEGORIES,
  categoryHref,
  getItemsForCategory,
  itemHref,
} from '@/features/seo/search-targets';
import { absoluteUrl, SITE_URL } from '@/lib/site';

const title = 'University of Waterloo Student Marketplace';
const description =
  'Explore Trovun Waterloo for used textbooks, electronics, clothing, and household essentials from verified University of Waterloo students.';

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: '/waterloo-marketplace',
  },
  openGraph: {
    title: `${title} | Trovun`,
    description,
    url: '/waterloo-marketplace',
  },
};

const faqItems = [
  {
    question: 'What is Trovun Waterloo?',
    answer:
      'Trovun, formerly UniMarket, is an independent student-built marketplace for the University of Waterloo community. Verified students can browse, list, and message inside the private marketplace.',
  },
  {
    question: 'What can students search for?',
    answer:
      'Common searches include used textbooks, monitors, calculators, laptops, desks, chairs, kitchenware, winter jackets, and co-op clothing.',
  },
  {
    question: 'Is Trovun affiliated with the University of Waterloo?',
    answer:
      'No. Trovun is an independent project and is not affiliated with or endorsed by the University of Waterloo.',
  },
] as const;

const campusPromises = [
  {
    icon: BadgeCheck,
    title: 'Verified access',
    text: 'Browsing, profiles, listings, and messages stay inside the Waterloo student community.',
  },
  {
    icon: MapPin,
    title: 'Close by',
    text: 'Find useful things already moving through the neighbourhoods around campus.',
  },
  {
    icon: BookOpen,
    title: 'Built for term life',
    text: 'Searches follow the way students actually move, study, furnish, and prepare for co-op.',
  },
] as const;

export default function WaterlooMarketplacePage() {
  return (
    <>
      <JsonLd
        data={[
          {
            '@context': 'https://schema.org',
            '@type': 'CollectionPage',
            '@id': `${absoluteUrl('/waterloo-marketplace')}#page`,
            url: absoluteUrl('/waterloo-marketplace'),
            name: title,
            description,
            isPartOf: {
              '@id': `${SITE_URL}/#website`,
            },
            about: [
              'University of Waterloo',
              'student marketplace',
              'used textbooks',
              'used electronics',
              'student furniture',
            ],
            mainEntity: {
              '@type': 'ItemList',
              itemListElement: SEARCH_CATEGORIES.map((category, index) => ({
                '@type': 'ListItem',
                position: index + 1,
                name: category.name,
                url: absoluteUrl(categoryHref(category.slug)),
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
            ],
          },
          {
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: faqItems.map((item) => ({
              '@type': 'Question',
              name: item.question,
              acceptedAnswer: {
                '@type': 'Answer',
                text: item.answer,
              },
            })),
          },
        ]}
      />

      <section className="relative isolate overflow-hidden border-b border-white/[0.08]">
        <div aria-hidden="true" className="um-public-hero-field absolute inset-0 -z-20" />

        <div className="mx-auto grid min-h-[calc(100svh-4.5rem)] max-w-[92rem] lg:grid-cols-[0.9fr_1.1fr]">
          <div className="flex items-center px-5 py-16 sm:px-8 sm:py-20 lg:px-12 xl:px-16">
            <div className="max-w-[42rem]">
              <div className="flex items-center gap-3 text-[0.68rem] font-semibold uppercase tracking-[0.19em] text-um-gold-300">
                <span aria-hidden="true" className="size-1.5 rounded-full bg-um-gold-300" />
                University of Waterloo
              </div>

              <h1 className="um-balanced um-display-safe mt-7 text-[clamp(3.1rem,6vw,6rem)] font-semibold leading-[1.01] tracking-[-0.044em] text-[#f6f1e8] sm:leading-[0.98]">
                Everything you need.
                <span className="block text-um-gold-300">Already nearby.</span>
              </h1>

              <p className="um-pretty mt-7 max-w-xl text-[1.05rem] leading-8 text-white/55 sm:text-lg">
                A private student marketplace for the useful things that move between Waterloo
                terms.
              </p>

              <div className="mt-9 flex flex-wrap gap-3">
                <Link
                  className="group inline-flex min-h-[3.15rem] items-center gap-3 rounded-full bg-um-gold-300 px-5 text-sm font-bold text-um-ink-950 transition hover:bg-[#ffe48d] focus-visible:ring-2 focus-visible:ring-white"
                  href="/login?next=%2Fmarketplace"
                  prefetch={false}
                >
                  <Search aria-hidden="true" className="size-4" />
                  Search live listings
                  <ArrowRight
                    aria-hidden="true"
                    className="size-4 transition-transform group-hover:translate-x-0.5"
                  />
                </Link>
                <Link
                  className="inline-flex min-h-[3.15rem] items-center rounded-full border border-white/14 px-5 text-sm font-semibold text-white/72 transition hover:border-white/28 hover:bg-white/[0.045] hover:text-white focus-visible:ring-2 focus-visible:ring-um-gold-300"
                  href="/signup"
                >
                  Join with Waterloo
                </Link>
              </div>

              <div className="mt-12 flex flex-wrap gap-x-7 gap-y-2 border-t border-white/[0.08] pt-5 text-xs text-white/38">
                <span>Verified Waterloo access</span>
                <span>Student to student</span>
                <span>Independent by design</span>
              </div>
            </div>
          </div>

          <div className="relative min-h-[36rem] overflow-hidden border-t border-white/[0.08] lg:min-h-full lg:border-l lg:border-t-0">
            <Image
              alt="Aerial view of the University of Waterloo campus"
              className="object-cover object-[54%_48%]"
              fill
              priority
              quality={92}
              sizes="(max-width: 1024px) 100vw, 55vw"
              src="/waterloo/campus-aerial-restored.webp"
            />
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-[linear-gradient(180deg,rgba(8,10,14,0.04),rgba(8,10,14,0.38)_50%,rgba(8,10,14,0.94)),linear-gradient(90deg,rgba(8,10,14,0.35),transparent_44%)]"
            />

            <p className="absolute left-6 top-6 rounded-full border border-white/15 bg-black/25 px-3 py-2 text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-white/68 backdrop-blur-md sm:left-8 sm:top-8">
              One campus · one exchange
            </p>

            <nav
              aria-label="Browse marketplace categories"
              className="absolute inset-x-5 bottom-5 isolate overflow-hidden rounded-[1.35rem] border border-[#8d7437]/45 bg-[#02060c]/58 shadow-[0_28px_80px_rgba(0,0,0,0.42),inset_0_1px_0_rgba(242,205,82,0.1)] backdrop-blur-lg sm:inset-x-8 sm:bottom-8"
            >
              {SEARCH_CATEGORIES.map((category) => (
                <Link
                  className="group grid min-h-[4.5rem] grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-b border-[#8d7437]/25 bg-black/25 px-4 text-white transition-[background-color,border-color] duration-300 last:border-b-0 even:bg-black/15 hover:border-[#d6b653]/35 hover:bg-[#171711]/70 sm:min-h-[5rem] sm:px-5"
                  href={categoryHref(category.slug)}
                  key={category.slug}
                >
                  <span className="text-lg font-semibold tracking-[-0.025em] sm:text-xl">
                    {category.name}
                  </span>
                  <ArrowRight
                    aria-hidden="true"
                    className="size-4 text-white/34 transition group-hover:translate-x-0.5 group-hover:text-um-gold-300"
                  />
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </section>

      <section className="bg-[#eee9df] text-[#11151c]">
        <div className="mx-auto max-w-um-content px-5 py-20 sm:px-8 sm:py-24 lg:py-28">
          <div className="grid gap-8 lg:grid-cols-[0.7fr_1.3fr] lg:gap-16">
            <div>
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[#8c6900]">
                Four parts of student life
              </p>
              <h2 className="um-balanced um-display-safe mt-5 max-w-lg text-[clamp(2.5rem,4.6vw,4.4rem)] font-semibold leading-[1.02] tracking-[-0.04em] sm:leading-[0.99]">
                Start where the problem is.
              </h2>
              <p className="mt-6 max-w-md text-base leading-7 text-black/52">
                From a missing charger to an empty apartment, find the right corner of Waterloo in
                one move.
              </p>
            </div>

            <div className="border-t border-black/12">
              {SEARCH_CATEGORIES.map((category) => (
                <Link
                  className="group grid gap-4 border-b border-black/12 py-5 transition sm:grid-cols-[minmax(0,1fr)_12rem_2rem] sm:items-center sm:py-6"
                  href={categoryHref(category.slug)}
                  key={category.slug}
                >
                  <div>
                    <h3 className="text-2xl font-semibold tracking-[-0.035em] transition group-hover:text-[#7d5e00]">
                      {category.name}
                    </h3>
                    <p className="mt-1 max-w-xl text-sm leading-6 text-black/48">
                      {category.description}
                    </p>
                  </div>
                  <div className="relative hidden aspect-[16/9] overflow-hidden rounded-[0.8rem] bg-black/5 sm:block">
                    <Image
                      alt=""
                      className="object-cover grayscale-[0.2] transition duration-700 ease-um-out group-hover:scale-[1.035] group-hover:grayscale-0"
                      fill
                      quality={88}
                      sizes="12rem"
                      src={category.image}
                      style={{ objectPosition: category.imagePosition }}
                    />
                  </div>
                  <ArrowRight
                    aria-hidden="true"
                    className="hidden size-4 text-black/36 transition group-hover:translate-x-0.5 group-hover:text-black sm:block"
                  />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="um-public-dark-section border-y border-white/[0.08]">
        <div className="mx-auto max-w-um-content px-5 py-20 sm:px-8 sm:py-24">
          <div className="max-w-2xl">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-um-gold-300">
              Search by the thing
            </p>
            <h2 className="um-balanced mt-5 text-[clamp(2.6rem,4.8vw,4.5rem)] font-semibold leading-[0.98] tracking-[-0.05em] text-[#f4efe6]">
              Less browsing. More finding.
            </h2>
          </div>

          <div className="mt-12 grid gap-x-10 gap-y-12 md:grid-cols-2 lg:grid-cols-4">
            {SEARCH_CATEGORIES.map((category) => (
              <section aria-labelledby={`${category.slug}-searches`} key={category.slug}>
                <div className="flex items-end justify-between gap-3 border-b border-white/[0.1] pb-3">
                  <h3
                    className="text-base font-semibold tracking-[-0.02em] text-white"
                    id={`${category.slug}-searches`}
                  >
                    {category.shortName}
                  </h3>
                </div>
                <ul className="mt-2">
                  {getItemsForCategory(category.slug).map((item) => (
                    <li key={item.slug}>
                      <Link
                        className="group flex min-h-10 items-center justify-between gap-3 text-sm text-white/48 transition hover:text-white"
                        href={itemHref(item.slug)}
                      >
                        {item.name}
                        <ArrowRight
                          aria-hidden="true"
                          className="size-3 text-um-gold-300/0 transition group-hover:translate-x-0.5 group-hover:text-um-gold-300"
                        />
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </div>
      </section>

      <section className="um-public-dark-section um-public-dark-section--reverse">
        <div className="mx-auto max-w-um-content px-5 py-20 sm:px-8 sm:py-24 lg:py-28">
          <div className="grid gap-12 lg:grid-cols-[0.78fr_1.22fr] lg:gap-20">
            <div>
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-um-gold-300">
                Made for one campus
              </p>
              <h2 className="um-balanced mt-5 text-[clamp(2.7rem,4.8vw,4.7rem)] font-semibold leading-[0.96] tracking-[-0.055em] text-[#f4efe6]">
                Familiar by design.
              </h2>
            </div>

            <div>
              <div className="grid gap-px overflow-hidden rounded-[1.2rem] border border-white/[0.09] bg-white/[0.09] md:grid-cols-3">
                {campusPromises.map((promise) => {
                  const Icon = promise.icon;
                  return (
                    <article className="bg-[#0c1016] p-6 sm:p-7" key={promise.title}>
                      <Icon aria-hidden="true" className="size-5 text-um-gold-300" />
                      <h3 className="mt-8 text-lg font-semibold tracking-[-0.025em] text-white">
                        {promise.title}
                      </h3>
                      <p className="mt-3 text-sm leading-6 text-white/46">{promise.text}</p>
                    </article>
                  );
                })}
              </div>

              <div className="mt-14 divide-y divide-white/[0.09] border-y border-white/[0.09]">
                {faqItems.map((item) => (
                  <section
                    className="grid gap-3 py-6 md:grid-cols-[0.75fr_1.25fr]"
                    key={item.question}
                  >
                    <h3 className="text-base font-semibold tracking-[-0.02em] text-white">
                      {item.question}
                    </h3>
                    <p className="text-sm leading-7 text-white/46">{item.answer}</p>
                  </section>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
