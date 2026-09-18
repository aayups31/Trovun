'use client';

import NextImage, { type ImageLoaderProps, type ImageProps } from 'next/image';
import { useState } from 'react';

const unavailable = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480" viewBox="0 0 640 480"><rect width="640" height="480" fill="#17232c"/><g fill="none" stroke="#84939d" stroke-width="3"><rect x="294" y="202" width="52" height="42" rx="6"/><path d="m298 236 14-14 12 11 8-8 10 11"/><circle cx="331" cy="213" r="3"/></g><text x="320" y="280" text-anchor="middle" font-family="sans-serif" font-size="16" fill="#aab5bc">Photo unavailable</text></svg>')}`;

function categoryLoader({ src, width }: ImageLoaderProps) {
  const size = width <= 480 ? 480 : width <= 960 ? 960 : 1600;
  return src.replace('.webp', `-${size}.webp`);
}

/** Local category variants skip cold image transforms; private photos skip the upstream proxy. */
export default function ResilientImage({ src, alt, onError, ...props }: ImageProps) {
  const [failure, setFailure] = useState<{
    source: ImageProps['src'];
    direct: boolean;
    unavailable: boolean;
  }>();
  const current = failure?.source === src ? failure : undefined;
  const signed = typeof src === 'string' && src.includes('/storage/v1/object/sign/');
  const category = typeof src === 'string' && /\/category-\w+-photo-v3\.webp$/.test(src);
  return (
    <NextImage
      {...props}
      src={current?.unavailable ? unavailable : src}
      alt={current?.unavailable ? (alt ? `${alt} — photo unavailable` : 'Photo unavailable') : alt}
      loader={category && !current ? categoryLoader : props.loader}
      unoptimized={current?.unavailable || current?.direct || signed || props.unoptimized}
      onError={(event) => {
        if (current?.unavailable) return;
        setFailure({
          source: src,
          direct: true,
          unavailable: Boolean(current?.direct || signed || props.unoptimized),
        });
        onError?.(event);
      }}
    />
  );
}
