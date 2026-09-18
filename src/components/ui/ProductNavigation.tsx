'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MessageCircle, Plus, Search, ShieldCheck, Store, UserRound } from 'lucide-react';
import type { MouseEvent } from 'react';
import { useEffect, useState } from 'react';

import {
  MESSAGES_UNREAD_EVENT,
  OPEN_MESSAGES_EVENT,
  REFRESH_MESSAGES_UNREAD_EVENT,
  type MessagesUnreadDetail,
} from '@/features/messages/events';
import { cn } from '@/lib/utils';

type ProductNavigationProps = {
  canSell: boolean;
  isModerator: boolean;
};

type NavigationItem = {
  href: string;
  label: string;
  mobileLabel?: string;
  icon: typeof Search;
  current: (pathname: string) => boolean;
};

const browseItem: NavigationItem = {
  href: '/marketplace',
  label: 'Browse',
  icon: Search,
  current: (pathname) =>
    pathname === '/marketplace' ||
    (/^\/listings\/[^/]+$/.test(pathname) && pathname !== '/listings/new'),
};

const listingsItem: NavigationItem = {
  href: '/my-listings',
  label: 'My listings',
  mobileLabel: 'Mine',
  icon: Store,
  current: (pathname) => pathname === '/my-listings' || /^\/listings\/[^/]+\/edit$/.test(pathname),
};

const createItem: NavigationItem = {
  href: '/listings/new',
  label: 'Sell',
  icon: Plus,
  current: (pathname) => pathname === '/listings/new',
};

const messagesItem: NavigationItem = {
  href: '/messages',
  label: 'Messages',
  icon: MessageCircle,
  current: (pathname) => pathname === '/messages' || pathname.startsWith('/messages/'),
};

const moderatorItem: NavigationItem = {
  href: '/moderation',
  label: 'Moderation',
  icon: ShieldCheck,
  current: (pathname) => pathname === '/moderation' || pathname.startsWith('/moderation/'),
};

const profileItem: NavigationItem = {
  href: '/profile',
  label: 'Profile',
  mobileLabel: 'Me',
  icon: UserRound,
  current: (pathname) => pathname === '/profile',
};

