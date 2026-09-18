import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NotificationPreferences } from './NotificationPreferences';
import { updateMessageEmailPreference } from './actions';
vi.mock('./actions', () => ({ updateMessageEmailPreference: vi.fn() }));
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});
describe('notification preference', () => {
  it('saves the opt-out and updates the switch after success', async () => {
    vi.mocked(updateMessageEmailPreference).mockResolvedValue({
      ok: true,
      message: 'Message emails turned off.',
    });
    render(<NotificationPreferences enabled available />);
    await userEvent.click(screen.getByRole('switch', { name: 'Message emails' }));
    expect(updateMessageEmailPreference).toHaveBeenCalledWith(false);
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'false');
  });
  it('keeps the saved value and shows an error if saving fails', async () => {
    vi.mocked(updateMessageEmailPreference).mockResolvedValue({ ok: false, message: 'Try again.' });
    render(<NotificationPreferences enabled available />);
    await userEvent.click(screen.getByRole('switch'));
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('alert')).toHaveTextContent('Try again.');
  });
});
