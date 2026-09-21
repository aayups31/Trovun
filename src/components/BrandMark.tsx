import Link from 'next/link';

import { TrovunGlyph } from '@/components/TrovunGlyph';
import { cn } from '@/lib/utils';

import styles from './BrandMark.module.css';

type BrandMarkProps = {
  className?: string;
  href?: string;
  label?: string;
  showCampusLabel?: boolean;
  tone?: 'dark' | 'light';
};

export function BrandMark({
  className,
  href = '/',
  label = 'Trovun home',
  showCampusLabel = true,
  tone = 'dark',
}: BrandMarkProps) {
  return (
    <Link
      aria-label={label}
      href={href}
      className={cn(
        styles.brand,
        tone === 'light' && styles.light,
        'group min-h-11 rounded-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-um-gold-400',
        className,
      )}
    >
      <span aria-hidden="true" className={styles.logoStage}>
        <svg className={styles.outline} viewBox="0 0 64 64">
          <path className={styles.outlinePath} pathLength="196" d="M8 8H56V20H39V56H25V20H8Z" />
        </svg>
        <TrovunGlyph className={styles.glyph} />
      </span>

      <span className={styles.copy}>
        <span className={styles.wordmark}>Trovun</span>
        {showCampusLabel ? (
          <span className={cn(styles.campusLabel, 'hidden sm:block')}>
            Waterloo marketplace
          </span>
        ) : null}
      </span>
    </Link>
  );
}
