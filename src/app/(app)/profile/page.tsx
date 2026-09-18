import type { Metadata } from 'next';

import { NotificationPreferences } from '@/features/notifications/NotificationPreferences';
import { getMessageEmailPreference } from '@/features/notifications/preferences';

import { ProfileSurface } from '@/features/profiles/components/ProfileSurface';
import { getOwnProfileSurface } from '@/features/profiles/queries';
import { requireMarketplaceViewer } from '@/lib/auth/session';

export const metadata: Metadata = {
  title: 'Your profile | Trovun',
  description: 'Your Trovun identity and active listings.',
  robots: { follow: false, index: false },
};

export const dynamic = 'force-dynamic';

export default async function ProfilePage() {
  const viewer = await requireMarketplaceViewer('/profile');
  const [profile, preference] = await Promise.all([
    getOwnProfileSurface(viewer),
    getMessageEmailPreference(viewer.profile.id),
  ]);

  return (
    <ProfileSurface
      profile={profile}
      variant="self"
      notificationSettings={<NotificationPreferences {...preference} />}
    />
  );
}
