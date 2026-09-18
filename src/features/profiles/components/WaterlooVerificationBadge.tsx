import Image from '@/components/ui/ResilientImage';

import { cn } from '@/lib/utils';

type WaterlooVerificationBadgeProps = {
  className?: string;
  /** @deprecated The Waterloo crest is always rendered without a text pill. */
  iconOnly?: boolean;
  size?: 'xs' | 'sm' | 'md';
};

const ICON_SIZE = {
  xs: 'size-4',
  sm: 'size-5',
  md: 'size-7',
};

export function WaterlooVerificationBadge({
  className,
  size = 'sm',
}: WaterlooVerificationBadgeProps) {
  return (
    <span
      aria-label="Verified University of Waterloo student"
      className={cn('inline-flex shrink-0 items-center rounded-full text-um-gold-200', className)}
    >
      <span
        aria-hidden="true"
        className={cn(
          'relative block overflow-hidden rounded-full bg-[#090c12] ring-1 ring-inset ring-um-gold-300/22',
          ICON_SIZE[size],
        )}
      >
        <Image
          alt=""
          className="object-cover"
          fill
          sizes={size === 'xs' ? '16px' : size === 'sm' ? '20px' : '28px'}
          src="/waterloo/uwaterloo-circle-badge.webp"
        />
      </span>
    </span>
  );
}
