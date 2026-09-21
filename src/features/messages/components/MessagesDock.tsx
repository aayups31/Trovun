'use client';

import * as Dialog from '@radix-ui/react-dialog';
import Image from '@/components/ui/ResilientImage';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  LoaderCircle,
  MessageCircle,
  Send,
  Star,
  UserRound,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';

import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

import {
  MESSAGES_UNREAD_EVENT,
  OPEN_MESSAGES_EVENT,
  REFRESH_MESSAGES_UNREAD_EVENT,
  type MessagesUnreadDetail,
  type OpenMessagesDetail,
} from '../events';
import type { ConversationMessage, ConversationSummary } from '../types';

type InboxResponse = {
  conversations: ConversationSummary[];
  totalUnread: number;
};

type ThreadResponse = {
  conversation: ConversationSummary;
  messages: ConversationMessage[];
};

type MessagesDockProps = {
  viewerId: string;
};

export function MessagesDock({ viewerId }: MessagesDockProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(pathname === '/messages');
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [inboxLoading, setInboxLoading] = useState(false);
  const [threadLoading, setThreadLoading] = useState(false);
  const [inboxError, setInboxError] = useState<string | null>(null);
  const [threadError, setThreadError] = useState<string | null>(null);
  const [mobileListVisible, setMobileListVisible] = useState(true);
  const requestedConversationRef = useRef<string | null>(null);
  const threadRequestRef = useRef(0);
  const threadEndRef = useRef<HTMLDivElement | null>(null);
  const lastScrolledMessageIdRef = useRef<string | null>(null);
  const dockRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open || !window.visualViewport) return;
    const viewport = window.visualViewport;
    const syncViewport = () => {
      // Track the keyboard without fighting intentional pinch zoom.
      if (viewport.scale !== 1) return;
      dockRef.current?.style.setProperty('--messages-height', `${viewport.height}px`);
      dockRef.current?.style.setProperty('--messages-top', `${viewport.offsetTop}px`);
    };
    syncViewport();
    viewport.addEventListener('resize', syncViewport);
    viewport.addEventListener('scroll', syncViewport);
    return () => {
      viewport.removeEventListener('resize', syncViewport);
      viewport.removeEventListener('scroll', syncViewport);
    };
  }, [open]);

  const activeConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === activeId) ?? null,
    [activeId, conversations],
  );

  const loadInbox = useCallback(async (preferredId?: string | null) => {
    setInboxLoading(true);
    setInboxError(null);

    try {
      const response = await fetch('/api/messages', { cache: 'no-store' });
      if (!response.ok) throw new Error('inbox');

      const payload = (await response.json()) as InboxResponse;
      const nextConversations = payload.conversations ?? [];
      setConversations((current) => {
        const existing = new Map(current.map((conversation) => [conversation.id, conversation]));
        return nextConversations.map((conversation) => {
          const previousCover = existing.get(conversation.id)?.coverUrl;
          return previousCover && conversation.coverUrl && conversation.listingStatus !== 'removed'
            ? { ...conversation, coverUrl: previousCover }
            : conversation;
        });
      });
      window.dispatchEvent(
        new CustomEvent<MessagesUnreadDetail>(MESSAGES_UNREAD_EVENT, {
          detail: { count: payload.totalUnread ?? 0 },
        }),
      );

      const requestedId = preferredId ?? requestedConversationRef.current;
      const requestedExists = requestedId
        ? nextConversations.some((conversation) => conversation.id === requestedId)
        : false;

      setActiveId((current) => {
        if (requestedId && requestedExists) return requestedId;
        if (current && nextConversations.some((conversation) => conversation.id === current)) {
          return current;
        }
        return nextConversations[0]?.id ?? null;
      });
    } catch {
      setInboxError('Messages could not be loaded.');
    } finally {
      setInboxLoading(false);
    }
  }, []);

  const loadThread = useCallback(async (conversationId: string, quiet = false) => {
    const requestId = ++threadRequestRef.current;
    if (!quiet) setThreadLoading(true);
    setThreadError(null);

    try {
      const response = await fetch(`/api/messages/${conversationId}`, { cache: 'no-store' });
      if (!response.ok) throw new Error('thread');

      const payload = (await response.json()) as ThreadResponse;
      if (requestId !== threadRequestRef.current) return;

      const nextMessages = payload.messages ?? [];
      setMessages((current) => (sameMessages(current, nextMessages) ? current : nextMessages));
      const shouldMarkRead = payload.conversation.unreadCount > 0;
      setConversations((current) =>
        current.map((conversation) =>
          conversation.id === payload.conversation.id
            ? {
                ...conversation,
                ...payload.conversation,
                unreadCount: shouldMarkRead ? 0 : payload.conversation.unreadCount,
              }
            : conversation,
        ),
      );

      if (shouldMarkRead) {
        void fetch(`/api/messages/${conversationId}/read`, { method: 'POST' }).then(() => {
          window.dispatchEvent(new Event(REFRESH_MESSAGES_UNREAD_EVENT));
        });
      }
    } catch {
      if (!quiet && requestId === threadRequestRef.current) {
        setThreadError('This conversation could not be loaded.');
      }
    } finally {
      if (requestId === threadRequestRef.current) setThreadLoading(false);
    }
  }, []);

  useEffect(() => {
    const handleOpen = (event: Event) => {
      event.preventDefault();
      const detail = (event as CustomEvent<OpenMessagesDetail>).detail;
      requestedConversationRef.current = detail?.conversationId ?? null;
      if (detail?.conversationId) {
        threadRequestRef.current += 1;
        lastScrolledMessageIdRef.current = null;
        setMessages([]);
        setActiveId(detail.conversationId);
        setMobileListVisible(false);
      } else {
        setMobileListVisible(true);
      }
      setOpen(true);
    };

    window.addEventListener(OPEN_MESSAGES_EVENT, handleOpen);
    if (window.location.pathname === '/messages') {
      const requested = new URLSearchParams(window.location.search).get('conversation');
      if (
        requested &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(requested)
      ) {
        handleOpen(new CustomEvent(OPEN_MESSAGES_EVENT, { detail: { conversationId: requested } }));
      }
    }
    return () => window.removeEventListener(OPEN_MESSAGES_EVENT, handleOpen);
  }, []);

  useEffect(() => {
    if (!open) return;
    void loadInbox(requestedConversationRef.current);
  }, [loadInbox, open]);

  useEffect(() => {
    if (!open || !activeId) return;

    const initialTimer = window.setTimeout(() => void loadThread(activeId), 0);
    const threadRefreshTimer = window.setInterval(() => {
      void loadThread(activeId, true);
    }, 20_000);
    const inboxRefreshTimer = window.setInterval(() => void loadInbox(activeId), 60_000);

    return () => {
      window.clearTimeout(initialTimer);
      window.clearInterval(threadRefreshTimer);
      window.clearInterval(inboxRefreshTimer);
    };
  }, [activeId, loadInbox, loadThread, open]);

  useEffect(() => {
    if (!open) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`messages:${viewerId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const conversationId = (payload.new as { conversation_id?: string }).conversation_id;
          void loadInbox(activeId);
          if (conversationId && conversationId === activeId) {
            void loadThread(activeId, true);
          }
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [activeId, loadInbox, loadThread, open, viewerId]);

  useEffect(() => {
    if (!open || messages.length === 0) return;

    const lastMessageId = messages.at(-1)?.id ?? null;
    if (!lastMessageId || lastMessageId === lastScrolledMessageIdRef.current) return;
    const behavior = lastScrolledMessageIdRef.current ? 'smooth' : 'auto';
    lastScrolledMessageIdRef.current = lastMessageId;
    const scroller = threadEndRef.current?.parentElement;
    scroller?.scrollTo({ top: scroller.scrollHeight, behavior });
  }, [messages, open]);

  const chooseConversation = (conversationId: string) => {
    threadRequestRef.current += 1;
    requestedConversationRef.current = conversationId;
    lastScrolledMessageIdRef.current = null;
    setMessages([]);
    setActiveId(conversationId);
    setMobileListVisible(false);
  };

  const handleSent = (message: ConversationMessage) => {
    setMessages((current) => [
      ...current.filter((item) => !item.id.startsWith('pending:') && item.id !== message.id),
      message,
    ]);
    void loadInbox(message.conversationId);
  };

  const handleOptimistic = (message: ConversationMessage) => {
    setMessages((current) => [...current, message]);
  };

  const handleSendError = (pendingId: string, message: string) => {
    setMessages((current) => current.filter((item) => item.id !== pendingId));
    setThreadError(message);
  };

  const handleRated = (conversationId: string, rating: number) => {
    setConversations((current) =>
      current.map((conversation) =>
        conversation.id === conversationId ? { ...conversation, sellerRating: rating } : conversation,
      ),
    );
  };

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) threadRequestRef.current += 1;
        setOpen(nextOpen);
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[70] bg-[#02050a]/72 backdrop-blur-[5px] data-[state=closed]:animate-out data-[state=open]:animate-in" />
        <Dialog.Content
          ref={dockRef}
          aria-describedby={undefined}
          className="um-messages-dock fixed inset-0 z-[80] overflow-hidden border-white/[0.09] bg-[#07101a]/96 text-white shadow-[0_40px_120px_rgba(0,0,0,0.58)] focus:outline-none sm:inset-y-4 sm:left-auto sm:right-4 sm:w-[min(58rem,calc(100vw-2rem))] sm:rounded-[1.35rem] sm:border"
        >
          <Dialog.Title className="sr-only">Messages</Dialog.Title>
          <div className="grid h-full min-h-0 sm:grid-cols-[19rem_minmax(0,1fr)]">
            <aside
              className={cn(
                'min-h-0 border-white/[0.07] bg-[#09131e]/94 sm:flex sm:flex-col sm:border-r',
                mobileListVisible ? 'flex flex-col' : 'hidden',
              )}
            >
              <div className="flex h-[4.6rem] shrink-0 items-center justify-between border-b border-white/[0.08] px-5">
                <div>
                  <p className="font-condensed text-[0.65rem] font-bold uppercase tracking-[0.18em] text-um-gold-300">
                    Trovun
                  </p>
                  <h2 className="mt-0.5 text-lg font-bold tracking-[-0.035em]">Messages</h2>
                </div>
                <Dialog.Close
                  aria-label="Close messages"
                  className="grid size-10 place-items-center rounded-full text-white/48 transition hover:bg-white/[0.07] hover:text-white focus-visible:ring-2 focus-visible:ring-um-gold-400 sm:hidden"
                >
                  <X className="size-[1.15rem]" aria-hidden="true" />
                </Dialog.Close>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 py-2.5">
                {inboxLoading && conversations.length === 0 ? <InboxSkeleton /> : null}
                {inboxError && conversations.length === 0 ? (
                  <CompactNotice>{inboxError}</CompactNotice>
                ) : null}
                {!inboxLoading && !inboxError && conversations.length === 0 ? (
                  <div className="grid min-h-64 place-items-center px-6 text-center">
                    <div>
                      <MessageCircle
                        className="mx-auto size-6 text-um-gold-300"
                        aria-hidden="true"
                      />
                      <p className="mt-3 text-sm font-semibold">No conversations yet</p>
                      <p className="mt-1 text-xs leading-5 text-white/42">
                        Open a listing and message its seller.
                      </p>
                    </div>
                  </div>
                ) : null}

                <div className="space-y-1">
                  {conversations.map((conversation) => (
                    <ConversationRow
                      active={conversation.id === activeId}
                      conversation={conversation}
                      key={conversation.id}
                      onSelect={chooseConversation}
                    />
                  ))}
                </div>
              </div>
            </aside>

            <section
              className={cn(
                'min-h-0 bg-[radial-gradient(circle_at_72%_0%,rgba(231,188,53,0.065),transparent_24rem),radial-gradient(circle_at_15%_100%,rgba(25,83,132,0.12),transparent_28rem),#07101a] sm:flex sm:flex-col',
                mobileListVisible ? 'hidden' : 'flex flex-col',
              )}
            >
              {activeConversation && activeId ? (
                <>
                  <ConversationHeader
                    conversation={activeConversation}
                    onBack={() => setMobileListVisible(true)}
                    onNavigate={() => setOpen(false)}
                  />
                  <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-6 sm:px-7">
                    {threadLoading ? <ThreadSkeleton /> : null}
                    {threadError && messages.length === 0 ? (
                      <CompactNotice>{threadError}</CompactNotice>
                    ) : null}
                    {!threadLoading && messages.length === 0 && !threadError ? (
                      <div className="grid h-full min-h-64 place-items-center text-center">
                        <div className="max-w-xs">
                          <span className="mx-auto grid size-11 place-items-center rounded-full border border-um-gold-400/25 bg-um-gold-400/[0.08] text-um-gold-300">
                            <MessageCircle className="size-5" aria-hidden="true" />
                          </span>
                          <p className="mt-4 text-sm font-semibold">Start with a simple hello.</p>
                          <p className="mt-1.5 text-xs leading-5 text-white/42">
                            Keep pickup details inside the conversation.
                          </p>
                        </div>
                      </div>
                    ) : null}

                    <div className="mx-auto flex max-w-2xl flex-col gap-2.5">
                      {messages.map((message) => (
                        <MessageBubble
                          key={message.id}
                          message={message}
                          own={message.senderId === viewerId}
                        />
                      ))}
                      <div ref={threadEndRef} />
                    </div>
                  </div>
                  {threadError && messages.length > 0 ? (
                    <p
                      className="mx-4 mb-2 rounded-[0.65rem] border border-red-300/15 bg-red-400/[0.07] px-3 py-2 text-xs text-red-100 sm:mx-5"
                      role="alert"
                    >
                      {threadError}
                    </p>
                  ) : null}
                  {activeConversation.participantRole === 'buyer' &&
                  activeConversation.listingStatus === 'sold' ? (
                    <SellerRatingPanel
                      conversation={activeConversation}
                      onRated={handleRated}
                    />
                  ) : null}
                  <MessageComposer
                    conversationId={activeId}
                    key={activeId}
                    onError={handleSendError}
                    onOptimistic={handleOptimistic}
                    onSent={handleSent}
                    viewerId={viewerId}
                  />
                </>
              ) : (
                <div className="relative grid h-full place-items-center px-8 text-center">
                  <Dialog.Close
                    aria-label="Close messages"
                    className="absolute right-5 top-5 hidden size-10 place-items-center rounded-full text-white/48 transition hover:bg-white/[0.07] hover:text-white sm:grid"
                  >
                    <X className="size-[1.15rem]" aria-hidden="true" />
                  </Dialog.Close>
                  <div>
                    <span className="mx-auto grid size-12 place-items-center rounded-full border border-white/[0.09] bg-white/[0.035] text-um-gold-300">
                      <MessageCircle className="size-5" aria-hidden="true" />
                    </span>
                    <p className="mt-4 font-semibold">Your conversations live here.</p>
                  </div>
                </div>
              )}
            </section>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function SellerRatingPanel({
  conversation,
  onRated,
}: {
  conversation: ConversationSummary;
  onRated: (conversationId: string, rating: number) => void;
}) {
  const [submitting, setSubmitting] = useState<number | null>(null);
  const [error, setError] = useState('');

  const rate = async (rating: number) => {
    setSubmitting(rating);
    setError('');
    try {
      const response = await fetch(`/api/messages/${conversation.id}/rating`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating }),
      });
      if (!response.ok) throw new Error('rating');
      const payload = (await response.json()) as { rating: number };
      onRated(conversation.id, payload.rating);
    } catch {
      setError('Your rating could not be saved. Please try again.');
    } finally {
      setSubmitting(null);
    }
  };

  return (
    <section
      aria-label="Rate seller"
      className="mx-4 mb-3 rounded-[0.9rem] border border-um-gold-300/20 bg-um-gold-300/[0.065] px-4 py-3 sm:mx-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-white">
            {conversation.sellerRating ? 'Thanks for rating the seller' : 'How was the seller?'}
          </p>
          <p className="mt-0.5 text-xs text-white/44">
            {conversation.sellerRating
              ? `You rated ${conversation.counterpartName} ${conversation.sellerRating} out of 5.`
              : `Rate your completed purchase from ${conversation.counterpartName}.`}
          </p>
        </div>
        <div className="flex items-center gap-1" role="group" aria-label="Seller rating">
          {[1, 2, 3, 4, 5].map((rating) => {
            const selected = rating <= (conversation.sellerRating ?? 0);
            return (
              <button
                aria-label={`Rate seller ${rating} out of 5`}
                className="grid size-10 place-items-center rounded-full text-um-gold-300 transition hover:bg-white/[0.08] focus-visible:ring-2 focus-visible:ring-um-gold-300 disabled:opacity-50"
                disabled={submitting !== null}
                key={rating}
                onClick={() => void rate(rating)}
                type="button"
              >
                {submitting === rating ? (
                  <LoaderCircle aria-hidden="true" className="size-5 animate-spin" />
                ) : (
                  <Star
                    aria-hidden="true"
                    className="size-5"
                    fill={selected ? 'currentColor' : 'none'}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>
      {error ? (
        <p className="mt-2 text-xs font-medium text-red-200" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}

function ConversationRow({
  active,
  conversation,
  onSelect,
}: {
  active: boolean;
  conversation: ConversationSummary;
  onSelect: (conversationId: string) => void;
}) {
  return (
    <button
      aria-current={active ? 'true' : undefined}
      className={cn(
        'group flex w-full items-center gap-3 rounded-[0.9rem] px-3 py-3 text-left transition duration-160 ease-um-out',
        active ? 'bg-white/[0.08]' : 'hover:bg-white/[0.045]',
      )}
      onClick={() => onSelect(conversation.id)}
      type="button"
    >
      <ListingThumb conversation={conversation} size="md" />
      <span className="min-w-0 flex-1">
        <span className="flex items-center justify-between gap-2">
          <span className="truncate text-sm font-bold tracking-[-0.02em] text-white">
            {conversation.listingTitle}
          </span>
          {conversation.unreadCount > 0 ? (
            <span className="grid min-w-5 place-items-center rounded-full bg-um-gold-400 px-1.5 py-0.5 text-[0.62rem] font-black tabular-nums text-um-ink-950">
              {Math.min(conversation.unreadCount, 99)}
            </span>
          ) : null}
        </span>
        <span className="mt-1 block truncate text-xs font-medium text-white/48">
          {conversation.counterpartName}
        </span>
        <span className="mt-1 block truncate text-xs text-white/34">
          {conversation.lastMessage?.body ?? 'New conversation'}
        </span>
      </span>
    </button>
  );
}

function ConversationHeader({
  conversation,
  onBack,
  onNavigate,
}: {
  conversation: ConversationSummary;
  onBack: () => void;
  onNavigate: () => void;
}) {
  const linked = Boolean(conversation.listingId && conversation.listingStatus === 'published');
  const listingContent = (
    <>
      <ListingThumb conversation={conversation} size="sm" />
      <span className="min-w-0">
        <span className="block truncate text-sm font-bold tracking-[-0.025em] text-white">
          {conversation.listingTitle}
        </span>
        <span className="mt-0.5 block truncate text-xs text-white/38">
          {linked ? 'View listing' : 'Listing unavailable'}
        </span>
      </span>
      {linked ? (
        <ArrowUpRight className="ml-auto size-4 shrink-0 text-white/38" aria-hidden="true" />
      ) : null}
    </>
  );

  return (
    <header className="flex h-[4.6rem] shrink-0 items-center gap-3 border-b border-white/[0.08] px-3 sm:px-5">
      <button
        aria-label="Back to conversations"
        className="grid size-10 shrink-0 place-items-center rounded-full text-white/50 transition hover:bg-white/[0.07] hover:text-white sm:hidden"
        onClick={onBack}
        type="button"
      >
        <ArrowLeft className="size-[1.1rem]" aria-hidden="true" />
      </button>

      {linked && conversation.listingId ? (
        <Link
          className="flex min-w-0 flex-1 items-center gap-3 rounded-[0.7rem] p-1.5 transition hover:bg-white/[0.045] focus-visible:ring-2 focus-visible:ring-um-gold-400"
          href={`/listings/${conversation.listingId}`}
          onClick={onNavigate}
        >
          {listingContent}
        </Link>
      ) : (
        <div className="flex min-w-0 flex-1 items-center gap-3 p-1.5">{listingContent}</div>
      )}

      <Link
        aria-label={`View ${conversation.counterpartName}'s profile`}
        className="group/profile flex h-10 shrink-0 items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.035] px-3 text-xs font-semibold text-white/58 transition hover:border-um-gold-300/28 hover:bg-um-gold-300/[0.08] hover:text-white focus-visible:ring-2 focus-visible:ring-um-gold-400"
        href={`/profile/${conversation.counterpartId}`}
        title={`View ${conversation.counterpartName}'s profile`}
        onClick={onNavigate}
      >
        <UserRound className="size-3.5 text-um-gold-300" aria-hidden="true" />
        <span className="md:hidden">Profile</span>
        <span className="hidden max-w-28 truncate md:block">{conversation.counterpartName}</span>
      </Link>

      <Dialog.Close
        aria-label="Close messages"
        className="hidden size-10 shrink-0 place-items-center rounded-full text-white/48 transition hover:bg-white/[0.07] hover:text-white focus-visible:ring-2 focus-visible:ring-um-gold-400 sm:grid"
      >
        <X className="size-[1.15rem]" aria-hidden="true" />
      </Dialog.Close>
    </header>
  );
}

