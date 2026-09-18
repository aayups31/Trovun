import { createClient } from '@/lib/supabase/server';
import { cache } from 'react';

import { FEATURED_LISTING_LIMIT, LISTING_IMAGE_BUCKET, MARKETPLACE_PAGE_SIZE } from './constants';
import type {
  MarketplaceCategory,
  MarketplaceFilters,
  MarketplaceImage,
  MarketplaceListing,
  MarketplacePageData,
  MarketplaceSeller,
  MarketplaceViewer,
} from './types';
import { normalizeMarketplaceQuery } from './url';
import { marketplaceSearchGroups, marketplaceTermFilter, relatedMarketplaceTerms } from './search';

const LISTING_COLUMNS = [
  'id',
  'seller_id',
  'title',
  'description',
  'price_cents',
  'category_id',
  'condition',
  'open_to_offers',
  'pickup_area',
  'pickup_latitude',
  'pickup_longitude',
  'featured_at',
  'published_at',
  'created_at',
].join(',');

const MARKETPLACE_VIEW_COLUMNS = [
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
  'pickup_latitude',
  'pickup_longitude',
].join(',');

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

type ListingRow = {
  id: string;
  seller_id: string;
  title: string;
  description: string;
  price_cents: number | null;
  category_id: number | null;
  condition: string | null;
  open_to_offers: boolean;
  pickup_area: string | null;
  pickup_latitude: number | null;
  pickup_longitude: number | null;
  featured_at: string | null;
  published_at: string | null;
  created_at: string;
};

type MarketplaceViewRow = {
  id: string;
  title: string;
  description: string;
  price_cents: number | null;
  condition: string | null;
  open_to_offers: boolean;
  pickup_area: string | null;
  featured_at: string | null;
  published_at: string;
  created_at: string;
  category_id: number;
  category_slug: string;
  category_name: string;
  category_icon: string | null;
  seller_id: string;
  seller_name: string;
  seller_program?: string | null;
  seller_academic_year?: string | null;
  seller_joined_at?: string;
  cover_image_path: string | null;
  pickup_latitude: number | null;
  pickup_longitude: number | null;
};

type CategoryRow = {
  id: number;
  slug: string;
  name: string;
  icon: string | null;
};

type ImageRow = {
  id: string;
  listing_id: string;
  storage_path: string;
  position: number;
};

type SellerRow = {
  id: string;
  display_name?: string;
  full_name?: string | null;
  program?: string | null;
  academic_year?: string | null;
  created_at: string;
};

export class MarketplaceDataError extends Error {
  constructor(message = 'We couldn’t load the marketplace right now.') {
    super(message);
    this.name = 'MarketplaceDataError';
  }
}

export async function getMarketplacePage(
  filters: MarketplaceFilters = {},
): Promise<MarketplacePageData> {
  const supabase = await createClient();
  const query = normalizeMarketplaceQuery(filters.query);
  const page = clampPage(filters.page);

  const { data: categoryRows, error: categoryError } = await supabase
    .from('categories')
    .select('id,slug,name,icon')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (categoryError) throw new MarketplaceDataError();

  const categories = ((categoryRows ?? []) as CategoryRow[]).map(mapCategory);
  const explicitCategory = categories.find((item) => item.slug === filters.category);
  const from = (page - 1) * MARKETPLACE_PAGE_SIZE;
  const to = from + MARKETPLACE_PAGE_SIZE - 1;

  let recentQuery = supabase
    .from('marketplace_listings')
    .select(MARKETPLACE_VIEW_COLUMNS, { count: 'exact' })
    .order('published_at', { ascending: false })
    .order('id', { ascending: false })
    .range(from, to);

  if (explicitCategory) {
    recentQuery = recentQuery.eq('category_slug', explicitCategory.slug);
  }
  for (const group of marketplaceSearchGroups(query)) {
    recentQuery = recentQuery.or(group.map(marketplaceTermFilter).join(','));
  }

  const featuredQuery = supabase
    .from('marketplace_listings')
    .select(MARKETPLACE_VIEW_COLUMNS)
    .not('featured_at', 'is', null)
    .order('featured_at', { ascending: false })
    .limit(FEATURED_LISTING_LIMIT);

  const shouldLoadFeatured = page === 1 && !query && !explicitCategory;

  const [recentResult, featuredResult] = await Promise.all([
    query ? rankedSearch(supabase, query, explicitCategory?.slug, from, recentQuery) : recentQuery,
    shouldLoadFeatured ? featuredQuery : Promise.resolve({ data: [], error: null }),
  ]);

  if (recentResult.error || featuredResult.error) {
    throw new MarketplaceDataError();
  }

  const recentRows = (recentResult.data ?? []) as unknown as MarketplaceViewRow[];
  const featuredRows = (featuredResult.data ?? []) as unknown as MarketplaceViewRow[];
  const hydrated = await hydrateMarketplaceRows(
    supabase,
    deduplicateMarketplaceRows([...featuredRows, ...recentRows]),
  );
  const byId = new Map(hydrated.map((listing) => [listing.id, listing]));
  const total = recentResult.count ?? 0;

  return {
    categories,
    featured: featuredRows.flatMap((row) => {
      const listing = byId.get(row.id);
      return listing ? [listing] : [];
    }),
    listings: recentRows.flatMap((row) => {
      const listing = byId.get(row.id);
      return listing ? [listing] : [];
    }),
    page,
    pageSize: MARKETPLACE_PAGE_SIZE,
    total,
    totalPages: Math.max(1, Math.ceil(total / MARKETPLACE_PAGE_SIZE)),
    query,
    category: explicitCategory?.slug ?? null,
  };
}

