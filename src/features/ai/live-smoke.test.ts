import { expect, it } from 'vitest';
import { z } from 'zod';
import { assistMarketplace } from './server';
import { reviewListing } from './moderation';
import { structuredResponse } from './provider';
import { searchPlan } from './contracts';

// Explicit opt-in only. Synthetic inputs; no marketplace content or user data.
it.skipIf(process.env.TROVUN_AI_LIVE_TEST !== '1')(
  'accepts live structured text, image and flag requests',
  async () => {
    const { default: nextEnv } = await import('@next/env');
    nextEnv.loadEnvConfig(process.cwd());
    const { default: sharp } = await import('sharp');
    const png = await sharp({
      create: { width: 32, height: 32, channels: 3, background: { r: 100, g: 40, b: 200 } },
    })
      .png()
      .toBuffer();
    const [draft, review, plan] = await Promise.all([
      assistMarketplace(
        {
          purpose: 'listing',
          title: 'Test colour sample',
          description: 'Synthetic purple colour sample used to test image input.',
        },
        [`data:image/png;base64,${png.toString('base64')}`],
      ),
      reviewListing('Tobacco cigarettes', 'Sealed packs of tobacco cigarettes for sale.', []),
      structuredResponse(
        'Extract item alternatives and the explicit CAD price limit in cents; no minimum if unstated. Do not infer suitability.',
        'desk under $80 for a small dorm',
        z.toJSONSchema(searchPlan, { target: 'draft-7' }),
      ).then((result) => searchPlan.parse(result)),
    ]);
    expect(draft.title.length).toBeGreaterThan(0);
    expect(review.flags.some((flag) => flag.category === 'prohibited_item')).toBe(true);
    expect(plan.maxPriceCents).toBe(8000);
  },
  30_000,
);
