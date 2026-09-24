'use server';

import { revalidatePath } from 'next/cache';
import { after } from 'next/server';
import { processListingReviews } from '@/features/ai/moderation';
import type { SupabaseClient } from '@supabase/supabase-js';
import { requireStudentSeller } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';
import {
  imageRegistrationSchema,
  LISTING_IMAGE_MAX_COUNT,
  listingIdSchema,
  listingDraftSchema,
  listingPublishSchema,
  moderationRemovalSchema,
  type ListingDraftInput,
} from './schemas';
import { publishErrorMessage } from './publish-error-message';

const IMAGE_BUCKET = 'listing-images';

function startBackgroundReviews() {
  // The durable queue survives failures; cron or a moderator can retry it.
  if (!process.env.OPENAI_API_KEY || !process.env.SUPABASE_SECRET_KEY) return;
  try {
    after(async () => {
      try {
        await processListingReviews();
      } catch {
        console.error('[ai-review] Background checks unavailable; queued work retained.');
      }
    });
  } catch {
    console.error('[ai-review] Could not start background check; queued work retained.');
  }
}

export type ListingActionResult<T = undefined> =
  { ok: true; data: T } | { ok: false; message: string; fieldErrors?: Record<string, string> };

type SavedDraft = { id: string; version: number };
type RegisteredImage = {
  id: string;
  path: string;
  position: number;
  signedUploadUrl: string;
};
type ReverifiedImage = { id: string; url: string };
type ReservedImage = { id: string; storagePath: string; position: number };
type SupabaseActionError = {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
};

function toFieldErrors(issues: { path: PropertyKey[]; message: string }[]) {
  return Object.fromEntries(
    issues.flatMap((issue) => {
      const key = issue.path[0];
      return typeof key === 'string' ? [[key, issue.message]] : [];
    }),
  );
}

function untyped(client: Awaited<ReturnType<typeof createClient>>) {
  return client as unknown as SupabaseClient;
}

function logSupabaseActionError(operation: string, error: SupabaseActionError) {
  console.error(`[listings] ${operation} failed`, {
    code: error.code,
    message: error.message,
    details: error.details,
    hint: error.hint,
  });
}

function safeRevalidatePath(path: string) {
  try {
    revalidatePath(path);
  } catch (error) {
    // The database write has already committed. Do not turn a cache refresh
    // failure into a failed save that the client may retry as a second draft.
    console.error(`[listings] revalidation failed for ${path}`, error);
  }
}

function parseReservedImage(value: unknown, expectedId: string): ReservedImage | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;

  const row = value as Record<string, unknown>;
  const id = typeof row.id === 'string' ? row.id : '';
  const storagePath = typeof row.storage_path === 'string' ? row.storage_path : '';
  const position = typeof row.position === 'number' ? row.position : Number.NaN;

  if (
    id !== expectedId ||
    storagePath.length === 0 ||
    !Number.isInteger(position) ||
    position < 0 ||
    position >= LISTING_IMAGE_MAX_COUNT
  ) {
    return null;
  }

  return { id, storagePath, position };
}

export async function saveListingDraftAction(
  input: ListingDraftInput,
): Promise<ListingActionResult<SavedDraft>> {
  await requireStudentSeller('/listings/new');
  const parsed = listingDraftSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      message: 'Check the highlighted listing details and try again.',
      fieldErrors: toFieldErrors(parsed.error.issues),
    };
  }

  const supabase = untyped(await createClient());
  const { data, error } = await supabase.rpc('save_listing_draft', {
    p_listing_id: parsed.data.listingId ?? null,
    p_title: parsed.data.title,
    p_description: parsed.data.description,
    p_price_cents: parsed.data.priceCents,
    p_category_id: parsed.data.categoryId,
    p_condition: parsed.data.condition,
    p_open_to_offers: parsed.data.openToOffers,
    p_pickup_area: parsed.data.pickupArea,
    p_pickup_latitude: parsed.data.pickupLatitude,
    p_pickup_longitude: parsed.data.pickupLongitude,
  });

  if (error || !data) {
    if (error) logSupabaseActionError('save draft RPC', error);
    return { ok: false, message: 'Your draft could not be created. Please try again.' };
  }

  safeRevalidatePath('/my-listings');
  safeRevalidatePath('/marketplace');
  safeRevalidatePath(`/listings/${data.id}`);
  startBackgroundReviews();
  return { ok: true, data: data as SavedDraft };
}

