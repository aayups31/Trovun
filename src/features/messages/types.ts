import type { ListingStatus } from '@/lib/supabase/database.types';

export type ConversationLastMessage = {
  id: string;
  senderId: string;
  body: string;
  createdAt: string;
};

export type ConversationSummary = {
  id: string;
  listingId: string | null;
  listingTitle: string;
  listingStatus: ListingStatus | null;
  coverUrl: string | null;
  counterpartId: string;
  counterpartName: string;
  participantRole: 'buyer' | 'seller';
  sellerRating: number | null;
  lastMessage: ConversationLastMessage | null;
  lastMessageBody: string | null;
  lastMessageSenderId: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
  createdAt: string;
};

export type ConversationMessage = {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  createdAt: string;
};
