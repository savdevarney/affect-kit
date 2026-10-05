import { expect, test, type Page } from '@playwright/test';

/** Drag the face pad from its center to a point given as fractions of its box. */
async function placeFace(page: Page, to: { x: number; y: number }) {
  const pad = page.locator('affect-kit-rater .face-zone');
  const box = await pad.boundingBox();
  if (!box) throw new Error('No face pad');
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * to.x, box.y + box.height * to.y, { steps: 8 });
  await page.mouse.up();
}

test('rate, say a sentence, edit the chips, and see it on the day', async ({ page }, testInfo) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'How are you?' })).toBeVisible();
  await placeFace(page, { x: 0.62, y: 0.7 });
  await expect(page.locator('affect-kit-rater .submit-btn')).toHaveClass(/visible/);
  await page.waitForTimeout(400); // the button fades in; let the picture show it
  await page.screenshot({ path: testInfo.outputPath('1-face.png'), fullPage: true });
  await page.locator('affect-kit-rater .submit-btn').click();

  await page.getByRole('textbox').fill("Presentation went fine but I'm wiped. Kind of proud though, and relieved.");
  await page.screenshot({ path: testInfo.outputPath('2-words.png'), fullPage: true });
  await page.getByRole('button', { name: 'Find my words' }).click();

  await expect(page.getByRole('heading', { name: 'Your feeling words' })).toBeVisible();
  await expect(page.getByRole('button', { name: /^tired, strongly/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /^proud, a little/ })).toBeVisible();
  await expect(page.getByText('relieved (your word)')).toBeVisible();
  await expect(page.getByText('Found with simple word matching.')).toBeVisible();

  // Proud: a little → clearly. Then add "grateful" from the list.
  await page.getByRole('button', { name: /^proud, a little/ }).click();
  await expect(page.getByRole('button', { name: /^proud, clearly/ })).toBeVisible();
  await page.getByRole('button', { name: 'Add a word' }).click();
  await page.getByRole('button', { name: 'Add grateful' }).click();
  await page.screenshot({ path: testInfo.outputPath('3-review.png'), fullPage: true });
  await page.getByRole('button', { name: 'Done' }).click();

  await expect(page).toHaveURL(/\/day\/\d{4}-\d{2}-\d{2}$/);
  const card = page.locator('article.checkin').last();
  await expect(card.getByRole('img', { name: 'tired, strongly' })).toBeVisible();
  await expect(card.getByRole('img', { name: 'proud, clearly' })).toBeVisible();
  await expect(card.getByRole('img', { name: 'grateful, clearly' })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('4-day.png'), fullPage: true });
});

test('crisis words show resources at once, and the check-in carries on', async ({ page }, testInfo) => {
  await page.goto('/');
  await placeFace(page, { x: 0.3, y: 0.75 });
  await page.locator('affect-kit-rater .submit-btn').click();
  await page.getByRole('textbox').fill('I want to kill myself');
  await page.getByRole('button', { name: 'Find my words' }).click();

  const panel = page.getByRole('region', { name: 'You can talk to someone right now' });
  await expect(panel).toBeVisible();
  await expect(panel.getByRole('heading', { name: 'You can talk to someone right now' })).toBeFocused();
  await expect(panel.getByRole('link', { name: 'Call 988' })).toHaveAttribute('href', 'tel:988');
  await expect(panel.getByText('Text HOME to 741741')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Your feeling words' })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('5-crisis.png'), fullPage: true });
});

test('the week prototype is a table of words by day', async ({ page }, testInfo) => {
  await page.goto('/prototypes/weeks');
  await expect(page.getByText('Prototype · synthetic data')).toBeVisible();
  await expect(page.getByRole('table')).toBeVisible();
  await expect(page.getByRole('rowheader', { name: 'check-ins' })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('6-weeks.png'), fullPage: true });
});
