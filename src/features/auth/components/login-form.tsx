'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowRight, LoaderCircle } from 'lucide-react';
import Link from 'next/link';
import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';

import { loginAction } from '../actions';
import { loginSchema, type LoginInput } from '../schemas';

type LoginFormProps = {
  nextPath: string;
};

export function LoginForm({ nextPath }: LoginFormProps) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const {
    formState: { errors },
    handleSubmit,
    register,
  } = useForm<LoginInput>({
    defaultValues: { email: '', next: nextPath, password: '' },
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = handleSubmit((values) => {
    setServerError(null);

    startTransition(async () => {
      try {
        const result = await loginAction(values);
        if (result && !result.ok) setServerError(result.message);
      } catch {
        setServerError('Something went wrong. Check your connection and try again.');
      }
    });
  });

  const signupHref =
    nextPath === '/marketplace' ? '/signup' : `/signup?next=${encodeURIComponent(nextPath)}`;

  return (
    <form className="mt-10 space-y-5" noValidate onSubmit={onSubmit}>
      <input type="hidden" {...register('next')} />

      <div className="space-y-2">
        <label className="text-sm font-bold text-um-text-strong" htmlFor="login-email">
          Email
        </label>
        <input
          aria-describedby={errors.email ? 'login-email-error' : undefined}
          aria-invalid={Boolean(errors.email)}
          autoComplete="email"
          autoFocus
          className="h-[3.35rem] w-full rounded-sm border border-black/[0.12] bg-um-surface px-4 text-base text-um-text-strong outline-none transition placeholder:text-um-text-muted hover:border-black/25 focus:border-um-gold-600 focus:ring-4 focus:ring-um-gold-400/20 disabled:cursor-not-allowed disabled:bg-black/[0.03]"
          disabled={isPending}
          id="login-email"
          inputMode="email"
          placeholder="yourname@uwaterloo.ca"
          type="email"
          {...register('email')}
        />
        {errors.email ? (
          <p className="text-sm font-medium text-red-700" id="login-email-error">
            {errors.email.message}
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <label className="text-sm font-bold text-um-text-strong" htmlFor="login-password">
            Password
          </label>
          <Link
            className="-my-3 inline-flex min-h-11 items-center text-xs font-bold text-um-gold-700 underline decoration-um-gold-500 underline-offset-4 transition hover:text-um-gold-200 hover:decoration-um-gold-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-um-gold-500"
            href="/forgot-password"
          >
            Forgot password?
          </Link>
        </div>
        <input
          aria-describedby={errors.password ? 'login-password-error' : undefined}
          aria-invalid={Boolean(errors.password)}
          autoComplete="current-password"
          className="h-[3.35rem] w-full rounded-sm border border-black/[0.12] bg-um-surface px-4 text-base text-um-text-strong outline-none transition placeholder:text-um-text-muted hover:border-black/25 focus:border-um-gold-600 focus:ring-4 focus:ring-um-gold-400/20 disabled:cursor-not-allowed disabled:bg-black/[0.03]"
          disabled={isPending}
          id="login-password"
          placeholder="Your password"
          type="password"
          {...register('password')}
        />
        {errors.password ? (
          <p className="text-sm font-medium text-red-700" id="login-password-error">
            {errors.password.message}
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

      <button
        className="group flex h-[3.35rem] w-full items-center justify-center gap-3 rounded-sm bg-um-ink-950 px-5 text-sm font-black text-white transition hover:bg-um-ink-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-um-gold-400/45 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isPending}
        type="submit"
      >
        {isPending ? (
          <>
            <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
            Signing in…
          </>
        ) : (
          <>
            Sign in
            <ArrowRight
              aria-hidden="true"
              className="size-4 text-um-gold-400 transition-transform group-hover:translate-x-1"
            />
          </>
        )}
      </button>

      <p className="flex flex-wrap items-center justify-center gap-x-1.5 text-center text-sm text-um-text-muted">
        <span>New to Trovun?</span>
        <Link
          className="inline-flex min-h-11 items-center font-bold leading-5 text-um-text-strong underline decoration-um-gold-500 decoration-2 underline-offset-4 transition hover:text-um-gold-200 hover:decoration-um-gold-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-um-gold-500"
          href={signupHref}
        >
          Create an account
        </Link>
      </p>
    </form>
  );
}
