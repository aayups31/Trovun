import Image from '@/components/ui/ResilientImage';

import { BrandMark } from '@/components/BrandMark';
import { cn } from '@/lib/utils';

type WaterlooCampaignPanelProps = {
  className?: string;
  compact?: boolean;
  variant?: 'auth' | 'default';
};

const CAMPUS_PLACES = ['DC', 'SLC', 'E7', 'UWP', 'ICON', 'LESTER'];

export function WaterlooCampaignPanel({
  className,
  compact = false,
  variant = 'default',
}: WaterlooCampaignPanelProps) {
  if (variant === 'auth') {
    return <WarriorsAuthPanel className={className} compact={compact} />;
  }

  if (compact) {
    return (
      <header
        className={cn(
          'um-ink-canvas relative isolate overflow-hidden border-b border-white/[0.07] px-5 pb-6 pt-4 text-white sm:px-8 sm:pb-7',
          className,
        )}
      >
        <div className="relative z-10 flex items-center justify-between gap-4">
          <BrandMark showCampusLabel={false} tone="light" />
          <p className="text-right text-xs font-medium leading-5 text-white/58">
            Winter · Spring<span className="block">Fall terms</span>
          </p>
        </div>

        <div className="relative z-10 mt-5 flex items-end justify-between gap-5 border-t border-white/[0.08] pt-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-um-gold-400">
              Private student marketplace
            </p>
            <p className="mt-2 max-w-[19rem] text-xl font-bold leading-snug tracking-[-0.02em]">
              Waterloo buys from Waterloo.
            </p>
          </div>
          <p className="hidden text-right text-xs leading-5 text-white/54 min-[430px]:block">
            {CAMPUS_PLACES.slice(0, 3).join(' · ')}
            <span className="block">{CAMPUS_PLACES.slice(3).join(' · ')}</span>
          </p>
        </div>
        <GoldBands />
      </header>
    );
  }

  return (
    <aside
      className={cn(
        'um-ink-canvas relative isolate hidden min-h-screen overflow-hidden px-10 py-9 text-white lg:flex lg:flex-col xl:px-14 xl:py-11',
        className,
      )}
    >
      <div className="relative z-10 flex items-start justify-between gap-6">
        <BrandMark tone="light" />
        <p className="text-right text-xs font-medium leading-5 text-white/58">
          Waterloo terms<span className="block">Student to student</span>
        </p>
      </div>

      <div className="relative z-10 my-auto max-w-2xl py-14">
        <div className="flex items-center gap-4">
          <span aria-hidden="true" className="h-px w-9 bg-um-gold-500" />
          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-um-gold-400">
            Private campus exchange
          </p>
        </div>

        <h2 className="um-balanced mt-8 text-[clamp(3.8rem,6.3vw,6.6rem)] font-bold leading-[0.96] tracking-[-0.03em] text-white">
          Waterloo buys
          <span className="block text-um-gold-300">from Waterloo.</span>
        </h2>

        <div className="mt-10 max-w-lg border-t border-white/[0.09] pt-6">
          <p className="max-w-md text-base leading-7 text-white/74">
            A private marketplace for verified <span className="text-white">@uwaterloo.ca</span>{' '}
            students—built for move-ins, move-outs, co-op terms, and everything between.
          </p>
        </div>
      </div>

      <div className="relative z-10">
        <p className="text-xs font-semibold uppercase tracking-[0.1em] text-um-gold-400">
          Around your Waterloo
        </p>
        <p className="mt-2 text-xs font-medium tracking-[0.04em] text-white/62">
          {CAMPUS_PLACES.join(' · ')}
        </p>
        <p className="mt-3 max-w-md text-xs leading-5 text-white/48">
          Trovun is independent and not an official University of Waterloo service.
        </p>
      </div>
      <GoldBands />
    </aside>
  );
}

