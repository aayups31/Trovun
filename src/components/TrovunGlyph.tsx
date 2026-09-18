import { cn } from '@/lib/utils';

type TrovunGlyphProps = {
  className?: string;
};

export function TrovunGlyph({ className }: TrovunGlyphProps) {
  return (
    <svg
      aria-hidden="true"
      className={cn('overflow-visible', className)}
      fill="none"
      viewBox="0 0 64 64"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M10 13.5H54"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="8"
      />
      <path
        d="M32 15V44"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="8"
      />
      <circle cx="32" cy="51" fill="currentColor" r="5" />
      <circle cx="10" cy="13.5" fill="currentColor" r="5.25" />
      <circle cx="54" cy="13.5" fill="currentColor" r="5.25" />
      <path
        d="M18 13.5H27"
        stroke="rgba(255,255,255,.28)"
        strokeLinecap="round"
        strokeWidth="2"
      />
    </svg>
  );
}
