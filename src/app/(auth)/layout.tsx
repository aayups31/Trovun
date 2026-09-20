import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { WaterlooCampaignPanel } from '@/features/auth/components/waterloo-campaign-panel';

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    noarchive: true,
    nocache: true,
  },
};

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="um-auth-dark min-h-screen bg-um-ink-950 text-um-text-strong lg:h-dvh lg:min-h-0 lg:overflow-hidden">
      <div className="um-auth-layout-grid mx-auto grid min-h-screen max-w-[112rem] lg:h-full lg:min-h-0 lg:grid-cols-[minmax(27rem,0.82fr)_minmax(34rem,1fr)]">
        <WaterlooCampaignPanel variant="auth" />

        <div className="um-ink-canvas relative flex min-h-screen flex-col overflow-hidden lg:h-full lg:min-h-0">
          <WaterlooCampaignPanel compact className="lg:hidden" variant="auth" />

          <section className="um-auth-form-stage relative flex flex-1 flex-col px-5 py-9 sm:px-10 sm:py-12 lg:min-h-0 lg:px-12 lg:py-8 xl:px-20 xl:py-9">
            <div className="mx-auto hidden w-full max-w-lg items-center justify-between border-b border-white/[0.08] pb-4 lg:flex">
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-um-gold-700">
                Verified Waterloo access
              </p>
              <p className="text-xs font-medium text-um-text-muted">Private marketplace</p>
            </div>

            <div className="mx-auto my-auto flex w-full max-w-lg shrink-0 items-center py-5 lg:py-4">
              <div className="um-auth-form-card um-fade-up w-full">{children}</div>
            </div>

            <footer className="mx-auto mt-5 flex w-full max-w-lg items-center justify-between border-t border-white/[0.08] pt-4 text-xs text-um-text-muted">
              <span>Verified Waterloo access</span>
              <span>DC · SLC · E7</span>
            </footer>
          </section>
        </div>
      </div>
    </main>
  );
}
