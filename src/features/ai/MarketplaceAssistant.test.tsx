import { useState } from 'react';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MarketplaceAssistant } from './MarketplaceAssistant';

const suggestion = {
  title: 'Desk',
  description: 'Wooden desk with a scratch on top.',
  concerns: [],
  checks: ['Confirm dimensions.'],
  categoryId: 3,
  suggestedPriceCents: 4500,
  priceReason: 'Assumes a stable used desk.',
  blocked: false,
};
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
describe('minimal AI controls', () => {
  it('starts as one button, opens an accessible dialog and restores focus on Escape', async () => {
    const user = userEvent.setup();
    render(<MarketplaceAssistant purpose="buyer" title="Laptop" description="Used laptop" />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    const trigger = screen.getByRole('button', { name: 'Ask about this item' });
    await user.click(trigger);
    expect(screen.getByRole('dialog')).toBeVisible();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });
  it('autofills details from explicitly selected photos and applies price only on request', async () => {
    const user = userEvent.setup();
    const apply = vi.fn();
    const applyPrice = vi.fn();
    const request = vi.fn().mockResolvedValue(new Response(JSON.stringify(suggestion)));
    vi.stubGlobal('fetch', request);
    function Harness() {
      const [fields, setFields] = useState({ title: '', description: '' });
      return (
        <MarketplaceAssistant
          purpose="listing"
          {...fields}
          currentPrice="80"
          listingId="b1234567-1234-4123-8123-123456789abc"
          photoRevision="one"
          onApply={(result) => {
            apply(result);
            setFields(result);
          }}
          onApplyPrice={applyPrice}
        />
      );
    }
    render(<Harness />);
    await user.click(screen.getByRole('button', { name: 'Autofill listing' }));
    expect(screen.getByRole('checkbox')).not.toBeChecked();
    expect(screen.getByRole('button', { name: 'Autofill & suggest price' })).toBeDisabled();
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: 'Autofill & suggest price' }));
    await screen.findByText(/Details filled/);
    expect(JSON.parse(request.mock.calls[0][1].body).includePhotos).toBe(true);
    expect(apply).toHaveBeenCalledWith(suggestion);
    expect(applyPrice).not.toHaveBeenCalled();
    const price = screen.getByLabelText('Suggested price · CAD');
    expect(price).toHaveValue('45');
    await user.clear(price);
    await user.type(price, '40');
    await user.click(screen.getByRole('button', { name: 'Use price' }));
    expect(applyPrice).toHaveBeenCalledWith(4000);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
  it('does not overwrite details changed while autofill is in flight', async () => {
    const user = userEvent.setup();
    const apply = vi.fn();
    let resolve!: (value: Response) => void;
    vi.stubGlobal(
      'fetch',
      vi.fn().mockReturnValue(
        new Promise<Response>((done) => {
          resolve = done;
        }),
      ),
    );
    const { rerender } = render(
      <MarketplaceAssistant purpose="listing" title="Desk" description="Wooden" onApply={apply} />,
    );
    await user.click(screen.getByRole('button', { name: 'Autofill listing' }));
    await user.click(screen.getByRole('button', { name: 'Autofill & suggest price' }));
    rerender(
      <MarketplaceAssistant
        purpose="listing"
        title="Desk with damage"
        description="Wooden"
        onApply={apply}
      />,
    );
    resolve(new Response(JSON.stringify(suggestion)));
    await screen.findByRole('alert');
    expect(apply).not.toHaveBeenCalled();
  });
  it('keeps prohibited offers unchanged but does not treat routine checks as blocking', async () => {
    const user = userEvent.setup();
    const apply = vi.fn();
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          new Response(
            JSON.stringify({
              ...suggestion,
              blocked: true,
              concerns: ['Prohibited item.'],
              suggestedPriceCents: null,
            }),
          ),
        ),
    );
    render(
      <MarketplaceAssistant
        purpose="listing"
        title="Item"
        description="Review this item."
        onApply={apply}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Autofill listing' }));
    await user.click(screen.getByRole('button', { name: 'Autofill & suggest price' }));
    await waitFor(() => expect(screen.getByText('Review this item first')).toBeVisible());
    expect(apply).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'Use price' })).not.toBeInTheDocument();
  });
});
