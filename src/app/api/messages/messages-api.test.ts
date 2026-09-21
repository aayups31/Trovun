import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getMessageInbox: vi.fn(),
  getMessageUnreadCount: vi.fn(),
  getMessageThread: vi.fn(),
  markMessageConversationRead: vi.fn(),
  rateConversationSeller: vi.fn(),
  sendMessage: vi.fn(),
  startMessageConversation: vi.fn(),
}));

vi.mock('@/features/messages/queries', () => ({
  ...mocks,
  MessagingRequestError: class MessagingRequestError extends Error {
    readonly status: number;

    constructor(status: number, message: string) {
      super(message);
      this.status = status;
    }
  },
}));

import { GET as getInbox } from './route';
import { GET as getUnread } from './unread/route';
import { POST as startConversation } from './start/route';
import { GET as getThread, POST as postMessage } from './[id]/route';
import { POST as markRead } from './[id]/read/route';
import { POST as rateSeller } from './[id]/rating/route';

const conversationId = '71000000-0000-4000-8000-000000000001';
const listingId = '72000000-0000-4000-8000-000000000002';
const context = { params: Promise.resolve({ id: conversationId }) };

describe('messages API contract', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns the inbox and total unread count without cacheability', async () => {
    mocks.getMessageInbox.mockResolvedValue({ conversations: [], totalUnread: 2 });

    const response = await getInbox();

    expect(await response.json()).toEqual({ conversations: [], totalUnread: 2 });
    expect(response.headers.get('cache-control')).toContain('no-store');
  });

  it('returns a lightweight unread count', async () => {
    mocks.getMessageUnreadCount.mockResolvedValue(3);

    const response = await getUnread();

    expect(await response.json()).toEqual({ totalUnread: 3 });
    expect(response.headers.get('cache-control')).toContain('no-store');
  });

  it('starts one listing conversation', async () => {
    mocks.startMessageConversation.mockResolvedValue(conversationId);
    const request = jsonRequest('http://localhost:3000/api/messages/start', { listingId });

    const response = await startConversation(request);

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ conversationId });
    expect(mocks.startMessageConversation).toHaveBeenCalledWith({ listingId });
  });

  it('returns a thread and sends a message', async () => {
    mocks.getMessageThread.mockResolvedValue({
      conversation: { id: conversationId },
      messages: [],
    });
    mocks.sendMessage.mockResolvedValue({ id: 'message-1', body: 'Hello' });

    const threadResponse = await getThread(
      new Request(`http://localhost:3000/api/messages/${conversationId}`),
      context,
    );
    const sendResponse = await postMessage(
      jsonRequest(`http://localhost:3000/api/messages/${conversationId}`, { body: 'Hello' }),
      context,
    );

    expect(await threadResponse.json()).toEqual({
      conversation: { id: conversationId },
      messages: [],
    });
    expect(sendResponse.status).toBe(201);
    expect(await sendResponse.json()).toEqual({ message: { id: 'message-1', body: 'Hello' } });
    expect(mocks.sendMessage).toHaveBeenCalledWith(conversationId, { body: 'Hello' });
  });

  it('marks a thread read', async () => {
    mocks.markMessageConversationRead.mockResolvedValue('2026-07-22T12:00:00.000Z');

    const response = await markRead(
      new Request(`http://localhost:3000/api/messages/${conversationId}/read`, {
        method: 'POST',
        headers: { origin: 'http://localhost:3000' },
      }),
      context,
    );

    expect(await response.json()).toEqual({ readAt: '2026-07-22T12:00:00.000Z' });
  });

  it('submits a seller rating for the conversation', async () => {
    mocks.rateConversationSeller.mockResolvedValue(5);

    const response = await rateSeller(
      jsonRequest(`http://localhost:3000/api/messages/${conversationId}/rating`, { rating: 5 }),
      context,
    );

    expect(await response.json()).toEqual({ rating: 5 });
    expect(mocks.rateConversationSeller).toHaveBeenCalledWith(conversationId, { rating: 5 });
  });

  it('rejects a cross-origin write before it reaches the backend', async () => {
    const response = await startConversation(
      new Request('http://localhost:3000/api/messages/start', {
        method: 'POST',
        headers: { 'content-type': 'application/json', origin: 'https://malicious.example' },
        body: JSON.stringify({ listingId }),
      }),
    );

    expect(response.status).toBe(403);
    expect(mocks.startMessageConversation).not.toHaveBeenCalled();
  });
});

function jsonRequest(url: string, body: unknown) {
  return new Request(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: new URL(url).origin },
    body: JSON.stringify(body),
  });
}
