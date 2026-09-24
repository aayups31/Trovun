'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { WandSparkles, X } from 'lucide-react';
import type { ReactNode } from 'react';

export function AiPanel({
  label,
  title,
  children,
  open,
  onOpenChange,
}: {
  label: string;
  title: string;
  children: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Trigger asChild>
        <button
          type="button"
          className="inline-flex min-h-11 items-center gap-2 rounded-full px-3 text-xs font-medium text-um-gold-300/85 transition-colors hover:bg-um-gold-300/10 hover:text-um-gold-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-um-gold-300"
          aria-label={label}
        >
          <WandSparkles aria-hidden="true" className="size-4" strokeWidth={1.7} />
          {label}
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[90] bg-black/55 backdrop-blur-sm" />
        <Dialog.Content className="fixed inset-x-3 bottom-3 z-[91] max-h-[85dvh] overflow-y-auto rounded-2xl border border-white/10 bg-[#101720] p-5 text-sm text-[#f1eee5] shadow-2xl focus:outline-none sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:w-[min(30rem,calc(100vw-2rem))] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <Dialog.Title className="flex items-center gap-2 text-base font-semibold">
              <WandSparkles aria-hidden="true" className="size-4 text-um-gold-300" />
              {title}
            </Dialog.Title>
            <Dialog.Close
              className="-mr-2 grid size-11 shrink-0 place-items-center rounded-full text-white/50 hover:bg-white/5 hover:text-white"
              aria-label="Close AI help"
            >
              <X aria-hidden="true" className="size-4" />
            </Dialog.Close>
          </div>
          <Dialog.Description className="sr-only">
            Optional AI assistance. Review suggestions before using them.
          </Dialog.Description>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
