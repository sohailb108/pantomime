import { expect, test as base, type Page } from '@playwright/test';

// Button names include Material icon text (e.g. "add New game"), so match by substring.
const btn = (page: Page, name: string) => page.getByRole('button', { name }).or(page.getByRole('link', { name }));

async function startGame(page: Page) {
  await page.goto('/');
  await btn(page, 'New game').click();
  await btn(page, 'Next').click();
  // A fresh install starts with every category selected.
  const categories = page.getByRole('checkbox');
  await expect(categories.first()).toBeVisible();
  await expect(page.locator('[role=checkbox][aria-checked=true]')).toHaveCount(await categories.count());
  await btn(page, 'Start game').click();
  await btn(page, "Let's play").click();
}

// Every test fails if the page throws an uncaught error. English is seeded because the app
// defaults to Persian; a test (or an earlier visit in the same test) can still choose otherwise.
const test = base.extend({
  page: async ({ page }, use) => {
    await page.addInitScript(() => {
      if (localStorage.getItem('pantomime:settings') === null) {
        localStorage.setItem('pantomime:settings', JSON.stringify({ language: 'en' }));
      }
    });
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await use(page);
    expect(errors, 'uncaught page errors').toEqual([]);
  },
});

test('home page loads and opens help', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Pantomime', { exact: true })).toBeVisible();
  await btn(page, 'Help').click();
  await expect(page).toHaveURL(/#\/help/);
  await expect(page.getByText('Quick start')).toBeVisible();
});

test('a game can be set up and started, and survives a reload', async ({ page }) => {
  await startGame(page);
  await expect(page).toHaveURL(/#\/board/);
  await expect(page.locator('.tile').first()).toBeVisible();

  await page.goto('/');
  await expect(btn(page, 'Resume')).toBeVisible();
  await page.reload();
  await expect(btn(page, 'Resume')).toBeVisible();
  await btn(page, 'End game').first().click();
  await page.getByRole('dialog').getByRole('button', { name: 'End game' }).click();
  await expect(btn(page, 'Resume')).toHaveCount(0);
});

test('a turn can be played and its tile is marked on the board', async ({ page }) => {
  await startGame(page);
  await expect(page.locator('.tile.played')).toHaveCount(0);

  await page.locator('.tile').first().click();
  await btn(page, 'Show the word').click();
  await expect(page.getByText('Only the actor looks.')).toBeVisible();
  await btn(page, 'Start').click();
  await btn(page, 'Guessed').click();
  // The other team may get one steal guess, depending on the settings.
  const wrong = btn(page, 'Wrong');
  const next = btn(page, 'Continue');
  await expect(wrong.or(next)).toBeVisible();
  if (await wrong.isVisible()) await wrong.click();
  await next.click();

  await expect(page).toHaveURL(/#\/board/);
  await expect(page.locator('.tile.played')).toHaveCount(1);
});

test('switching to Persian flips the page to right-to-left', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'فارسی' }).click();
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await page.getByRole('button', { name: 'English' }).click();
  await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
});

test('the app works offline after the first visit', async ({ page, context }) => {
  await page.goto('/');
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => undefined));
  // Reload once so the page is controlled by the service worker.
  await page.reload();
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);

  await context.setOffline(true);
  await page.reload();
  await expect(page.getByText('Pantomime', { exact: true })).toBeVisible();
  await btn(page, 'New game').click();
  await expect(page).toHaveURL(/#\/setup/);
});
