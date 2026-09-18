'use client';

import gsap from 'gsap';
import { usePathname } from 'next/navigation';
import { useLayoutEffect } from 'react';

export function ProductPageMotion() {
  const pathname = usePathname();

  useLayoutEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const main = document.querySelector<HTMLElement>('#main-content');
    const page = main?.firstElementChild as HTMLElement | null;
    if (!main || !page) return;

    const context = gsap.context(() => {
      const surfaces = Array.from(
        page.querySelectorAll<HTMLElement>(
          '.um-listing-card, .um-product-panel, .um-sell-section, [data-product-surface]',
        ),
      ).slice(0, 16);

      const timeline = gsap.timeline({ defaults: { ease: 'power3.out' } });
      timeline.fromTo(
        page,
        { opacity: 0.72, y: 12 },
        { clearProps: 'transform', duration: 0.52, opacity: 1, y: 0 },
      );

      if (surfaces.length > 0) {
        timeline.fromTo(
          surfaces,
          { opacity: 0.72, scale: 0.985, y: 18 },
          {
            clearProps: 'transform',
            duration: 0.58,
            ease: 'power3.out',
            opacity: 1,
            scale: 1,
            stagger: 0.035,
            y: 0,
          },
          0.08,
        );
      }
    }, main);

    return () => context.revert();
  }, [pathname]);

  return null;
}
