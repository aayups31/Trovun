'use client';

import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import s from './Home.module.css';

export function CarouselControls() {
  const root = useRef<HTMLDivElement>(null);
  const viewport = useRef<HTMLElement | null>(null);
  const [state, setState] = useState({ progress: 0, overflow: false, first: 1, last: 1, total: 1 });
  useEffect(() => {
    const carousel = root.current?.closest('[data-home-carousel]');
    const view = carousel?.querySelector<HTMLElement>('[data-carousel-viewport]');
    const track = carousel?.querySelector<HTMLElement>('[data-home-listings]');
    if (!view || !track) return;
    viewport.current = view;
    const sync = () => {
      const max = view.scrollWidth - view.clientWidth;
      const cards = Array.from(track.children) as HTMLElement[];
      const bounds = view.getBoundingClientRect();
      const visible = cards.flatMap((card, index) => {
        const rect = card.getBoundingClientRect();
        return rect.right > bounds.left + 20 && rect.left < bounds.right - 20 ? [index + 1] : [];
      });
      setState({
        progress: max > 1 ? (view.scrollLeft / max) * 100 : 0,
        overflow: max > 1,
        first: visible[0] ?? 1,
        last: visible.at(-1) ?? cards.length,
        total: cards.length,
      });
    };
    const resize = new ResizeObserver(sync);
    resize.observe(view);
    resize.observe(track);
    const mutation = new MutationObserver(sync);
    mutation.observe(track, { childList: true });
    view.addEventListener('scroll', sync, { passive: true });
    sync();
    return () => {
      resize.disconnect();
      mutation.disconnect();
      view.removeEventListener('scroll', sync);
      viewport.current = null;
    };
  }, []);
  function move(direction: number) {
    const view = viewport.current;
    if (!view) return;
    const card = view.querySelector<HTMLElement>('[data-home-listing]');
    const track = view.querySelector<HTMLElement>('[data-home-listings]');
    const step = card
      ? card.offsetWidth + parseFloat(getComputedStyle(track!).columnGap || '0')
      : view.clientWidth;
    view.scrollBy({
      left: direction * step,
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'instant'
        : 'smooth',
    });
  }
  const label = `Listings ${state.first}–${state.last} of ${state.total}`;
  return (
    <div className={s.findsNavigation} ref={root}>
      <span className={s.findsRange}>{label}</span>
      <input
        type="range"
        min="0"
        max="100"
        step="0.1"
        value={state.progress}
        aria-label="Scroll campus listings"
        aria-valuetext={label}
        disabled={!state.overflow}
        className={s.findsSlider}
        style={{ '--finds-progress': `${state.progress}%` } as React.CSSProperties}
        onKeyDown={(event) => {
          const view = viewport.current;
          if (!view) return;
          if (event.key === 'Home' || event.key === 'End') {
            event.preventDefault();
            view.scrollTo({
              left: event.key === 'Home' ? 0 : view.scrollWidth - view.clientWidth,
              behavior: 'instant',
            });
          } else if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
            event.preventDefault();
            move(event.key === 'ArrowLeft' ? -1 : 1);
          }
        }}
        onChange={(event) => {
          const view = viewport.current;
          if (view)
            view.scrollTo({
              left: (Number(event.target.value) / 100) * (view.scrollWidth - view.clientWidth),
              behavior: 'instant',
            });
        }}
      />
      <div className={s.carouselControls}>
        <button
          type="button"
          aria-label="Previous listings"
          disabled={!state.overflow || state.progress < 0.2}
          onClick={() => move(-1)}
        >
          <ArrowLeft size={18} />
        </button>
        <button
          type="button"
          aria-label="Next listings"
          disabled={!state.overflow || state.progress > 99.8}
          onClick={() => move(1)}
        >
          <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
}
