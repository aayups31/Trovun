'use client';

import Image from '@/components/ui/ResilientImage';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  rectSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { CheckCircle2, GripVertical, ImagePlus, Loader2, RotateCcw, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  finalizeListingImageAction,
  registerListingImageAction,
  removeListingImageAction,
  reorderListingImagesAction,
  reverifyListingImagesAction,
} from '../actions';
import { LISTING_IMAGE_MAX_COUNT } from '../schemas';
import { prepareListingImageFile } from './imageUploadFile';
import { uploadListingImageToSignedUrl } from './imageUploadTransfer';

export type ComposerImage = {
  id: string;
  url: string;
  path: string;
  progress: number;
  status: 'uploading' | 'uploaded' | 'failed';
  name: string;
  focusPosition?: string;
};

type UploadJob = {
  file: File;
  listingId: string | null;
  path: string;
  queued: boolean;
  hasAttemptedUpload: boolean;
  transferController: AbortController | null;
};

const IMAGE_TRANSFER_TIMEOUT_MS = 90_000;

type ImageUploaderProps = {
  listingId: string | null;
  initialImages?: ComposerImage[];
  ensureDraft: () => Promise<string | null>;
  onImagesChange?: (images: ComposerImage[]) => void;
};

export function ImageUploader({
  listingId,
  initialImages = [],
  ensureDraft,
  onImagesChange,
}: ImageUploaderProps) {
  const [images, setImages] = useState(initialImages);
  const [message, setMessage] = useState('');
  const [bannerMessage, setBannerMessage] = useState<string | null>(null);
  const [isDraggingFiles, setIsDraggingFiles] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const cancelledUploadsRef = useRef(new Set<string>());
  const imagesRef = useRef(images);
  const listingIdRef = useRef(listingId);
  const uploadJobsRef = useRef(new Map<string, UploadJob>());
  const uploadQueueRef = useRef<Promise<void>>(Promise.resolve());
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  useEffect(() => {
    imagesRef.current = images;
    onImagesChange?.(images);
  }, [images, onImagesChange]);

  useEffect(() => {
    listingIdRef.current = listingId;
  }, [listingId]);

  const updateImages = useCallback((update: (current: ComposerImage[]) => ComposerImage[]) => {
    const next = update(imagesRef.current);
    imagesRef.current = next;
    setImages(next);
  }, []);

  useEffect(
    () => () => {
      imagesRef.current.forEach((image) => {
        if (image.url.startsWith('blob:')) URL.revokeObjectURL(image.url);
      });
      uploadJobsRef.current.forEach((job, imageId) => {
        cancelledUploadsRef.current.add(imageId);
        job.transferController?.abort('Image uploader closed.');
      });
    },
    [],
  );

  // On mount, try to reconcile any pending uploads for this listing.
  useEffect(() => {
    if (!listingId) return;
    const controller = new AbortController();
    void (async () => {
      const recoveredIds = new Set<string>();
      for (const retryDelay of [0, 1_200, 3_000]) {
        if (retryDelay > 0 && !(await delayUnlessAborted(retryDelay, controller.signal))) return;

        try {
          const result = await reverifyListingImagesAction({ listingId });
          if (controller.signal.aborted) return;
          if (!result.ok || result.data.updated.length === 0) continue;

          const recovered = new Map(
            result.data.updated.map((image) => [image.id, image.url] as const),
          );
          result.data.updated.forEach((image) => recoveredIds.add(image.id));
          updateImages((current) =>
            current.map((image) => {
              const recoveredUrl = recovered.get(image.id);
              if (!recoveredUrl || uploadJobsRef.current.has(image.id)) return image;
              if (image.url.startsWith('blob:')) URL.revokeObjectURL(image.url);
              return { ...image, url: recoveredUrl, status: 'uploaded', progress: 100 };
            }),
          );
        } catch {
          // A later bounded attempt may still recover a delayed Storage object.
        }
      }

      if (!controller.signal.aborted && recoveredIds.size > 0) {
        setMessage(
          `Recovered ${recoveredIds.size} uploaded photo${recoveredIds.size > 1 ? 's' : ''}.`,
        );
      }
    })();
    return () => {
      controller.abort();
    };
  }, [listingId, updateImages]);

  const runUploadJob = useCallback(
    async (imageId: string) => {
      const job = uploadJobsRef.current.get(imageId);
      if (!job) return;

      const isCancelled = () => cancelledUploadsRef.current.has(imageId);
      const updateJobImage = (update: (image: ComposerImage) => ComposerImage) => {
        updateImages((current) =>
          current.map((image) => (image.id === imageId ? update(image) : image)),
        );
      };
      const markUploaded = () => {
        updateJobImage((image) => ({
          ...image,
          progress: 100,
          status: 'uploaded',
        }));
        uploadJobsRef.current.delete(imageId);
        setMessage('');
      };
      const markFailed = (errorMessage: string) => {
        if (isCancelled()) return;
        job.queued = false;
        updateJobImage((image) => ({
          ...image,
          progress: 0,
          status: 'failed',
        }));
        setMessage(errorMessage);
      };
      const reconcile = async (draftId: string) => {
        try {
          const recovered = await finalizeUploadedImage(draftId, imageId, 1);
          if (!recovered.ok) return false;
          markUploaded();
          return true;
        } catch {
          return false;
        }
      };
      const cleanCancelledReservation = async (draftId: string | null) => {
        // Registration may have committed even if its response never reached
        // this browser, so cleanup by the stable UUID regardless of whether a
        // path response was observed.
        if (draftId) {
          await removeListingImageAction({ listingId: draftId, imageId }).catch(() => undefined);
        }
        uploadJobsRef.current.delete(imageId);
      };

      try {
        if (isCancelled()) {
          await cleanCancelledReservation(job.listingId);
          return;
        }

        updateJobImage((image) => ({ ...image, progress: 2, status: 'uploading' }));

        let draftId = job.listingId ?? listingIdRef.current;
        if (!draftId) draftId = await ensureDraft();
        if (!draftId) {
          markFailed('Save the draft before adding images.');
          return;
        }

        job.listingId = draftId;
        listingIdRef.current = draftId;

        if (isCancelled()) {
          await cleanCancelledReservation(draftId);
          return;
        }

        // A mobile browser can lose the upload response after Storage accepted
        // the body. Always reconcile that ambiguous state before sending again.
        if (job.hasAttemptedUpload && job.path && (await reconcile(draftId))) return;

        let lastMessage = `${job.file.name} did not finish uploading. Retry the photo.`;

        for (let attempt = 0; attempt < 3; attempt += 1) {
          if (isCancelled()) {
            await cleanCancelledReservation(draftId);
            return;
          }

          if (attempt > 0) {
            updateJobImage((image) => ({ ...image, progress: 5 + attempt * 3 }));
            await delay(700 * 2 ** (attempt - 1) + Math.floor(Math.random() * 180));
          } else {
            updateJobImage((image) => ({ ...image, progress: 5 }));
          }

          const ready = await waitForUploadOpportunity(isCancelled, (waitingMessage) => {
            setMessage(waitingMessage);
          });
          if (!ready) {
            await cleanCancelledReservation(draftId);
            return;
          }
          setMessage('');

          let registration: Awaited<ReturnType<typeof registerListingImageAction>>;
          try {
            registration = await registerListingImageAction({
              imageId,
              listingId: draftId,
              name: job.file.name,
              mimeType: job.file.type,
              sizeBytes: job.file.size,
            });
          } catch {
            lastMessage = 'The secure upload could not be prepared. Check your connection.';
            if (job.path && (await reconcile(draftId))) return;
            continue;
          }

          if (!registration.ok) {
            lastMessage = registration.message;
            if (job.path && (await reconcile(draftId))) return;
            continue;
          }

          job.path = registration.data.path;
          updateJobImage((image) => ({
            ...image,
            path: registration.data.path,
            progress: 18,
          }));

          if (isCancelled()) {
            await cleanCancelledReservation(draftId);
            return;
          }

          const readyToTransfer = await waitForUploadOpportunity(isCancelled, (waitingMessage) => {
            setMessage(waitingMessage);
          });
          if (!readyToTransfer || isCancelled()) {
            await cleanCancelledReservation(draftId);
            return;
          }
          setMessage('');

          let uploadError: unknown = null;
          job.hasAttemptedUpload = true;
          const transferController = new AbortController();
          job.transferController = transferController;
          const timeoutId = window.setTimeout(
            () => transferController.abort('Image transfer timed out.'),
            IMAGE_TRANSFER_TIMEOUT_MS,
          );
          try {
            const transfer = await uploadListingImageToSignedUrl(
              registration.data.signedUploadUrl,
              job.file,
              transferController.signal,
            );
            uploadError = transfer.ok ? null : transfer;
          } catch (error) {
            // Mobile browsers can throw when changing networks or when the tab
            // was backgrounded. Reconciliation below distinguishes a lost
            // response from an upload that genuinely needs another attempt.
            uploadError = error;
          } finally {
            window.clearTimeout(timeoutId);
            if (job.transferController === transferController) job.transferController = null;
          }

          if (isCancelled()) {
            await cleanCancelledReservation(draftId);
            return;
          }

          if (uploadError) {
            lastMessage = `${job.file.name} did not finish uploading. Check your connection and retry.`;
            if (await reconcile(draftId)) return;
            continue;
          }

          updateJobImage((image) => ({ ...image, progress: 84 }));
          try {
            const finalized = await finalizeUploadedImage(draftId, imageId, 5);
            if (finalized.ok) {
              markUploaded();
              return;
            }
            lastMessage = finalized.message;
          } catch {
            lastMessage = `${job.file.name} uploaded but could not be verified. Retry the photo.`;
          }
        }

        markFailed(lastMessage);
      } catch {
        markFailed(`${job.file.name} could not be uploaded. Check your connection and retry.`);
      }
    },
    [ensureDraft, updateImages],
  );

  const enqueueUpload = useCallback(
    (imageId: string) => {
      const job = uploadJobsRef.current.get(imageId);
      if (!job || job.queued) return;
      job.queued = true;

      uploadQueueRef.current = uploadQueueRef.current
        .catch(() => undefined)
        .then(() => runUploadJob(imageId))
        .catch(() => {
          if (cancelledUploadsRef.current.has(imageId)) return;
          const failedJob = uploadJobsRef.current.get(imageId);
          if (failedJob) failedJob.queued = false;
          updateImages((current) =>
            current.map((image) =>
              image.id === imageId ? { ...image, progress: 0, status: 'failed' } : image,
            ),
          );
          setMessage('The photo upload stopped unexpectedly. Retry the photo.');
        })
        .finally(() => {
          const queuedJob = uploadJobsRef.current.get(imageId);
          if (queuedJob) queuedJob.queued = false;
          if (cancelledUploadsRef.current.has(imageId)) {
            uploadJobsRef.current.delete(imageId);
            cancelledUploadsRef.current.delete(imageId);
          }
        });
    },
    [runUploadJob, updateImages],
  );

  const retryImage = useCallback(
    (image: ComposerImage) => {
      const job = uploadJobsRef.current.get(image.id);
      if (!job || job.queued) return;
      cancelledUploadsRef.current.delete(image.id);
      setMessage('');
      updateImages((current) =>
        current.map((item) =>
          item.id === image.id ? { ...item, progress: 0, status: 'uploading' } : item,
        ),
      );
      enqueueUpload(image.id);
    },
    [enqueueUpload, updateImages],
  );

  const uploadFiles = useCallback(
    (selected: File[]) => {
      setMessage('');
      const available = LISTING_IMAGE_MAX_COUNT - imagesRef.current.length;
      const files = selected.slice(0, available);
      const supportedFiles: File[] = [];
      let validationMessage = '';

      if (selected.length > available) {
        validationMessage = `You can add ${available} more image${available === 1 ? '' : 's'}.`;
      }
      if (files.length === 0) {
        if (validationMessage) setMessage(validationMessage);
        return;
      }

      for (const originalFile of files) {
        const prepared = prepareListingImageFile(originalFile);
        if (!prepared.ok) {
          setBannerMessage(prepared.message);
          continue;
        }
        supportedFiles.push(prepared.file);
      }

      if (validationMessage) setMessage(validationMessage);
      if (supportedFiles.length === 0) return;

      const queuedImages = supportedFiles.map((file) => {
        const id = createClientImageId();
        const item: ComposerImage = {
          id,
          path: '',
          url: URL.createObjectURL(file),
          progress: 0,
          status: 'uploading',
          name: file.name,
          focusPosition: '50% 35%',
        };
        uploadJobsRef.current.set(id, {
          file,
          listingId: listingIdRef.current,
          path: '',
          queued: false,
          hasAttemptedUpload: false,
          transferController: null,
        });
        return item;
      });

      // Show every selected photo immediately. Registration and transfer run
      // through a small sequential queue so iOS/Android browsers are not asked
      // to decode and upload several multi-megabyte camera files at once.
      updateImages((current) => [...current, ...queuedImages]);
      queuedImages.forEach((image) => enqueueUpload(image.id));
    },
    [enqueueUpload, updateImages],
  );

  const handleDragEnd = async ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const currentImages = imagesRef.current;
    const oldIndex = currentImages.findIndex((image) => image.id === active.id);
    const newIndex = currentImages.findIndex((image) => image.id === over.id);
    const previousOrder = currentImages.map((image) => image.id);
    const next = arrayMove(currentImages, oldIndex, newIndex);
    updateImages(() => next);
    const draftId = listingIdRef.current ?? (await ensureDraft());
    if (!draftId) {
      updateImages((current) => restoreImageOrder(current, previousOrder));
      return;
    }
    listingIdRef.current = draftId;

    // Optimistic previews do not have a database row yet. Exclude only those
    // local placeholders; registered failed images still belong in the order.
    const imageIdsToSave = next.filter((image) => Boolean(image.path)).map((image) => image.id);
    try {
      const result = await reorderListingImagesAction({
        listingId: draftId,
        imageIds: imageIdsToSave,
      });
      if (!result.ok) {
        updateImages((current) => restoreImageOrder(current, previousOrder));
        setMessage(`${result.message} Your previous order was restored.`);
      }
    } catch {
      updateImages((current) => restoreImageOrder(current, previousOrder));
      setMessage('The image order could not be saved. Your previous order was restored.');
    }
  };

  // Drag-and-drop reordering handled via dnd-kit; arrow/cover/crop controls removed.

  const removeImage = async (image: ComposerImage) => {
    cancelledUploadsRef.current.add(image.id);
    const job = uploadJobsRef.current.get(image.id);

    // Stop an active signed request, hide its optimistic preview immediately,
    // and let the serialized job remove metadata/object after the request has
    // actually settled. Deleting concurrently could let a late PUT recreate an
    // orphaned Storage object.
    if (job?.queued) {
      job.transferController?.abort('Image removed by user.');
      if (image.url.startsWith('blob:')) URL.revokeObjectURL(image.url);
      updateImages((current) => current.filter((item) => item.id !== image.id));
      return;
    }

    // A preview is inserted before registration. Removing it during that short
    // window must stay local rather than creating a draft just to delete it.
    if (!image.path) {
      if (image.url.startsWith('blob:')) URL.revokeObjectURL(image.url);
      updateImages((current) => current.filter((item) => item.id !== image.id));
      if (!job?.queued) {
        uploadJobsRef.current.delete(image.id);
        cancelledUploadsRef.current.delete(image.id);
      }
      return;
    }

    const draftId = job?.listingId ?? listingIdRef.current ?? (await ensureDraft());
    if (!draftId) {
      cancelledUploadsRef.current.delete(image.id);
      setMessage('The image could not be removed until the draft is saved.');
      return;
    }
    try {
      const result = await removeListingImageAction({ listingId: draftId, imageId: image.id });
      if (!result.ok) {
        cancelledUploadsRef.current.delete(image.id);
        updateImages((current) =>
          current.map((item) =>
            item.id === image.id && item.status === 'uploading'
              ? { ...item, status: 'failed' }
              : item,
          ),
        );
        setMessage(result.message);
        return;
      }
      if (image.url.startsWith('blob:')) URL.revokeObjectURL(image.url);
      updateImages((current) => current.filter((item) => item.id !== image.id));
      uploadJobsRef.current.delete(image.id);
      cancelledUploadsRef.current.delete(image.id);
    } catch {
      cancelledUploadsRef.current.delete(image.id);
      updateImages((current) =>
        current.map((item) =>
          item.id === image.id && item.status === 'uploading'
            ? { ...item, status: 'failed' }
            : item,
        ),
      );
      setMessage('The image could not be removed. Check your connection and try again.');
    }
  };

  const uploadedCount = useMemo(
    () => images.filter((image) => image.status === 'uploaded').length,
    [images],
  );
  const failedCount = useMemo(
    () => images.filter((image) => image.status === 'failed').length,
    [images],
  );
  const isWaitingForUpload = images.some((image) => image.status === 'uploading');
  const uploadHelp = message
    ? message
    : failedCount > 0
      ? `${failedCount} photo${failedCount === 1 ? ' needs' : 's need'} attention. Retry or remove the failed photo${failedCount === 1 ? '' : 's'} before publishing.`
      : isWaitingForUpload
        ? 'Finishing your photo upload… keep this page open until it is ready.'
        : 'JPEG, PNG, or WebP · up to 5 MB each · drag to reorder · the first photo is the cover';
  return (
    <section
      id="images"
      aria-labelledby="images-heading"
      className="um-sell-section scroll-mt-32 rounded-[1.35rem] px-5 py-8 sm:rounded-[1.65rem] sm:px-8 sm:py-10 lg:px-10"
    >
      <div className="mb-6 grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
        <div>
          <p className="font-condensed text-[0.68rem] font-bold uppercase tracking-[0.17em] text-um-gold-300/78">
            Add photos
          </p>
          <h2
            id="images-heading"
            className="mt-2 text-[clamp(1.65rem,3vw,2.25rem)] font-bold leading-[1.08] tracking-[-0.045em] text-um-text-strong"
          >
            Show the item
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-um-text-muted">
            Add a few clear angles. The first photo is the cover. Photos fit automatically without
            cropping.
          </p>
        </div>
        <span
          aria-atomic="true"
          aria-live="polite"
          className={cn(
            'inline-flex h-8 w-fit shrink-0 items-center gap-1.5 border-l-2 px-3 text-xs font-semibold tabular-nums sm:mt-1',
            failedCount > 0
              ? 'border-red-400 bg-red-400/[0.10] text-red-200'
              : 'border-um-gold-400 bg-white/[0.06] text-um-text-muted',
          )}
          role="status"
        >
          {failedCount > 0 ? (
            <RotateCcw aria-hidden="true" className="size-3.5" />
          ) : uploadedCount > 0 ? (
            <CheckCircle2 aria-hidden="true" className="size-3.5 text-um-success" />
          ) : null}
          {failedCount > 0
            ? 'Uploads need attention'
            : uploadedCount > 0
              ? 'Photos ready'
              : 'Add photos'}
        </span>
      </div>

      {bannerMessage ? (
        <div className="mb-4 rounded-um-sm border border-red-500/30 bg-red-600/95 p-3 text-sm font-semibold text-white">
          <div className="flex items-start justify-between gap-3">
            <div>{bannerMessage}</div>
            <button
              type="button"
              onClick={() => setBannerMessage(null)}
              className="ml-4 rounded bg-white/10 px-2 py-1 text-xs font-medium text-white/90"
            >
              Dismiss
            </button>
          </div>
        </div>
      ) : null}

      <div
        onDragEnter={(event) => {
          event.preventDefault();
          setIsDraggingFiles(true);
        }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null))
            setIsDraggingFiles(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setIsDraggingFiles(false);
          void uploadFiles(Array.from(event.dataTransfer.files));
        }}
        className={cn(
          'relative overflow-hidden rounded-[1.15rem] border border-dashed border-white/[0.17] bg-[#08101a]/82 p-3 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.025)] transition duration-200 ease-um-out sm:p-5',
          isDraggingFiles && 'border-um-gold-400 bg-um-ink-850 shadow-um-gold',
        )}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-24 -top-28 size-96 rounded-full bg-um-gold-400/[0.07] blur-[88px]"
        />
        {images.length === 0 ? (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="relative flex min-h-56 w-full flex-col items-center justify-center px-5 text-center outline-none transition duration-200 ease-um-out hover:bg-white/[0.035] focus-visible:ring-2 focus-visible:ring-um-gold-400 focus-visible:ring-offset-2 focus-visible:ring-offset-um-ink-900 sm:min-h-64"
          >
            <span className="grid size-12 place-items-center rounded-full border border-white/10 bg-white/[0.055] text-um-gold-400 shadow-um-sm">
              <ImagePlus aria-hidden="true" className="size-6" strokeWidth={1.8} />
            </span>
            <span className="mt-5 text-lg font-bold tracking-[-0.02em] text-white">
              Add clear photos
            </span>
            <span className="mt-1.5 text-sm text-white/52">or choose them from your device</span>
            <span className="mt-5 inline-flex min-h-11 items-center rounded-um-sm bg-um-gold-400 px-4 text-sm font-bold text-um-ink-950 shadow-um-xs">
              Choose photos
            </span>
          </button>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={images.map((image) => image.id)} strategy={rectSortingStrategy}>
              <div className="relative grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3">
                {images.map((image, index) => (
                  <SortableImage
                    key={image.id}
                    image={image}
                    index={index}
                    canRetry={image.url.startsWith('blob:')}
                    onRemove={removeImage}
                    onRetry={retryImage}
                  />
                ))}
                {images.length < LISTING_IMAGE_MAX_COUNT ? (
                  <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    className="flex aspect-[4/3] min-h-28 flex-col items-center justify-center rounded-um-sm border border-dashed border-white/20 bg-white/[0.05] text-sm font-bold text-white/55 transition duration-160 ease-um-out hover:border-um-gold-400 hover:text-white focus-visible:ring-2 focus-visible:ring-um-gold-400 focus-visible:ring-offset-2 focus-visible:ring-offset-um-ink-900"
                  >
                    <ImagePlus aria-hidden="true" className="mb-2 size-5" strokeWidth={1.8} />
                    Add photos
                  </button>
                ) : null}
              </div>
            </SortableContext>
          </DndContext>
        )}

        <input
          ref={inputRef}
          aria-describedby="image-upload-help"
          aria-label="Upload listing photos"
          className="sr-only"
          accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
          multiple
          onChange={(event) => {
            const selectedFiles = Array.from(event.currentTarget.files ?? []);

            // Reset immediately so the same photo can be selected again.
            event.currentTarget.value = '';

            void uploadFiles(selectedFiles);
          }}
          tabIndex={-1}
          type="file"
        />
      </div>
      <p
        aria-live="polite"
        className={cn(
          'mt-3 min-h-5 text-sm leading-5',
          message || failedCount > 0 ? 'font-medium text-red-200' : 'text-um-text-muted',
        )}
        id="image-upload-help"
      >
        {uploadHelp}
      </p>
    </section>
  );
}

