import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { ListingDetail } from '@/features/marketplace/components/ListingDetail';
import { getMarketplaceListing } from '@/features/marketplace/queries';
import { requireMarketplaceViewer } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

type ListingPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: ListingPageProps): Promise<Metadata> {
  const { id } = await params;
  if (!isUuid(id)) return { title: 'Listing not found | Trovun' };

  try {
    const { listing } = await getMarketplaceListing(id);
    if (!listing) return { title: 'Listing not found | Trovun' };

    return {
      title: `${listing.title} | Trovun`,
      description: listing.description.replace(/\s+/g, ' ').slice(0, 155),
    };
  } catch {
    return { title: 'Listing | Trovun' };
  }
}

export default async function ListingPage({ params, searchParams }: ListingPageProps) {
  const { id } = await params;
  const query = await searchParams;
  if (!isUuid(id)) notFound();

  await requireMarketplaceViewer(`/listings/${id}`);

  const { listing, viewer } = await getMarketplaceListing(id);
  if (!listing) notFound();

  return (
    <ListingDetail
      contactUnavailable={query.contact === 'unavailable'}
      listing={listing}
      publishSuccess={query.published === '1'}
      viewer={viewer}
    />
  );
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
