import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ComponentProps } from 'react';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  publishListingAction: vi.fn(),
  publishListingInBrowser: vi.fn(),
  push: vi.fn(),
  refresh: vi.fn(),
  saveListingDraftAction: vi.fn(),
  saveListingDraftInBrowser: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.push, refresh: mocks.refresh }),
}));

vi.mock('../actions', () => ({
  publishListingAction: mocks.publishListingAction,
  saveListingDraftAction: mocks.saveListingDraftAction,
}));

vi.mock('../client-persistence', () => ({
  publishListingInBrowser: mocks.publishListingInBrowser,
  saveListingDraftInBrowser: mocks.saveListingDraftInBrowser,
}));

vi.mock('./ImageUploader', async () => {
  const React = await import('react');
  type MockImageStatus = 'uploading' | 'uploaded' | 'failed';
  const imageForStatus = (status: MockImageStatus) => [
    {
      id: 'image-one',
      url: '/images/test-listing.jpg',
      path: 'seller/listing/image-one.jpg',
      progress: status === 'uploaded' ? 100 : 0,
      status,
      name: 'test-listing.jpg',
    },
  ];

  return {
    ImageUploader: ({
      onImagesChange,
    }: {
      onImagesChange?: (images: ReturnType<typeof imageForStatus>) => void;
    }) => {
      React.useEffect(() => onImagesChange?.(imageForStatus('uploaded')), [onImagesChange]);
      return (
        <section id="images">
          One uploaded photo
          <button type="button" onClick={() => onImagesChange?.(imageForStatus('uploading'))}>
            Mock image uploading
          </button>
          <button type="button" onClick={() => onImagesChange?.(imageForStatus('uploaded'))}>
            Mock image uploaded
          </button>
          <button type="button" onClick={() => onImagesChange?.(imageForStatus('failed'))}>
            Mock image failed
          </button>
          <button type="button" onClick={() => onImagesChange?.([])}>
            Mock image removed
          </button>
        </section>
      );
    },
  };
});

import { ListingComposer } from './ListingComposer';

const categories = [{ id: 7, slug: 'books', name: 'Books', icon: 'book' }];

beforeAll(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
});

afterAll(() => vi.unstubAllGlobals());
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

type ComposerInitial = NonNullable<ComponentProps<typeof ListingComposer>['initial']>;

function renderComposer(initial?: Partial<ComposerInitial>) {
  const hydratedInitial: ComposerInitial | undefined = initial
    ? {
        id: 'c67713b4-f2e5-4c4a-a647-e22a65134c80',
        title: 'Desk lamp',
        description: 'A bright desk lamp in excellent working condition.',
        priceCents: 1200,
        categoryId: 7,
        condition: 'good',
        openToOffers: false,
        pickupArea: '200 University Ave W',
        pickupLatitude: null,
        pickupLongitude: null,
        status: 'published',
        images: [],
        ...initial,
      }
    : undefined;

  return render(
    <ListingComposer
      categories={categories}
      initial={hydratedInitial}
      sellerName="A Waterloo student"
    />,
  );
}

