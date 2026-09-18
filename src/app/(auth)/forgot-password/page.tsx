import type { Metadata } from 'next';

import { ForgotPasswordForm } from '@/features/auth/components/forgot-password-form';

export const metadata: Metadata = {
  title: 'Recover password',
  description: 'Request a password recovery email for Trovun.',
};

type ForgotPasswordPageProps = {
  searchParams: Promise<{ error?: string | string[] }>;
};

export default async function ForgotPasswordPage({ searchParams }: ForgotPasswordPageProps) {
  const params = await searchParams;
  const requestedError = Array.isArray(params.error) ? params.error[0] : params.error;

  return (
    <div>
      <p className="text-sm font-semibold tracking-[0.02em] text-um-gold-700">
        Waterloo access · Recovery
      </p>
      <h1
        aria-label="Reset your password"
        className="mt-5 text-[clamp(2.6rem,5.5vw,3.75rem)] font-bold leading-[1.02] tracking-[-0.028em] text-um-text-strong"
      >
        Reset your
        <span className="block text-um-gold-600">password.</span>
      </h1>
      <p className="mt-5 max-w-md text-base leading-7 text-um-text">
        We’ll email a private recovery link if the address belongs to an eligible account.
      </p>

      {requestedError === 'invalid-link' ? (
        <div
          className="mt-6 border-l-2 border-red-600 bg-red-50/80 px-4 py-3 text-sm font-medium text-red-800"
          role="alert"
        >
          That recovery link is invalid or expired. Request a new one below.
        </div>
      ) : null}

      <ForgotPasswordForm />
    </div>
  );
}
