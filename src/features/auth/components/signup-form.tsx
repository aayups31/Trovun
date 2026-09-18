'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowRight, LoaderCircle, RotateCw } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';

import { resendSignupAction, signupAction } from '../actions';
import { signupSchema, type SignupInput } from '../schemas';

const RESEND_COOLDOWN_SECONDS = 60;

export function SignupForm({ nextPath }: { nextPath: string }) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [accountExists, setAccountExists] = useState(false);
  const [showVerificationRecovery, setShowVerificationRecovery] = useState(false);
  const [resendNotice, setResendNotice] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [isPending, startTransition] = useTransition();
  const [isResending, startResendTransition] = useTransition();
  const {
    formState: { errors },
    getValues,
    handleSubmit,
    register,
  } = useForm<SignupInput>({
    defaultValues: { confirmPassword: '', email: '', next: nextPath, password: '' },
    resolver: zodResolver(signupSchema),
  });

  const onSubmit = handleSubmit((values) => {
    setServerError(null);
    setAccountExists(false);
    setShowVerificationRecovery(false);
    setResendNotice(null);
    startTransition(async () => {
      try {
        const result = await signupAction(values);
        if (result && !result.ok) {
          if (result.reason === 'account-exists') {
            setAccountExists(true);
          } else {
            setServerError(result.message);
          }
        }
      } catch {
        setShowVerificationRecovery(true);
        setServerError(
          "We couldn't confirm the result. If your account was created, request a new code below.",
        );
      }
    });
  });

  const loginHref =
    nextPath === '/marketplace' ? '/login' : `/login?next=${encodeURIComponent(nextPath)}`;

  useEffect(() => {
    if (resendCooldown <= 0) return;

    const timer = window.setTimeout(() => setResendCooldown((seconds) => seconds - 1), 1_000);
    return () => window.clearTimeout(timer);
  }, [resendCooldown]);

  const resendVerification = () => {
    if (isResending || resendCooldown > 0) return;

    setServerError(null);
    setResendNotice(null);
    startResendTransition(async () => {
      try {
        const result = await resendSignupAction({
          email: getValues('email'),
          next: nextPath,
        });

        if (result.ok) {
          setResendNotice(result.message);
          setResendCooldown(RESEND_COOLDOWN_SECONDS);
        } else {
          setServerError(result.message);
        }
      } catch {
        setServerError("We couldn't resend the verification email. Try again in a moment.");
      }
    });
  };

  return (
    <form className="mt-10 space-y-5" noValidate onSubmit={onSubmit}>
      <input type="hidden" {...register('next')} />

      <div className="space-y-2">
        <label className="text-sm font-bold text-um-text-strong" htmlFor="signup-email">
          Waterloo email
        </label>
        <input
          aria-describedby={errors.email ? 'signup-email-error' : 'signup-email-hint'}
          aria-invalid={Boolean(errors.email)}
          autoComplete="email"
          autoFocus
          className="h-[3.35rem] w-full rounded-sm border border-black/[0.12] bg-um-surface px-4 text-base text-um-text-strong outline-none transition placeholder:text-um-text-muted hover:border-black/25 focus:border-um-gold-600 focus:ring-4 focus:ring-um-gold-400/20 disabled:cursor-not-allowed disabled:bg-black/[0.03]"
          disabled={isPending}
          id="signup-email"
          inputMode="email"
          placeholder="yourname@uwaterloo.ca"
          type="email"
          {...register('email')}
        />
        {errors.email ? (
          <p className="text-sm font-medium text-red-700" id="signup-email-error">
            {errors.email.message}
          </p>
        ) : (
          <p className="text-sm text-um-text-muted" id="signup-email-hint">
            Only verified @uwaterloo.ca students can join.
          </p>
        )}
      </div>

      <div className="space-y-2">
        <label className="text-sm font-bold text-um-text-strong" htmlFor="signup-password">
          Password
        </label>
        <input
          aria-describedby={errors.password ? 'signup-password-error' : 'signup-password-hint'}
          aria-invalid={Boolean(errors.password)}
          autoComplete="new-password"
          className="h-[3.35rem] w-full rounded-sm border border-black/[0.12] bg-um-surface px-4 text-base text-um-text-strong outline-none transition placeholder:text-um-text-muted hover:border-black/25 focus:border-um-gold-600 focus:ring-4 focus:ring-um-gold-400/20 disabled:cursor-not-allowed disabled:bg-black/[0.03]"
          disabled={isPending}
          id="signup-password"
          placeholder="Create a password"
          type="password"
          {...register('password')}
        />
        {errors.password ? (
          <p className="text-sm font-medium text-red-700" id="signup-password-error">
            {errors.password.message}
          </p>
        ) : (
          <p className="text-sm text-um-text-muted" id="signup-password-hint">
            Minimum 8 characters with uppercase, lowercase, and a number.
          </p>
        )}
      </div>

      <div className="space-y-2">
        <label className="text-sm font-bold text-um-text-strong" htmlFor="confirm-password">
          Confirm password
        </label>
        <input
          aria-describedby={errors.confirmPassword ? 'confirm-password-error' : undefined}
          aria-invalid={Boolean(errors.confirmPassword)}
          autoComplete="new-password"
          className="h-[3.35rem] w-full rounded-sm border border-black/[0.12] bg-um-surface px-4 text-base text-um-text-strong outline-none transition placeholder:text-um-text-muted hover:border-black/25 focus:border-um-gold-600 focus:ring-4 focus:ring-um-gold-400/20 disabled:cursor-not-allowed disabled:bg-black/[0.03]"
          disabled={isPending}
          id="confirm-password"
          placeholder="Repeat your password"
          type="password"
          {...register('confirmPassword')}
        />
        {errors.confirmPassword ? (
          <p className="text-sm font-medium text-red-700" id="confirm-password-error">
            {errors.confirmPassword.message}
          </p>
        ) : null}
      </div>

      {serverError ? (
        <div
          aria-live="polite"
          className="border-l-2 border-red-600 bg-red-50/80 px-4 py-3 text-sm font-medium text-red-800"
          role="alert"
        >
          {serverError}
        </div>
      ) : null}

      {showVerificationRecovery && !accountExists ? (
        <div
          aria-live="polite"
          className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-white/10 bg-white/[0.04] px-4 py-3"
          role="status"
        >
          <button
            className="um-auth-forgot-password inline-flex min-h-9 items-center gap-1.5 rounded-md px-1 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-um-gold-500 disabled:cursor-wait disabled:opacity-60"
            disabled={isResending || resendCooldown > 0}
            onClick={resendVerification}
            type="button"
          >
            <RotateCw
              aria-hidden="true"
              className={`size-3.5 ${isResending ? 'animate-spin' : ''}`}
            />
            {isResending
              ? 'Sending…'
              : resendCooldown > 0
                ? `Resend in ${resendCooldown}s`
                : 'Send new code'}
          </button>
          {resendNotice ? (
            <p className="text-sm font-medium text-um-gold-200">{resendNotice}</p>
          ) : null}
        </div>
      ) : null}

      {accountExists ? (
        <div
          aria-live="polite"
          className="animate-in fade-in slide-in-from-bottom-2 rounded-lg border border-white/10 bg-white/[0.04] px-4 py-3 duration-300"
          role="status"
        >
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <p className="text-base font-bold tracking-[-0.015em] text-um-text-strong">
              Email already registered.
            </p>
            <div className="flex w-full flex-wrap items-center gap-x-4 gap-y-2 sm:ml-auto sm:w-auto">
              <Link
                className="um-auth-forgot-password inline-flex min-h-9 items-center rounded-md px-1 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-um-gold-500"
                href="/forgot-password"
              >
                Forgot password?
              </Link>
              <Link
                className="group inline-flex min-h-10 items-center justify-center gap-2 rounded-full bg-um-gold-300 px-4 text-sm font-black text-um-ink-950 transition hover:bg-um-gold-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-um-gold-500 focus-visible:ring-offset-2 focus-visible:ring-offset-um-ink-950"
                href={loginHref}
              >
                Sign in
                <ArrowRight
                  aria-hidden="true"
                  className="size-4 transition-transform group-hover:translate-x-1"
                />
              </Link>
            </div>
          </div>
        </div>
      ) : null}

      {!accountExists ? (
        <>
          <button
            className="group flex h-[3.35rem] w-full items-center justify-center gap-3 rounded-sm bg-um-ink-950 px-5 text-sm font-black text-white transition hover:bg-um-ink-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-um-gold-400/45 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isPending}
            type="submit"
          >
            {isPending ? (
              <>
                <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
                Joining…
              </>
            ) : (
              <>
                Join Trovun
                <ArrowRight
                  aria-hidden="true"
                  className="size-4 text-um-gold-400 transition-transform group-hover:translate-x-1"
                />
              </>
            )}
          </button>

          <p className="flex flex-wrap items-center justify-center gap-x-1.5 text-center text-sm text-um-text-muted">
            <span>Already have an account?</span>
            <Link
              className="inline-flex min-h-11 items-center font-bold leading-5 text-um-text-strong underline decoration-um-gold-500 decoration-2 underline-offset-4 transition hover:text-um-gold-200 hover:decoration-um-gold-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-um-gold-500"
              href={loginHref}
            >
              Sign in
            </Link>
          </p>
        </>
      ) : null}
    </form>
  );
}
