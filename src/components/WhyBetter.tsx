import { ArrowUpRight } from 'lucide-react';
import Link from 'next/link';
import type { PublicListingShowcaseItem } from '@/features/marketplace/public-showcase';
import { MarketplaceScrollShowcase } from './MarketplaceScrollShowcase';
import s from './Home.module.css';

export function WhyBetter({ listings }: { listings: PublicListingShowcaseItem[] }) {
  return (
    <section
      className={`${s.section} ${s.findsSection}`}
      id="why-waterloo"
      aria-labelledby="finds-heading"
    >
      <div className={s.wrap}>
        <header className={s.sectionHeader} data-home-reveal>
          <div>
            <p className={s.eyebrow}>From your people, for your next term</p>
            <h2 className={s.heading} id="finds-heading">
              New term.
              <br />
              <span className={s.serif}>Good finds.</span>
            </h2>
          </div>
          <div className={s.headerAside}>
            <p>
              The desk for your new place. The book for your next class. The little things that make
              campus yours.
            </p>
            <Link className={s.textLink} href="/marketplace" prefetch={false}>
              Browse the marketplace <ArrowUpRight aria-hidden="true" size={16} />
            </Link>
          </div>
        </header>
        <MarketplaceScrollShowcase listings={listings} />
        <div className={s.trustStrip} data-home-reveal>
          <p>
            <span className={s.statusDot} /> Verified Waterloo accounts
          </p>
          <p>Student to student</p>
          <p>Pickup close to campus</p>
        </div>
      </div>
    </section>
  );
}
