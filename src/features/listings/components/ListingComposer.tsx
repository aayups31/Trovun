'use client';

import Image from '@/components/ui/ResilientImage';
import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import * as Dialog from '@radix-ui/react-dialog';
import * as Switch from '@radix-ui/react-switch';
import {
  Armchair,
  ArrowLeft,
  ArrowRight,
  BookOpenText,
  Check,
  Eye,
  ImageIcon,
  Loader2,
  MonitorSmartphone,
  Save,
  Shapes,
  ShieldCheck,
  Shirt,
  Sparkles,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useForm, useWatch } from 'react-hook-form';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Textarea } from '@/components/ui/Textarea';
import { WaterlooVerificationBadge } from '@/features/profiles/components/WaterlooVerificationBadge';
import { cn } from '@/lib/utils';

import { publishListingAction, saveListingDraftAction } from '../actions';
import { publishListingInBrowser, saveListingDraftInBrowser } from '../client-persistence';
import {
  centsToDollars,
  dollarsToCents,
  LISTING_DESCRIPTION_MAX,
  LISTING_TITLE_MAX,
  listingPublishSchema,
  type ListingCondition,
  type ListingDraftInput,
} from '../schemas';
import { ImageUploader, type ComposerImage } from './ImageUploader';

type CategoryOption = { id: number; slug: string; name: string; icon: string };

type ListingComposerProps = {
  sellerName: string;
  categories: CategoryOption[];
  initial?: {
    id: string;
    title: string;
    description: string;
    priceCents: number | null;
    categoryId: number | null;
    condition: ListingCondition | null;
    openToOffers: boolean;
    pickupArea: string;
    pickupLatitude: number | null;
    pickupLongitude: number | null;
    status: string;
    images: ComposerImage[];
  };
};

type FormValues = {
  title: string;
  description: string;
  price: string;
  categoryId: string;
  condition: ListingCondition | '';
  openToOffers: boolean;
  pickupArea: string;
};

const CONDITIONS: Array<{ value: ListingCondition; label: string }> = [
  { value: 'new', label: 'New' },
  { value: 'like_new', label: 'Like New' },
  { value: 'good', label: 'Good' },
  { value: 'fair', label: 'Fair' },
  { value: 'well_used', label: 'Well Used' },
];

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  electronics: MonitorSmartphone,
  books: BookOpenText,
  household: Armchair,
  'household-items': Armchair,
  clothing: Shirt,
};

const STEPS = [
  { href: '#images', label: 'Photos' },
  { href: '#details', label: 'Details' },
  { href: '#pricing', label: 'Price & pickup' },
  { href: '#publish', label: 'Review' },
];

const AUTOSAVE_DELAY_MS = 1600;
const DARK_FIELD_CLASS =
  'border-white/[0.14] !bg-[#111a26] !text-[#f7f4ee] caret-um-gold-300 placeholder:!text-white/42 focus:!bg-[#172231] focus:!text-white focus:border-um-gold-300 focus:ring-4 focus:ring-um-gold-400/[0.16]';

