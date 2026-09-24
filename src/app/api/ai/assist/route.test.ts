import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({
  viewer: vi.fn(),
  rpc: vi.fn(),
  assist: vi.fn(),
  from: vi.fn(),
  photos: vi.fn(),
  search: vi.fn(),
}));
vi.mock('@/lib/auth/session', () => ({ getViewer: mocks.viewer }));
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({ rpc: mocks.rpc, from: mocks.from }),
}));
vi.mock('@/features/ai/server', () => ({ assistMarketplace: mocks.assist }));
vi.mock('@/features/ai/photos', () => ({ listingPhotoUrls: mocks.photos }));
vi.mock('@/features/ai/smart-search', () => ({ smartSearch: mocks.search }));
import { POST } from './route';
const request = (
  origin = 'https://trovun.com',
  body: unknown = { purpose: 'listing', title: 'Chair', description: 'Used.' },
) =>
  new Request('https://trovun.com/api/ai/assist', {
    method: 'POST',
    headers: { origin },
    body: JSON.stringify(body),
  });
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('OPENAI_API_KEY', 'test-key');
  mocks.viewer.mockResolvedValue({
    id: 'user',
    profile: { role: 'student', email_verified: true, onboarding_completed_at: 'today' },
  });
  mocks.rpc.mockResolvedValue({ data: true, error: null });
  mocks.assist.mockResolvedValue({ title: 'Chair' });
  const categories = {
    select: vi.fn(),
    eq: vi.fn(),
    order: vi.fn().mockResolvedValue({ data: [{ id: 1, name: 'Books' }], error: null }),
  };
  categories.select.mockReturnValue(categories);
  categories.eq.mockReturnValue(categories);
  mocks.from.mockReturnValue(categories);
});
afterEach(() => vi.unstubAllEnvs());
describe('AI endpoint permissions and budget', () => {
  it('rejects cross-origin requests before using the provider', async () => {
    expect((await POST(request('https://other.example'))).status).toBe(403);
    expect(mocks.assist).not.toHaveBeenCalled();
  });
  it('rejects anonymous callers', async () => {
    mocks.viewer.mockResolvedValue(null);
    expect((await POST(request())).status).toBe(401);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it('fails closed when the quota migration is missing', async () => {
    mocks.rpc.mockResolvedValue({ error: { message: 'Missing function' } });
    expect((await POST(request())).status).toBe(503);
    expect(mocks.assist).not.toHaveBeenCalled();
  });
  it('does not call OpenAI when the persistent budget is exhausted', async () => {
    mocks.rpc.mockResolvedValue({ data: false, error: null });
    expect((await POST(request())).status).toBe(429);
    expect(mocks.assist).not.toHaveBeenCalled();
  });
  it('accepts bounded authorized requests without caching', async () => {
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toContain('no-store');
    expect(mocks.assist).toHaveBeenCalledOnce();
  });
  it('denies another seller’s photos before signing or requesting AI', async () => {
    const chain = {
      select: vi.fn(),
      eq: vi.fn(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    };
    chain.select.mockReturnValue(chain);
    chain.eq.mockReturnValue(chain);
    mocks.from.mockReturnValue(chain);
    const response = await POST(
      request(undefined, {
        purpose: 'listing',
        title: '',
        description: '',
        includePhotos: true,
        listingId: 'b1234567-1234-4123-8123-123456789abc',
      }),
    );
    expect(response.status).toBe(404);
    expect(chain.eq).toHaveBeenCalledWith('seller_id', 'user');
    expect(mocks.photos).not.toHaveBeenCalled();
    expect(mocks.assist).not.toHaveBeenCalled();
  });
  it('uses the same allowance for smart search', async () => {
    mocks.rpc.mockResolvedValue({ data: false, error: null });
    const response = await POST(request(undefined, { purpose: 'search', query: 'desk under $80' }));
    expect(response.status).toBe(429);
    expect(mocks.search).not.toHaveBeenCalled();
  });
  it('grounds buyer answers in the current published listing, not supplied stale text', async () => {
    const chain = {
      select: vi.fn(),
      eq: vi.fn(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: {
          title: 'Current desk',
          description: 'Scratched top.',
          price_cents: 6000,
          condition: 'good',
        },
        error: null,
      }),
    };
    chain.select.mockReturnValue(chain);
    chain.eq.mockReturnValue(chain);
    mocks.from.mockReturnValue(chain);
    const response = await POST(
      request(undefined, {
        purpose: 'buyer',
        title: 'Stale title',
        description: 'Wrong description.',
        listingId: 'b1234567-1234-4123-8123-123456789abc',
        question: 'How much is it?',
      }),
    );
    expect(response.status).toBe(200);
    expect(chain.eq).toHaveBeenCalledWith('status', 'published');
    expect(mocks.assist).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Current desk', description: 'Scratched top.' }),
      [],
      { priceCents: 6000, condition: 'good' },
      [],
    );
  });
  it('rejects malformed JSON as a client error', async () => {
    const response = await POST(
      new Request('https://trovun.com/api/ai/assist', {
        method: 'POST',
        headers: { origin: 'https://trovun.com' },
        body: '{',
      }),
    );
    expect(response.status).toBe(400);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
});