function WarriorsAuthPanel({
  className,
  compact,
}: Pick<WaterlooCampaignPanelProps, 'className' | 'compact'>) {
  if (compact) {
    return (
      <header
        className={cn(
          'um-warrior-campaign um-warrior-campaign--compact relative isolate overflow-hidden border-b border-white/[0.08] px-5 pb-6 pt-4 text-white sm:px-8 sm:pb-7',
          className,
        )}
      >
        <WarriorPowerField compact />

        <div className="relative z-10 flex items-center justify-between gap-4">
          <BrandMark showCampusLabel={false} tone="light" />
          <p className="font-condensed text-right text-[0.62rem] font-semibold uppercase leading-5 tracking-[0.16em] text-white/54">
            Verified Waterloo<span className="block text-um-gold-300/78">Student access</span>
          </p>
        </div>

        <div className="relative z-10 mt-7 border-t border-white/[0.1] pt-5">
          <p className="font-condensed text-[0.62rem] font-bold uppercase tracking-[0.2em] text-um-gold-300">
            Waterloo Warriors
          </p>
          <h2 className="mt-2 text-[2rem] font-black uppercase leading-[0.88] tracking-[-0.045em]">
            Go black. <span className="text-um-gold-300">Go gold.</span>
          </h2>
        </div>
        <GoldBands />
      </header>
    );
  }

  return (
    <aside
      className={cn(
        'um-warrior-campaign um-grain relative isolate hidden min-h-screen overflow-hidden border-r border-white/[0.08] px-10 py-9 text-white lg:flex lg:h-full lg:min-h-0 lg:flex-col xl:px-14 xl:py-11',
        className,
      )}
    >
      <WarriorPowerField />

      <div className="relative z-10">
        <BrandMark tone="light" />
      </div>

      <div className="um-warrior-story relative z-10 my-auto max-w-[48rem] py-14">
        <div className="flex items-center gap-4">
          <span aria-hidden="true" className="h-px w-10 bg-um-gold-400" />
          <p className="font-condensed text-[0.68rem] font-bold uppercase tracking-[0.22em] text-um-gold-300">
            One campus. One marketplace.
          </p>
        </div>

        <h2
          aria-label="Go black. Go gold."
          className="um-warrior-slogan mt-8 text-[clamp(4.65rem,7.2vw,7.75rem)] font-black uppercase leading-[0.82] tracking-[-0.065em]"
        >
          <span
            aria-hidden="true"
            className="um-warrior-word um-warrior-word--black"
            data-text="Go black."
          >
            Go black.
          </span>
          <span
            aria-hidden="true"
            className="um-warrior-word um-warrior-word--gold mt-2"
            data-text="Go gold."
          >
            Go gold.
          </span>
        </h2>

        <p className="um-warrior-support mt-9 max-w-sm border-l border-um-gold-400/65 pl-5 text-sm leading-6 text-white/66 xl:text-base xl:leading-7">
          One verified Waterloo identity. A marketplace powered by the people around you.
        </p>
      </div>

      <div className="um-warrior-meta relative z-10 flex items-end justify-between gap-8">
        <div>
          <p className="font-condensed text-[0.65rem] font-bold uppercase tracking-[0.2em] text-um-gold-300">
            Around your Waterloo
          </p>
          <p className="mt-2 font-mono text-[0.62rem] font-medium tracking-[0.09em] text-white/54">
            {CAMPUS_PLACES.join(' · ')}
          </p>
          <p className="mt-3 max-w-md text-[0.68rem] leading-5 text-white/38">
            Trovun is independent and not an official University of Waterloo service.
          </p>
        </div>
        <p className="hidden font-mono text-[0.58rem] uppercase tracking-[0.18em] text-white/28 xl:block">
          Powering campus exchange
        </p>
      </div>
      <GoldBands />
    </aside>
  );
}

function WarriorPowerField({ compact = false }: { compact?: boolean }) {
  return (
    <div aria-hidden="true" className="um-warrior-power-field">
      <div className="um-warrior-head-shell">
        <Image
          alt=""
          className="object-contain"
          fill
          loading="eager"
          sizes={compact ? '19rem' : '(max-width: 1280px) 52vw, 58rem'}
          src="/waterloo/warriors-head.webp"
        />
      </div>
    </div>
  );
}

function GoldBands() {
  return (
    <div
      aria-hidden="true"
      className="absolute inset-x-0 bottom-0 h-px bg-[linear-gradient(90deg,transparent_0%,rgba(231,188,53,0.2)_16%,rgba(231,188,53,0.8)_50%,rgba(231,188,53,0.2)_84%,transparent_100%)]"
    >
      <span className="sr-only">Waterloo gold accent</span>
    </div>
  );
}
