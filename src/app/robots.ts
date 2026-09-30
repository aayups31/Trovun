import type { MetadataRoute } from 'next';

import { SITE_URL } from '@/lib/site';

export default function robots(): MetadataRoute.Robots {
  // Next.js serves this as the public, plain-text /robots.txt endpoint.
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/brand/', '/favicon.ico'],
        disallow: [
          '/api/',
          '/auth/',
          '/login',
          '/signup',
          '/verify',
          '/forgot-password',
          '/update-password',
          '/onboarding',
          '/marketplace',
          '/listings/',
          '/messages',
          '/profile',
          '/my-listings',
          '/moderation',
          '/safety/report',
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
