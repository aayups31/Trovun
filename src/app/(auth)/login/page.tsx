import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { LoginForm } from '@/features/auth/components/login-form';
import { getSafeNextPath } from '@/lib/auth/navigation';
import { getCurrentIdentity, getViewer } from '@/lib/auth/session';

export const metadata: Metadata = {
  title: 'Sign in',
  description: 'Sign in to the marketplace for verified Waterloo students.',
};

type LoginPageProps = {
  searchParams: Promise<{
    error?: string | string[];
    next?: string | string[];
    notice?: string | string[];
  }>;
};

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  'ineligible-account': 'Use an eligible Trovun account to continue.',
  'invalid-link': 'That verification link is invalid or expired. Request a new one from signup.',
  'profile-unavailable': "We verified the email but couldn't prepare the account. Try again.",
  'session-expired': 'Your web session expired after three days of inactivity. Sign in again.',
};

const AUTH_NOTICE_MESSAGES: Record<string, string> = {
  'email-verified': 'Email verified. Sign in with the password you created.',
  'password-updated': 'Password updated. Sign in with your new password.',
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const requestedNext = Array.isArray(params.next) ? params.next[0] : params.next;
  const nextPath = getSafeNextPath(requestedNext);
  const requestedError = Array.isArray(params.error) ? params.error[0] : params.error;
  const authError = requestedError ? AUTH_ERROR_MESSAGES[requestedError] : undefined;
  const requestedNotice = Array.isArray(params.notice) ? params.notice[0] : params.notice;
  const authNotice = requestedNotice ? AUTH_NOTICE_MESSAGES[requestedNotice] : undefined;
  const identity = await getCurrentIdentity();

  if (identity) {
    const viewer = await getViewer();

    if (viewer?.profile.role === 'moderator' || viewer?.profile.onboarding_completed_at) {
      redirect(nextPath);
    }

    const query = nextPath === '/marketplace' ? '' : `?next=${encodeURIComponent(nextPath)}`;
    redirect(`/onboarding${query}`);
  }

  return (
    <div>
      <h1
        aria-label="Sign in with Waterloo"
        className="text-[clamp(2.6rem,5.5vw,3.75rem)] font-bold leading-[1.02] tracking-[-0.028em] text-um-text-strong"
      >
        Welcome back,
        <span className="block text-um-gold-600">Warrior.</span>
      </h1>

      {authError ? (
        <div
          className="mt-6 border-l-2 border-red-600 bg-red-50/80 px-4 py-3 text-sm font-medium text-red-800"
          role="alert"
        >
          {authError}
        </div>
      ) : null}

      {authNotice ? (
        <div
          className="mt-6 border-l-2 border-emerald-700 bg-emerald-50/80 px-4 py-3 text-sm font-medium text-emerald-900"
          role="status"
        >
          {authNotice}
        </div>
      ) : null}

      <LoginForm nextPath={nextPath} />
    </div>
  );
}
