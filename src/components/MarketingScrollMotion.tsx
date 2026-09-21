'use client';

import { useEffect } from 'react';

// One animation owner. Layout and readable content are present before JS loads.
export function MarketingScrollMotion() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>('[data-home-root]');
    if (!root) return;

    let disposed = false;
    let cleanup: (() => void) | undefined;
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } })
      .connection;
    if (connection?.saveData) return;

    async function start() {
      const [{ default: gsap }, { ScrollTrigger }, { setupHomePreviews }] = await Promise.all([
        import('gsap'),
        import('gsap/ScrollTrigger'),
        import('./HomePreviewMotion'),
      ]);
      if (disposed || !root) return;
      gsap.registerPlugin(ScrollTrigger);
      const media = gsap.matchMedia();
      const context = gsap.context(() => {
        media.add(
          {
            desktop: '(min-width: 1024px)',
            reduce: '(prefers-reduced-motion: reduce)',
            mobile: '(max-width: 1023px), (max-height: 759px)',
          },
          (match) => {
            if (match.conditions?.reduce) return;
            const desktop = Boolean(match.conditions?.desktop);
            const cleanups: Array<() => void> = [];
            const select = <T extends Element = HTMLElement>(selector: string) =>
              Array.from(root.querySelectorAll<T>(selector));

            const rail = root.querySelector<HTMLElement>('[data-home-carousel]');
            const view = rail?.querySelector<HTMLElement>('[data-carousel-viewport]');
            const stage = rail?.querySelector<HTMLElement>('[data-carousel-stage]');
            const track = rail?.querySelector<HTMLElement>('[data-home-listings]');
            if (rail && view && stage && track) {
              const railContext = gsap.context(() => {});
              let movement: gsap.core.Tween | undefined;
              const distance = () => Math.max(0, view.scrollWidth - view.clientWidth);
              const travel = () => Math.min(3000, Math.max(600, distance()));
              const measure = () =>
                rail.style.setProperty('--carousel-height', `${stage.offsetHeight + travel()}px`);
              const reset = () => {
                railContext.revert();
                movement = undefined;
                rail.removeAttribute('data-carousel-enhanced');
                rail.style.removeProperty('--carousel-height');
                view.scrollLeft = 0;
              };
              const configure = () => {
                if (distance() < 2) {
                  if (movement) {
                    reset();
                    ScrollTrigger.refresh();
                  }
                  return;
                }
                // Preserve anchor navigation and restored positions below the gallery.
                if (!movement && rail.getBoundingClientRect().bottom <= 0) return;
                rail.setAttribute('data-carousel-enhanced', '');
                measure();
                if (!movement)
                  railContext.add(() => {
                    movement = gsap.fromTo(
                      view,
                      { scrollLeft: 0 },
                      {
                        scrollLeft: distance,
                        ease: 'none',
                        scrollTrigger: {
                          trigger: rail,
                          start: () => `top ${window.innerWidth < 768 ? 88 : 110}px`,
                          end: () => `+=${travel()}`,
                          scrub: 0.75,
                          invalidateOnRefresh: true,
                          onRefreshInit: measure,
                        },
                      },
                    );
                  });
                ScrollTrigger.refresh();
              };
              const focus = (event: FocusEvent) => {
                const card = (event.target as HTMLElement).closest<HTMLElement>(
                  '[data-home-listing]',
                );
                const trigger = movement?.scrollTrigger;
                if (!card || !trigger) return;
                const progress = Math.max(0, Math.min(1, card.offsetLeft / distance()));
                window.scrollTo({
                  top: trigger.start + (trigger.end - trigger.start) * progress,
                  behavior: 'instant',
                });
              };
              configure();
              const observer = new ResizeObserver(configure);
              observer.observe(view);
              observer.observe(track);
              view.addEventListener('focusin', focus);
              cleanups.push(() => {
                observer.disconnect();
                view.removeEventListener('focusin', focus);
                reset();
              });
            }

            // Preserve the gallery layout while the cards lift and their photos drift.
            select<HTMLElement>('[data-home-listing]').forEach((card, index) => {
              if (card.getBoundingClientRect().top >= window.innerHeight * 0.9) {
                gsap.fromTo(
                  card,
                  { y: desktop ? 76 : 44, scale: 0.96, opacity: 0.45 },
                  {
                    y: 0,
                    scale: 1,
                    opacity: 1,
                    ease: 'sine.out',
                    scrollTrigger: {
                      trigger: card,
                      start: 'top 97%',
                      end: `top ${desktop ? 48 + (index % 3) * 5 : 58}%`,
                      scrub: 1.1,
                    },
                  },
                );
              }
              const photo = card.querySelector('img');
              if (photo)
                gsap.fromTo(
                  photo,
                  { yPercent: -4, scale: 1.14 },
                  {
                    yPercent: 4,
                    scale: 1.14,
                    ease: 'none',
                    scrollTrigger: {
                      trigger: card,
                      start: 'top bottom',
                      end: 'bottom top',
                      scrub: 1.2,
                    },
                  },
                );
            });
            const categoryBackdrop = root.querySelector('[data-home-category-backdrop]');
            if (categoryBackdrop)
              gsap.fromTo(
                categoryBackdrop,
                { yPercent: -3, scale: 1.08 },
                {
                  yPercent: 3,
                  scale: 1.08,
                  ease: 'none',
                  scrollTrigger: {
                    trigger: '#categories',
                    start: 'top bottom',
                    end: 'bottom top',
                    scrub: 1.2,
                  },
                },
              );

            select<HTMLElement>('[data-home-reveal]').forEach((element) => {
              // Never hide content already visible on load, hash navigation, or scroll restoration.
              if (element.getBoundingClientRect().top < window.innerHeight * 0.9) return;
              gsap.fromTo(
                element,
                { y: desktop ? 32 : 18, opacity: 0.15 },
                {
                  y: 0,
                  opacity: 1,
                  duration: desktop ? 1.25 : 0.8,
                  ease: 'power3.out',
                  scrollTrigger: { trigger: element, start: 'top 90%', once: true },
                  clearProps: 'transform,opacity',
                },
              );
            });

            if (desktop) {
              const story = root.querySelector<HTMLElement>('[data-home-story]');
              const cards = select<HTMLElement>('[data-home-story-card]');
              if (
                story &&
                cards.length === 3 &&
                story.getBoundingClientRect().top > window.innerHeight * 0.9
              ) {
                const [left, centre, right] = cards;
                const timeline = gsap.timeline({
                  defaults: { ease: 'power2.out' },
                  scrollTrigger: {
                    trigger: story,
                    start: 'top 72%',
                    end: 'bottom bottom-=80',
                    scrub: 0.8,
                    invalidateOnRefresh: true,
                  },
                });
                timeline.eventCallback('onUpdate', () =>
                  story.dispatchEvent(new Event('trovun:story-progress')),
                );
                timeline
                  .fromTo(centre, { y: 70, opacity: 0.12 }, { y: 0, opacity: 1, duration: 1.2 }, 0)
                  .fromTo(
                    left,
                    { y: 50, x: 24, opacity: 0.12 },
                    { y: 0, x: 0, opacity: 1, duration: 1.2 },
                    0.55,
                  )
                  .fromTo(
                    right,
                    { y: 50, x: -24, opacity: 0.12 },
                    { y: 0, x: 0, opacity: 1, duration: 1.2 },
                    1,
                  );
              }
            } else {
              select<HTMLElement>('[data-home-story-card]').forEach((card) => {
                if (card.getBoundingClientRect().top < window.innerHeight * 0.9) return;
                gsap.fromTo(
                  card,
                  { y: 24, opacity: 0.2 },
                  {
                    y: 0,
                    opacity: 1,
                    duration: 0.95,
                    ease: 'power3.out',
                    onComplete: () =>
                      root
                        .querySelector('[data-home-story]')
                        ?.dispatchEvent(new Event('trovun:story-progress')),
                    scrollTrigger: { trigger: card, start: 'top 91%', once: true },
                    clearProps: 'transform,opacity',
                  },
                );
              });
            }
            cleanups.push(setupHomePreviews(root, gsap, ScrollTrigger));
            return () => cleanups.reverse().forEach((dispose) => dispose());
          },
        );
      }, root);
      const refresh = () => {
        if (!disposed) ScrollTrigger.refresh();
      };
      void document.fonts.ready.then(refresh);
      window.addEventListener('pageshow', refresh);
      cleanup = () => {
        window.removeEventListener('pageshow', refresh);
        media.revert();
        context.revert();
      };
    }

    // Keep the animation bundle out of the critical rendering path.
    const begin = () => {
      void start().catch(() => {
        cleanup?.();
      });
    };
    const idleCallback = window.requestIdleCallback?.(begin, { timeout: 900 });
    const timer = idleCallback === undefined ? window.setTimeout(begin, 240) : undefined;
    return () => {
      disposed = true;
      if (idleCallback !== undefined) window.cancelIdleCallback?.(idleCallback);
      if (timer !== undefined) window.clearTimeout(timer);
      cleanup?.();
    };
  }, []);
  return null;
}
