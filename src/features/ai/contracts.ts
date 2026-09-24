import { z } from 'zod';

export const assistanceInput = z
  .object({
    purpose: z.enum(['listing', 'buyer']),
    title: z.string().trim().max(100),
    description: z.string().trim().max(5000),
    listingId: z.uuid().optional(),
    includePhotos: z.boolean().optional(),
    question: z.string().trim().max(500).optional(),
    condition: z.enum(['new', 'like_new', 'good', 'fair', 'well_used']).nullable().optional(),
  })
  .refine(
    (input) =>
      input.title.length >= 3 ||
      (input.purpose === 'listing' && input.includePhotos && input.listingId),
    'Add a title or uploaded photos.',
  );

export const searchInput = z.object({
  purpose: z.literal('search'),
  query: z.string().trim().min(3).max(300),
  category: z.string().max(80).optional(),
});
export const searchPlan = z.object({
  terms: z.array(z.string().min(1).max(40)).min(1).max(3),
  maxPriceCents: z.number().int().min(0).max(100_000_000).nullable(),
  minPriceCents: z.number().int().min(0).max(100_000_000).nullable(),
  note: z.string().max(400),
});

export const assistanceOutput = z.object({
  title: z.string().min(1).max(100),
  description: z.string().max(5000),
  checks: z.array(z.string().max(400)).max(6),
  concerns: z.array(z.string().max(400)).max(6),
});
export const listingAutofillOutput = assistanceOutput.extend({
  categoryId: z.number().int().positive().nullable(),
  suggestedPriceCents: z.number().int().min(0).max(100_000_000).nullable(),
  priceReason: z.string().max(300),
  blocked: z.boolean(),
});
export type Assistance = z.infer<typeof assistanceOutput> &
  Partial<z.infer<typeof listingAutofillOutput>>;

// Best-effort minimization, not a guarantee that free text is anonymous.
export function minimizeText(value: string) {
  return value
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[email removed]')
    .replace(/https?:\/\/\S+/gi, '[link removed]')
    .replace(/\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g, '[phone removed]');
}
