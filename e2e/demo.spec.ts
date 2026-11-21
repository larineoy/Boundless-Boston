import { expect, test, type Page } from '@playwright/test';

// Follows the doc 05 demo script against demo fixtures: 5 open, in-budget places within walking range, plus 3 reached by the T
// (Red Line to Harvard, Green Line D to Fenway, Orange Line to Assembly) until their demo last trains around 12:40 AM.
const cards = (page: Page) => page.locator('article.venue-card');
const walkCards = (page: Page) => cards(page).filter({ hasNot: page.locator('.transit-row') });
const tCards = (page: Page) => cards(page).filter({ has: page.locator('.transit-row') });

async function searchAt(page: Page, time: string) {
  await page.locator('input[type=datetime-local]').fill(time);
  await page.getByRole('button', { name: /Find my night/ }).click();
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(cards(page).first()).toBeVisible(); // the page searches on load
});

test('loads demo results with sources labeled demo', async ({ page }) => {
  await expect(walkCards(page)).toHaveCount(5); // the T places depend on the time of day, so they are tested below
  const sources = page.locator('.source-items');
  for (const name of ['Google Places', 'MBTA', 'Boston Open Data']) await expect(sources).toContainText(name);
  await expect(sources.locator('small', { hasText: 'demo' }).first()).toBeVisible();
  await expect(cards(page).first().locator('.score strong')).toHaveText(/^\d+$/);
});

test('Why this? shows the full score breakdown, including unused parts', async ({ page }) => {
  const first = cards(page).first();
  await first.getByRole('button', { name: /Why this/ }).click();
  const breakdown = first.locator('.breakdown');
  for (const part of ['momentum', 'quality', 'reach', 'events', 'weather']) await expect(breakdown).toContainText(part);
  await expect(breakdown).toContainText('not used (event data unavailable)');
});

test('rain lowers the outdoor park and lifts indoor places', async ({ page }) => {
  // Weather is ~11% of the score, so rain shifts scores without necessarily flipping the order.
  const fit = (name: string) => cards(page).filter({ has: page.getByRole('heading', { name }) }).locator('.score strong');
  const parkBefore = Number(await fit('Boston Public Garden').textContent());
  const phoBefore = Number(await fit('Pho Pasteur').textContent());
  await page.getByRole('button', { name: /Clear skies/ }).click();
  await page.getByRole('button', { name: /Find my night/ }).click();
  await expect(page.getByRole('button', { name: /Rain check/ })).toBeVisible();
  await expect.poll(async () => Number(await fit('Boston Public Garden').textContent())).toBeLessThan(parkBefore);
  await expect.poll(async () => Number(await fit('Pho Pasteur').textContent())).toBeGreaterThan(phoBefore);
});

test('a too-strict search shows the exact empty state', async ({ page }) => {
  await page.getByRole('button', { name: '$', exact: true }).click();
  await page.locator('input[type=range]').fill('5');
  await page.getByRole('button', { name: /Find my night/ }).click();
  await expect(page.getByText('Nothing open and reachable at that time. Try an earlier hour or a higher budget.')).toBeVisible();
  await expect(cards(page)).toHaveCount(0);
});

test('neighborhood notes open with 311 data', async ({ page }) => {
  await page.getByRole('button', { name: /Neighborhood notes/ }).click();
  const modal = page.locator('.modal');
  await expect(modal).toContainText('NEIGHBORHOOD SNAPSHOT');
  await expect(modal).toContainText('311 requests');
  await modal.locator('.modal-close').click();
  await expect(modal).toHaveCount(0);
});

test('Walk + T adds places by train with the line and the last train home', async ({ page }) => {
  await searchAt(page, '2026-11-21T20:00');
  await expect(tCards(page)).toHaveCount(3);
  const harvard = cards(page).filter({ has: page.getByRole('heading', { name: "Pinocchio's Pizza & Subs" }) });
  await expect(harvard.locator('.line-pill')).toHaveText('Red Line');
  await expect(harvard).toContainText('22 min by T');
  await expect(harvard.locator('.last-train')).toContainText('Last train back 12:47 AM');
});

test('Walk only hides the T places', async ({ page }) => {
  await page.getByRole('button', { name: 'Walk only' }).click();
  await searchAt(page, '2026-11-21T20:00');
  await expect(page.getByRole('button', { name: 'Walk only' })).toHaveAttribute('aria-pressed', 'true');
  await expect(tCards(page)).toHaveCount(0);
  await expect(cards(page)).toHaveCount(5);
});

test('after the last train, far places drop out', async ({ page }) => {
  await searchAt(page, '2026-11-21T23:50');
  await expect(tCards(page)).toHaveCount(0);
});
