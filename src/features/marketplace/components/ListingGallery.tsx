'use client';

import Image from '@/components/ui/ResilientImage';
import { ImageIcon } from 'lucide-react';
import { useState } from 'react';

import type { MarketplaceImage, MarketplaceListing } from '../types';

export function ListingGallery({ listing }: { listing: MarketplaceListing }) {
  const availableImages = listing.images.filter(
    (image): image is MarketplaceImage & { url: string } => Boolean(image.url),
  );
  const [selectedId, setSelectedId] = useState(availableImages[0]?.id ?? null);
  const selectedImage =
    availableImages.find((image) => image.id === selectedId) ?? availableImages[0] ?? null;
  const selectedPosition = selectedImage
    ? availableImages.findIndex((image) => image.id === selectedImage.id) + 1
    : 0;

  return (
    <section aria-label="Listing photos">
      <div className="relative aspect-[4/3] overflow-hidden rounded-[1.35rem] border border-white/[0.08] bg-[#111923] shadow-[0_30px_90px_rgba(0,0,0,0.28)] lg:aspect-[7/5]">
        {selectedImage ? (
          <Image
            alt={`${listing.title}, photo ${selectedPosition} of ${availableImages.length}`}
            className="object-contain object-center"
            fill
            priority
            sizes="(min-width: 1320px) 863px, (min-width: 1208px) calc(71vw - 74px), (min-width: 1024px) calc(100vw - 424px), (min-width: 640px) calc(100vw - 48px), calc(100vw - 32px)"
            src={selectedImage.url}
            style={{ objectFit: 'contain', objectPosition: 'center' }}
          />
        ) : (
          <div className="relative isolate grid h-full place-items-center overflow-hidden bg-[radial-gradient(circle_at_50%_35%,rgba(231,188,53,0.09),transparent_18rem),#111923] px-8 text-center">
            <div className="relative">
              <span className="mx-auto grid size-14 place-items-center rounded-full bg-white/[0.055] text-white/48 ring-1 ring-white/[0.08]">
                <ImageIcon aria-hidden="true" className="size-6" />
              </span>
              <p className="mt-3 text-sm font-medium text-white/48">Photo unavailable</p>
            </div>
          </div>
        )}

        {availableImages.length > 1 ? (
          <span className="absolute bottom-3 right-3 rounded-full border border-white/[0.1] bg-um-ink-950/76 px-3 py-1.5 text-xs font-bold tabular-nums text-white shadow-um-xs backdrop-blur-md">
            {selectedPosition} / {availableImages.length}
          </span>
        ) : null}
      </div>

      {availableImages.length > 1 ? (
        <div
          aria-label="Choose a listing photo"
          className="mt-4 flex gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          role="group"
        >
          {availableImages.map((image, index) => {
            const isSelected = image.id === selectedImage?.id;

            return (
              <button
                aria-label={`Show photo ${index + 1} of ${availableImages.length}`}
                aria-pressed={isSelected}
                className={`relative aspect-[4/3] h-16 shrink-0 overflow-hidden rounded-[0.7rem] bg-[#111923] transition duration-160 ease-um-out hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-um-gold-400 focus-visible:ring-offset-2 focus-visible:ring-offset-um-ink-950 sm:h-[4.5rem] ${
                  isSelected
                    ? 'ring-2 ring-um-gold-400 ring-offset-2 ring-offset-um-ink-950'
                    : 'opacity-[0.68] hover:opacity-100'
                }`}
                key={image.id}
                onClick={() => setSelectedId(image.id)}
                type="button"
              >
                <Image
                  alt=""
                  className="object-contain object-center"
                  fill
                  sizes="(min-width: 640px) 96px, 86px"
                  src={image.url}
                  style={{ objectFit: 'contain', objectPosition: 'center' }}
                />
              </button>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
