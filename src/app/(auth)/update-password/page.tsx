import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { UpdatePasswordForm } from '@/features/auth/components/update-password-form';
import { getCurrentIdentity } from '@/lib/auth/session';

export const metadata: Metadata = {
  title: 'Choose a new password',
  description: 'Set a new password for your Trovun account.',
};

export default async function UpdatePasswordPage() {
  const identity = await getCurrentIdentity();
  if (!identity) redirect('/forgot-password');

  return (
    <div>
      <p className="text-sm font-semibold tracking-[0.02em] text-emerald-800">
        Recovery link verified
      </p>
      <h1 className="mt-5 text-[clamp(2.6rem,5.5vw,3.75rem)] font-bold leading-[1.02] tracking-[-0.028em] text-um-text-strong">
        Choose a new
        <span className="block text-um-gold-600">password.</span>
      </h1>
      <p className="mt-5 max-w-md text-base leading-7 text-um-text">
        This updates the password for{' '}
        <span className="font-bold text-um-text-strong">{identity.email}</span> and returns you to
        sign in.
      </p>

      <UpdatePasswordForm />
    </div>
  );
}
