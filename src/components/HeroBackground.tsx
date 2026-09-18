'use client';

import { useState } from 'react';
import Image from '@/components/ui/ResilientImage';
import campusPhoto from '../../public/waterloo/campus-aerial-hero.webp';
import s from './Home.module.css';

export function HeroBackground() {
  const [ready, setReady] = useState(false);

  return (
    <div className={s.heroBackdrop} aria-hidden="true" data-ready={ready}>
      <Image
        alt=""
        src={campusPhoto}
        fill
        priority
        sizes="100vw"
        className={s.campusImage}
        onLoad={() => setReady(true)}
        unoptimized
      />
    </div>
  );
}
