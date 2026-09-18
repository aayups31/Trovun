import { describe, expect, it } from 'vitest';
import { marketplaceSearchGroups, marketplaceTermFilter, relatedMarketplaceTerms } from './search';

describe('marketplace related search', () => {
  it('finds equivalent item names while preserving modifiers as separate requirements', () => {
    const [colour, item] = marketplaceSearchGroups('red couch');
    expect(colour).toEqual(['red']);
    expect(item).toEqual(expect.arrayContaining(['couch', 'sofa', 'loveseat']));
  });
  it('understands student item vocabulary in both directions', () => {
    expect(relatedMarketplaceTerms('MacBook')).toContain('laptop');
    expect(relatedMarketplaceTerms('laptop')).toContain('macbook');
    expect(relatedMarketplaceTerms('textbooks')).toContain('books');
  });
  it('does not invent relations for an unknown item or expand a substring', () => {
    expect(marketplaceSearchGroups('lampstand')).toEqual([['lampstand']]);
    expect(relatedMarketplaceTerms('')).toEqual([]);
  });
  it('bounds expansion and strips filter syntax from user terms', () => {
    expect(
      relatedMarketplaceTerms('laptop monitor phone book chair bike').length,
    ).toBeLessThanOrEqual(24);
    expect(marketplaceTermFilter('couch%,id.eq.anything')).not.toContain(',id.eq.');
    expect(marketplaceSearchGroups('THE couch and sofa')).toHaveLength(2);
  });
});
