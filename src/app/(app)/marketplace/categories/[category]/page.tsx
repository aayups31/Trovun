import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { MarketplaceSurface } from '@/features/marketplace/components/MarketplaceSurface';
import { getMarketplacePage } from '@/features/marketplace/queries';
import { firstSearchParam } from '@/features/marketplace/url';
import { requireMarketplaceViewer } from '@/lib/auth/session';

export const metadata: Metadata = {
  title: 'Browse by category | Trovun',
  description: 'New listings from verified University of Waterloo students.',
};

export const dynamic = 'force-dynamic';

type MarketplaceCategoryPageProps = {
  params: Promise<{ category: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function MarketplaceCategoryPage({
  params,
  searchParams,
}: MarketplaceCategoryPageProps) {
  const { category: categorySlug } = await params;
  const viewer = await requireMarketplaceViewer(
    `/marketplace/categories/${encodeURIComponent(categorySlug)}`,
  );
  const queryParams = await searchParams;
  const query = firstSearchParam(queryParams.q) ?? '';
  const pageParam = Number.parseInt(firstSearchParam(queryParams.page) ?? '1', 10);
  const data = await getMarketplacePage({
    query,
    category: categorySlug,
    page: Number.isNaN(pageParam) ? 1 : pageParam,
  });
  const activeCategory = data.categories.find((category) => category.slug === data.category);

  if (!activeCategory) notFound();

  return <MarketplaceSurface data={data} canSell={viewer.profile.role === 'student'} />;
}
