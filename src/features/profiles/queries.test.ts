import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ createClient: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/supabase/server', () => ({ createClient: mocks.createClient }));
import { getPublicStudentProfile } from './queries';

const id = '61000000-0000-4000-8000-000000000001';
function setup(counterpart: { counterpart_id: string; counterpart_name: string } | null) {
  const queries: { table: string; column?: string; value?: string }[] = [];
  mocks.createClient.mockResolvedValue({
    from: (table: string) => {
      const query: (typeof queries)[number] = { table };
      queries.push(query);
      const response = {
        error: null,
        data:
          table === 'inbox_conversations'
            ? counterpart
            : table === 'marketplace_listings'
              ? []
              : null,
      };
      return {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue(response),
        eq: vi.fn().mockImplementation(function (this: unknown, column: string, value: string) {
          query.column = column;
          query.value = value;
          return this;
        }),
        then: (resolve: (value: typeof response) => unknown) =>
          Promise.resolve(response).then(resolve),
      };
    },
  });
  return queries;
}

describe('profiles opened from messages', () => {
  beforeEach(() => vi.clearAllMocks());
  it('shows the existing chat identity when a buyer has no public seller profile', async () => {
    const queries = setup({ counterpart_id: id, counterpart_name: 'Alex W.' });
    const profile = await getPublicStudentProfile(id);
    expect(profile).toMatchObject({
      name: 'Alex W.',
      email: null,
      program: null,
      joinedAt: null,
      listings: [],
    });
    expect(queries).toContainEqual({
      table: 'inbox_conversations',
      column: 'counterpart_id',
      value: id,
    });
    expect(queries.some((query) => query.table === 'profiles')).toBe(false);
  });
  it('does not expose an unrelated student without a public profile', async () => {
    setup(null);
    expect(await getPublicStudentProfile(id)).toBeNull();
  });
  it('rejects invalid profile identifiers without querying the database', async () => {
    expect(await getPublicStudentProfile('../private')).toBeNull();
    expect(mocks.createClient).not.toHaveBeenCalled();
  });
});
