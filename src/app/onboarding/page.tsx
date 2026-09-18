import type { Metadata } from 'next';
import Image from '@/components/ui/ResilientImage';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';

import { BrandMark } from '@/components/BrandMark';
import { SignOutButton } from '@/features/auth/components/sign-out-button';
import { OnboardingForm } from '@/features/onboarding/components/onboarding-form';
import { ACADEMIC_YEARS, type OnboardingInput } from '@/features/onboarding/schemas';
import { getSafeNextPath } from '@/lib/auth/navigation';
import { getCurrentIdentity, getViewer } from '@/lib/auth/session';

export const metadata: Metadata = {
  title: 'Set up your profile',
  description: 'Complete your private Waterloo student profile.',
  robots: {
    index: false,
    follow: false,
    noarchive: true,
    nocache: true,
  },
};

type OnboardingPageProps = {
  searchParams: Promise<{ next?: string | string[] }>;
};

function knownAcademicYear(value: string | null) {
  return ACADEMIC_YEARS.find((year) => year === value);
}

export default async function OnboardingPage({ searchParams }: OnboardingPageProps) {
  const params = await searchParams;
  const requestedNext = Array.isArray(params.next) ? params.next[0] : params.next;
  const nextPath = getSafeNextPath(requestedNext);
  const identity = await getCurrentIdentity();

  if (!identity) {
    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  }

  const viewer = await getViewer();

  if (!viewer) {
    return (
      <OnboardingFrame action={<SignOutButton />}>
        <div className="rounded-[1rem] border border-red-900/15 bg-red-50/55 p-5">
          <p className="text-[0.66rem] font-semibold uppercase tracking-[0.17em] text-red-700">
            Profile service unavailable
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-[#111311]">
            We couldn’t prepare your profile.
          </h1>
          <p className="mt-3 max-w-lg leading-7 text-black/58">
            We verified your email but couldn’t prepare your profile. Sign out, then try again.
          </p>
        </div>
      </OnboardingFrame>
    );
  }

  if (viewer.profile.role === 'moderator' || viewer.profile.onboarding_completed_at) {
    redirect(nextPath);
  }

  const initialValues: Partial<OnboardingInput> = {
    academicYear: knownAcademicYear(viewer.profile.academic_year),
    fullName: viewer.profile.full_name ?? '',
    program: viewer.profile.program ?? '',
    residenceArea: viewer.profile.residence_area ?? '',
  };

  return (
    <OnboardingFrame action={<SignOutButton />}>
      <section className="relative">
        <div>
          <p className="text-[0.67rem] font-semibold uppercase tracking-[0.18em] text-[#8b6900]">
            One last step
          </p>
          <h1 className="um-balanced mt-4 max-w-2xl text-[clamp(3rem,5.6vw,5.1rem)] font-semibold leading-[0.94] tracking-[-0.057em] text-um-text-strong">
            Make Trovun yours.
          </h1>
          <p className="um-pretty mt-5 max-w-xl text-base leading-7 text-black/50">
            Add the details students need to recognize who they are trading with.
          </p>

          <div className="mt-7 flex flex-wrap gap-x-6 gap-y-2 border-y border-black/[0.09] py-3.5 text-xs text-black/44">
            <span>Exact address never requested</span>
            <span>Residence area stays private</span>
          </div>

          <OnboardingForm email={viewer.email} initialValues={initialValues} nextPath={nextPath} />
        </div>
      </section>
    </OnboardingFrame>
  );
}

function OnboardingFrame({ action, children }: { action?: ReactNode; children: ReactNode }) {
  return (
    <main className="min-h-screen bg-[#eee9df] text-um-text-strong">
      <div className="mx-auto grid min-h-screen max-w-[100rem] lg:grid-cols-[minmax(25rem,0.78fr)_minmax(38rem,1.22fr)]">
        <OnboardingIdentityPanel />

        <div className="relative flex min-h-screen flex-col bg-[#eee9df]">
          <div className="border-b border-white/[0.08] bg-[#0a0d12] px-5 py-4 text-white sm:px-8 lg:hidden">
            <div className="flex items-center justify-between gap-4">
              <BrandMark showCampusLabel={false} tone="light" />
              <span className="text-[0.64rem] font-semibold uppercase tracking-[0.16em] text-um-gold-300">
                Profile setup
              </span>
            </div>
          </div>

          <header className="flex min-h-[4.5rem] items-center justify-between border-b border-black/[0.09] px-5 sm:px-10 lg:px-12 xl:px-16">
            <p className="text-[0.66rem] font-semibold uppercase tracking-[0.17em] text-black/38">
              Verified Waterloo access
            </p>
            {action}
          </header>

          <div className="flex flex-1 items-center px-5 py-9 sm:px-10 sm:py-12 lg:px-12 xl:px-16">
            <div className="mx-auto w-full max-w-[43rem]">{children}</div>
          </div>

          <footer className="flex items-center justify-between border-t border-black/[0.08] px-5 py-4 text-[0.66rem] text-black/34 sm:px-10 lg:px-12 xl:px-16">
            <span>Private campus exchange</span>
            <span>Waterloo, Ontario</span>
          </footer>
        </div>
      </div>
    </main>
  );
}

function OnboardingIdentityPanel() {
  return (
    <aside className="relative isolate hidden min-h-screen overflow-hidden border-r border-white/[0.08] bg-[#080a0e] px-10 py-9 text-white lg:flex lg:flex-col xl:px-14 xl:py-11">
      <Image
        alt=""
        className="-z-30 object-cover object-[52%_50%] opacity-36"
        fill
        priority
        quality={90}
        sizes="42vw"
        src="/waterloo/slc-interior.webp"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-20 bg-[linear-gradient(180deg,rgba(8,10,14,0.42),rgba(8,10,14,0.8)_56%,#080a0e),linear-gradient(90deg,#080a0e_0%,transparent_68%)]"
      />
      <div
        aria-hidden="true"
        className="absolute -left-32 top-1/3 -z-10 size-[30rem] rounded-full bg-um-gold-300/[0.08] blur-[7rem]"
      />

      <div className="relative z-10">
        <BrandMark tone="light" />
      </div>

      <div className="relative z-10 my-auto max-w-xl py-14">
        <div className="flex items-center gap-3 text-[0.67rem] font-semibold uppercase tracking-[0.18em] text-um-gold-300">
          <span aria-hidden="true" className="size-1.5 rounded-full bg-um-gold-300" />
          Your Waterloo profile
        </div>
        <h2 className="um-balanced mt-7 text-[clamp(3.65rem,5.4vw,5.7rem)] font-semibold leading-[0.92] tracking-[-0.06em] text-[#f6f1e8]">
          You’re in.
          <span className="block text-um-gold-300">Make it yours.</span>
        </h2>
        <p className="mt-7 max-w-sm text-base leading-7 text-white/52">
          A recognizable profile makes every message and exchange feel closer to campus.
        </p>
      </div>

      <div className="relative z-10 flex items-end justify-between gap-6 border-t border-white/[0.09] pt-5 text-xs text-white/38">
        <span>Student to student</span>
        <span>DC · SLC · E7</span>
      </div>
    </aside>
  );
}