export async function publishListingAction(
  input: ListingDraftInput,
): Promise<ListingActionResult<{ id: string }>> {
  await requireStudentSeller('/listings/new');
  const parsed = listingPublishSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      message: 'Your listing needs a few more details before it can be published.',
      fieldErrors: toFieldErrors(parsed.error.issues),
    };
  }

  const saved = await saveListingDraftAction(parsed.data);
  if (!saved.ok) return saved;

  const supabase = untyped(await createClient());
  const { error } = await supabase.rpc('publish_listing', {
    p_listing_id: saved.data.id,
  });

  if (error) {
    logSupabaseActionError('publish RPC', error);
    return { ok: false, message: publishErrorMessage(error) };
  }

  safeRevalidatePath('/marketplace');
  safeRevalidatePath('/my-listings');
  safeRevalidatePath(`/listings/${saved.data.id}`);
  startBackgroundReviews();
  return { ok: true, data: { id: saved.data.id } };
}

export async function registerListingImageAction(
  input: unknown,
): Promise<ListingActionResult<RegisteredImage>> {
  await requireStudentSeller('/listings/new');
  const parsed = imageRegistrationSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? 'That image is not supported.',
    };
  }

  const supabase = untyped(await createClient());
  const { data: reservationData, error: reservationError } = await supabase
    .rpc('reserve_listing_image', {
      p_listing_id: parsed.data.listingId,
      p_image_id: parsed.data.imageId,
      p_mime_type: parsed.data.mimeType,
      p_size_bytes: parsed.data.sizeBytes,
      p_width: parsed.data.width ?? null,
      p_height: parsed.data.height ?? null,
    })
    .single();

  const reserved = parseReservedImage(reservationData, parsed.data.imageId);

  if (reservationError || !reserved) {
    const message = reservationError?.message?.toLowerCase() ?? '';
    if (message.includes('up to six images')) {
      return { ok: false, message: 'A listing can include up to six images.' };
    }
    if (message.includes('no longer editable')) {
      return { ok: false, message: 'This listing is no longer editable.' };
    }
    if (message.includes('cannot be reused')) {
      return { ok: false, message: 'That image reservation is no longer available.' };
    }
    if (reservationError) logSupabaseActionError('reserve image RPC', reservationError);
    return { ok: false, message: 'The image upload could not be prepared. Please try again.' };
  }

  const path = reserved.storagePath;
  const { data: signedUpload, error: signedUploadError } = await supabase.storage
    .from(IMAGE_BUCKET)
    .createSignedUploadUrl(path, { upsert: false });

  if (signedUploadError || !signedUpload?.signedUrl) {
    if (signedUploadError) logSupabaseActionError('create signed image upload', signedUploadError);
    // The reservation intentionally remains pending. Retrying with the same
    // image UUID recovers it and produces a fresh short-lived upload token.
    return { ok: false, message: 'The secure image upload could not be started. Please retry.' };
  }

  return {
    ok: true,
    data: {
      id: reserved.id,
      path,
      position: reserved.position,
      signedUploadUrl: signedUpload.signedUrl,
    },
  };
}

export async function finalizeListingImageAction(input: {
  listingId: string;
  imageId: string;
}): Promise<ListingActionResult<{ imageId: string }>> {
  const viewer = await requireStudentSeller('/listings/new');
  const supabase = untyped(await createClient());
  const { data: image, error: imageError } = await supabase
    .from('listing_images')
    .select('id,upload_status,listings!inner(seller_id)')
    .eq('id', input.imageId)
    .eq('listing_id', input.listingId)
    .eq('listings.seller_id', viewer.id)
    .maybeSingle();

  if (imageError || !image) {
    if (imageError) logSupabaseActionError('read image before finalization', imageError);
    return { ok: false, message: 'The uploaded image could not be verified.' };
  }

  // A lost Server Action response must not make an already-committed upload
  // look like a failure when the client retries finalization.
  if (image.upload_status === 'uploaded') {
    safeRevalidatePath('/marketplace');
    safeRevalidatePath(`/listings/${input.listingId}`);
    return { ok: true, data: { imageId: input.imageId } };
  }

  // private.validate_listing_image() is the single source of truth here. It
  // atomically proves the Storage object exists and that its MIME and byte size
  // match the contract before accepting the uploaded state.
  const { data: finalized, error } = await supabase
    .from('listing_images')
    .update({ upload_status: 'uploaded' })
    .eq('id', input.imageId)
    .eq('listing_id', input.listingId)
    .select('id')
    .maybeSingle();

  if (error || !finalized) {
    const message = error?.message?.toLowerCase() ?? '';
    if (message.includes('storage object is missing or invalid')) {
      return { ok: false, message: 'The upload did not finish. Retry this image.' };
    }
    if (error) logSupabaseActionError('finalize image metadata', error);
    return { ok: false, message: 'The uploaded image could not be finalized.' };
  }

  safeRevalidatePath('/marketplace');
  safeRevalidatePath(`/listings/${input.listingId}`);
  startBackgroundReviews();
  return { ok: true, data: { imageId: input.imageId } };
}

