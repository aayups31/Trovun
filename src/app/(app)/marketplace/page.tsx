import type { Metadata } from 'next';
import { MarketplaceSurface } from '@/features/marketplace/components/MarketplaceSurface';
import { getMarketplacePage } from '@/features/marketplace/queries';
import { firstSearchParam } from '@/features/marketplace/url';
import { requireMarketplaceViewer } from '@/lib/auth/session';

export const metadata: Metadata = {
  title: 'Marketplace | Trovun',
  description: 'Buy and sell with verified University of Waterloo students.',
};

export const dynamic = 'force-dynamic';

type MarketplacePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function MarketplacePage({ searchParams }: MarketplacePageProps) {
  const viewer = await requireMarketplaceViewer('/marketplace');
  const canSell = viewer.profile.role === 'student';
  const firstName = getFirstName(viewer.profile.full_name);
  const params = await searchParams;
  const query = firstSearchParam(params.q) ?? '';
  const category = firstSearchParam(params.category);
  const didPublish = firstSearchParam(params.published) === '1';
  const restrictionNotice = getRestrictionNotice(firstSearchParam(params.notice));
  const pageParam = Number.parseInt(firstSearchParam(params.page) ?? '1', 10);
  const data = await getMarketplacePage({
    query,
    category,
    page: Number.isNaN(pageParam) ? 1 : pageParam,
  });
  return (
    <MarketplaceSurface
      data={data}
      canSell={canSell}
      firstName={firstName}
      didPublish={didPublish}
      restrictionNotice={restrictionNotice}
    />
  );
}

function getRestrictionNotice(value: string | null | undefined) {
  if (value === 'selling-restricted') {
    return {
      title: 'Seller tools are unavailable for this account.',
      message: 'Selling is reserved for Waterloo student accounts.',
    };
  }

  if (value === 'moderator-restricted') {
    return {
      title: 'Moderator access is restricted.',
      message: 'Only authorized moderator accounts can open that workspace.',
    };
  }

  return null;
}

function getFirstName(fullName: string | null) {
  return fullName?.trim().split(/\s+/)[0] || null;
}
