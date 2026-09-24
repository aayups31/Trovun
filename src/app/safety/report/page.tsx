import Link from 'next/link';
import { z } from 'zod';
import { requireMarketplaceViewer } from '@/lib/auth/session';
import { ReportForm } from '@/features/safety/ReportForm';
export const metadata = { title: 'Report a concern', robots: { index: false, follow: false } };
export default async function ReportPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireMarketplaceViewer('/safety/report');
  const params = await searchParams;
  const id = z.uuid().safeParse(params.id);
  const subject =
    params.subject === 'listing' || params.subject === 'conversation' ? params.subject : 'other';
  return (
    <main className="min-h-screen bg-[#0a1016] px-5 py-12 text-white">
      <div className="mx-auto max-w-2xl">
        <Link href="/safety" className="underline">
          Safety & privacy
        </Link>
        <h1 className="mt-8 text-4xl font-semibold">Report a concern</h1>
        <p className="mt-4">
          For immediate danger, call 911. Use this form for marketplace concerns, privacy requests
          or appeals.
        </p>
        <ReportForm
          subject={id.success ? subject : 'other'}
          referenceId={id.success ? id.data : null}
        />
      </div>
    </main>
  );
}