export async function removeListingImageAction(input: {
  listingId: string;
  imageId: string;
}): Promise<ListingActionResult<{ imageId: string }>> {
  const viewer = await requireStudentSeller('/listings/new');
  const supabase = untyped(await createClient());
  const { data: image } = await supabase
    .from('listing_images')
    .select(
      'id,storage_path,position,upload_status,mime_type,size_bytes,width,height,listings!inner(seller_id,status)',
    )
    .eq('id', input.imageId)
    .eq('listing_id', input.listingId)
    .eq('listings.seller_id', viewer.id)
    .maybeSingle();

  if (!image) return { ok: false, message: 'That image is no longer attached.' };

  const parent = Array.isArray(image.listings) ? image.listings[0] : image.listings;
  const isPublished = parent?.status === 'published';

  if (isPublished) {
    // Published objects remain immutable while attached. Detach the metadata
    // first; the database rejects removing the final published image.
    const { error: metadataError } = await supabase
      .from('listing_images')
      .delete()
      .eq('id', input.imageId);
    if (metadataError) {
      const message = metadataError.message.toLowerCase();
      return {
        ok: false,
        message: message.includes('retain at least one')
          ? 'Add a replacement before removing the only image on a live listing.'
          : 'The image could not be removed.',
      };
    }

    const { error: storageError } = await supabase.storage
      .from(IMAGE_BUCKET)
      .remove([String(image.storage_path)]);

    if (storageError) {
      // If Storage definitely kept the object, restore its metadata so the
      // live listing and editor stay consistent and the owner can retry.
      const { error: restoreError } = await supabase.from('listing_images').insert({
        id: image.id,
        listing_id: input.listingId,
        storage_path: image.storage_path,
        position: image.position,
        upload_status: image.upload_status,
        mime_type: image.mime_type,
        size_bytes: image.size_bytes,
        width: image.width,
        height: image.height,
      });
      if (!restoreError) {
        return { ok: false, message: 'The image could not be removed. Please try again.' };
      }
    }
  } else {
    const { error: storageError } = await supabase.storage
      .from(IMAGE_BUCKET)
      .remove([String(image.storage_path)]);
    if (storageError) return { ok: false, message: 'The image file could not be removed.' };

    const { error: metadataError } = await supabase
      .from('listing_images')
      .delete()
      .eq('id', input.imageId);
    if (metadataError) return { ok: false, message: 'The image could not be removed.' };
  }

  const { data: remaining } = await supabase
    .from('listing_images')
    .select('id')
    .eq('listing_id', input.listingId)
    .order('position');
  if (remaining && remaining.length > 0) {
    await supabase.rpc('reorder_listing_images', {
      p_listing_id: input.listingId,
      p_image_ids: remaining.map((item) => item.id),
    });
  }

  safeRevalidatePath('/marketplace');
  safeRevalidatePath(`/listings/${input.listingId}`);
  startBackgroundReviews();
  return { ok: true, data: { imageId: input.imageId } };
}

export async function reorderListingImagesAction(input: {
  listingId: string;
  imageIds: string[];
}): Promise<ListingActionResult<{ imageIds: string[] }>> {
  await requireStudentSeller('/listings/new');
  if (
    input.imageIds.length > LISTING_IMAGE_MAX_COUNT ||
    new Set(input.imageIds).size !== input.imageIds.length
  ) {
    return { ok: false, message: 'The new image order is invalid.' };
  }

  const supabase = untyped(await createClient());
  const { error } = await supabase.rpc('reorder_listing_images', {
    p_listing_id: input.listingId,
    p_image_ids: input.imageIds,
  });
  if (error) return { ok: false, message: 'The image order could not be saved.' };
  safeRevalidatePath('/marketplace');
  safeRevalidatePath(`/listings/${input.listingId}`);
  startBackgroundReviews();
  return { ok: true, data: { imageIds: input.imageIds } };
}

