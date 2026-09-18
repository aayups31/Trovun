import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { EmailOtpVerification } from '@/features/auth/components/email-otp-verification';
import { waterlooEmailSchema } from '@/features/auth/schemas';
import { getSafeNextPath } from '@/lib/auth/navigation';

export const metadata: Metadata = {
  title: 'Enter your verification code',
  description: 'Verify your Waterloo email to continue to Trovun.',
};

type VerifyPageProps = {
  searchParams: Promise<{
    email?: string | string[];
    next?: string | string[];
  }>;
};

export default async function VerifyPage({ searchParams }: VerifyPageProps) {
  const params = await searchParams;
  const rawEmail = Array.isArray(params.email) ? params.email[0] : params.email;
  const parsedEmail = waterlooEmailSchema.safeParse(rawEmail);

  if (!parsedEmail.success) redirect('/signup');

  const requestedNext = Array.isArray(params.next) ? params.next[0] : params.next;
  const nextPath = getSafeNextPath(requestedNext);

  return (
    <div>
      <h1
        aria-label="Verify your Waterloo email"
        className="text-[clamp(2.6rem,5.5vw,3.75rem)] font-bold leading-[1.02] tracking-[-0.028em] text-um-text-strong"
      >
        Verify your Waterloo
        <span className="block text-um-gold-600">email.</span>
      </h1>
      <p className="mt-5 text-lg font-semibold tracking-[-0.02em] text-um-text">
        Enter the code we sent you.
      </p>
      <p className="mt-3 text-sm leading-6 text-um-text">
        A six-digit code is on its way to{' '}
        <span className="font-bold text-um-text-strong">{parsedEmail.data}</span>.
      </p>

      <EmailOtpVerification email={parsedEmail.data} nextPath={nextPath} />
    </div>
  );
}
