import 'server-only';

import { cache } from 'react';

import type { Viewer } from '@/lib/auth/session';
import type { Tables } from '@/lib/supabase/database.types';
import { createClient } from '@/lib/supabase/server';

import type { MarketplaceListing } from '@/features/marketplace/types';
import type { StudentProfileSurface } from './types';

const LISTING_IMAGE_BUCKET = 'listing-images';
const PROFILE_IMAGE_BUCKET = 'profile-images';
const PROFILE_COLUMNS = 'id,display_name,program,academic_year,university,created_at,avatar_path';
const PROFILE_LISTING_COLUMNS = [
  'id',
  'title',
  'description',
  'price_cents',
  'condition',
  'open_to_offers',
  'pickup_area',
  'featured_at',
  'published_at',
  'created_at',
  'category_id',
  'category_slug',
  'category_name',
  'category_icon',
  'seller_id',
  'seller_name',
  'seller_program',
  'seller_academic_year',
  'seller_joined_at',
  'cover_image_path',
].join(',');

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;
type PublicProfileRow = Tables<'seller_profiles'>;
type PublicListingRow = Tables<'marketplace_listings'>;

export class ProfileDataError extends Error {
  constructor() {
    super('We couldn’t load that Waterloo profile right now.');
    this.name = 'ProfileDataError';
  }
}

export const getPublicStudentProfile = cache(async function getPublicStudentProfile(
  studentId: string,
): Promise<StudentProfileSurface | null> {
  if (!isUuid(studentId)) return null;

  const supabase = await createClient();
  const [{ data: profile, error: profileError }, listings] = await Promise.all([
    supabase.from('seller_profiles').select(PROFILE_COLUMNS).eq('id', studentId).maybeSingle(),
    loadActiveListings(supabase, studentId),
  ]);

  if (profileError) throw new ProfileDataError();
  if (!profile) {
    // Buyers may have no published listings. The participant-only inbox still
    // permits showing the same safe identity the viewer can see in their chat.
    const { data: counterpart, error: counterpartError } = await supabase
      .from('inbox_conversations')
      .select('counterpart_id,counterpart_name')
      .eq('counterpart_id', studentId)
      .limit(1)
      .maybeSingle();
    if (counterpartError) throw new ProfileDataError();
    if (!counterpart) return null;
    return {
      id: studentId,
      name: counterpart.counterpart_name,
      avatarUrl: null,
      hasAvatar: false,
      email: null,
      program: null,
      academicYear: null,
      university: 'University of Waterloo',
      joinedAt: null,
      verified: false,
      role: 'student',
      listings,
    };
  }

  const row = profile as PublicProfileRow;
  const avatarUrl = await signProfileAvatar(supabase, row.avatar_path);
  return {
    id: row.id,
    name: row.display_name,
    avatarUrl,
    hasAvatar: Boolean(row.avatar_path),
    email: null,
    program: row.program,
    academicYear: row.academic_year,
    university: row.university,
    joinedAt: row.created_at,
    verified: true,
    role: 'student',
    listings,
  };
});

export async function getOwnProfileSurface(viewer: Viewer): Promise<StudentProfileSurface> {
  const supabase = await createClient();
  const [listings, avatarUrl] = await Promise.all([
    viewer.profile.role === 'student' ? loadActiveListings(supabase, viewer.id) : [],
    signProfileAvatar(supabase, viewer.profile.avatar_path),
  ]);

  return {
    id: viewer.id,
    name:
      viewer.profile.full_name?.trim() ||
      (viewer.profile.role === 'moderator' ? 'Trovun moderator' : 'Waterloo student'),
    avatarUrl,
    hasAvatar: Boolean(viewer.profile.avatar_path),
    email: viewer.email,
    program: viewer.profile.program,
    academicYear: viewer.profile.academic_year,
    university: viewer.profile.university,
    joinedAt: viewer.profile.created_at,
    verified: viewer.profile.role === 'student' && viewer.profile.email_verified,
    role: viewer.profile.role,
    listings,
  };
}

export async function getSignedProfileAvatarUrl(avatarPath: string | null) {
  if (!avatarPath) return null;
  return signProfileAvatar(await createClient(), avatarPath);
}

async function loadActiveListings(
  supabase: SupabaseServerClient,
  studentId: string,
): Promise<MarketplaceListing[]> {
  const { data, error } = await supabase
    .from('marketplace_listings')
    .select(PROFILE_LISTING_COLUMNS)
    .eq('seller_id', studentId)
    .order('published_at', { ascending: false })
    .order('id', { ascending: false });

  if (error) throw new ProfileDataError();

  const rows = (data ?? []) as unknown as PublicListingRow[];
  const paths = rows.flatMap((row) => (row.cover_image_path ? [row.cover_image_path] : []));
  const covers = await signListingImages(supabase, paths);

  return rows.map((row) => ({
    id: row.id,
    sellerId: row.seller_id,
    title: row.title,
    description: row.description,
    priceCents: row.price_cents ?? 0,
    condition: row.condition,
    openToOffers: row.open_to_offers,
    pickupArea: row.pickup_area,
    featuredAt: row.featured_at,
    publishedAt: row.published_at,
    createdAt: row.created_at,
    category: {
      id: row.category_id,
      slug: row.category_slug,
      label: row.category_name,
      icon: row.category_icon,
    },
    seller: {
      id: row.seller_id,
      fullName: row.seller_name,
      program: row.seller_program,
      academicYear: row.seller_academic_year,
      joinedAt: row.seller_joined_at,
    },
    images: row.cover_image_path
      ? [
          {
            id: `${row.id}-cover`,
            storagePath: row.cover_image_path,
            position: 0,
            url: covers.get(row.cover_image_path) ?? null,
          },
        ]
      : [],
  }));
}

async function signListingImages(supabase: SupabaseServerClient, paths: string[]) {
  const uniquePaths = [...new Set(paths)];
  if (uniquePaths.length === 0) return new Map<string, string>();

  const { data, error } = await supabase.storage
    .from(LISTING_IMAGE_BUCKET)
    .createSignedUrls(uniquePaths, 60 * 15);

  if (error || !data) return new Map<string, string>();

  const urls = new Map<string, string>();
  data.forEach((item, index) => {
    if (item.signedUrl) urls.set(item.path ?? uniquePaths[index], item.signedUrl);
  });
  return urls;
}

async function signProfileAvatar(supabase: SupabaseServerClient, path: string | null) {
  if (!path) return null;

  const { data, error } = await supabase.storage
    .from(PROFILE_IMAGE_BUCKET)
    .createSignedUrl(path, 60 * 60);

  return error ? null : data.signedUrl;
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
