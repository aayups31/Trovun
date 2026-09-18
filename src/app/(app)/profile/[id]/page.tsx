import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';

import { ProfileSurface } from '@/features/profiles/components/ProfileSurface';
import { getPublicStudentProfile } from '@/features/profiles/queries';
import { requireMarketplaceViewer } from '@/lib/auth/session';

export const metadata: Metadata = {
  title: 'Waterloo seller | Trovun',
  description: 'A verified Waterloo seller on Trovun.',
  robots: { follow: false, index: false },
};

export const dynamic = 'force-dynamic';

type PublicProfilePageProps = {
  params: Promise<{ id: string }>;
};

export default async function PublicProfilePage({ params }: PublicProfilePageProps) {
  const { id } = await params;
  const viewer = await requireMarketplaceViewer(`/profile/${id}`);

  if (id === viewer.id) redirect('/profile');

  const profile = await getPublicStudentProfile(id);
  if (!profile) notFound();

  return <ProfileSurface profile={profile} variant="public" />;
}
