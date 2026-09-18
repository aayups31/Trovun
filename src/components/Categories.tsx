'use client';

import { ArrowUpRight } from 'lucide-react';
import Image from '@/components/ui/ResilientImage';
import Link from 'next/link';
import { useState } from 'react';
import { getMarketplaceCategoryPresentation } from '@/features/marketplace/category-presentation';
import s from './Home.module.css';

const categories = [
  { slug: 'electronics', title: 'Electronics' },
  { slug: 'books', title: 'Books' },
  { slug: 'household-items', title: 'Household' },
  { slug: 'clothing', title: 'Clothing' },
];

export function Categories() {
  const [active, setActive] = useState('electronics');
  return (
    <section
      className={`${s.section} ${s.categorySection}`}
      id="categories"
      aria-labelledby="categories-heading"
    >
      <div className={s.categoryCampus} aria-hidden="true" data-home-category-backdrop>
        {categories.map(({ slug }) => (
          <Image
            key={slug}
            src={getMarketplaceCategoryPresentation(slug).image}
            alt=""
            fill
            sizes="100vw"
            className={s.categoryPending}
            style={{ opacity: active === slug ? 1 : 0 }}
          />
        ))}
      </div>
      <div className={`${s.wrap} ${s.categoryLayout}`}>
        <header data-home-reveal>
          <p className={s.eyebrow}>Your campus, your kind of finds</p>
          <h2 className={s.heading} id="categories-heading">
            A little more
            <br />
            <span className={s.serif}>you.</span>
          </h2>
          <p className={s.categoryIntro}>
            For your next class, your first place, and everything in between. From people who share
            your university.
          </p>
          <Link className={s.textLink} href="/waterloo-marketplace">
            Explore your marketplace <ArrowUpRight aria-hidden="true" size={16} />
          </Link>
        </header>
        <nav aria-label="Marketplace categories" className={s.categoryList}>
          {categories.map((category) => (
            <Link
              className={s.categoryRow}
              href={`/waterloo-marketplace/${category.slug}`}
              key={category.slug}
              data-active={active === category.slug}
              onMouseEnter={() => setActive(category.slug)}
              onFocus={() => setActive(category.slug)}
            >
              <span className={s.categoryText}>
                <span>{category.title}</span>
              </span>
              <span className={s.categoryArrow}>
                <ArrowUpRight aria-hidden="true" size={23} />
              </span>
            </Link>
          ))}
        </nav>
      </div>
    </section>
  );
}
