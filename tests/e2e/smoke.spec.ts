import { expect, test } from '@playwright/test';

test('landing page presents the real Waterloo-only product', async ({ page }) => {
  await page.goto('/');

  await expect(
    page.getByRole('heading', {
      level: 1,
      name: /good things.*right here/i,
    }),
  ).toBeVisible();
  await expect(
    page.locator('#main-content').getByRole('link', { name: 'Find your people', exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('link', { name: 'Sign in', exact: true }).first()).toHaveAttribute(
    'href',
    '/marketplace',
  );
  await expect(page.getByText(/in-app escrow/i)).toHaveCount(0);
  await expect(page.getByText(/coming to your campus/i)).toHaveCount(0);
});

test('protected marketplace preserves its destination on sign-in redirect', async ({ page }) => {
  await page.goto('/marketplace');

  await expect(page).toHaveURL(/\/login\?next=%2Fmarketplace$/);
  await expect(
    page.getByRole('heading', { level: 1, name: 'Sign in with Waterloo' }),
  ).toBeVisible();
});

test('protected moderation preserves its destination on sign-in redirect', async ({ page }) => {
  await page.goto('/moderation?page=2');

  await expect(page).toHaveURL(/\/login\?next=%2Fmoderation%3Fpage%3D2$/);
});

test('login rejects non-Waterloo email before password authentication', async ({ page }) => {
  await page.goto('/login');
  await page.waitForLoadState('networkidle');

  const email = page.getByLabel('Email', { exact: true });
  await email.fill('student@gmail.com');
  await page.getByLabel('Password', { exact: true }).fill('Waterloo8');
  await expect(email).toHaveValue('student@gmail.com');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();

  await expect(page.getByText('Use your @uwaterloo.ca email address.')).toBeVisible();
  await expect(page).toHaveURL(/\/login$/);
});

test('signup is Waterloo-only and requires matching strong passwords', async ({ page }) => {
  await page.goto('/signup');
  await page.waitForLoadState('networkidle');

  await page.getByLabel('Waterloo email').fill('aayupsuw@gmail.com');
  await page.getByLabel('Password', { exact: true }).fill('Waterloo8');
  await page.getByLabel('Confirm password').fill('Different8');
  await page.getByRole('button', { name: 'Join UniMarket' }).click();

  await expect(page.getByText('Use your @uwaterloo.ca email address.')).toBeVisible();
  await expect(page.getByText('Passwords do not match.')).toBeVisible();
});

test('signup confirmation screen accepts a six-digit email code', async ({ page }) => {
  await page.goto('/verify?email=student%40uwaterloo.ca&next=%2Flistings%2Fnew');

  await expect(
    page.getByRole('heading', { level: 1, name: 'Verify your Waterloo email' }),
  ).toBeVisible();
  await expect(page.getByText('student@uwaterloo.ca')).toBeVisible();
  await expect(page.getByLabel('Verification code')).toHaveAttribute(
    'autocomplete',
    'one-time-code',
  );
  await expect(page.getByText('Six digits · expires in 15 minutes')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Resend in 60s' })).toBeDisabled();
  await expect(page.getByRole('link', { name: 'Change email' })).toHaveAttribute(
    'href',
    '/signup?next=%2Flistings%2Fnew',
  );
});

test('an invalid signup callback returns to sign in safely', async ({ page }) => {
  await page.context().addCookies([
    {
      name: 'unimarket-auth-next',
      url: 'http://localhost:3000',
      value: '/my-listings',
    },
  ]);
  await page.goto('/auth/callback');

  await expect(page).toHaveURL(/\/login\?error=invalid-link&next=%2Fmy-listings$/);
  await expect(page.getByText('That verification link is invalid or expired.')).toBeVisible();
});

test('password recovery has a generic response surface', async ({ page }) => {
  await page.goto('/forgot-password');

  await expect(page.getByRole('heading', { level: 1, name: 'Reset your password' })).toBeVisible();
  await expect(page.getByText(/if the address belongs to an eligible account/i)).toBeVisible();
});

test('an invalid recovery callback returns to password recovery', async ({ page }) => {
  await page.goto('/auth/recovery-callback');

  await expect(page).toHaveURL(/\/forgot-password\?error=invalid-link$/);
  await expect(page.getByText('That recovery link is invalid or expired.')).toBeVisible();
});