function ListingThumb({
  conversation,
  size,
}: {
  conversation: ConversationSummary;
  size: 'sm' | 'md';
}) {
  return (
    <span
      className={cn(
        'relative grid shrink-0 place-items-center overflow-hidden rounded-[0.65rem] bg-white/[0.06] text-um-gold-300 ring-1 ring-white/[0.09]',
        size === 'sm' ? 'size-10' : 'size-12',
      )}
    >
      {conversation.coverUrl ? (
        <Image
          alt=""
          className="object-cover"
          fill
          sizes={size === 'sm' ? '40px' : '48px'}
          src={conversation.coverUrl}
          unoptimized
        />
      ) : (
        <MessageCircle className="size-4" aria-hidden="true" />
      )}
    </span>
  );
}

function MessageBubble({ message, own }: { message: ConversationMessage; own: boolean }) {
  const pending = message.id.startsWith('pending:');

  return (
    <div className={cn('flex', own ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[82%] rounded-[1.15rem] px-4 py-2.5 text-sm leading-6 shadow-[0_8px_24px_rgba(0,0,0,0.12)]',
          own
            ? 'rounded-br-[0.35rem] bg-um-gold-300 text-um-ink-950'
            : 'rounded-bl-[0.35rem] bg-white/[0.075] text-white/86 ring-1 ring-white/[0.06]',
        )}
      >
        <p className="whitespace-pre-wrap break-words">{message.body}</p>
        <p
          className={cn(
            'mt-0.5 flex items-center justify-end gap-1 text-[0.6rem] tabular-nums',
            own ? 'text-um-ink-950/45' : 'text-white/30',
          )}
        >
          {formatMessageTime(message.createdAt)}
          {own ? (
            pending ? (
              <LoaderCircle className="size-2.5 animate-spin" aria-label="Sending" />
            ) : (
              <Check className="size-2.5" aria-label="Sent" />
            )
          ) : null}
        </p>
      </div>
    </div>
  );
}

