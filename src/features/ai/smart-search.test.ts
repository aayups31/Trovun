import { afterEach, describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
const provider = vi.hoisted(() => vi.fn());
vi.mock('./provider', () => ({ structuredResponse: provider }));
import { smartSearch } from './smart-search';

afterEach(() => vi.clearAllMocks());
describe('smart search', () => {
  it('enforces interpreted prices and category in the real database query', async () => {
    provider.mockResolvedValue({
      terms: ['desk'],
      minPriceCents: 1000,
      maxPriceCents: 8000,
      note: 'Check dimensions.',
    });
    const chain = {
      select: vi.fn(),
      order: vi.fn(),
      limit: vi.fn(),
      or: vi.fn(),
      eq: vi.fn(),
      lte: vi.fn(),
      gte: vi.fn(),
      then: (resolve: (x: unknown) => void) =>
        resolve({ data: [{ id: 'actual-row' }], error: null }),
    };
    for (const key of ['select', 'order', 'limit', 'or', 'eq', 'lte', 'gte'] as const)
      chain[key].mockReturnValue(chain);
    const db = { from: vi.fn().mockReturnValue(chain) };
    const result = await smartSearch(db as unknown as SupabaseClient, {
      purpose: 'search',
      query: 'desk between $10 and $80',
      category: 'furniture',
    });
    expect(chain.gte).toHaveBeenCalledWith('price_cents', 1000);
    expect(chain.lte).toHaveBeenCalledWith('price_cents', 8000);
    expect(chain.eq).toHaveBeenCalledWith('category_slug', 'furniture');
    expect(result.listings).toEqual([{ id: 'actual-row' }]);
    expect(chain.limit).toHaveBeenCalledWith(8);
  });
  it('rejects inverted price ranges before querying listings', async () => {
    provider.mockResolvedValue({
      terms: ['desk'],
      minPriceCents: 8000,
      maxPriceCents: 1000,
      note: '',
    });
    const db = { from: vi.fn() };
    await expect(
      smartSearch(db as unknown as SupabaseClient, { purpose: 'search', query: 'desk' }),
    ).rejects.toThrow('Invalid price range');
    expect(db.from).not.toHaveBeenCalled();
  });
  it('does not send contact information in a search prompt', async () => {
    provider.mockResolvedValue({ terms: [], minPriceCents: null, maxPriceCents: null, note: '' });
    await expect(
      smartSearch({} as SupabaseClient, { purpose: 'search', query: 'desk email a@uwaterloo.ca' }),
    ).rejects.toThrow();
    expect(provider.mock.calls[0][1]).not.toContain('a@uwaterloo.ca');
  });
});
