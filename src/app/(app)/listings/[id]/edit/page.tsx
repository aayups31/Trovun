import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { ListingComposer } from '@/features/listings/components/ListingComposer';
import {
  getListingEditorOptions,
  getOwnedListingForEdit,
} from '@/features/listings/editor-queries';
import { requireStudentSeller } from '@/lib/auth/session';

export const metadata: Metadata = {
  title: 'Edit listing',
  description: 'Update a Trovun listing.',
};

export const dynamic = 'force-dynamic';

type EditListingPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditListingPage({ params }: EditListingPageProps) {
  const { id } = await params;
  if (!isUuid(id)) notFound();

  const viewer = await requireStudentSeller(`/listings/${id}/edit`);
  const [options, listing] = await Promise.all([
    getListingEditorOptions(),
    getOwnedListingForEdit(id, viewer.id),
  ]);

  if (!listing) notFound();

  return (
    <ListingComposer
      categories={options.categories}
      initial={listing}
      sellerName={viewer.profile.full_name ?? 'Waterloo student'}
    />
  );
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
