import { ArrowUpRight } from 'lucide-react';
import Link from 'next/link';
import { BrandMark } from '@/components/BrandMark';
import s from './Home.module.css';

export function Nav() {
  return (
    <header className={s.navigation}>
      <nav className={`${s.wrap} ${s.navInner}`} aria-label="Public navigation">
        <BrandMark className={s.homeBrand} tone="light" showCampusLabel={false} />
        <div className={s.navLinks}>
          <a href="#why-waterloo">The marketplace</a>
          <a href="#how-it-works">How it works</a>
          <Link href="/waterloo-marketplace">Search guide</Link>
        </div>
        <div className={s.navActions}>
          <Link className={s.signIn} href="/marketplace" prefetch={false}>
            Sign in
          </Link>
          <Link className={s.navJoin} href="/signup">
            Join Trovun <ArrowUpRight aria-hidden="true" size={16} />
          </Link>
        </div>
      </nav>
    </header>
  );
}
