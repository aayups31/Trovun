import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  from: vi.fn(),
  provider: vi.fn(),
  photos: vi.fn(),
}));
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({ rpc: mocks.rpc, from: mocks.from }),
}));
vi.mock('./provider', () => ({ structuredResponse: mocks.provider }));
vi.mock('./photos', () => ({ listingPhotoUrls: mocks.photos }));
import { processListingReviews } from './moderation';

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('OPENAI_API_KEY', 'test');
  vi.stubEnv('SUPABASE_SECRET_KEY', 'test');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co');
  mocks.rpc.mockImplementation((name) =>
    Promise.resolve(
      name === 'claim_ai_listing_reviews'
        ? { data: [{ listing_id: 'listing', lease: 'owned-lease' }], error: null }
        : { error: null },
    ),
  );
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    maybeSingle: vi
      .fn()
      .mockResolvedValue({ data: { title: 'Chair', description: 'Wooden chair' }, error: null }),
  };
  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  mocks.from.mockReturnValue(query);
  mocks.photos.mockResolvedValue([]);
});
afterEach(() => vi.unstubAllEnvs());
describe('private advisory reviews', () => {
  it('stores flags through the leased queue without mutating a listing or account', async () => {
    const flags = [
      {
        category: 'unsafe_item',
        priority: 'normal',
        certainty: 'uncertain',
        evidence: 'Possible broken leg',
        reason: 'Check structural safety.',
      },
    ];
    mocks.provider.mockResolvedValue({ flags });
    expect(await processListingReviews()).toEqual({ checked: 1, failed: 0 });
    expect(mocks.rpc.mock.calls.map((call) => call[0])).toEqual([
      'claim_ai_listing_reviews',
      'finish_ai_listing_review',
    ]);
    expect(mocks.rpc).toHaveBeenLastCalledWith('finish_ai_listing_review', {
      p_id: 'listing',
      p_lease: 'owned-lease',
      p_flags: flags,
      p_success: true,
    });
    expect(mocks.from).toHaveBeenCalledExactlyOnceWith('listings');
  });
  it('retries provider failure rather than treating an unchecked listing as clear', async () => {
    mocks.provider.mockRejectedValue(new Error('timeout'));
    expect(await processListingReviews()).toEqual({ checked: 0, failed: 1 });
    expect(mocks.rpc).toHaveBeenLastCalledWith(
      'finish_ai_listing_review',
      expect.objectContaining({ p_success: false, p_flags: [] }),
    );
  });
  it('rejects malformed model flags', async () => {
    mocks.provider.mockResolvedValue({ flags: [{ action: 'ban' }] });
    expect(await processListingReviews()).toEqual({ checked: 0, failed: 1 });
    expect(mocks.rpc).toHaveBeenLastCalledWith(
      'finish_ai_listing_review',
      expect.objectContaining({ p_success: false }),
    );
  });
});
