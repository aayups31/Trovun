import type { MarketplaceListing } from '@/features/marketplace/types';

export type StudentProfileSurface = {
  id: string;
  name: string;
  avatarUrl: string | null;
  hasAvatar: boolean;
  email: string | null;
  program: string | null;
  academicYear: string | null;
  university: string;
  joinedAt: string | null;
  verified: boolean;
  role: 'student' | 'moderator';
  ratingAverage: number | null;
  ratingCount: number;
  listings: MarketplaceListing[];
};