function SortableImage({
  image,
  index,
  canRetry,
  onRemove,
  onRetry,
}: {
  image: ComposerImage;
  index: number;
  canRetry: boolean;
  onRemove: (image: ComposerImage) => void;
  onRetry: (image: ComposerImage) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: image.id,
    disabled: image.status !== 'uploaded',
  });
  const safeAttributes = {
    ...attributes,
    'aria-describedby': undefined,
  };
  const safeListeners = {
    ...listeners,
    onKeyDown: (event: React.KeyboardEvent) => {
      if (event.key === ' ' || event.key === 'Enter') {
        event.preventDefault();
      }
      listeners?.onKeyDown?.(event);
    },
  };
  return (
    <div
      ref={setNodeRef}
      {...safeAttributes}
      {...safeListeners}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        'group relative aspect-[4/3] overflow-hidden rounded-um-sm bg-um-ink-800 shadow-um-xs ring-1 ring-white/[0.14]',
        isDragging && 'z-20 opacity-80 shadow-um-md',
        image.status === 'failed' && 'ring-2 ring-red-400/70',
      )}
    >
      <Image
        src={image.url}
        alt={`${image.name} preview`}
        fill
        unoptimized
        className="object-contain object-center"
        style={{ objectFit: 'contain', objectPosition: 'center' }}
      />
      <div className="absolute inset-x-0 top-0 flex items-center justify-between bg-gradient-to-b from-black/60 to-transparent p-2 text-white">
        <span className="font-condensed rounded-full bg-um-ink-950/80 px-2.5 py-1 text-[0.65rem] font-bold uppercase tracking-[0.1em] text-white">
          {index === 0 ? 'Cover' : 'Photo'}
        </span>
        {image.status === 'failed' ? (
          <span className="rounded-full bg-red-500/90 px-2.5 py-1 text-[0.65rem] font-bold uppercase tracking-[0.08em] text-white">
            Needs attention
          </span>
        ) : image.status === 'uploaded' ? (
          <button
            type="button"
            className="grid size-11 touch-none place-items-center rounded-um-sm bg-black/[0.55] transition hover:bg-black/75 focus-visible:ring-2 focus-visible:ring-white"
            aria-label={`Drag ${image.name} to reorder`}
          >
            <GripVertical aria-hidden="true" className="size-4" />
          </button>
        ) : null}
      </div>
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent p-2 pt-8">
        {image.status === 'uploading' ? (
          <div
            aria-label={`Uploading ${image.name}`}
            aria-valuemax={100}
            aria-valuemin={0}
            aria-valuenow={Math.min(100, Math.max(0, Math.round(image.progress)))}
            className="flex items-center gap-2 text-xs font-medium text-white"
            role="progressbar"
          >
            <Loader2 aria-hidden="true" className="size-3 animate-spin" />
            <span>{Math.max(1, Math.round(image.progress))}%</span>
            <div aria-hidden="true" className="h-1 flex-1 overflow-hidden rounded-full bg-white/30">
              <div className="h-full bg-um-gold-400" style={{ width: `${image.progress}%` }} />
            </div>
          </div>
        ) : image.status === 'failed' ? (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-um-xs border border-red-300/30 bg-um-ink-950/85 px-2 py-1.5">
            <span
              className="inline-flex items-center gap-1 text-xs font-semibold text-red-100"
              role="alert"
            >
              <RotateCcw aria-hidden="true" className="size-3" /> Upload did not finish
            </span>
            <span className="ml-auto flex items-center gap-1.5">
              {canRetry ? (
                <button
                  type="button"
                  onClick={() => onRetry(image)}
                  aria-label={`Retry upload ${image.name}`}
                  className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-um-xs bg-um-gold-400 px-2.5 text-xs font-bold text-um-ink-950 transition hover:bg-um-gold-300 focus-visible:ring-2 focus-visible:ring-white"
                >
                  <RotateCcw aria-hidden="true" className="size-3.5" /> Retry
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => onRemove(image)}
                aria-label={`Remove failed upload ${image.name}`}
                className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-um-xs bg-red-500 px-2.5 text-xs font-bold text-white transition hover:bg-red-400 focus-visible:ring-2 focus-visible:ring-white"
              >
                <Trash2 aria-hidden="true" className="size-3.5" /> Remove
              </button>
            </span>
          </div>
        ) : (
          <div className="flex items-center justify-end gap-1">
            <button
              type="button"
              onClick={() => onRemove(image)}
              aria-label={`Remove ${image.name}`}
              className="grid size-10 place-items-center rounded-um-sm bg-black/[0.55] text-white transition hover:bg-um-danger focus-visible:ring-2 focus-visible:ring-white"
            >
              <Trash2 aria-hidden="true" className="size-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function restoreImageOrder(images: ComposerImage[], orderedIds: string[]) {
  const byId = new Map(images.map((image) => [image.id, image]));
  const restored = orderedIds.flatMap((id) => {
    const image = byId.get(id);
    if (!image) return [];
    byId.delete(id);
    return [image];
  });

  return [...restored, ...byId.values()];
}

type FinalizeImageResult = Awaited<ReturnType<typeof finalizeListingImageAction>>;

async function finalizeUploadedImage(
  listingId: string,
  imageId: string,
  maxAttempts: number,
): Promise<FinalizeImageResult> {
  let lastResult: FinalizeImageResult | null = null;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      const result = await finalizeListingImageAction({ listingId, imageId });
      lastResult = result;
      if (result.ok) return result;

      const objectMayStillBeSettling = result.message.toLowerCase().includes('did not finish');
      if (!objectMayStillBeSettling || attempt === maxAttempts - 1) return result;
    } catch {
      if (attempt === maxAttempts - 1) throw new Error('Image verification request failed.');
    }

    await new Promise((resolve) => setTimeout(resolve, 300 * 2 ** attempt));
  }

  return (
    lastResult ?? {
      ok: false,
      message: 'The uploaded image could not be verified.',
    }
  );
}

