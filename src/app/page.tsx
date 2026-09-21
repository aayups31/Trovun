import type { Metadata } from 'next';
import { connection } from 'next/server';

import { App as MarketingPage } from '@/App';
import { getPublicListingShowcase } from '@/features/marketplace/public-showcase';
import { JsonLd } from '@/features/seo/components/JsonLd';
import { absoluteUrl, SITE_DESCRIPTION, SITE_URL } from '@/lib/site';

export const metadata: Metadata = {
  title: {
    absolute: 'Trovun Waterloo | University Marketplace for Students',
  },
  description: SITE_DESCRIPTION,
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'Trovun Waterloo | University Marketplace for Students',
    description: SITE_DESCRIPTION,
    url: '/',
  },
};

export default async function HomePage() {
  await connection();
  const showcaseListings = await getPublicListingShowcase();

  return (
    <>
      <JsonLd
        data={[
          {
            '@context': 'https://schema.org',
            '@type': 'WebSite',
            '@id': `${SITE_URL}/#website`,
            url: SITE_URL,
            name: 'Trovun',
            alternateName: ['Trovun Waterloo', 'UniMarket'],
            description: SITE_DESCRIPTION,
            inLanguage: 'en-CA',
            publisher: {
              '@id': `${SITE_URL}/#organization`,
            },
          },
          {
            '@context': 'https://schema.org',
            '@type': 'Organization',
            '@id': `${SITE_URL}/#organization`,
            name: 'Trovun',
            alternateName: ['Trovun Waterloo', 'UniMarket'],
            url: SITE_URL,
            logo: {
              '@type': 'ImageObject',
              url: absoluteUrl('/brand/trovun-logo-no-background.png'),
              width: 1265,
              height: 1243,
            },
            description:
              'An independent student-built marketplace for the University of Waterloo community.',
          },
        ]}
      />
      <MarketingPage showcaseListings={showcaseListings} />
    </>
  );
}
