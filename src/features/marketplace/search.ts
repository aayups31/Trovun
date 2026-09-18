import { marketplaceSearchTerms, normalizeMarketplaceQuery } from './url';

// Small, explicit vocabulary. Expand actual item names, never seller identity.
const RELATED_ITEMS = [
  ['laptop', 'laptops', 'macbook', 'notebook', 'computer'],
  ['monitor', 'monitors', 'display', 'screen'],
  ['headphones', 'earbuds', 'airpods', 'headset'],
  ['phone', 'iphone', 'smartphone', 'android'],
  ['tablet', 'ipad'],
  ['calculator', 'calculators', 'ti84', 'ti-84', 'casio'],
  ['sofa', 'couch', 'loveseat', 'settee'],
  ['bike', 'bicycle', 'cycling'],
  ['book', 'books', 'textbook', 'textbooks', 'coursebook'],
  ['bed', 'mattress', 'bedframe'],
  ['chair', 'chairs', 'seating', 'stool'],
  ['lamp', 'lamps', 'lighting', 'light'],
  ['fridge', 'refrigerator', 'minifridge', 'mini-fridge'],
  ['hoodie', 'sweatshirt', 'crewneck', 'sweater'],
  ['jacket', 'coat', 'parka'],
  ['shoes', 'sneakers', 'trainers'],
  ['backpack', 'rucksack', 'bookbag'],
] as const;

export function marketplaceSearchGroups(query: string) {
  return marketplaceSearchTerms(query).map((term) => {
    const normalized = term.toLocaleLowerCase('en-CA');
    const group = RELATED_ITEMS.find((items) => items.some((item) => item === normalized));
    return [...new Set([normalized, ...(group ?? [])])];
  });
}

export function relatedMarketplaceTerms(query: string) {
  const originals = new Set(marketplaceSearchTerms(query).map((term) => term.toLowerCase()));
  return [...new Set(marketplaceSearchGroups(query).flat())]
    .filter((term) => !originals.has(term))
    .slice(0, 24);
}

export function marketplaceTermFilter(term: string) {
  const safeTerm = normalizeMarketplaceQuery(term);
  return ['title', 'description', 'category_name']
    .map((column) => `${column}.ilike.%${safeTerm}%`)
    .join(',');
}