export function ProductNavigation({ canSell, isModerator }: ProductNavigationProps) {
  const pathname = usePathname();
  const items = canSell
    ? [browseItem, listingsItem]
    : isModerator
      ? [browseItem, moderatorItem]
      : [browseItem];

  return (
    <nav aria-label="Primary" className="hidden h-full items-center gap-1 lg:flex">
      {items.map((item) => {
        const isCurrent = item.current(pathname);

        return (
          <Link
            aria-current={isCurrent ? 'page' : undefined}
            className={cn(
              'relative inline-flex min-h-10 items-center rounded-full px-3.5 text-sm font-semibold transition-colors duration-220 ease-um-out after:absolute after:bottom-1.5 after:left-1/2 after:h-px after:w-5 after:-translate-x-1/2 after:bg-um-gold-300 after:transition-[opacity,transform] after:duration-220',
              isCurrent
                ? 'bg-white/[0.065] text-white after:scale-100 after:opacity-100'
                : 'text-white/54 after:scale-50 after:opacity-0 hover:bg-white/[0.045] hover:text-white',
            )}
            href={item.href}
            key={item.href}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function SearchNavigationButton() {
  const pathname = usePathname();

  return (
    <Link
      aria-label="Search the marketplace"
      className="group inline-flex size-10 shrink-0 items-center justify-center rounded-full text-white/52 transition-[background-color,color,box-shadow] duration-220 ease-um-out hover:bg-white/[0.055] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-um-gold-300"
      href="/marketplace#marketplace-search"
      onClick={(event) => {
        if (pathname !== '/marketplace') return;
        const input = document.getElementById('marketplace-search');
        if (!(input instanceof HTMLInputElement)) return;
        event.preventDefault();
        input.scrollIntoView({ behavior: 'smooth', block: 'center' });
        input.focus({ preventScroll: true });
      }}
      title="Search"
    >
      <Search
        aria-hidden="true"
        className="size-[1.05rem] transition-transform duration-220 ease-um-out group-hover:scale-105"
        strokeWidth={1.9}
      />
    </Link>
  );
}

export function MessagesNavigationButton({
  className,
  source = 'header',
}: {
  className?: string;
  source?: 'header' | 'mobile';
}) {
  const pathname = usePathname();
  const isCurrent = messagesItem.current(pathname);
  const unread = useUnreadMessages();

  return (
    <Link
      aria-current={isCurrent ? 'page' : undefined}
      aria-label={unread > 0 ? `Open messages, ${unread} unread` : 'Open messages'}
      className={cn(
        'group relative inline-flex size-10 shrink-0 items-center justify-center rounded-full text-white/52 transition-[background-color,color,box-shadow] duration-220 ease-um-out hover:bg-white/[0.055] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-um-gold-300',
        isCurrent && 'bg-white/[0.07] text-um-gold-300 ring-white/[0.13]',
        className,
      )}
      href={messagesItem.href}
      onClick={(event) => openMessages(event, source)}
      title="Messages"
    >
      <MessageCircle
        aria-hidden="true"
        className="size-[1.08rem] transition-transform duration-220 ease-um-out group-hover:scale-105"
        strokeWidth={1.9}
      />
      {unread > 0 ? <UnreadBadge count={unread} /> : null}
    </Link>
  );
}

export function CreateListingNavigationButton() {
  const pathname = usePathname();
  const isCurrent = createItem.current(pathname);

  return (
    <Link
      aria-current={isCurrent ? 'page' : undefined}
      className={cn(
        'hidden min-h-10 shrink-0 items-center justify-center gap-2 rounded-full px-4 text-sm font-bold transition-[background-color,box-shadow,transform] duration-220 ease-um-out hover:-translate-y-px lg:inline-flex',
        isCurrent
          ? 'bg-um-gold-200 text-um-ink-950 ring-1 ring-inset ring-white/40'
          : 'bg-um-gold-300 text-um-ink-950 shadow-[0_10px_28px_rgba(201,152,18,0.13)] hover:bg-um-gold-200 hover:shadow-[0_13px_34px_rgba(201,152,18,0.18)]',
      )}
      href={createItem.href}
    >
      <Plus aria-hidden="true" className="size-4" strokeWidth={2.2} />
      Sell
    </Link>
  );
}

export function MobileTabBar({ canSell, isModerator }: ProductNavigationProps) {
  const pathname = usePathname();
  const unread = useUnreadMessages(canSell);
  const items = canSell
    ? [browseItem, createItem, messagesItem, listingsItem, profileItem]
    : isModerator
      ? [browseItem, moderatorItem, profileItem]
      : [browseItem, profileItem];

  return (
    <nav
      aria-label="Mobile primary"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-white/[0.09] bg-[#070b12]/92 px-3 pb-[max(0.4rem,env(safe-area-inset-bottom))] pt-1.5 shadow-[0_-18px_50px_rgba(0,0,0,0.2)] backdrop-blur-2xl lg:hidden"
    >
      <div
        className="mx-auto grid max-w-md gap-1"
        style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
      >
        {items.map((item) => {
          const Icon = item.icon;
          const isCurrent = item.current(pathname);
          const isCreate = item.href === createItem.href;
          const isMessages = item.href === messagesItem.href;

          return (
            <Link
              aria-current={isCurrent ? 'page' : undefined}
              aria-label={isMessages && unread > 0 ? `Messages, ${unread} unread` : undefined}
              className={cn(
                'relative flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-um-sm px-1 text-[0.67rem] font-semibold transition-colors duration-220 ease-um-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-um-gold-300',
                isCurrent ? 'text-white' : 'text-white/42 hover:text-white/78',
              )}
              href={item.href}
              key={item.href}
              onClick={isMessages ? (event) => openMessages(event, 'mobile') : undefined}
            >
              {isCurrent && !isCreate ? (
                <span
                  aria-hidden="true"
                  className="absolute top-0 h-px w-8 rounded-full bg-um-gold-300 shadow-[0_0_12px_rgba(242,213,111,0.55)]"
                />
              ) : null}
              <span
                className={cn(
                  'relative grid size-6 place-items-center rounded-full transition-[background-color,color,transform] duration-220 ease-um-out',
                  isCreate && 'size-7 bg-um-gold-300 text-um-ink-950',
                  isCreate && isCurrent && 'bg-um-gold-200 ring-1 ring-inset ring-white/40',
                )}
              >
                <Icon
                  aria-hidden="true"
                  className="size-[1.05rem]"
                  strokeWidth={isCurrent ? 2.1 : 1.8}
                />
                {isMessages && unread > 0 ? <UnreadBadge count={unread} compact /> : null}
              </span>
              <span>{item.mobileLabel ?? item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function useUnreadMessages(enabled = true) {
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    let active = true;

    const loadUnread = async () => {
      try {
        const response = await fetch('/api/messages/unread', { cache: 'no-store' });
        if (!response.ok) return;
        const payload = (await response.json()) as { totalUnread?: number };
        if (active) setUnread(Math.max(0, Number(payload.totalUnread ?? 0)));
      } catch {
        // The icon remains usable even if the badge cannot refresh.
      }
    };

    const handleCount = (event: Event) => {
      const detail = (event as CustomEvent<MessagesUnreadDetail>).detail;
      setUnread(Math.max(0, Number(detail?.count ?? 0)));
    };
    const handleRefresh = () => void loadUnread();

    window.addEventListener(MESSAGES_UNREAD_EVENT, handleCount);
    window.addEventListener(REFRESH_MESSAGES_UNREAD_EVENT, handleRefresh);
    void loadUnread();
    const timer = window.setInterval(loadUnread, 60_000);

    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener(MESSAGES_UNREAD_EVENT, handleCount);
      window.removeEventListener(REFRESH_MESSAGES_UNREAD_EVENT, handleRefresh);
    };
  }, [enabled]);

  return unread;
}

function UnreadBadge({ count, compact = false }: { count: number; compact?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'absolute grid min-w-4 place-items-center rounded-full bg-um-gold-300 px-1 text-[0.56rem] font-black leading-4 tabular-nums text-um-ink-950 ring-2 ring-[#070a0f]',
        compact ? '-right-1.5 -top-1.5' : '-right-0.5 -top-0.5',
      )}
    >
      {count > 99 ? '99+' : count}
    </span>
  );
}

function openMessages(event: MouseEvent<HTMLAnchorElement>, source: 'header' | 'mobile') {
  const openEvent = new CustomEvent(OPEN_MESSAGES_EVENT, {
    cancelable: true,
    detail: { source },
  });

  // The messages dock prevents the custom event's default when it handles the
  // request. Without a mounted dock, the link remains a normal /messages route.
  if (!window.dispatchEvent(openEvent)) {
    event.preventDefault();
  }
}
