import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ resendSignupAction: vi.fn(), signupAction: vi.fn() }));

vi.mock('../actions', () => ({
  resendSignupAction: mocks.resendSignupAction,
  signupAction: mocks.signupAction,
}));

import { SignupForm } from './signup-form';

describe('SignupForm', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('shows a sign-in prompt instead of verification for an existing account', async () => {
    mocks.signupAction.mockResolvedValue({
      ok: false,
      message: 'This Waterloo email is already registered.',
      reason: 'account-exists',
    });
    const user = userEvent.setup();

    render(<SignupForm nextPath="/marketplace" />);
    await user.type(screen.getByLabelText('Waterloo email'), 'student@uwaterloo.ca');
    await user.type(screen.getByLabelText('Password'), 'Waterloo8');
    await user.type(screen.getByLabelText('Confirm password'), 'Waterloo8');
    await user.click(screen.getByRole('button', { name: 'Join Trovun' }));

    const accountNotice = await screen.findByRole('status');
    expect(within(accountNotice).getByText('Email already registered.')).toBeVisible();
    expect(
      within(accountNotice).queryByText(/This Waterloo email already has an account/i),
    ).not.toBeInTheDocument();
    expect(within(accountNotice).getByRole('link', { name: 'Sign in' })).toHaveAttribute(
      'href',
      '/login',
    );
    expect(within(accountNotice).getByRole('link', { name: 'Forgot password?' })).toHaveAttribute(
      'href',
      '/forgot-password',
    );
    expect(
      within(accountNotice).queryByRole('button', { name: 'Send new code' }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('offers verification recovery when the signup response is interrupted', async () => {
    mocks.signupAction.mockRejectedValue(new Error('connection lost'));
    mocks.resendSignupAction.mockResolvedValue({
      ok: true,
      message: 'If verification is still pending, a new code has been requested.',
    });
    const user = userEvent.setup();

    render(<SignupForm nextPath="/marketplace" />);
    await user.type(screen.getByLabelText('Waterloo email'), 'student@uwaterloo.ca');
    await user.type(screen.getByLabelText('Password', { exact: true }), 'Waterloo8');
    await user.type(screen.getByLabelText('Confirm password'), 'Waterloo8');
    await user.click(screen.getByRole('button', { name: 'Join Trovun' }));

    expect(await screen.findByRole('alert')).toHaveTextContent("We couldn't confirm the result");
    const resendButton = screen.getByRole('button', { name: 'Send new code' });
    expect(resendButton).toBeVisible();

    await user.click(resendButton);
    expect(
      await screen.findByText('If verification is still pending, a new code has been requested.'),
    ).toBeVisible();
    expect(screen.getByRole('button', { name: 'Resend in 60s' })).toBeDisabled();
  });
});