export function ListingComposer({ sellerName, categories, initial }: ListingComposerProps) {
  const router = useRouter();
  const isPublished = initial?.status === 'published';
  const [activeStep, setActiveStep] = useState(initial ? 1 : 0);
  const stepHeadingRef = useRef<HTMLParagraphElement>(null);
  const [listingId, setListingId] = useState(initial?.id ?? null);
  const [images, setImages] = useState<ComposerImage[]>(initial?.images ?? []);
  const [notice, setNotice] = useState('');
  const [noticeKind, setNoticeKind] = useState<'success' | 'error'>('success');
  const [isAutosaving, setIsAutosaving] = useState(false);
  const [pendingAction, setPendingAction] = useState<'save' | 'publish' | null>(null);
  const [pendingCanonicalPath, setPendingCanonicalPath] = useState<string | null>(null);
  const [isSaving, startSaving] = useTransition();
  const listingIdRef = useRef(initial?.id ?? null);
  const hasPersistedListingRef = useRef(Boolean(initial?.id));
  const draftSaveQueueRef = useRef<Promise<void>>(Promise.resolve());
  const autosaveRevisionRef = useRef(0);
  const lastAutosaveAttemptRevisionRef = useRef<number | null>(null);
  const manualOperationRef = useRef(false);
  const publishCompletedRef = useRef(false);
  const canonicalizedPathRef = useRef<string | null>(null);
  const {
    register,
    getValues,
    reset,
    setValue,
    setError,
    clearErrors,
    control,
    formState: { errors, isDirty },
  } = useForm<FormValues>({
    mode: 'onTouched',
    defaultValues: {
      title: initial?.title ?? '',
      description: initial?.description ?? '',
      price: centsToDollars(initial?.priceCents),
      categoryId: initial?.categoryId ? String(initial.categoryId) : '',
      condition: initial?.condition ?? '',
      openToOffers: initial?.openToOffers ?? false,
      pickupArea: initial?.pickupArea ?? '',
    },
  });
  const values = useWatch({ control }) as FormValues;
  const canAutosave = !isPublished;
  const hasUploadingImages = images.some((image) => image.status === 'uploading');
  const hasFailedImages = images.some((image) => image.status === 'failed');
  const hasPendingWork = isDirty || hasUploadingImages || hasFailedImages;
  const hasDraftSafePrice =
    values.price.trim().length === 0 || dollarsToCents(values.price) !== null;

  const toPayload = useCallback(
    (id = listingIdRef.current): ListingDraftInput => ({
      listingId: id,
      title: getValues('title'),
      description: getValues('description'),
      priceCents: dollarsToCents(getValues('price')),
      categoryId: getValues('categoryId') ? Number(getValues('categoryId')) : null,
      condition: getValues('condition') || null,
      openToOffers: getValues('openToOffers'),
      pickupArea: getValues('pickupArea'),
      // Map placement is paused. Always clear legacy pins so coordinates can
      // never silently disagree with an edited pickup address.
      pickupLatitude: null,
      pickupLongitude: null,
    }),
    [getValues],
  );

  const goToStep = (step: number) => {
    setActiveStep(step);
    requestAnimationFrame(() => {
      stepHeadingRef.current?.focus({ preventScroll: true });
      stepHeadingRef.current?.scrollIntoView?.({
        behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
          ? 'instant'
          : 'smooth',
        block: 'start',
      });
    });
  };

  const revealIssue = (field: PropertyKey | undefined) => {
    setActiveStep(['priceCents', 'pickupArea', 'price'].includes(String(field)) ? 2 : 1);
    requestAnimationFrame(() => focusFirstIssue(field));
  };

  const continueStep = () => {
    clearErrors();
    if (activeStep === 0) {
      if (
        !images.some((image) => image.status === 'uploaded') ||
        hasFailedImages ||
        hasUploadingImages
      ) {
        setNoticeKind('error');
        setNotice(
          hasUploadingImages
            ? 'Let your photos finish uploading.'
            : hasFailedImages
              ? 'Retry or remove failed photos to continue.'
              : 'Add at least one photo to continue.',
        );
        return;
      }
    } else if (activeStep < 3) {
      const result = listingPublishSchema.safeParse({
        ...toPayload(),
        listingId: listingIdRef.current ?? '00000000-0000-4000-8000-000000000000',
      });
      if (!result.success) {
        const fields =
          activeStep === 1
            ? ['title', 'description', 'categoryId', 'condition']
            : ['priceCents', 'pickupArea'];
        const issues = result.error.issues.filter((issue) =>
          fields.includes(String(issue.path[0])),
        );
        if (issues.length) {
          applyFieldErrors(
            Object.fromEntries(issues.map((issue) => [String(issue.path[0]), issue.message])),
            setError,
          );
          setNoticeKind('error');
          setNotice('A few details still need your attention.');
          revealIssue(issues[0].path[0]);
          return;
        }
      }
    }
    setNotice('');
    goToStep(Math.min(activeStep + 1, 3));
  };

  const persistDraft = useCallback(() => {
    const rawPrice = getValues('price');
    if (rawPrice.trim() && dollarsToCents(rawPrice) === null) {
      setNoticeKind('error');
      setNotice('Enter a valid price with no more than two decimal places.');
      setError('price', { message: 'Enter a valid price with no more than two decimal places.' });
      return Promise.resolve(null);
    }
    // Reserve the draft ID before the first request. The Server Action and the
    // browser RLS fallback can then retry without ever creating two drafts.
    const reservedId = listingIdRef.current ?? crypto.randomUUID();
    listingIdRef.current = reservedId;
    const snapshot = toPayload(reservedId);

    const saveSnapshot = async () => {
      // A second request can be queued while the first creates a new draft. Reuse
      // the ID established by that first request instead of creating a duplicate.
      const payload = {
        ...snapshot,
        listingId: snapshot.listingId ?? listingIdRef.current,
      };

      try {
        let result;
        try {
          result = await saveListingDraftAction(payload);
        } catch {
          // The authenticated browser workflow below is the resilience path for
          // a Server Action request that was interrupted by the network.
        }

        if (!result?.ok && !result?.fieldErrors) {
          result = await saveListingDraftInBrowser(payload);
        }

        if (!result) {
          setNoticeKind('error');
          setNotice('Your draft could not be saved. Check your connection and try again.');
          return null;
        }

        if (!result.ok) {
          setNoticeKind('error');
          setNotice(result.message);
          applyFieldErrors(result.fieldErrors, setError);
          return null;
        }

        const savedId = result.data.id;
        if (!hasPersistedListingRef.current) {
          hasPersistedListingRef.current = true;
          listingIdRef.current = savedId;
          setListingId(savedId);
          // Next.js observes native history changes. Moving from `/listings/new`
          // to the dynamic edit route remounts this composer, so changing the URL
          // here used to cancel and delete the very first image upload between
          // registration and transfer. Canonicalize only after all local work is
          // safely persisted; failed images must keep their in-memory File so the
          // user can retry them without selecting the photo again.
          setPendingCanonicalPath(`/listings/${savedId}/edit`);
        }

        // Only clear the dirty state when the fields still match the exact payload
        // that reached the server. Edits made while a save is in flight stay dirty.
        if (
          draftFingerprint({ ...payload, listingId: savedId }) ===
          draftFingerprint(toPayload(savedId))
        ) {
          reset(getValues());
        }

        return savedId;
      } catch {
        setNoticeKind('error');
        setNotice(
          'We could not save this draft. Your changes are still here—check your connection and try again.',
        );
        return null;
      }
    };

    // Serialize every draft write. An older autosave can never finish after a
    // newer manual save and overwrite the user's latest fields.
    const queuedSave = draftSaveQueueRef.current.then(saveSnapshot, saveSnapshot);
    draftSaveQueueRef.current = queuedSave.then(
      () => undefined,
      () => undefined,
    );
    return queuedSave;
  }, [getValues, reset, setError, toPayload]);

  useEffect(() => {
    if (
      !pendingCanonicalPath ||
      canonicalizedPathRef.current === pendingCanonicalPath ||
      isDirty ||
      hasUploadingImages ||
      hasFailedImages ||
      isAutosaving ||
      isSaving ||
      pendingAction !== null
    ) {
      return;
    }

    const canonicalPath = pendingCanonicalPath;
    canonicalizedPathRef.current = canonicalPath;
    window.history.replaceState(window.history.state, '', canonicalPath);
  }, [
    hasFailedImages,
    hasUploadingImages,
    isAutosaving,
    isDirty,
    isSaving,
    pendingAction,
    pendingCanonicalPath,
  ]);

  useEffect(() => {
    autosaveRevisionRef.current += 1;
  }, [
    values.categoryId,
    values.condition,
    values.description,
    values.openToOffers,
    values.pickupArea,
    values.price,
    values.title,
  ]);

  useEffect(() => {
    if (
      !canAutosave ||
      !isDirty ||
      !hasDraftSafePrice ||
      hasUploadingImages ||
      isAutosaving ||
      isSaving ||
      manualOperationRef.current ||
      publishCompletedRef.current
    ) {
      return;
    }

    const snapshotFingerprint = draftFingerprint(toPayload());
    const snapshotRevision = autosaveRevisionRef.current;
    if (lastAutosaveAttemptRevisionRef.current === snapshotRevision) return;

    const autosaveTimer = window.setTimeout(() => {
      if (manualOperationRef.current || publishCompletedRef.current) return;

      lastAutosaveAttemptRevisionRef.current = snapshotRevision;
      setIsAutosaving(true);
      void persistDraft()
        .then((savedId) => {
          if (
            savedId &&
            snapshotFingerprint === draftFingerprint(toPayload(savedId)) &&
            !manualOperationRef.current &&
            !publishCompletedRef.current
          ) {
            setNoticeKind('success');
            setNotice('Draft autosaved privately.');
          }
        })
        .finally(() => setIsAutosaving(false));
    }, AUTOSAVE_DELAY_MS);

    return () => window.clearTimeout(autosaveTimer);
  }, [
    canAutosave,
    hasDraftSafePrice,
    hasUploadingImages,
    isAutosaving,
    isDirty,
    isSaving,
    persistDraft,
    toPayload,
    values.categoryId,
    values.condition,
    values.description,
    values.openToOffers,
    values.pickupArea,
    values.price,
    values.title,
  ]);

  useEffect(() => {
    if (!hasPendingWork) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = true;
    };
    const handleLinkClick = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const target = event.target;
      if (!(target instanceof Element)) return;
      const link = target.closest<HTMLAnchorElement>('a[href]');
      if (!link || link.target === '_blank' || link.hasAttribute('download')) return;

      const href = link.getAttribute('href');
      if (!href || href.startsWith('#')) return;

      const destination = new URL(link.href, window.location.href);
      if (
        destination.pathname === window.location.pathname &&
        destination.search === window.location.search
      ) {
        return;
      }

      if (
        !window.confirm(
          hasUploadingImages || hasFailedImages
            ? 'Photos have not finished. Leave this page anyway?'
            : 'You have unsaved listing changes. Leave this page anyway?',
        )
      ) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('click', handleLinkClick, true);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('click', handleLinkClick, true);
    };
  }, [hasFailedImages, hasPendingWork, hasUploadingImages]);

  const saveDraft = () => {
    manualOperationRef.current = true;
    setPendingAction('save');
    setNoticeKind('success');
    setNotice(isPublished ? 'Saving changes…' : 'Saving your private draft…');
    startSaving(async () => {
      try {
        const id = await persistDraft();
        if (id) {
          setNoticeKind('success');
          setNotice(isPublished ? 'Changes saved.' : 'Draft saved privately.');
        }
      } finally {
        manualOperationRef.current = false;
        setPendingAction(null);
      }
    });
  };

  const publish = () => {
    manualOperationRef.current = true;
    setPendingAction('publish');
    setNoticeKind('success');
    setNotice('Checking your listing before it goes live…');
    startSaving(async () => {
      try {
        clearErrors();
        const id = await persistDraft();
        if (!id) return;

        const payload = toPayload(id);
        const validation = listingPublishSchema.safeParse(payload);
        if (!validation.success) {
          applyFieldErrors(
            Object.fromEntries(
              validation.error.issues.flatMap((issue) =>
                typeof issue.path[0] === 'string' ? [[issue.path[0], issue.message]] : [],
              ),
            ),
            setError,
          );
          setNoticeKind('error');
          setNotice('Your listing needs a few more details before publishing.');
          revealIssue(validation.error.issues[0]?.path[0]);
          return;
        }
        if (images.some((image) => image.status === 'failed')) {
          setNoticeKind('error');
          setNotice('Remove failed uploads before publishing your listing.');
          goToStep(0);
          return;
        }
        if (!images.some((image) => image.status === 'uploaded')) {
          setNoticeKind('error');
          setNotice('Please add at least one finished image before publishing.');
          goToStep(0);
          return;
        }
        if (images.some((image) => image.status === 'uploading')) {
          setNoticeKind('error');
          setNotice('Let the images finish uploading before publishing.');
          return;
        }

        try {
          let result;
          try {
            result = await publishListingAction(validation.data);
          } catch (error) {
            console.error('[listings] publish Server Action request failed', error);
          }

          if (!result?.ok && !result?.fieldErrors) {
            result = await publishListingInBrowser(validation.data);
          }

          if (!result) {
            setNoticeKind('error');
            setNotice('We could not publish the listing. Your work is still saved as a draft.');
            return;
          }

          if (!result.ok) {
            setNoticeKind('error');
            setNotice(result.message);
            applyFieldErrors(result.fieldErrors, setError);
            return;
          }
          publishCompletedRef.current = true;
          router.push(`/listings/${result.data.id}?published=1`);
          router.refresh();
        } catch {
          setNoticeKind('error');
          setNotice('We could not publish the listing. Your work is still saved as a draft.');
        }
      } finally {
        manualOperationRef.current = false;
        setPendingAction(null);
      }
    });
  };

  const selectedCategory = categories.find((category) => String(category.id) === values.categoryId);
  const coverImage = images[0]?.url;
  const selectedCondition = CONDITIONS.find((condition) => condition.value === values.condition);
  const displayPrice = dollarsToCents(values.price);
  const saveState =
    isSaving || isAutosaving
      ? 'Saving…'
      : isDirty
        ? 'Unsaved changes'
        : listingId
          ? isPublished
            ? 'Changes saved'
            : 'Draft saved privately'
          : 'Not saved yet';

  return (
    <div className="um-sell-workspace relative pb-44 text-um-text-inverse lg:pb-24">
      <header className="relative mx-auto max-w-um-content overflow-hidden px-4 pb-7 pt-8 text-um-text-inverse sm:px-6 sm:pb-9 sm:pt-11 lg:px-8">
        <div
          aria-hidden="true"
          className="absolute -right-24 -top-40 size-[30rem] rounded-full bg-[radial-gradient(circle,rgba(38,82,137,0.16),transparent_68%)] blur-2xl"
        />
        <div className="um-campus-signal relative z-10 max-w-3xl pl-4 sm:pl-5">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <p className="font-condensed text-xs font-semibold uppercase tracking-[0.16em] text-um-gold-400">
              {isPublished ? 'Edit listing' : 'Create a listing'}
            </p>
            <span aria-hidden="true" className="h-px w-8 bg-um-gold-600" />
            <p className="text-xs font-medium text-white/[0.55]">{saveState}</p>
          </div>
          <h1 className="mt-2 break-words pb-1 text-[clamp(2.15rem,4.5vw,3.7rem)] font-bold leading-[1.05] tracking-[-0.045em] text-white">
            {isPublished ? (
              'Keep your find current.'
            ) : (
              <>
                Your next good deed.
                <br />
                <span className="font-serif font-normal italic text-um-gold-300">Pass it on.</span>
              </>
            )}
          </h1>
          <p className="mt-4 max-w-lg text-sm leading-relaxed text-white/50">
            A few photos, a little detail, and a new home for something good. Your draft stays
            private until you publish.
          </p>
        </div>
      </header>

      <nav
        aria-label="Listing sections"
        className="relative mx-auto max-w-um-content overflow-x-auto px-4 [scrollbar-width:none] sm:px-6 lg:px-8 [&::-webkit-scrollbar]:hidden"
      >
        <ol className="um-sell-steps">
          {STEPS.map((step, index) => (
            <li key={step.href}>
              <button
                type="button"
                aria-current={activeStep === index ? 'step' : undefined}
                onClick={() => goToStep(index)}
              >
                <span aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
                {step.label}
              </button>
            </li>
          ))}
        </ol>
      </nav>

      <div className="relative mx-auto mt-6 grid max-w-um-content items-start gap-7 px-3 sm:px-6 lg:grid-cols-[minmax(0,1.72fr)_minmax(18.5rem,0.82fr)] lg:px-8 xl:gap-10">
        <form
          className="min-w-0 space-y-5 text-um-text-strong sm:space-y-6"
          onSubmit={(event) => event.preventDefault()}
        >
          <div className="um-step-summary">
            <p ref={stepHeadingRef} tabIndex={-1} className="scroll-mt-28 outline-none">
              Step {activeStep + 1} of 4 <span>— {STEPS[activeStep].label}</span>
            </p>
            <button
              type="button"
              onClick={saveDraft}
              disabled={isSaving}
              className="inline-flex items-center gap-2 text-xs text-white/65 hover:text-white disabled:opacity-40"
            >
              <Save size={14} aria-hidden="true" />
              {isPublished ? 'Save changes' : 'Save draft'}
            </button>
          </div>
          <div hidden={activeStep !== 0} data-sell-step>
            <ImageUploader
              ensureDraft={persistDraft}
              initialImages={initial?.images}
              listingId={listingId}
              onImagesChange={setImages}
            />
            <div className="um-photo-tips">
              <p>
                <strong>Let it shine.</strong> Natural light makes all the difference.
              </p>
              <p>
                <strong>Show the whole story.</strong> Add a close-up of any wear.
              </p>
              <p>
                <strong>Best photo first.</strong> Drag your favourite to the front.
              </p>
            </div>
          </div>

          <section
            hidden={activeStep !== 1}
            data-sell-step
            aria-labelledby="details-heading"
            className="um-sell-section scroll-mt-32 rounded-[1.35rem] px-5 py-8 sm:rounded-[1.65rem] sm:px-8 sm:py-10 lg:px-10"
            id="details"
          >
            <SectionHeading eyebrow="Item details" title="Describe the item" id="details-heading" />

            <div className="mt-9 space-y-9">
              <Field
                counter={`${values.title.length}/${LISTING_TITLE_MAX}`}
                error={errors.title?.message}
                label="Title"
              >
                <Input
                  {...register('title', {
                    maxLength: {
                      value: LISTING_TITLE_MAX,
                      message: `Use ${LISTING_TITLE_MAX} characters or fewer.`,
                    },
                  })}
                  aria-invalid={Boolean(errors.title)}
                  className={cn(
                    'h-[3.25rem] rounded-um-sm px-4 text-base shadow-um-xs',
                    DARK_FIELD_CLASS,
                  )}
                  id="title"
                  placeholder="Dell 24-inch monitor with stand"
                />
              </Field>

              <Field
                counter={`${values.description.length}/${LISTING_DESCRIPTION_MAX}`}
                error={errors.description?.message}
                label="Description"
              >
                <Textarea
                  {...register('description', {
                    maxLength: {
                      value: LISTING_DESCRIPTION_MAX,
                      message: 'The description is too long.',
                    },
                  })}
                  aria-invalid={Boolean(errors.description)}
                  className={cn(
                    'min-h-44 rounded-um-sm px-4 py-4 text-base leading-7 shadow-um-xs',
                    DARK_FIELD_CLASS,
                  )}
                  id="description"
                  onInput={(event) => {
                    event.currentTarget.style.height = 'auto';
                    event.currentTarget.style.height = `${event.currentTarget.scrollHeight}px`;
                  }}
                  placeholder="Selling before co-op. Works perfectly and includes the stand, HDMI cable, and power cable. Small cosmetic marks on the back; no damage to the screen."
                  rows={7}
                />
              </Field>

              <fieldset
                aria-describedby={errors.categoryId ? 'categoryId-error' : undefined}
                aria-invalid={Boolean(errors.categoryId)}
                id="categoryId-group"
              >
                <legend className="text-sm font-bold text-um-text-strong">Category</legend>
                <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                  {categories.map((category) => {
                    const selected = values.categoryId === String(category.id);
                    const Icon = CATEGORY_ICONS[category.slug] ?? Shapes;
                    return (
                      <label
                        className={cn(
                          'relative flex min-h-16 cursor-pointer items-center gap-3 overflow-hidden rounded-[1rem] border px-3 py-3 transition duration-200 ease-um-out focus-within:ring-2 focus-within:ring-um-gold-400 focus-within:ring-offset-2 focus-within:ring-offset-um-ink-900',
                          selected
                            ? 'border-um-gold-400 bg-um-ink-800 text-white shadow-um-sm'
                            : 'border-white/[0.10] bg-um-ink-850 hover:border-white/[0.24] hover:bg-um-ink-800',
                        )}
                        key={category.id}
                      >
                        <input
                          {...register('categoryId')}
                          aria-describedby={errors.categoryId ? 'categoryId-error' : undefined}
                          className="sr-only"
                          id={`categoryId-${category.id}`}
                          type="radio"
                          value={category.id}
                        />
                        <span
                          className={cn(
                            'grid size-9 shrink-0 place-items-center rounded-full',
                            selected
                              ? 'bg-um-gold-400 text-um-ink-950'
                              : 'bg-white/[0.08] text-um-text-muted',
                          )}
                        >
                          <Icon aria-hidden="true" className="size-[1.15rem]" strokeWidth={1.8} />
                        </span>
                        <span
                          className={cn(
                            'pr-3 text-sm font-bold leading-5',
                            selected ? 'text-white' : 'text-um-text-strong',
                          )}
                        >
                          {category.name}
                        </span>
                        {selected ? (
                          <Check
                            aria-hidden="true"
                            className="absolute right-3 top-3 size-4 text-um-gold-400"
                            strokeWidth={2.4}
                          />
                        ) : null}
                      </label>
                    );
                  })}
                </div>
                {errors.categoryId ? (
                  <p className="mt-2 text-sm text-um-danger" id="categoryId-error" role="alert">
                    {errors.categoryId.message}
                  </p>
                ) : null}
              </fieldset>

              <fieldset
                aria-describedby={errors.condition ? 'condition-error' : undefined}
                aria-invalid={Boolean(errors.condition)}
                id="condition-group"
              >
                <legend className="text-sm font-bold text-um-text-strong">Condition</legend>
                <div className="mt-4 grid grid-cols-2 overflow-hidden rounded-um-sm border border-white/[0.12] bg-um-ink-850 sm:grid-cols-5">
                  {CONDITIONS.map((condition) => {
                    const selected = values.condition === condition.value;
                    return (
                      <label
                        className={cn(
                          'relative flex min-h-12 cursor-pointer items-center justify-center border-b border-r border-white/[0.08] px-2 py-3 text-center transition duration-160 ease-um-out focus-within:z-10 focus-within:ring-2 focus-within:ring-um-gold-400 sm:min-h-14 sm:border-b-0',
                          selected
                            ? 'bg-um-gold-400 text-um-ink-950'
                            : 'bg-um-ink-850 text-um-text hover:bg-um-ink-800',
                        )}
                        key={condition.value}
                      >
                        <input
                          {...register('condition')}
                          aria-describedby={errors.condition ? 'condition-error' : undefined}
                          className="sr-only"
                          id={`condition-${condition.value}`}
                          type="radio"
                          value={condition.value}
                        />
                        <span className="text-xs font-bold leading-4 sm:text-sm">
                          {condition.label}
                        </span>
                        {selected ? (
                          <Check
                            aria-hidden="true"
                            className="absolute right-1.5 top-1.5 size-3 text-um-gold-400"
                          />
                        ) : null}
                      </label>
                    );
                  })}
                </div>
                {errors.condition ? (
                  <p className="mt-2 text-sm text-um-danger" id="condition-error" role="alert">
                    {errors.condition.message}
                  </p>
                ) : null}
              </fieldset>
            </div>
          </section>

          <section
            hidden={activeStep !== 2}
            data-sell-step
            aria-labelledby="pricing-heading"
            className="um-sell-section scroll-mt-32 rounded-[1.35rem] px-5 py-8 sm:rounded-[1.65rem] sm:px-8 sm:py-10 lg:px-10"
            id="pricing"
          >
            <SectionHeading
              eyebrow="Price & pickup"
              id="pricing-heading"
              title="Set the exchange"
            />

            <div className="mt-9 grid gap-6">
              <div className="overflow-hidden rounded-[1.15rem] border border-white/[0.12] bg-[#0c1521] shadow-[inset_0_1px_0_rgba(255,255,255,0.035)] sm:grid sm:grid-cols-[minmax(0,1fr)_auto] sm:items-stretch">
                <div className="p-4 sm:p-5">
                  <Field error={errors.price?.message} helper="0 = free" label="Price">
                    <div className="relative">
                      <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-sm font-bold text-um-text-muted">
                        $
                      </span>
                      <Input
                        {...register('price')}
                        aria-describedby="price-help"
                        aria-invalid={Boolean(errors.price)}
                        className={cn(
                          'h-[3.25rem] rounded-[0.8rem] border-white/[0.1] !bg-white/[0.035] pl-8 pr-16 text-lg font-bold shadow-none',
                          DARK_FIELD_CLASS,
                        )}
                        id="price"
                        inputMode="decimal"
                        placeholder="120"
                      />
                      <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center font-condensed text-xs font-semibold uppercase tracking-[0.1em] text-um-text-muted">
                        CAD
                      </span>
                    </div>
                  </Field>
                </div>
                <div className="flex min-h-20 items-center justify-between gap-6 border-t border-white/[0.08] px-4 sm:min-w-52 sm:border-l sm:border-t-0 sm:px-5">
                  <Label className="font-bold text-um-text-strong" htmlFor="open-to-offers">
                    Open to offers
                  </Label>
                  <Switch.Root
                    aria-label="Open to offers"
                    checked={values.openToOffers}
                    className="relative h-7 w-12 shrink-0 rounded-full bg-white/[0.16] transition-colors duration-160 ease-um-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-um-gold-400 focus-visible:ring-offset-2 focus-visible:ring-offset-um-ink-900 data-[state=checked]:bg-um-gold-500"
                    id="open-to-offers"
                    onCheckedChange={(checked) =>
                      setValue('openToOffers', checked, { shouldDirty: true })
                    }
                  >
                    <Switch.Thumb className="block size-5 translate-x-1 rounded-full bg-white shadow transition-transform duration-160 ease-um-out data-[state=checked]:translate-x-6 data-[state=checked]:bg-um-ink-950" />
                  </Switch.Root>
                </div>
              </div>

              <div>
                <Field
                  error={errors.pickupArea?.message}
                  htmlFor="pickupArea"
                  label="Pickup address"
                >
                  <div>
                    <Input
                      {...register('pickupArea')}
                      aria-describedby={errors.pickupArea ? 'pickupArea-help' : undefined}
                      aria-invalid={Boolean(errors.pickupArea)}
                      autoComplete="street-address"
                      className={cn(
                        'h-[3.25rem] rounded-um-sm px-4 text-base shadow-um-xs',
                        DARK_FIELD_CLASS,
                      )}
                      id="pickupArea"
                      placeholder="200 University Ave W, Waterloo"
                    />
                  </div>
                </Field>
              </div>
            </div>
          </section>

          <section hidden={activeStep !== 3} data-sell-step className="scroll-mt-32" id="publish">
            <div className="relative overflow-hidden rounded-[1.35rem] border border-um-gold-300/15 bg-[linear-gradient(135deg,rgba(35,30,16,0.88),rgba(9,15,24,0.94)_55%)] p-5 text-white shadow-[0_24px_64px_rgba(0,0,0,0.24)] sm:rounded-[1.65rem] sm:p-7">
              <div className="flex items-center gap-3">
                <ShieldCheck
                  aria-hidden="true"
                  className="size-5 text-um-gold-300"
                  strokeWidth={1.8}
                />
                <h2 className="text-lg font-bold tracking-[-0.025em] text-white">One last look.</h2>
              </div>

              <p className="mt-3 text-sm leading-relaxed text-white/55">
                Check the details your Waterloo people will see. You can always come back and make
                changes.
              </p>
              <dl className="um-review-details">
                <div>
                  <dt>Photos</dt>
                  <dd>
                    {images.filter((image) => image.status === 'uploaded').length} ready{' '}
                    <button type="button" onClick={() => goToStep(0)}>
                      Edit
                    </button>
                  </dd>
                </div>
                <div>
                  <dt>Item</dt>
                  <dd>
                    {values.title || 'Add a title'}{' '}
                    <button type="button" onClick={() => goToStep(1)}>
                      Edit
                    </button>
                  </dd>
                </div>
                <div>
                  <dt>Category · condition</dt>
                  <dd>
                    {selectedCategory?.name ?? 'Choose a category'} ·{' '}
                    {selectedCondition?.label ?? 'Choose condition'}
                  </dd>
                </div>
                <div>
                  <dt>Price</dt>
                  <dd>
                    {displayPrice === null
                      ? 'Add a price'
                      : displayPrice === 0
                        ? 'Free'
                        : `$${(displayPrice / 100).toFixed(2)} CAD`}
                    {values.openToOffers ? ' · Open to offers' : ''}{' '}
                    <button type="button" onClick={() => goToStep(2)}>
                      Edit
                    </button>
                  </dd>
                </div>
                <div>
                  <dt>Pickup</dt>
                  <dd>{values.pickupArea || 'Add a pickup address'}</dd>
                </div>
              </dl>
              <p
                aria-live="polite"
                className={cn(
                  'mt-5 min-h-5 text-sm font-medium',
                  noticeKind === 'error' ? 'text-red-300' : 'text-emerald-300',
                )}
              >
                {notice || (isDirty ? 'You have unsaved changes.' : saveState)}
              </p>

              <div className="mt-4 hidden flex-wrap justify-end gap-3 lg:flex">
                <Button
                  className="border-white/15 bg-white/[0.07] text-white hover:bg-white/[0.12]"
                  disabled={isSaving}
                  onClick={saveDraft}
                  type="button"
                  variant="secondary"
                >
                  {pendingAction === 'save' ? (
                    <Loader2 aria-hidden="true" className="size-4 animate-spin" />
                  ) : (
                    <Save aria-hidden="true" className="size-4" />
                  )}
                  {pendingAction === 'save'
                    ? 'Saving…'
                    : isPublished
                      ? 'Save changes'
                      : 'Save draft'}
                </Button>
                <Button
                  className="bg-um-gold-400 text-um-ink-950 shadow-um-sm hover:bg-um-gold-300"
                  disabled={isSaving || hasUploadingImages}
                  onClick={publish}
                  size="lg"
                  type="button"
                  variant="primary"
                >
                  {isSaving || hasUploadingImages ? (
                    <Loader2 aria-hidden="true" className="size-4 animate-spin" />
                  ) : (
                    <Sparkles aria-hidden="true" className="size-4" />
                  )}
                  {hasUploadingImages
                    ? 'Uploading photos'
                    : pendingAction === 'publish'
                      ? 'Publishing…'
                      : isPublished
                        ? 'Update listing'
                        : 'Publish listing'}
                </Button>
              </div>
            </div>
          </section>
          <div className="um-step-footer">
            <button
              type="button"
              onClick={() => goToStep(activeStep - 1)}
              disabled={activeStep === 0}
              className="inline-flex min-h-11 items-center gap-2 text-sm text-white/65 disabled:invisible"
            >
              <ArrowLeft size={16} aria-hidden="true" /> Back
            </button>
            {activeStep < 3 && (
              <Button
                type="button"
                onClick={continueStep}
                variant="gold"
                className="rounded-full px-6"
              >
                {activeStep === 2 ? 'Review listing' : 'Continue'}
                <ArrowRight size={16} aria-hidden="true" />
              </Button>
            )}
          </div>
        </form>

        <aside
          aria-label="Live listing preview"
          className="hidden min-w-0 self-start lg:sticky lg:top-24 lg:block"
        >
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="font-condensed text-xs font-bold uppercase tracking-[0.16em] text-um-gold-400">
              Live preview
            </p>
            <p className="text-[0.68rem] font-medium text-white/45">Buyer view</p>
          </div>
          <ListingPreviewCard
            condition={selectedCondition}
            coverImage={coverImage}
            displayPrice={displayPrice}
            selectedCategory={selectedCategory}
            sellerName={sellerName}
            values={values}
          />
        </aside>
      </div>

      {notice ? (
        <div
          aria-live="polite"
          className={cn(
            'pointer-events-none fixed bottom-6 right-6 z-50 hidden max-w-md border px-4 py-3 text-sm font-semibold shadow-[0_18px_50px_rgba(0,0,0,0.32)] lg:block',
            noticeKind === 'error'
              ? 'border-red-300/30 bg-[#341617] text-red-100'
              : 'border-um-gold-400/30 bg-um-ink-900 text-white',
          )}
          role={noticeKind === 'error' ? 'alert' : 'status'}
        >
          {notice}
        </div>
      ) : null}

      <div className="fixed inset-x-0 bottom-[var(--um-mobile-nav-height)] z-40 border-y border-white/10 bg-um-ink-950/[0.97] px-3 py-2.5 shadow-[0_-12px_32px_rgba(0,0,0,0.28)] backdrop-blur-md sm:px-5 lg:hidden">
        <div className="mx-auto max-w-xl">
          <p
            aria-live="polite"
            className={cn(
              'mb-2 truncate text-xs font-medium',
              noticeKind === 'error' ? 'text-red-300' : 'text-white/65',
            )}
            role={noticeKind === 'error' ? 'alert' : 'status'}
          >
            {notice || saveState}
          </p>
          <div className="flex items-center gap-2.5">
            <Dialog.Root>
              <Dialog.Trigger asChild>
                <Button
                  aria-label="Preview listing"
                  className="size-11 shrink-0 border-white/15 bg-white/[0.07] p-0 text-white hover:bg-white/[0.12]"
                  size="icon"
                  type="button"
                  variant="secondary"
                >
                  <Eye aria-hidden="true" className="size-4" />
                </Button>
              </Dialog.Trigger>

              <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 z-50 bg-um-ink-950/60 backdrop-blur-[2px] data-[state=closed]:animate-out data-[state=open]:animate-in" />
                <Dialog.Content
                  aria-describedby="mobile-preview-description"
                  className="fixed inset-x-0 bottom-0 z-50 max-h-[calc(100dvh-0.75rem)] overflow-y-auto overscroll-contain rounded-t-um-xl border border-b-0 border-white/10 bg-um-ink-950 px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 text-white shadow-[0_-24px_64px_rgba(0,0,0,0.42)] focus:outline-none sm:px-6"
                >
                  <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/20" />
                  <div className="mx-auto flex max-w-xl items-start justify-between gap-4">
                    <div className="pt-1">
                      <Dialog.Title className="text-xl font-bold tracking-[-0.025em] text-white">
                        Buyer preview
                      </Dialog.Title>
                      <Dialog.Description className="sr-only" id="mobile-preview-description">
                        Live listing preview
                      </Dialog.Description>
                    </div>
                    <Dialog.Close asChild>
                      <button
                        aria-label="Close listing preview"
                        className="grid size-11 shrink-0 place-items-center rounded-um-sm text-white/55 transition hover:bg-white/[0.08] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-um-gold-400 focus-visible:ring-offset-2 focus-visible:ring-offset-um-ink-950"
                        type="button"
                      >
                        <X aria-hidden="true" className="size-5" />
                      </button>
                    </Dialog.Close>
                  </div>

                  <div className="mx-auto mt-5 max-w-xl">
                    <ListingPreviewCard
                      condition={selectedCondition}
                      coverImage={coverImage}
                      displayPrice={displayPrice}
                      selectedCategory={selectedCategory}
                      sellerName={sellerName}
                      values={values}
                    />
                  </div>
                </Dialog.Content>
              </Dialog.Portal>
            </Dialog.Root>

            <Button
              aria-label={isPublished ? 'Save changes' : 'Save draft'}
              className="h-11 shrink-0 border-white/15 bg-white/[0.07] px-3 text-white hover:bg-white/[0.12]"
              disabled={isSaving}
              onClick={saveDraft}
              type="button"
              variant="secondary"
            >
              {pendingAction === 'save' ? (
                <Loader2 aria-hidden="true" className="size-4 animate-spin" />
              ) : (
                <Save aria-hidden="true" className="size-4" />
              )}
              <span className="hidden min-[390px]:inline">
                {pendingAction === 'save' ? 'Saving…' : isPublished ? 'Save' : 'Save draft'}
              </span>
            </Button>
            <Button
              className="h-11 flex-1 bg-um-gold-500 px-4 text-um-ink-950 shadow-um-xs hover:bg-um-gold-400"
              disabled={isSaving || hasUploadingImages}
              onClick={activeStep < 3 ? continueStep : publish}
              type="button"
              variant="gold"
            >
              {isSaving || hasUploadingImages ? (
                <Loader2 aria-hidden="true" className="size-4 animate-spin" />
              ) : (
                <Sparkles aria-hidden="true" className="size-4" />
              )}
              {activeStep < 3
                ? activeStep === 2
                  ? 'Review listing'
                  : 'Continue'
                : hasUploadingImages
                  ? 'Uploading photos'
                  : pendingAction === 'publish'
                    ? 'Publishing…'
                    : isPublished
                      ? 'Update listing'
                      : 'Publish listing'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionHeading({ eyebrow, title, id }: { eyebrow: string; title: string; id: string }) {
  return (
    <div>
      <p className="font-condensed text-[0.68rem] font-bold uppercase tracking-[0.17em] text-um-gold-300/78">
        {eyebrow}
      </p>
      <h2
        className="mt-2 break-words pb-0.5 text-[clamp(1.65rem,3vw,2.25rem)] font-bold leading-[1.08] tracking-[-0.045em] text-um-text-strong"
        id={id}
      >
        {title}
      </h2>
    </div>
  );
}

function Field({
  label,
  htmlFor,
  helper,
  error,
  counter,
  children,
}: {
  label: string;
  htmlFor?: string;
  helper?: string;
  error?: string;
  counter?: string;
  children: React.ReactNode;
}) {
  const id = htmlFor ?? label.toLowerCase().replaceAll(' ', '-');
  return (
    <div>
      <div className="mb-2.5 flex items-center justify-between gap-3">
        <Label className="font-bold text-um-text-strong" htmlFor={id}>
          {label}
        </Label>
        {counter ? (
          <span className="text-xs tabular-nums text-um-text-muted">{counter}</span>
        ) : null}
      </div>
      {children}
      {error || helper ? (
        <p
          className={cn('mt-2 text-sm leading-5', error ? 'text-um-danger' : 'text-um-text-muted')}
          id={`${id}-help`}
        >
          {error || helper}
        </p>
      ) : null}
    </div>
  );
}

function ListingPreviewCard({
  condition,
  coverImage,
  displayPrice,
  selectedCategory,
  sellerName,
  values,
}: {
  condition: (typeof CONDITIONS)[number] | undefined;
  coverImage: string | undefined;
  displayPrice: number | null;
  selectedCategory: CategoryOption | undefined;
  sellerName: string;
  values: FormValues;
}) {
  return (
    <div className="um-listing-card overflow-hidden rounded-[1.35rem] p-2 text-white shadow-[0_28px_80px_rgba(0,0,0,0.34)]">
      <div className="relative aspect-[4/3] overflow-hidden rounded-[1.05rem] bg-um-ink-800">
        {coverImage ? (
          <Image
            alt={values.title ? `${values.title} cover preview` : 'Listing cover preview'}
            className="object-contain object-center"
            fill
            src={coverImage}
            unoptimized
          />
        ) : (
          <div className="grid h-full place-items-center px-8 text-center">
            <div>
              <ImageIcon
                aria-hidden="true"
                className="mx-auto size-7 text-white/25"
                strokeWidth={1.6}
              />
              <p className="mt-3 text-sm leading-6 text-white/42">
                Your cover photo will appear here.
              </p>
            </div>
          </div>
        )}
        <WaterlooVerificationBadge className="absolute left-3 top-3 bg-um-ink-950/90 shadow-um-xs backdrop-blur-sm" />
      </div>

      <div className="px-3 pb-3 pt-5">
        <p className="font-condensed text-[0.68rem] font-semibold uppercase tracking-[0.13em] text-um-gold-400">
          {selectedCategory?.name || 'Category'}
        </p>
        <div className="mt-2 flex items-start justify-between gap-4">
          <h3 className="min-w-0 break-words text-base font-bold leading-6 tracking-[-0.02em] text-white">
            {values.title || 'Your listing title'}
          </h3>
          <p className="shrink-0 text-base font-bold tabular-nums text-white">
            {formatPreviewPrice(displayPrice)}
          </p>
        </div>

        <div className="mt-4 flex flex-wrap gap-2 text-xs font-medium text-white/72">
          {selectedCategory ? <PreviewCategory category={selectedCategory} /> : null}
          {condition ? (
            <span className="rounded-full bg-white/[0.08] px-2.5 py-1">{condition.label}</span>
          ) : null}
          {values.openToOffers ? (
            <span className="rounded-full bg-um-gold-400 px-2.5 py-1 text-um-ink-950">
              Offers welcome
            </span>
          ) : null}
        </div>

        <div className="mt-5 space-y-2.5 border-t border-white/[0.09] pt-4 text-sm text-white/55">
          <p>{values.pickupArea || 'Pickup address'}</p>
          <p className="flex items-center gap-2">
            <WaterlooVerificationBadge iconOnly size="xs" />
            {sellerName}
          </p>
        </div>
      </div>
    </div>
  );
}

function PreviewCategory({ category }: { category: CategoryOption }) {
  const Icon = CATEGORY_ICONS[category.slug] ?? Shapes;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.08] px-2.5 py-1">
      <Icon aria-hidden="true" className="size-3" strokeWidth={1.8} />
      {category.name}
    </span>
  );
}

