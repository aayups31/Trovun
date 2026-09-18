import { expect, test } from '@playwright/test';

test('homepage remains readable and usable with motion disabled', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  for (const id of [
    'home-heading',
    'finds-heading',
    'how-heading',
    'categories-heading',
    'join-heading',
  ]) {
    const heading = page.locator(`#${id}`);
    await heading.scrollIntoViewIfNeeded();
    await expect(heading).toBeVisible();
    expect(
      await heading.evaluate((el) => {
        let node: Element | null = el;
        while (node) {
          if (Number(getComputedStyle(node).opacity) < 0.95) return false;
          node = node.parentElement;
        }
        return true;
      }),
    ).toBe(true);
  }
  expect(await page.locator('video').count()).toBe(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('homepage does not depend on JavaScript for its content or navigation', async ({
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('http://localhost:3000/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Your university.');
  await expect(page.getByRole('link', { name: 'Find your people' })).toHaveAttribute(
    'href',
    '/signup',
  );
  await expect(
    page.getByRole('navigation', { name: 'Marketplace categories' }).getByRole('link'),
  ).toHaveCount(4);
  await context.close();
});

test('scrolling reveals all three product cards without changing page width', async ({ page }) => {
  await page.goto('/');
  const story = page.locator('[data-home-story]');
  await story.scrollIntoViewIfNeeded();
  const storyBottom = await story.evaluate((el) => el.getBoundingClientRect().bottom + scrollY);
  await page.evaluate(
    (bottom) => window.scrollTo({ top: bottom - innerHeight + 100, behavior: 'instant' }),
    storyBottom,
  );
  for (const card of await page.locator('[data-home-story-card]').all()) {
    await expect(card).toHaveCSS('opacity', '1');
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('page scrolling reveals all seven listings without manual controls', async ({
  page,
  isMobile,
}) => {
  await page.goto('/');
  const gallery = page.locator('[data-home-listings]');
  await gallery.evaluate((el) => {
    const sample = el.querySelector('[data-home-listing]')!;
    while (el.children.length < 7) {
      const card = sample.cloneNode(true) as HTMLElement;
      card.removeAttribute('style');
      el.appendChild(card);
    }
  });
  const rail = page.locator('[data-home-carousel]');
  const viewport = page.locator('[data-carousel-viewport]');
  await expect(rail).toHaveAttribute('data-carousel-enhanced', '');
  await expect(page.getByRole('slider')).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Next listings|Previous listings/ })).toHaveCount(
    0,
  );
  const start = await rail.evaluate(
    (el, offset) => el.getBoundingClientRect().top + scrollY - offset,
    isMobile ? 88 : 110,
  );
  await page.evaluate((top) => window.scrollTo({ top, behavior: 'instant' }), start + 350);
  await expect.poll(() => viewport.evaluate((el) => el.scrollLeft)).toBeGreaterThan(100);
  const travel = await rail.evaluate(
    (el) =>
      (el as HTMLElement).offsetHeight - (el.querySelector('[data-carousel-stage]') as HTMLElement).offsetHeight,
  );
  await page.evaluate((top) => window.scrollTo({ top, behavior: 'instant' }), start + travel);
  await expect
    .poll(() => viewport.evaluate((el) => el.scrollWidth - el.clientWidth - el.scrollLeft))
    .toBeLessThan(2);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.evaluate((top) => window.scrollTo({ top, behavior: 'instant' }), start);
  await expect.poll(() => viewport.evaluate((el) => el.scrollLeft)).toBeLessThan(2);
});

test('product previews loop automatically without playback buttons', async ({ page }) => {
  await page.goto('/');
  const scene = page.locator('[data-preview="access"]');
  await scene.scrollIntoViewIfNeeded();
  await expect(page.locator('[data-home-story]')).toHaveAttribute('data-previews-ready', '');
  await expect(
    page.getByRole('button', { name: /Pause previews|Play previews|Replay/ }),
  ).toHaveCount(0);
  const code = page.locator('[data-access-code]');
  // Observe the verification scene appear, disappear, then appear on its next cycle.
  await expect(code).toHaveCSS('visibility', 'visible', { timeout: 12000 });
  await expect(code).toHaveCSS('visibility', 'hidden', { timeout: 12000 });
  await expect(code).toHaveCSS('visibility', 'visible', { timeout: 12000 });
});

test('visible listing photos recover from storage failures without an image proxy', async ({
  page,
}) => {
  await page.route('**/storage/v1/object/sign/**', (route) => route.abort());
  await page.goto('/');
  await page.locator('[data-home-carousel]').scrollIntoViewIfNeeded();
  const images = page.locator('[data-home-listing] img');
  const sources = await images.evaluateAll((nodes) =>
    nodes.map((node) => (node as HTMLImageElement).src),
  );
  expect(sources.every((src) => !src.includes('_next/image'))).toBe(true);
  for (const image of await images.all()) {
    await image.scrollIntoViewIfNeeded();
    await expect
      .poll(async () =>
        image.evaluate((node) => {
          const photo = node as HTMLImageElement;
          return photo.complete && photo.naturalWidth > 0;
        }),
      )
      .toBe(true);
  }
});

test('preview frames move and disappear together while stars stay visible', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('[data-home-story]')).toHaveAttribute('data-previews-ready', '');
  await page.locator('[data-preview="access"]').scrollIntoViewIfNeeded();
  const panels = page.locator('[data-home-scene-panel]');
  await expect
    .poll(
      async () =>
        panels.evaluateAll((nodes) =>
          nodes.every((node) => Number(getComputedStyle(node).opacity) > 0.98),
        ),
      { timeout: 14000 },
    )
    .toBe(true);
  await expect
    .poll(
      async () =>
        panels.evaluateAll((nodes) =>
          nodes.every((node) => getComputedStyle(node).visibility === 'hidden'),
        ),
      { timeout: 14000, intervals: [50] },
    )
    .toBe(true);
  const states = await panels.evaluateAll((nodes) =>
    nodes.map((node) => ({
      opacity: Number(getComputedStyle(node).opacity),
      y: new DOMMatrix(getComputedStyle(node).transform).m42,
      stars: getComputedStyle(node.closest('[data-preview]')!, '::before').opacity,
    })),
  );
  expect(
    states.every((state) => state.opacity === 0 && state.y < -20 && Number(state.stars) > 0.5),
  ).toBe(true);
  await expect
    .poll(
      async () =>
        panels.evaluateAll((nodes) =>
          nodes.every((node) => {
            const alpha = Number(getComputedStyle(node).opacity);
            return alpha > 0.15 && alpha < 0.85;
          }),
        ),
      { intervals: [50], timeout: 4000 },
    )
    .toBe(true);
  await expect(page.locator('[data-preview="access"]')).toHaveCSS('opacity', '1');
  expect(
    await page
      .locator('[data-home-story]')
      .evaluate((el) => getComputedStyle(el, '::before').content),
  ).toBe('none');
  await expect(page.getByRole('navigation', { name: 'Marketplace categories' })).toHaveCSS(
    'border-radius',
    '0px',
  );
});

test('gallery photos respond to page scrolling without moving the grid out of flow', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.locator('[data-home-story]')).toHaveAttribute('data-previews-ready', '');
  const card = page.locator('[data-home-listing]').first();
  await card.scrollIntoViewIfNeeded();
  const photo = card.locator('img');
  const initial = await photo.evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).m42);
  await page.evaluate(() => window.scrollBy({ top: 200, behavior: 'instant' }));
  await expect
    .poll(() => photo.evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).m42))
    .toBeGreaterThan(initial + 1);
  await expect(page.locator('[data-home-listings]')).toHaveCSS('display', 'flex');
});