function MessageComposer({
  conversationId,
  onError,
  onOptimistic,
  onSent,
  viewerId,
}: {
  conversationId: string;
  onError: (pendingId: string, message: string) => void;
  onOptimistic: (message: ConversationMessage) => void;
  onSent: (message: ConversationMessage) => void;
  viewerId: string;
}) {
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const submit = async (event?: FormEvent) => {
    event?.preventDefault();
    const trimmed = body.trim();
    if (!trimmed || sending) return;

    const pendingId = `pending:${crypto.randomUUID()}`;
    const pendingMessage: ConversationMessage = {
      id: pendingId,
      conversationId,
      senderId: viewerId,
      body: trimmed,
      createdAt: new Date().toISOString(),
    };

    setBody('');
    setSending(true);
    onOptimistic(pendingMessage);

    try {
      const response = await fetch(`/api/messages/${conversationId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: trimmed }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error || 'Message could not be sent.');
      }

      const payload = (await response.json()) as { message: ConversationMessage };
      onSent(payload.message);
    } catch (error) {
      onError(pendingId, error instanceof Error ? error.message : 'Message could not be sent.');
      setBody((current) => (current.trim() ? current : trimmed));
    } finally {
      setSending(false);
      textareaRef.current?.focus();
    }
  };

  return (
    <form
      className="shrink-0 border-t border-white/[0.08] bg-[#0a0f17]/95 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl sm:px-5 sm:pb-4"
      onSubmit={submit}
    >
      <div className="mx-auto flex max-w-2xl items-end gap-2 rounded-[1.15rem] border border-white/[0.1] bg-white/[0.055] p-1.5 transition focus-within:border-um-gold-400/55 focus-within:bg-white/[0.075]">
        <label className="sr-only" htmlFor="message-composer">
          Message
        </label>
        <textarea
          className="max-h-32 min-h-10 min-w-0 flex-1 resize-none bg-transparent px-3 py-2 text-base leading-6 text-white outline-none placeholder:text-white/30 sm:text-sm"
          id="message-composer"
          maxLength={2000}
          onChange={(event) => setBody(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              void submit();
            }
          }}
          placeholder="Write a message"
          ref={textareaRef}
          rows={1}
          value={body}
        />
        <button
          aria-label="Send message"
          className="grid size-10 shrink-0 place-items-center rounded-full bg-um-gold-300 text-um-ink-950 transition hover:bg-um-gold-200 disabled:cursor-not-allowed disabled:opacity-35"
          disabled={!body.trim() || sending}
          type="submit"
        >
          {sending ? (
            <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <Send className="size-4" aria-hidden="true" />
          )}
        </button>
      </div>
    </form>
  );
}

function InboxSkeleton() {
  return (
    <div className="space-y-2 px-2 py-1" aria-label="Loading conversations" role="status">
      {[0, 1, 2].map((item) => (
        <div className="flex animate-pulse items-center gap-3 px-1 py-2" key={item}>
          <span className="size-12 rounded-[0.65rem] bg-white/[0.06]" />
          <span className="flex-1 space-y-2">
            <span className="block h-3 w-4/5 rounded-full bg-white/[0.07]" />
            <span className="block h-2.5 w-1/2 rounded-full bg-white/[0.05]" />
          </span>
        </div>
      ))}
    </div>
  );
}

function ThreadSkeleton() {
  return (
    <div
      className="mx-auto max-w-2xl animate-pulse space-y-3"
      aria-label="Loading messages"
      role="status"
    >
      <div className="h-12 w-3/5 rounded-[1rem] bg-white/[0.055]" />
      <div className="ml-auto h-16 w-2/3 rounded-[1rem] bg-um-gold-300/15" />
      <div className="h-10 w-2/5 rounded-[1rem] bg-white/[0.055]" />
    </div>
  );
}

function CompactNotice({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="m-3 rounded-[0.8rem] border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-xs leading-5 text-white/55"
      role="status"
    >
      {children}
    </p>
  );
}

function formatMessageTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-CA', { hour: 'numeric', minute: '2-digit' }).format(date);
}

function sameMessages(current: ConversationMessage[], next: ConversationMessage[]) {
  return (
    current.length === next.length &&
    current.every(
      (message, index) =>
        message.id === next[index]?.id &&
        message.body === next[index]?.body &&
        message.createdAt === next[index]?.createdAt,
    )
  );
}
