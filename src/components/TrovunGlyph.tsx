import { cn } from '@/lib/utils';
import Image from 'next/image';

type TrovunGlyphProps = {
  className?: string;
};

export function TrovunGlyph({ className }: TrovunGlyphProps) {
  return (
    <Image
      aria-hidden="true"
      alt=""
      src="/brand/trovun-logo-no-background.png"
      width={96}
      height={94}
      sizes="48px"
      className={cn('shrink-0 object-contain', className)}
    />
  );
}
