import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ createClient: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({ createClient: mocks.createClient }));
import { getMarketplacePage } from './queries';

function setup({ missingRpc = false, error = false, ids = ['second', 'first'], total = 30 } = {}) {
  const filters: string[] = [];
  const rows = [
    {
      id: 'first',
      title: 'MacBook',
      category_id: 1,
      category_slug: 'electronics',
      category_name: 'Electronics',
      seller_id: 'seller',
      seller_name: 'Sam',
      cover_image_path: null,
      price_cents: 100,
    },
    {
      id: 'second',
      title: 'Laptop',
      category_id: 1,
      category_slug: 'electronics',
      category_name: 'Electronics',
      seller_id: 'seller',
      seller_name: 'Sam',
      cover_image_path: null,
      price_cents: 200,
    },
  ];
  const makeBuilder = (table: string) => {
    const response =
      table === 'categories'
        ? {
            data: [{ id: 1, slug: 'electronics', name: 'Electronics', icon: null }],
            error: null,
            count: 1,
          }
        : { data: rows, error: null, count: 2 };
    const builder = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
      not: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      or: vi.fn((filter: string) => {
        filters.push(filter);
        return builder;
      }),
      then: (resolve: (value: typeof response) => unknown) =>
        Promise.resolve(response).then(resolve),
    };
    return builder;
  };
  const rpc = vi.fn().mockResolvedValue({
    data: missingRpc || error ? null : { ids, total },
    error: missingRpc ? { code: 'PGRST202' } : error ? { code: '42501' } : null,
  });
  mocks.createClient.mockResolvedValue({ from: makeBuilder, rpc });
  return { rpc, filters };
}

describe('marketplace ranked search', () => {
  beforeEach(() => vi.clearAllMocks());
  it('preserves relevance order, total, page offset, and explicit category scope', async () => {
    const { rpc } = setup();
    const page = await getMarketplacePage({ query: 'laptop', category: 'electronics', page: 2 });
    expect(page.listings.map((listing) => listing.id)).toEqual(['second', 'first']);
    expect(page.total).toBe(30);
    expect(page.totalPages).toBe(3);
    expect(rpc).toHaveBeenCalledWith(
      'search_marketplace',
      expect.objectContaining({
        p_offset: 12,
        p_limit: 12,
        p_category_slug: 'electronics',
        p_related_terms: expect.arrayContaining(['macbook']),
      }),
    );
  });
  it('retains the result count when requesting a page beyond the results', async () => {
    setup({ ids: [], total: 2 });
    const page = await getMarketplacePage({ query: 'laptop', page: 3 });
    expect(page.listings).toEqual([]);
    expect(page.total).toBe(2);
  });
  it('keeps related search working before the database migration is installed', async () => {
    const { filters } = setup({ missingRpc: true });
    const page = await getMarketplacePage({ query: 'red couch' });
    expect(page.listings).toHaveLength(2);
    expect(filters).toHaveLength(2);
    expect(filters[1]).toContain('title.ilike.%sofa%');
    expect(filters[0]).toContain('title.ilike.%red%');
  });
  it('does not hide a permission error behind a fallback', async () => {
    setup({ error: true });
    await expect(getMarketplacePage({ query: 'laptop' })).rejects.toThrow('We couldn’t load');
  });
  it('does not call ranked search for the ordinary browsing feed', async () => {
    const { rpc } = setup();
    await getMarketplacePage({ category: 'electronics' });
    expect(rpc).not.toHaveBeenCalled();
  });
});
