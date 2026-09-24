import { afterEach, describe, expect, it, vi } from 'vitest';
import { assistMarketplace } from './server';
import { assistanceInput, minimizeText } from './contracts';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
describe('marketplace AI boundaries', () => {
  it('limits inputs and removes obvious contact information', () => {
    expect(
      assistanceInput.safeParse({
        purpose: 'listing',
        title: 'Monitor',
        description: 'x'.repeat(5001),
      }).success,
    ).toBe(false);
    expect(minimizeText('a@uwaterloo.ca 519-555-1234 https://example.com')).toBe(
      '[email removed] [phone removed] [link removed]',
    );
  });
  it('sends minimized text with no stored history and validates the response', async () => {
    vi.stubEnv('OPENAI_API_KEY', 'test-key');
    const expected = {
      title: 'Monitor',
      description: 'Scratched screen.',
      checks: ['Confirm the model.'],
      concerns: [],
      categoryId: null,
      suggestedPriceCents: null,
      priceReason: 'Confirm the model before estimating.',
      blocked: false,
    };
    const fetcher = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          status: 'completed',
          output: [{ content: [{ type: 'output_text', text: JSON.stringify(expected) }] }],
        }),
      ),
    );
    vi.stubGlobal('fetch', fetcher);
    expect(
      await assistMarketplace({
        purpose: 'listing',
        title: 'Monitor',
        description: 'Scratched screen. me@uwaterloo.ca',
      }),
    ).toEqual(expected);
    const body = JSON.parse(fetcher.mock.calls[0][1].body);
    expect(body.store).toBe(false);
    expect(body.input).not.toContain('me@uwaterloo.ca');
    expect(body.max_output_tokens).toBe(1200);
    expect(body.tools).toBeUndefined();
    expect(body.instructions).toContain('No pornography or explicit sexual media');
    expect(body.instructions).toContain('No homemade, unpackaged');
    expect(body.instructions).toContain('Only shelf-stable food');
    expect(body.instructions).toContain('Examples are not exhaustive');
  });
  it('does not accept truncated output or expose upstream errors', async () => {
    vi.stubEnv('OPENAI_API_KEY', 'test-key');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ status: 'incomplete', output: [] }))),
    );
    await expect(
      assistMarketplace({ purpose: 'buyer', title: 'Chair', description: '' }),
    ).rejects.toThrow('AI incomplete');
  });
});