export async function reverifyListingImagesAction(input: {
  listingId: string;
}): Promise<ListingActionResult<{ updated: ReverifiedImage[] }>> {
  const viewer = await requireStudentSeller('/listings/new');
  const parsed = listingIdSchema.safeParse(input.listingId);
  if (!parsed.success) return { ok: false, message: 'Invalid listing id.' };

  const supabase = untyped(await createClient());

  const { data: pending, error: pendingError } = await supabase
    .from('listing_images')
    .select('id,storage_path,upload_status,listings!inner(seller_id)')
    .eq('listing_id', parsed.data)
    .eq('listings.seller_id', viewer.id)
    .neq('upload_status', 'uploaded');

  if (pendingError) {
    logSupabaseActionError('read images for reverification', pendingError);
    return { ok: false, message: 'The image uploads could not be checked. Please try again.' };
  }
  if (!pending || pending.length === 0) return { ok: true, data: { updated: [] } };

  const verified: { id: string; path: string }[] = [];
  for (const row of pending) {
    try {
      // The database trigger verifies existence, MIME and size atomically. A
      // concurrent or previously committed finalization is safe to repeat.
      const { data: finalized, error } = await supabase
        .from('listing_images')
        .update({ upload_status: 'uploaded' })
        .eq('id', row.id)
        .eq('listing_id', parsed.data)
        .select('id,storage_path')
        .maybeSingle();

      if (!error && finalized) {
        verified.push({ id: String(finalized.id), path: String(finalized.storage_path) });
      } else if (error && !error.message.toLowerCase().includes('storage object is missing')) {
        logSupabaseActionError('reverify image metadata', error);
      }
    } catch (err) {
      // One interrupted object must not prevent recovery of the other images.
      console.warn('[listings] image reverification failed', err);
    }
  }

  if (verified.length === 0) return { ok: true, data: { updated: [] } };

  const uniquePaths = [...new Set(verified.map((image) => image.path))];
  const { data: signedImages, error: signingError } = await supabase.storage
    .from(IMAGE_BUCKET)
    .createSignedUrls(uniquePaths, 60 * 60);

  if (signingError) logSupabaseActionError('sign reverified images', signingError);

  const urlByPath = new Map<string, string>();
  signedImages?.forEach((item, index) => {
    if (item.signedUrl) urlByPath.set(item.path ?? uniquePaths[index], item.signedUrl);
  });

  const updated = verified.flatMap((image): ReverifiedImage[] => {
    const url = urlByPath.get(image.path);
    return url ? [{ id: image.id, url }] : [];
  });

  safeRevalidatePath('/marketplace');
  safeRevalidatePath(`/listings/${parsed.data}`);

  return { ok: true, data: { updated } };
}

export async function archiveOwnListingAction(
  listingId: unknown,
): Promise<ListingActionResult<{ id: string }>> {
  const viewer = await requireStudentSeller('/my-listings');
  const parsedId = listingIdSchema.safeParse(listingId);
  if (!parsedId.success) return { ok: false, message: 'That listing ID is invalid.' };

  const supabase = untyped(await createClient());
  const { data, error } = await supabase
    .from('listings')
    .update({ status: 'archived' })
    .eq('id', parsedId.data)
    .eq('seller_id', viewer.id)
    .neq('status', 'removed')
    .select('id')
    .maybeSingle();

  if (error || !data) return { ok: false, message: 'The listing could not be archived.' };
  revalidatePath('/marketplace');
  revalidatePath('/my-listings');
  revalidatePath(`/listings/${parsedId.data}`);
  return { ok: true, data: { id: parsedId.data } };
}

export async function markOwnListingSoldAction(
  listingId: unknown,
): Promise<ListingActionResult<{ id: string }>> {
  const viewer = await requireStudentSeller('/my-listings');
  const parsedId = listingIdSchema.safeParse(listingId);
  if (!parsedId.success) return { ok: false, message: 'That listing ID is invalid.' };

  const supabase = untyped(await createClient());
  const { data, error } = await supabase
    .from('listings')
    .update({ status: 'sold' })
    .eq('id', parsedId.data)
    .eq('seller_id', viewer.id)
    .eq('status', 'published')
    .select('id')
    .maybeSingle();

  if (error || !data) {
    return { ok: false, message: 'Only a live listing can be marked as sold.' };
  }

  revalidatePath('/marketplace');
  revalidatePath('/my-listings');
  revalidatePath(`/listings/${parsedId.data}`);
  return { ok: true, data: { id: parsedId.data } };
}

