import Link from 'next/link';
import { BrandMark } from './BrandMark';
import s from './Home.module.css';
export function Footer() {
  return (
    <footer className={s.footer}>
      <div className={s.wrap}>
        <div className={s.footerTop}>
          <BrandMark showCampusLabel={false} tone="light" />
          <nav aria-label="Footer navigation">
            <Link href="/waterloo-marketplace">Search guide</Link>
            <Link href="/marketplace" prefetch={false}>
              Marketplace
            </Link>
            <Link href="/signup">Join Trovun</Link>
          </nav>
          <a href="#main-content" className={s.backTop}>
            Back to top ↑
          </a>
        </div>
        <div className={s.footerBottom}>
          <p>Independent and student-built. Not affiliated with the University of Waterloo.</p>
          <span>© {new Date().getFullYear()} Trovun</span>
        </div>
      </div>
    </footer>
  );
}
