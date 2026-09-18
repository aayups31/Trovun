import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  cookies: vi.fn(),
  createClient: vi.fn(),
  headers: vi.fn(),
  redirect: vi.fn((path: string): never => {
    throw new Error(`REDIRECT:${path}`);
  }),
}));

vi.mock('next/headers', () => ({ cookies: mocks.cookies, headers: mocks.headers }));
vi.mock('next/navigation', () => ({ redirect: mocks.redirect }));
vi.mock('@/lib/supabase/server', () => ({ createClient: mocks.createClient }));

import { AUTH_NEXT_COOKIE } from '@/lib/auth/pending-sign-in';
import {
  WEB_ACTIVITY_COOKIE,
  WEB_SESSION_POLICY_COOKIE,
  WEB_SESSION_POLICY_VERSION,
} from '@/lib/auth/web-session';

import {
  loginAction,
  requestPasswordResetAction,
  resendSignupAction,
  signOutAction,
  signupAction,
  updatePasswordAction,
  verifySignupOtpAction,
} from './actions';

const siteUrl = 'https://mvp.unimarket.example';
const strongPassword = 'Waterloo8';

type AuthError = {
  code?: string;
  status?: number;
};

type ProfileResult = {
  data: {
    email_verified: boolean;
    onboarding_completed_at: string | null;
    role: 'moderator' | 'student';
  } | null;
  error: Error | null;
};

type SupabaseOptions = {
  getUserEmail?: string;
  getUserError?: AuthError | null;
  loginEmail?: string;
  loginEmailConfirmedAt?: string | null;
  loginError?: AuthError | null;
  loginHasUser?: boolean;
  profile?: ProfileResult;
  resetError?: AuthError | null;
  resendError?: AuthError | null;
  signupError?: AuthError | null;
  signupHasSession?: boolean;
  signupIdentities?: unknown[];
  updateError?: AuthError | null;
  verifyOtpEmail?: string;
  verifyOtpEmailConfirmedAt?: string | null;
  verifyOtpError?: AuthError | null;
  verifyOtpHasUser?: boolean;
};

function arrangeSupabase({
  getUserEmail = 'student@uwaterloo.ca',
  getUserError = null,
  loginEmail = 'student@uwaterloo.ca',
  loginEmailConfirmedAt = '2026-07-15T12:00:00.000Z',
  loginError = null,
  loginHasUser = true,
  profile = {
    data: {
      email_verified: true,
      onboarding_completed_at: '2026-07-15T12:00:00.000Z',
      role: 'student',
    },
    error: null,
  },
  resetError = null,
  resendError = null,
  signupError = null,
  signupHasSession = false,
  signupIdentities = [{ id: 'identity-123' }],
  updateError = null,
  verifyOtpEmail = 'student@uwaterloo.ca',
  verifyOtpEmailConfirmedAt = '2026-07-15T12:00:00.000Z',
  verifyOtpError = null,
  verifyOtpHasUser = true,
}: SupabaseOptions = {}) {
  const signInWithPassword = vi.fn().mockResolvedValue({
    data: {
      user: loginHasUser
        ? {
            email: loginEmail,
            email_confirmed_at: loginEmailConfirmedAt,
            id: 'user-123',
          }
        : null,
    },
    error: loginError,
  });
  const signUp = vi.fn().mockResolvedValue({
    data: {
      session: signupHasSession ? { access_token: 'temporary-session' } : null,
      user: { identities: signupIdentities },
    },
    error: signupError,
  });
  const resend = vi.fn().mockResolvedValue({ error: resendError });
  const resetPasswordForEmail = vi.fn().mockResolvedValue({ error: resetError });
  const getUser = vi.fn().mockResolvedValue({
    data: {
      user: getUserEmail ? { email: getUserEmail, id: 'user-123' } : null,
    },
    error: getUserError,
  });
  const updateUser = vi.fn().mockResolvedValue({ error: updateError });
  const verifyOtp = vi.fn().mockResolvedValue({
    data: {
      user: verifyOtpHasUser
        ? {
            email: verifyOtpEmail,
            email_confirmed_at: verifyOtpEmailConfirmedAt,
            id: 'user-123',
          }
        : null,
    },
    error: verifyOtpError,
  });
  const signOut = vi.fn().mockResolvedValue({ error: null });
  const maybeSingle = vi.fn().mockResolvedValue(profile);
  const eq = vi.fn(() => ({ maybeSingle }));
  const select = vi.fn(() => ({ eq }));
  const from = vi.fn(() => ({ select }));

  mocks.createClient.mockResolvedValue({
    auth: {
      getUser,
      resend,
      resetPasswordForEmail,
      signInWithPassword,
      signOut,
      signUp,
      updateUser,
      verifyOtp,
    },
    from,
  });

  return {
    eq,
    from,
    getUser,
    maybeSingle,
    resend,
    resetPasswordForEmail,
    select,
    signInWithPassword,
    signOut,
    signUp,
    updateUser,
    verifyOtp,
  };
}

