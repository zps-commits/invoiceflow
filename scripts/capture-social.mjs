/**
 * Captures the real screens used by the social images.
 *
 * Element captures rather than viewport crops: a crop cuts a label in
 * half and omits whatever sits below the fold.
 *
 *   npm run build && npm run preview -- --port 5301
 *   SHOT_URL=http://localhost:5301/ npm run shots
 */
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';

const URL = process.env.SHOT_URL ?? 'http://localhost:5301/';
const OUT = 'docs/social-media/assets';
await mkdir(OUT, { recursive: true });

const browser = await chromium.launch();

/**
 * Fills one invented quote. The app opens empty — correctly, since it
 * invents nothing — so the capture has to type the example in, and the
 * client, the business and the figures below are made up.
 */
async function fillExample(page) {
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(500);

  await page.getByLabel('Your name or business').first().fill('Oficina Paralela');
  await page.getByLabel('Client name').first().fill('Comércio Irmãos Souza');

  const rows = [
    ['Brand website, five pages', '1', '6200,00'],
    ['Copywriting and review', '1', '1450,00'],
    ['Product photography, half day', '1', '980,00'],
  ];
  for (const [index, [description, quantity, price]] of rows.entries()) {
    if (index > 0) await page.getByRole('button', { name: /Add (an )?item/i }).click();
    const descriptions = page.locator('input[id^="desc-"]');
    const quantities = page.locator('input[id^="qty-"]');
    const prices = page.locator('input[id^="price-"]');
    await descriptions.nth(index).fill(description);
    await quantities.nth(index).fill(quantity);
    await prices.nth(index).fill(price);
  }

  // The amount field only exists once a kind of discount is chosen.
  await page.locator('#discount-kind').selectOption('percent');
  await page.locator('#discount-value').fill('10');
  await page.waitForTimeout(400);
}

{
  const context = await browser.newContext({ viewport: { width: 1360, height: 1100 }, deviceScaleFactor: 2 });
  const page = await context.newPage();
  await fillExample(page);
  // The document sheet is the product: the thing the client receives.
  await page.locator('article, [data-sheet]').first().screenshot({ path: `${OUT}/sheet.png` });
  await page.locator('section.panel').first().screenshot({ path: `${OUT}/panel-first.png` });
  const totals = page.getByText(/Totals|Discount/).first();
  await totals.locator('xpath=ancestor::section[1]').screenshot({ path: `${OUT}/totals.png` });
  await context.close();
}

{
  const context = await browser.newContext({ viewport: { width: 414, height: 1000 }, deviceScaleFactor: 2 });
  const page = await context.newPage();
  await fillExample(page);
  await page.screenshot({ path: `${OUT}/phone.png` });
  await context.close();
}

await browser.close();
console.log(`Captured into ${OUT}`);