function formatPreviewPrice(priceCents: number | null) {
  if (priceCents === null) return '$—';
  if (priceCents === 0) return 'Free';
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    maximumFractionDigits: priceCents % 100 === 0 ? 0 : 2,
  }).format(priceCents / 100);
}

function draftFingerprint(payload: ListingDraftInput) {
  return JSON.stringify({
    listingId: payload.listingId ?? null,
    title: payload.title,
    description: payload.description,
    priceCents: payload.priceCents,
    categoryId: payload.categoryId,
    condition: payload.condition,
    openToOffers: payload.openToOffers,
    pickupArea: payload.pickupArea,
    pickupLatitude: payload.pickupLatitude,
    pickupLongitude: payload.pickupLongitude,
  });
}

function applyFieldErrors(
  errors: Record<string, string> | undefined,
  setError: ReturnType<typeof useForm<FormValues>>['setError'],
) {
  if (!errors) return;
  for (const [field, message] of Object.entries(errors)) {
    const formField =
      field === 'priceCents'
        ? 'price'
        : field === 'pickupLatitude' || field === 'pickupLongitude'
          ? 'pickupArea'
          : field;
    if (
      formField in
      {
        title: 1,
        description: 1,
        price: 1,
        categoryId: 1,
        condition: 1,
        pickupArea: 1,
        openToOffers: 1,
      }
    ) {
      setError(formField as keyof FormValues, { message });
    }
  }
}

function focusFirstIssue(field: PropertyKey | undefined) {
  if (typeof field !== 'string') return;
  const formField =
    field === 'priceCents'
      ? 'price'
      : field === 'pickupLatitude' || field === 'pickupLongitude'
        ? 'pickupArea'
        : field;
  const isRadioGroup = formField === 'categoryId' || formField === 'condition';
  const control = isRadioGroup
    ? (document.querySelector<HTMLInputElement>(`input[name="${formField}"]:checked`) ??
      document.querySelector<HTMLInputElement>(`input[name="${formField}"]`))
    : document.getElementById(formField);
  const scrollTarget = isRadioGroup ? document.getElementById(`${formField}-group`) : control;

  control?.focus({ preventScroll: true });
  scrollTarget?.scrollIntoView?.({
    behavior: 'smooth',
    block: 'center',
  });
}
