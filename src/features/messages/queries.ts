import 'server-only';

import type { PostgrestError } from '@supabase/supabase-js';

import { getViewer } from '@/lib/auth/session';
import type { Message, Tables } from '@/lib/supabase/database.types';
import { createClient } from '@/lib/supabase/server';

import {
  conversationIdSchema,
  listingConversationSchema,
  sellerRatingSchema,
  sendMessageSchema,
} from './schemas';
import type { ConversationMessage, ConversationSummary } from './types';

const LISTING_IMAGE_BUCKET = 'listing-images';
const INBOX_LIMIT = 100;
const THREAD_MESSAGE_LIMIT = 100;

type InboxRow = Tables<'inbox_conversations'>;
type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export class MessagingRequestError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'MessagingRequestError';
    this.status = status;
  }
}

export async function getMessageInbox(): Promise<{
  conversations: ConversationSummary[];
  totalUnread: number;
}> {
  const viewer = await requireMessagingViewer();
  const supabase = await createClient();
  const [inboxResult, unreadResult] = await Promise.all([
    supabase
      .from('inbox_conversations')
      .select('*')
      .order('last_message_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
      .limit(INBOX_LIMIT),
    supabase.rpc('get_unread_message_count', {}),
  ]);

  if (inboxResult.error) throw mapSupabaseError(inboxResult.error, 'Unable to load messages.');
  if (unreadResult.error) throw mapSupabaseError(unreadResult.error, 'Unable to load messages.');

  const rows = (inboxResult.data ?? []) as InboxRow[];
  const covers = await signCoverImages(
    supabase,
    rows.flatMap((row) =>
      row.cover_image_path && row.listing_status !== 'removed' ? [row.cover_image_path] : [],
    ),
  );

  return {
    conversations: rows.map((row) => mapConversation(row, viewer.id, covers)),
    totalUnread: Number(unreadResult.data ?? 0),
  };
}

export async function getMessageUnreadCount(): Promise<number> {
  await requireMessagingViewer();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('get_unread_message_count', {});

  if (error) throw mapSupabaseError(error, 'Unable to load unread messages.');
  return Number(data ?? 0);
}

export async function startMessageConversation(input: unknown): Promise<string> {
  await requireMessagingViewer();
  const parsed = listingConversationSchema.safeParse(input);
  if (!parsed.success) throw new MessagingRequestError(400, parsed.error.issues[0].message);

  const supabase = await createClient();
  const { data, error } = await supabase.rpc('start_listing_conversation', {
    p_listing_id: parsed.data.listingId,
  });

  if (error || !data) {
    throw error
      ? mapSupabaseError(error, 'Unable to start that conversation.')
      : new MessagingRequestError(500, 'Unable to start that conversation.');
  }

  return data.id;
}

export async function getMessageThread(conversationId: unknown): Promise<{
  conversation: ConversationSummary;
  messages: ConversationMessage[];
}> {
  const viewer = await requireMessagingViewer();
  const parsedId = conversationIdSchema.safeParse(conversationId);
  if (!parsedId.success) throw new MessagingRequestError(400, parsedId.error.issues[0].message);

  const supabase = await createClient();
  const [conversationResult, messagesResult] = await Promise.all([
    supabase.from('inbox_conversations').select('*').eq('id', parsedId.data).maybeSingle(),
    supabase
      .from('messages')
      .select('id,conversation_id,sender_id,body,created_at')
      .eq('conversation_id', parsedId.data)
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(THREAD_MESSAGE_LIMIT),
  ]);

  if (conversationResult.error) {
    throw mapSupabaseError(conversationResult.error, 'Unable to load that conversation.');
  }
  if (!conversationResult.data) {
    throw new MessagingRequestError(404, 'That conversation is unavailable.');
  }
  if (messagesResult.error) {
    throw mapSupabaseError(messagesResult.error, 'Unable to load that conversation.');
  }

  const row = conversationResult.data as InboxRow;
  const covers = await signCoverImages(
    supabase,
    row.cover_image_path && row.listing_status !== 'removed' ? [row.cover_image_path] : [],
  );

  return {
    conversation: mapConversation(row, viewer.id, covers),
    messages: ((messagesResult.data ?? []) as Message[]).reverse().map(mapMessage),
  };
}

export async function sendMessage(
  conversationId: unknown,
  input: unknown,
): Promise<ConversationMessage> {
  await requireMessagingViewer();
  const parsedId = conversationIdSchema.safeParse(conversationId);
  if (!parsedId.success) throw new MessagingRequestError(400, parsedId.error.issues[0].message);
  const parsedBody = sendMessageSchema.safeParse(input);
  if (!parsedBody.success) {
    throw new MessagingRequestError(400, parsedBody.error.issues[0].message);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc('send_conversation_message', {
    p_body: parsedBody.data.body,
    p_conversation_id: parsedId.data,
  });

  if (error || !data) {
    throw error
      ? mapSupabaseError(error, 'Unable to send that message.')
      : new MessagingRequestError(500, 'Unable to send that message.');
  }

  return mapMessage(data);
}

export async function markMessageConversationRead(conversationId: unknown): Promise<string> {
  await requireMessagingViewer();
  const parsedId = conversationIdSchema.safeParse(conversationId);
  if (!parsedId.success) throw new MessagingRequestError(400, parsedId.error.issues[0].message);

  const supabase = await createClient();
  const { data, error } = await supabase.rpc('mark_conversation_read', {
    p_conversation_id: parsedId.data,
  });

  if (error || !data) {
    throw error
      ? mapSupabaseError(error, 'Unable to update that conversation.')
      : new MessagingRequestError(500, 'Unable to update that conversation.');
  }

  return data;
}

export async function rateConversationSeller(
  conversationId: unknown,
  input: unknown,
): Promise<number> {
  await requireMessagingViewer();
  const parsedId = conversationIdSchema.safeParse(conversationId);
  if (!parsedId.success) throw new MessagingRequestError(400, parsedId.error.issues[0].message);
  const parsedRating = sellerRatingSchema.safeParse(input);
  if (!parsedRating.success) {
    throw new MessagingRequestError(400, 'Choose a rating from one to five.');
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc('rate_seller', {
    p_conversation_id: parsedId.data,
    p_rating: parsedRating.data.rating,
  });

  if (error || !data) {
    throw error
      ? mapSupabaseError(error, 'Unable to save that rating.')
      : new MessagingRequestError(500, 'Unable to save that rating.');
  }

  return Number(data);
}

async function requireMessagingViewer() {
  const viewer = await getViewer();
  if (!viewer) throw new MessagingRequestError(401, 'Sign in to view messages.');
  if (
    viewer.profile.role !== 'student' ||
    !viewer.profile.email_verified ||
    !viewer.profile.onboarding_completed_at
  ) {
    throw new MessagingRequestError(403, 'Verified Waterloo student access is required.');
  }
  return viewer;
}

async function signCoverImages(client: SupabaseServerClient, paths: string[]) {
  const uniquePaths = [...new Set(paths)];
  if (uniquePaths.length === 0) return new Map<string, string>();

  const { data, error } = await client.storage
    .from(LISTING_IMAGE_BUCKET)
    .createSignedUrls(uniquePaths, 60 * 15);

  if (error || !data) return new Map<string, string>();

  const urls = new Map<string, string>();
  data.forEach((item, index) => {
    if (item.signedUrl) urls.set(item.path ?? uniquePaths[index], item.signedUrl);
  });
  return urls;
}

function mapConversation(
  row: InboxRow,
  viewerId: string,
  covers: Map<string, string>,
): ConversationSummary {
  const lastMessage =
    row.last_message_id &&
    row.last_message_sender_id &&
    row.last_message_body !== null &&
    row.last_message_created_at
      ? {
          id: row.last_message_id,
          senderId: row.last_message_sender_id,
          body: row.last_message_body,
          createdAt: row.last_message_created_at,
        }
      : null;

  return {
    id: row.id,
    listingId: row.listing_id,
    listingTitle: row.listing_title,
    listingStatus: row.listing_status,
    coverUrl:
      row.cover_image_path && row.listing_status !== 'removed'
        ? (covers.get(row.cover_image_path) ?? null)
        : null,
    counterpartId: row.counterpart_id,
    counterpartName: row.counterpart_name,
    participantRole: row.seller_id === viewerId ? 'seller' : 'buyer',
    sellerRating: row.seller_rating === null ? null : Number(row.seller_rating),
    lastMessage,
    lastMessageBody: lastMessage?.body ?? null,
    lastMessageSenderId: lastMessage?.senderId ?? null,
    lastMessageAt: row.last_message_at,
    unreadCount: Number(row.unread_count ?? 0),
    createdAt: row.created_at,
  };
}

function mapMessage(message: Message): ConversationMessage {
  return {
    id: message.id,
    conversationId: message.conversation_id,
    senderId: message.sender_id,
    body: message.body,
    createdAt: message.created_at,
  };
}

function mapSupabaseError(error: PostgrestError, fallback: string): MessagingRequestError {
  const message = error.message || fallback;
  if (error.code === 'P0002') return new MessagingRequestError(404, message);
  if (error.code === '42501') return new MessagingRequestError(403, message);
  if (error.code === '22023' || error.code === '23514') {
    return new MessagingRequestError(400, message);
  }
  if (error.code === 'P0001' && message.toLowerCase().includes('wait')) {
    return new MessagingRequestError(429, message);
  }

  console.error('[messages] Supabase operation failed', {
    code: error.code,
    details: error.details,
    hint: error.hint,
    message: error.message,
  });
  return new MessagingRequestError(500, fallback);
}