describe('ListingComposer listing actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.saveListingDraftAction.mockImplementation(async (input: { listingId: string }) => ({
      ok: true,
      data: { id: input.listingId, version: 1 },
    }));
    mocks.publishListingAction.mockImplementation(async (input: { listingId: string }) => ({
      ok: true,
      data: { id: input.listingId },
    }));
    mocks.saveListingDraftInBrowser.mockImplementation(async (input: { listingId: string }) => ({
      ok: true,
      data: { id: input.listingId, version: 1 },
    }));
    mocks.publishListingInBrowser.mockImplementation(async (input: { listingId: string }) => ({
      ok: true,
      data: { id: input.listingId },
    }));
  });

  it('keeps listing fields legible without exposing map controls', () => {
    renderComposer();

    expect(screen.getByLabelText('Title')).toHaveClass('!bg-[#111a26]', '!text-[#f7f4ee]');
    expect(screen.getByLabelText('Description')).toHaveClass('!bg-[#111a26]', '!text-[#f7f4ee]');
    expect(screen.getByLabelText('Pickup address')).toHaveClass('!bg-[#111a26]', '!text-[#f7f4ee]');
    expect(screen.queryByText('Place the pickup pin')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Use my location' })).not.toBeInTheDocument();
  });

  it('does not retain a hidden legacy pin when an older listing is saved', async () => {
    const user = userEvent.setup();
    renderComposer({
      pickupArea: '200 University Ave W',
      pickupLatitude: 43.471468,
      pickupLongitude: -80.544205,
    });

    await user.click(screen.getAllByRole('button', { name: 'Save changes' })[0]);

    await waitFor(() => expect(mocks.saveListingDraftAction).toHaveBeenCalledTimes(1));
    expect(mocks.saveListingDraftAction).toHaveBeenCalledWith(
      expect.objectContaining({ pickupLatitude: null, pickupLongitude: null }),
    );
  });

  it('saves a new draft and reuses the returned listing id on the next save', async () => {
    const user = userEvent.setup();
    renderComposer();

    await user.click(screen.getAllByRole('button', { name: 'Save draft' })[0]);

    await waitFor(() => expect(mocks.saveListingDraftAction).toHaveBeenCalledTimes(1));
    const reservedId = mocks.saveListingDraftAction.mock.calls[0][0].listingId;
    expect(reservedId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    expect(mocks.saveListingDraftAction).toHaveBeenNthCalledWith(1, {
      listingId: reservedId,
      title: '',
      description: '',
      priceCents: null,
      categoryId: null,
      condition: null,
      openToOffers: false,
      pickupArea: '',
      pickupLatitude: null,
      pickupLongitude: null,
    });

    await waitFor(() =>
      expect(screen.getAllByRole('button', { name: 'Save draft' })[0]).toBeEnabled(),
    );
    await user.type(screen.getByLabelText('Title'), 'Desk lamp');
    await user.click(screen.getAllByRole('button', { name: 'Save draft' })[0]);

    await waitFor(() => expect(mocks.saveListingDraftAction).toHaveBeenCalledTimes(2));
    expect(mocks.saveListingDraftAction).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ listingId: reservedId, title: 'Desk lamp' }),
    );
  });

  it('defers the edit URL until a newly-created draft image finishes uploading', async () => {
    const replaceState = vi
      .spyOn(window.history, 'replaceState')
      .mockImplementation(() => undefined);
    const user = userEvent.setup();
    renderComposer();

    await user.click(screen.getByRole('button', { name: 'Mock image uploading' }));
    await user.click(screen.getAllByRole('button', { name: 'Save draft' })[0]);

    await waitFor(() => expect(mocks.saveListingDraftAction).toHaveBeenCalledOnce());
    await waitFor(() =>
      expect(screen.getAllByText('Draft saved privately.').length).toBeGreaterThan(0),
    );
    const reservedId = mocks.saveListingDraftAction.mock.calls[0][0].listingId;
    expect(replaceState).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Mock image uploaded' }));

    await waitFor(() => expect(replaceState).toHaveBeenCalledOnce());
    expect(replaceState.mock.calls[0]?.slice(1)).toEqual(['', `/listings/${reservedId}/edit`]);
  });

  it('keeps a failed image on the new URL until the failed image is removed', async () => {
    const replaceState = vi
      .spyOn(window.history, 'replaceState')
      .mockImplementation(() => undefined);
    const user = userEvent.setup();
    renderComposer();

    await user.click(screen.getByRole('button', { name: 'Mock image failed' }));
    await user.click(screen.getAllByRole('button', { name: 'Save draft' })[0]);

    await waitFor(() => expect(mocks.saveListingDraftAction).toHaveBeenCalledOnce());
    await waitFor(() =>
      expect(screen.getAllByText('Draft saved privately.').length).toBeGreaterThan(0),
    );
    const reservedId = mocks.saveListingDraftAction.mock.calls[0][0].listingId;
    expect(replaceState).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Mock image removed' }));

    await waitFor(() => expect(replaceState).toHaveBeenCalledOnce());
    expect(replaceState.mock.calls[0]?.slice(1)).toEqual(['', `/listings/${reservedId}/edit`]);
  });

  it('saves a complete new listing before publishing it with the returned id', async () => {
    const user = userEvent.setup();
    renderComposer();

    await user.click(screen.getAllByRole('button', { name: 'Continue' })[0]);
    await user.type(screen.getByLabelText('Title'), 'Calculus textbook');
    await user.type(
      screen.getByLabelText('Description'),
      'Clean copy with no missing pages and only a few pencil notes.',
    );
    await user.click(screen.getByRole('radio', { name: 'Books' }));
    await user.click(screen.getByRole('radio', { name: 'Good' }));
    await user.click(screen.getAllByRole('button', { name: 'Continue' })[0]);
    await user.type(screen.getByLabelText('Price'), '35');
    await user.type(screen.getByLabelText('Pickup address'), '200 University Ave W');

    await user.click(screen.getAllByRole('button', { name: 'Review listing' })[0]);
    await user.click(screen.getAllByRole('button', { name: 'Publish listing' })[0]);

    await waitFor(() => expect(mocks.publishListingAction).toHaveBeenCalledTimes(1));

    expect(mocks.saveListingDraftAction).toHaveBeenCalledTimes(1);
    const reservedId = mocks.saveListingDraftAction.mock.calls[0][0].listingId;
    expect(reservedId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    expect(mocks.saveListingDraftAction).toHaveBeenCalledWith({
      listingId: reservedId,
      title: 'Calculus textbook',
      description: 'Clean copy with no missing pages and only a few pencil notes.',
      priceCents: 3500,
      categoryId: 7,
      condition: 'good',
      openToOffers: false,
      pickupArea: '200 University Ave W',
      pickupLatitude: null,
      pickupLongitude: null,
    });
    expect(mocks.publishListingAction).toHaveBeenCalledWith({
      listingId: reservedId,
      title: 'Calculus textbook',
      description: 'Clean copy with no missing pages and only a few pencil notes.',
      priceCents: 3500,
      categoryId: 7,
      condition: 'good',
      openToOffers: false,
      pickupArea: '200 University Ave W',
      pickupLatitude: null,
      pickupLongitude: null,
    });
    expect(mocks.saveListingDraftAction.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.publishListingAction.mock.invocationCallOrder[0],
    );
    expect(mocks.push).toHaveBeenCalledWith(`/listings/${reservedId}?published=1`);
    expect(mocks.refresh).toHaveBeenCalledTimes(1);
  });

  it('uses the signed-in browser session when the Server Action transport fails', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    mocks.saveListingDraftAction.mockRejectedValueOnce(new Error('Server Action request failed'));
    const user = userEvent.setup();
    renderComposer();

    await user.click(screen.getAllByRole('button', { name: 'Save draft' })[0]);

    await waitFor(() => expect(mocks.saveListingDraftInBrowser).toHaveBeenCalledTimes(1));
    const reservedId = mocks.saveListingDraftAction.mock.calls[0][0].listingId;
    expect(mocks.saveListingDraftInBrowser).toHaveBeenCalledWith(
      expect.objectContaining({ listingId: reservedId }),
    );
    await waitFor(() =>
      expect(screen.getAllByText('Draft saved privately.').length).toBeGreaterThan(0),
    );
    expect(consoleError).not.toHaveBeenCalled();
  });
});
