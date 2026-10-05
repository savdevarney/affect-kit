import { expect, test, type Locator, type Page } from '@playwright/test';

// Behavior of <affect-kit-rater face-only> in the playground: the pad works,
// no chips render, and commit carries the face with no labels.

/** Drag the face from the pad's center to a point given as fractions of its box. */
async function dragFace(page: Page, rater: Locator, to: { x: number; y: number }) {
  const box = await rater.locator('.face-zone').boundingBox();
  if (!box) throw new Error('No face zone');
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * to.x, box.y + box.height * to.y, { steps: 8 });
  await page.mouse.up();
}

test('face-only: no chips, and commit carries the face with no labels', async ({ page }, testInfo) => {
  await page.goto('/');
  const rater = page.locator('#rater');
  await rater.evaluate((el) => {
    (el as HTMLElement & { faceOnly: boolean }).faceOnly = true;
    // Resolve with the next commit's payload.
    (window as unknown as { nextCommit: Promise<unknown> }).nextCommit = new Promise((resolve) =>
      el.addEventListener('commit', (e) => resolve((e as CustomEvent).detail), { once: true }),
    );
  });

  await expect(rater.locator('.submit-btn')).not.toHaveClass(/visible/);

  // Up and to the right: pleasant and activated.
  await dragFace(page, rater, { x: 0.85, y: 0.2 });

  await expect(rater.locator('.chip')).toHaveCount(0);
  await expect(rater.locator('.submit-btn')).toHaveClass(/visible/);
  await page.waitForTimeout(400); // let the button's fade-in finish before the picture
  await rater.screenshot({ path: testInfo.outputPath('face-only.png') });

  await rater.locator('.submit-btn').click();
  const rating = (await page.evaluate(
    () => (window as unknown as { nextCommit: Promise<unknown> }).nextCommit,
  )) as { face: { v: number; a: number }; labels: unknown[]; composite: unknown };

  expect(rating.labels).toEqual([]);
  expect(rating.composite).toBeNull();
  expect(rating.face.v).toBeGreaterThan(0.5);
  expect(rating.face.a).toBeGreaterThan(0.4);
});

test('face-only ignores labels from setRating', async ({ page }) => {
  await page.goto('/');
  const rater = page.locator('#rater');
  await rater.evaluate((el) => {
    const r = el as HTMLElement & { faceOnly: boolean; setRating(rating: unknown): void };
    r.faceOnly = true;
    r.setRating({ timestamp: 0, face: { v: -0.4, a: 0.6 }, labels: [{ name: 'anxious', level: 2 }], composite: null });
    (window as unknown as { nextCommit: Promise<unknown> }).nextCommit = new Promise((resolve) =>
      el.addEventListener('commit', (e) => resolve((e as CustomEvent).detail), { once: true }),
    );
  });

  await rater.locator('.submit-btn').click();
  const rating = (await page.evaluate(
    () => (window as unknown as { nextCommit: Promise<unknown> }).nextCommit,
  )) as { face: { v: number; a: number }; labels: unknown[] };

  expect(rating.labels).toEqual([]);
  expect(rating.face).toEqual({ v: -0.4, a: 0.6 });
});