async function hydrateMarketplaceRows(
  supabase: SupabaseServerClient,
  rows: MarketplaceViewRow[],
): Promise<MarketplaceListing[]> {
  const paths = rows.flatMap((row) => (row.cover_image_path ? [row.cover_image_path] : []));
  const signedUrls = await signListingImages(supabase, paths);

  return rows.map((row) => ({
    id: row.id,
    sellerId: row.seller_id,
    title: row.title,
    description: row.description,
    priceCents: row.price_cents ?? 0,
    condition: row.condition,
    openToOffers: row.open_to_offers,
    pickupArea: row.pickup_area,
    pickupLatitude: row.pickup_latitude,
    pickupLongitude: row.pickup_longitude,
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
      fullName: toPublicDisplayName(row.seller_name),
      program: row.seller_program ?? null,
      academicYear: row.seller_academic_year ?? null,
      joinedAt: row.seller_joined_at ?? row.created_at,
    },
    images: row.cover_image_path
      ? [
          {
            id: `${row.id}-cover`,
            storagePath: row.cover_image_path,
            position: 0,
            url: signedUrls.get(row.cover_image_path) ?? null,
          },
        ]
      : [],
  }));
}

export const getMarketplaceListing = cache(async function getMarketplaceListing(
  id: string,
): Promise<{
  listing: MarketplaceListing | null;
  viewer: MarketplaceViewer | null;
}> {
  const supabase = await createClient();

  const [listingResult, userResult] = await Promise.all([
    supabase
      .from('listings')
      .select(LISTING_COLUMNS)
      .eq('id', id)
      .eq('status', 'published')
      .maybeSingle(),
    supabase.auth.getUser(),
  ]);

  if (listingResult.error) throw new MarketplaceDataError('We couldn’t load this listing.');
  if (!listingResult.data) return { listing: null, viewer: null };

  const { data: categoryRows, error: categoryError } = await supabase
    .from('categories')
    .select('id,slug,name,icon')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (categoryError) throw new MarketplaceDataError('We couldn’t load this listing.');

  const [listing] = await hydrateListings(
    supabase,
    [listingResult.data as unknown as ListingRow],
    ((categoryRows ?? []) as CategoryRow[]).map(mapCategory),
  );

  const user = userResult.data.user;
  let viewer: MarketplaceViewer | null = user ? { id: user.id, role: null } : null;

  if (user) {
    const { data: viewerProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    const role = viewerProfile?.role;
    viewer = {
      id: user.id,
      role: role === 'student' || role === 'moderator' ? role : null,
    };
  }

  return { listing: listing ?? null, viewer };
});

async function hydrateListings(
  supabase: SupabaseServerClient,
  rows: ListingRow[],
  categories: MarketplaceCategory[],
): Promise<MarketplaceListing[]> {
  if (rows.length === 0) return [];

  const listingIds = rows.map((row) => row.id);
  const sellerIds = [...new Set(rows.map((row) => row.seller_id))];

  const [imagesResult, sellersResult] = await Promise.all([
    supabase
      .from('listing_images')
      .select('id,listing_id,storage_path,position')
      .in('listing_id', listingIds)
      .eq('upload_status', 'uploaded')
      .order('position', { ascending: true }),
    supabase.from('seller_profiles').select('*').in('id', sellerIds),
  ]);

  if (imagesResult.error || sellersResult.error) throw new MarketplaceDataError();

  const imageRows = (imagesResult.data ?? []) as ImageRow[];
  const signedUrls = await signListingImages(
    supabase,
    imageRows.map((image) => image.storage_path),
  );
  const imagesByListing = new Map<string, MarketplaceImage[]>();

  for (const image of imageRows) {
    const mapped: MarketplaceImage = {
      id: image.id,
      storagePath: image.storage_path,
      position: image.position,
      url: signedUrls.get(image.storage_path) ?? null,
      focusPosition: image.position === 1 ? 'object-[50%_50%]' : 'object-[50%_35%]',
    };
    const existing = imagesByListing.get(image.listing_id) ?? [];
    existing.push(mapped);
    imagesByListing.set(image.listing_id, existing);
  }

  const sellerMap = new Map(
    ((sellersResult.data ?? []) as SellerRow[]).map((seller) => [seller.id, mapSeller(seller)]),
  );
  const categoryMap = new Map(categories.map((category) => [category.id, category]));

  return rows.map((row) => ({
    id: row.id,
    sellerId: row.seller_id,
    title: row.title,
    description: row.description,
    priceCents: row.price_cents ?? 0,
    condition: row.condition,
    openToOffers: row.open_to_offers,
    pickupArea: row.pickup_area,
    pickupLatitude: row.pickup_latitude,
    pickupLongitude: row.pickup_longitude,
    featuredAt: row.featured_at,
    publishedAt: row.published_at,
    createdAt: row.created_at,
    category: row.category_id ? (categoryMap.get(row.category_id) ?? null) : null,
    seller: sellerMap.get(row.seller_id) ?? null,
    images: imagesByListing.get(row.id) ?? [],
  }));
}

async function signListingImages(
  supabase: SupabaseServerClient,
  paths: string[],
): Promise<Map<string, string>> {
  if (paths.length === 0) return new Map();

  const uniquePaths = [...new Set(paths)];
  const { data, error } = await supabase.storage
    .from(LISTING_IMAGE_BUCKET)
    .createSignedUrls(uniquePaths, 60 * 15);

  if (error || !data) return new Map();

  const urls = new Map<string, string>();
  data.forEach((item, index) => {
    if (item.signedUrl) urls.set(item.path ?? uniquePaths[index], item.signedUrl);
  });
  return urls;
}

function mapCategory(row: CategoryRow): MarketplaceCategory {
  return { id: row.id, slug: row.slug, label: row.name, icon: row.icon };
}

function mapSeller(row: SellerRow): MarketplaceSeller {
  return {
    id: row.id,
    fullName: toPublicDisplayName(row.display_name ?? row.full_name),
    program: row.program ?? null,
    academicYear: row.academic_year ?? null,
    joinedAt: row.created_at,
  };
}

function toPublicDisplayName(value: string | null | undefined) {
  const parts = value?.trim().split(/\s+/).filter(Boolean) ?? [];
  if (parts.length === 0) return 'Waterloo student';
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts.at(-1)?.charAt(0).toUpperCase()}.`;
}

async function rankedSearch(
  supabase: SupabaseServerClient,
  query: string,
  category: string | undefined,
  offset: number,
  fallback: PromiseLike<{ data: unknown; error: unknown; count: number | null }>,
) {
  const { data, error } = await supabase.rpc('search_marketplace', {
    p_query: query,
    p_related_terms: relatedMarketplaceTerms(query),
    p_category_slug: category ?? null,
    p_limit: MARKETPLACE_PAGE_SIZE,
    p_offset: offset,
  });
  // Rolling deployments stay usable before the forward migration is installed.
  if (error?.code === 'PGRST202') return await fallback;
  if (error) throw new MarketplaceDataError();
  if (
    !data ||
    typeof data !== 'object' ||
    Array.isArray(data) ||
    !Array.isArray(data.ids) ||
    typeof data.total !== 'number'
  ) {
    throw new MarketplaceDataError();
  }
  const ids = data.ids.filter((id): id is string => typeof id === 'string');
  if (!ids.length) return { data: [], error: null, count: data.total };
  const result = await supabase
    .from('marketplace_listings')
    .select(MARKETPLACE_VIEW_COLUMNS)
    .in('id', ids);
  if (result.error) throw new MarketplaceDataError();
  const byId = new Map(
    ((result.data ?? []) as unknown as MarketplaceViewRow[]).map((row) => [row.id, row]),
  );
  return { data: ids.flatMap((id) => byId.get(id) ?? []), error: null, count: data.total };
}

function clampPage(value: number | undefined) {
  if (!Number.isFinite(value)) return 1;
  return Math.min(Math.max(Math.trunc(value ?? 1), 1), 1_000);
}

function deduplicateMarketplaceRows(rows: MarketplaceViewRow[]) {
  return [...new Map(rows.map((row) => [row.id, row])).values()];
}
