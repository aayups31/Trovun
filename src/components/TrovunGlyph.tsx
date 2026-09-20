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
      src="/brand/trovun-mark.png"
      width={512}
      height={512}
      unoptimized
      className={cn('shrink-0 object-contain', className)}
    />
  );
}