function createClientImageId() {
  if (typeof globalThis.crypto.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }

  // Older iOS WebViews expose getRandomValues without randomUUID.
  const bytes = globalThis.crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0'));
  return `${hex.slice(0, 4).join('')}-${hex.slice(4, 6).join('')}-${hex.slice(6, 8).join('')}-${hex.slice(8, 10).join('')}-${hex.slice(10).join('')}`;
}

async function waitForUploadOpportunity(
  isCancelled: () => boolean,
  onWaiting: (message: string) => void,
) {
  while (!isCancelled()) {
    const isOffline = typeof navigator !== 'undefined' && navigator.onLine === false;
    const isHidden = typeof document !== 'undefined' && document.visibilityState === 'hidden';

    if (!isOffline && !isHidden) return true;
    onWaiting(
      isOffline
        ? 'Upload paused until your connection returns.'
        : 'Upload paused while this page is in the background.',
    );
    await delay(750);
  }

  return false;
}

function delay(milliseconds: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, milliseconds);
  });
}

function delayUnlessAborted(milliseconds: number, signal: AbortSignal) {
  if (signal.aborted) return Promise.resolve(false);

  return new Promise<boolean>((resolve) => {
    const timeoutId = window.setTimeout(() => {
      signal.removeEventListener('abort', handleAbort);
      resolve(true);
    }, milliseconds);
    const handleAbort = () => {
      window.clearTimeout(timeoutId);
      resolve(false);
    };
    signal.addEventListener('abort', handleAbort, { once: true });
  });
}