export async function deleteOwnListingAction(
  listingId: unknown,
): Promise<ListingActionResult<{ id: string }>> {
  const viewer = await requireStudentSeller('/my-listings');
  const parsedId = listingIdSchema.safeParse(listingId);
  if (!parsedId.success) return { ok: false, message: 'That listing ID is invalid.' };

  const supabase = untyped(await createClient());
  const { data: listing, error: listingError } = await supabase
    .from('listings')
    .select('id,status')
    .eq('id', parsedId.data)
    .eq('seller_id', viewer.id)
    .maybeSingle();

  if (listingError || !listing) {
    return { ok: false, message: 'This listing could not be found.' };
  }

  if (listing.status === 'removed') {
    return { ok: false, message: 'This listing has already been removed.' };
  }

  if (listing.status === 'published') {
    const { data: archived, error: archiveError } = await supabase
      .from('listings')
      .update({ status: 'archived' })
      .eq('id', parsedId.data)
      .eq('seller_id', viewer.id)
      .eq('status', 'published')
      .select('id')
      .maybeSingle();

    if (archiveError || !archived) {
      return { ok: false, message: 'The live listing could not be removed from the marketplace.' };
    }
  }

  const { data: images, error: imageReadError } = await supabase
    .from('listing_images')
    .select('id,storage_path')
    .eq('listing_id', parsedId.data);

  if (imageReadError) {
    return { ok: false, message: 'The listing images could not be prepared for deletion.' };
  }

  const storageFolder = `${viewer.id}/${parsedId.data}`;
  const { data: storedObjects, error: storageListError } = await supabase.storage
    .from(IMAGE_BUCKET)
    .list(storageFolder, { limit: 100 });
  if (storageListError) {
    return { ok: false, message: 'The listing images could not be prepared for deletion.' };
  }

  const storagePaths = [
    ...new Set([
      ...(images ?? []).map((image) => String(image.storage_path)),
      ...(storedObjects ?? []).map((object) => `${storageFolder}/${object.name}`),
    ]),
  ];
  if (storagePaths.length > 0) {
    const { error: storageError } = await supabase.storage.from(IMAGE_BUCKET).remove(storagePaths);
    if (storageError) {
      return { ok: false, message: 'The listing images could not be deleted. Please try again.' };
    }

    const { error: imageDeleteError } = await supabase
      .from('listing_images')
      .delete()
      .eq('listing_id', parsedId.data);
    if (imageDeleteError) {
      return { ok: false, message: 'The listing could not finish deleting. Please try again.' };
    }
  }

  const { data: deleted, error: deleteError } = await supabase
    .from('listings')
    .delete()
    .eq('id', parsedId.data)
    .eq('seller_id', viewer.id)
    .select('id')
    .maybeSingle();

  if (deleteError || !deleted) {
    return { ok: false, message: 'The listing could not be deleted. Please try again.' };
  }

  revalidatePath('/marketplace');
  revalidatePath('/my-listings');
  revalidatePath(`/listings/${parsedId.data}`);
  return { ok: true, data: { id: parsedId.data } };
}

export async function removeListingAsModeratorAction(
  input: unknown,
): Promise<ListingActionResult<{ id: string }>> {
  const parsed = moderationRemovalSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: 'Enter a moderation reason between 10 and 500 characters.' };
  }

  const { requireMarketplaceViewer } = await import('@/lib/auth/session');
  const viewer = await requireMarketplaceViewer(`/listings/${parsed.data.listingId}`);
  if (viewer.profile.role !== 'moderator') {
    return { ok: false, message: 'Only moderators can remove another student’s listing.' };
  }

  const supabase = untyped(await createClient());
  const { error } = await supabase.rpc('remove_listing', {
    p_listing_id: parsed.data.listingId,
    p_reason: parsed.data.reason,
  });
  if (error) return { ok: false, message: 'The listing could not be removed.' };
  revalidatePath('/marketplace');
  revalidatePath(`/listings/${parsed.data.listingId}`);
  return { ok: true, data: { id: parsed.data.listingId } };
}