async function expectRedirect(action: () => Promise<unknown>, path: string) {
  await expect(action()).rejects.toThrow(`REDIRECT:${path}`);
  expect(mocks.redirect).toHaveBeenCalledWith(path);
}

describe('auth server actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', siteUrl);

    mocks.cookies.mockResolvedValue({ set: vi.fn() });
    mocks.headers.mockResolvedValue({
      get: vi.fn((name: string) => (name === 'origin' ? 'https://untrusted.example' : null)),
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('signupAction', () => {
    it('signs up with a password and routes to six-digit verification', async () => {
      const cookieStore = { set: vi.fn() };
      mocks.cookies.mockResolvedValue(cookieStore);
      const context = arrangeSupabase();

      await expectRedirect(
        () =>
          signupAction({
            confirmPassword: strongPassword,
            email: ' Student@UWATERLOO.CA ',
            next: '/my-listings?status=active',
            password: strongPassword,
          }),
        '/verify?email=student%40uwaterloo.ca&next=%2Fmy-listings%3Fstatus%3Dactive',
      );

      expect(context.signUp).toHaveBeenCalledWith({
        email: 'student@uwaterloo.ca',
        password: strongPassword,
      });
      expect(cookieStore.set).toHaveBeenCalledWith(
        AUTH_NEXT_COOKIE,
        '/my-listings?status=active',
        expect.objectContaining({ httpOnly: true, path: '/', sameSite: 'lax' }),
      );
      expect(context.signOut).not.toHaveBeenCalled();
    });

    it('rejects Gmail before creating a Supabase client', async () => {
      const result = await signupAction({
        confirmPassword: strongPassword,
        email: 'aayupsuw@gmail.com',
        password: strongPassword,
      });

      expect(result).toEqual({ ok: false, message: 'Use your @uwaterloo.ca email address.' });
      expect(mocks.createClient).not.toHaveBeenCalled();
    });

    it('keeps an existing confirmed account on signup with a sign-in prompt', async () => {
      const cookieStore = { set: vi.fn() };
      mocks.cookies.mockResolvedValue(cookieStore);
      arrangeSupabase({ signupIdentities: [] });

      const result = await signupAction({
        confirmPassword: strongPassword,
        email: 'student@uwaterloo.ca',
        password: strongPassword,
      });

      expect(result).toEqual({
        ok: false,
        message: 'This Waterloo email is already registered.',
        reason: 'account-exists',
      });
      expect(mocks.redirect).not.toHaveBeenCalled();
      expect(cookieStore.set).not.toHaveBeenCalled();
    });
  });

  describe('resendSignupAction', () => {
    it('resends a signup verification code', async () => {
      const context = arrangeSupabase();

      const result = await resendSignupAction({
        email: 'student@uwaterloo.ca',
        next: '/listings/new',
      });

      expect(result).toEqual({
        ok: true,
        message: 'If verification is still pending, a new code has been requested.',
      });
      expect(context.resend).toHaveBeenCalledWith({
        email: 'student@uwaterloo.ca',
        type: 'signup',
      });
    });

    it.each([
      {
        error: { code: 'email_address_not_authorized', status: 403 },
        message:
          'Email delivery is not enabled for this address. Please contact Trovun support.',
      },
      {
        error: { code: 'over_email_send_rate_limit', status: 429 },
        message: 'Too many emails were requested. Wait a few minutes, then try once.',
      },
    ])('returns a useful delivery error for $error.code', async ({ error, message }) => {
      const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      arrangeSupabase({ resendError: error });

      const result = await resendSignupAction({ email: 'student@uwaterloo.ca' });

      expect(result).toEqual({ ok: false, message });
      expect(log).toHaveBeenCalledWith(
        '[auth-email] request failed',
        expect.objectContaining({ code: error.code, operation: 'resend-verification' }),
      );
      log.mockRestore();
    });
  });

  describe('verifySignupOtpAction', () => {
    it('verifies the code, checks the profile, ends the temporary session, and redirects', async () => {
      const cookieStore = { delete: vi.fn(), set: vi.fn() };
      mocks.cookies.mockResolvedValue(cookieStore);
      const context = arrangeSupabase();

      await expectRedirect(
        () =>
          verifySignupOtpAction({
            email: ' Student@UWATERLOO.CA ',
            next: '/listings/new',
            token: '123456',
          }),
        '/login?notice=email-verified&next=%2Flistings%2Fnew',
      );

      expect(context.verifyOtp).toHaveBeenCalledWith({
        email: 'student@uwaterloo.ca',
        token: '123456',
        type: 'email',
      });
      expect(context.select).toHaveBeenCalledWith('email_verified');
      expect(context.eq).toHaveBeenCalledWith('id', 'user-123');
      expect(context.signOut).toHaveBeenCalledWith({ scope: 'local' });
      expect(cookieStore.delete).toHaveBeenCalledWith(AUTH_NEXT_COOKIE);
    });

    it('rejects an invalid or expired code without creating a session', async () => {
      const context = arrangeSupabase({
        verifyOtpError: { code: 'otp_expired', status: 403 },
        verifyOtpHasUser: false,
      });

      const result = await verifySignupOtpAction({
        email: 'student@uwaterloo.ca',
        token: '123456',
      });

      expect(result).toEqual({
        ok: false,
        message: 'That code is invalid or expired. Request a new code and try again.',
      });
      expect(context.from).not.toHaveBeenCalled();
      expect(context.signOut).not.toHaveBeenCalled();
    });

    it('returns a useful message when code attempts are rate-limited', async () => {
      const context = arrangeSupabase({
        verifyOtpError: { code: 'over_request_rate_limit', status: 429 },
        verifyOtpHasUser: false,
      });

      const result = await verifySignupOtpAction({
        email: 'student@uwaterloo.ca',
        token: '123456',
      });

      expect(result).toEqual({
        ok: false,
        message: 'Too many code attempts. Wait a few minutes, then try again.',
      });
      expect(context.from).not.toHaveBeenCalled();
      expect(context.signOut).not.toHaveBeenCalled();
    });

    it('ends the session when the verified identity does not match the submitted email', async () => {
      const context = arrangeSupabase({ verifyOtpEmail: 'different@uwaterloo.ca' });

      const result = await verifySignupOtpAction({
        email: 'student@uwaterloo.ca',
        token: '123456',
      });

      expect(result).toEqual({
        ok: false,
        message: 'That code could not verify this Waterloo account.',
      });
      expect(context.signOut).toHaveBeenCalledWith({ scope: 'local' });
      expect(context.from).not.toHaveBeenCalled();
    });

    it.each([
      {
        label: 'missing',
        profile: { data: null, error: null },
      },
      {
        label: 'not verified',
        profile: {
          data: {
            email_verified: false,
            onboarding_completed_at: null,
            role: 'student' as const,
          },
          error: null,
        },
      },
    ])('ends the temporary session when the profile is $label', async ({ profile }) => {
      const context = arrangeSupabase({ profile });

      const result = await verifySignupOtpAction({
        email: 'student@uwaterloo.ca',
        token: '123456',
      });

      expect(result).toEqual({
        ok: false,
        message: "Your account couldn't be prepared. Please try again.",
      });
      expect(context.signOut).toHaveBeenCalledWith({ scope: 'local' });
      expect(mocks.redirect).not.toHaveBeenCalled();
    });
  });

  describe('loginAction', () => {
    it('routes a student who completed onboarding directly to the safe destination', async () => {
      const email = 'student@uwaterloo.ca';
      const profile = {
        data: {
          email_verified: true,
          onboarding_completed_at: '2026-07-15T12:00:00.000Z',
          role: 'student' as const,
        },
        error: null,
      };
      const cookieStore = { set: vi.fn() };
      mocks.cookies.mockResolvedValue(cookieStore);
      const context = arrangeSupabase({ loginEmail: email, profile });

      await expectRedirect(
        () =>
          loginAction({
            email,
            next: '/my-listings?status=active',
            password: strongPassword,
          }),
        '/my-listings?status=active',
      );

      expect(context.signInWithPassword).toHaveBeenCalledWith({
        email,
        password: strongPassword,
      });
      expect(context.select).toHaveBeenCalledWith('role, onboarding_completed_at, email_verified');
      expect(context.eq).toHaveBeenCalledWith('id', 'user-123');
      expect(context.signOut).not.toHaveBeenCalled();
      expect(cookieStore.set).toHaveBeenCalledWith(
        WEB_SESSION_POLICY_COOKIE,
        WEB_SESSION_POLICY_VERSION,
        expect.objectContaining({ httpOnly: true, path: '/', sameSite: 'lax' }),
      );
      expect(cookieStore.set).toHaveBeenCalledWith(
        WEB_ACTIVITY_COOKIE,
        expect.stringMatching(/^\d{13}$/),
        expect.objectContaining({ httpOnly: true, path: '/', sameSite: 'lax' }),
      );
    });

    it('rejects Gmail before password authentication', async () => {
      const result = await loginAction({
        email: 'aayupsuw@gmail.com',
        password: strongPassword,
      });

      expect(result).toEqual({ ok: false, message: 'Use your @uwaterloo.ca email address.' });
      expect(mocks.createClient).not.toHaveBeenCalled();
    });

    it('routes an incomplete student to onboarding with the safe destination', async () => {
      arrangeSupabase({
        profile: {
          data: { email_verified: true, onboarding_completed_at: null, role: 'student' },
          error: null,
        },
      });

      await expectRedirect(
        () =>
          loginAction({
            email: 'student@uwaterloo.ca',
            next: '/listings/new',
            password: strongPassword,
          }),
        '/onboarding?next=%2Flistings%2Fnew',
      );
    });

    it('signs out and rejects an unverified authenticated user', async () => {
      const context = arrangeSupabase({ loginEmailConfirmedAt: null });

      const result = await loginAction({
        email: 'student@uwaterloo.ca',
        password: strongPassword,
      });

      expect(result).toEqual({
        ok: false,
        message: 'Use an eligible Trovun account to continue.',
      });
      expect(context.signOut).toHaveBeenCalledWith({ scope: 'local' });
      expect(context.from).not.toHaveBeenCalled();
    });

    it.each([
      { label: 'missing', profile: { data: null, error: null } },
      {
        label: 'unverified',
        profile: {
          data: { email_verified: false, onboarding_completed_at: null, role: 'student' as const },
          error: null,
        },
      },
      { label: 'unavailable', profile: { data: null, error: new Error('database unavailable') } },
    ])('signs out when the profile is $label', async ({ profile }) => {
      const context = arrangeSupabase({ profile });

      const result = await loginAction({
        email: 'student@uwaterloo.ca',
        password: strongPassword,
      });

      expect(result).toEqual({
        ok: false,
        message: "Your account couldn't be prepared. Please try again.",
      });
      expect(context.signOut).toHaveBeenCalledWith({ scope: 'local' });
    });

    it.each(['invalid_credentials', 'user_not_found'])(
      'does not reveal account existence for %s',
      async (code) => {
        const context = arrangeSupabase({ loginError: { code }, loginHasUser: false });

        const result = await loginAction({
          email: 'student@uwaterloo.ca',
          password: 'incorrect-password',
        });

        expect(result).toEqual({ ok: false, message: 'The email or password is incorrect.' });
        expect(context.from).not.toHaveBeenCalled();
      },
    );
  });

  describe('requestPasswordResetAction', () => {
    it('requests recovery without revealing whether a Waterloo account exists', async () => {
      const context = arrangeSupabase();

      const result = await requestPasswordResetAction({ email: 'student@uwaterloo.ca' });

      expect(result).toEqual({
        ok: true,
        message: 'If an eligible account exists, a password recovery email is on its way.',
      });
      expect(context.resetPasswordForEmail).toHaveBeenCalledWith('student@uwaterloo.ca', {
        redirectTo: `${siteUrl}/auth/recovery-callback`,
      });
    });

    it('rejects Gmail recovery before requesting email delivery', async () => {
      const result = await requestPasswordResetAction({ email: 'aayupsuw@gmail.com' });

      expect(result).toEqual({ ok: false, message: 'Use your @uwaterloo.ca email address.' });
      expect(mocks.createClient).not.toHaveBeenCalled();
    });
  });

  describe('updatePasswordAction', () => {
    it('verifies the recovery user, updates the password, signs out locally, and redirects', async () => {
      const cookieStore = { set: vi.fn() };
      mocks.cookies.mockResolvedValue(cookieStore);
      const context = arrangeSupabase();

      await expectRedirect(
        () =>
          updatePasswordAction({
            confirmPassword: strongPassword,
            password: strongPassword,
          }),
        '/login?notice=password-updated',
      );

      expect(context.getUser).toHaveBeenCalledOnce();
      expect(context.updateUser).toHaveBeenCalledWith({ password: strongPassword });
      expect(context.signOut).toHaveBeenCalledWith({ scope: 'local' });
      expect(context.getUser.mock.invocationCallOrder[0]).toBeLessThan(
        context.updateUser.mock.invocationCallOrder[0],
      );
      expect(context.updateUser.mock.invocationCallOrder[0]).toBeLessThan(
        context.signOut.mock.invocationCallOrder[0],
      );
      expect(cookieStore.set).toHaveBeenCalledWith(
        WEB_SESSION_POLICY_COOKIE,
        '',
        expect.objectContaining({ maxAge: 0 }),
      );
      expect(cookieStore.set).toHaveBeenCalledWith(
        WEB_ACTIVITY_COOKIE,
        '',
        expect.objectContaining({ maxAge: 0 }),
      );
    });

    it('does not update a password without an eligible recovery user', async () => {
      const context = arrangeSupabase({ getUserEmail: '' });

      const result = await updatePasswordAction({
        confirmPassword: strongPassword,
        password: strongPassword,
      });

      expect(result).toEqual({
        ok: false,
        message: 'Request a new recovery link before updating your password.',
      });
      expect(context.updateUser).not.toHaveBeenCalled();
      expect(context.signOut).toHaveBeenCalledWith({ scope: 'local' });
    });
  });

  describe('signOutAction', () => {
    it('clears the web inactivity marker before ending the local session', async () => {
      const cookieStore = { set: vi.fn() };
      mocks.cookies.mockResolvedValue(cookieStore);
      const context = arrangeSupabase();

      await expectRedirect(() => signOutAction(), '/login');

      expect(cookieStore.set).toHaveBeenCalledWith(
        WEB_SESSION_POLICY_COOKIE,
        '',
        expect.objectContaining({ maxAge: 0 }),
      );
      expect(cookieStore.set).toHaveBeenCalledWith(
        WEB_ACTIVITY_COOKIE,
        '',
        expect.objectContaining({ maxAge: 0 }),
      );
      expect(context.signOut).toHaveBeenCalledWith({ scope: 'local' });
    });
  });
});
