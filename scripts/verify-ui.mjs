/**
 * Browser verification.
 *
 *   npm run build && npm run preview -- --port 5301
 *   VERIFY_URL=http://localhost:5301 npm run verify:ui
 *
 * Unit tests cover the arithmetic and the flows in jsdom; this covers what
 * only a real browser answers: overflow, axe, and whether the PDF export
 * actually hands over a file.
 */
import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';

const URL = (process.env.VERIFY_URL ?? 'http://localhost:4173').replace(/\/$/, '');
const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];
const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'phone', width: 390, height: 844 },
  { name: 'narrow', width: 320, height: 720 },
];

const log = [];
const failures = [];
const check = (ok, message) => void (ok || failures.push(message));

const browser = await chromium.launch();

for (const viewport of VIEWPORTS) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
  });
  const page = await context.newPage();
  const noise = [];
  page.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning') noise.push(`${m.type()}: ${m.text()}`);
  });
  page.on('pageerror', (e) => noise.push(`pageerror: ${e.message}`));

  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(200);

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  const axe = await new AxeBuilder({ page }).withTags(WCAG).analyze();

  check(overflow <= 0, `${viewport.name}: ${overflow}px of horizontal overflow`);
  check(noise.length === 0, `${viewport.name} console: ${noise.join(' | ')}`);
  for (const v of axe.violations) {
    failures.push(
      `${viewport.name} axe ${v.id} (${v.impact}): ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`,
    );
  }
  log.push(
    `${viewport.name.padEnd(8)} ${String(viewport.width).padStart(4)}px overflow=${overflow} console=${noise.length} axe=${axe.violations.length}`,
  );
  await context.close();
}

/* The flow, including the one thing jsdom cannot do: produce a real file. */
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  acceptDownloads: true,
});
const page = await context.newPage();
await page.goto(URL, { waitUntil: 'networkidle' });

const exportButton = page.getByRole('button', { name: /export pdf/i });
check(await exportButton.isDisabled(), 'export was enabled on an empty document');

await page.getByLabel(/your name or business/i).fill('Estúdio Açaí');
await page.getByLabel(/client name/i).fill('Comércio Irmãos');
await page.getByLabel(/^description$/i).first().fill('Consultoria · instalação');
await page.getByLabel(/^unit price$/i).first().fill('1250.50');
await page.waitForTimeout(200);

check(!(await exportButton.isDisabled()), 'export stayed disabled on a complete document');

const sheet = page.locator('[data-document-sheet]');
check(
  (await sheet.innerText()).includes('Comércio Irmãos'),
  'the preview did not show the client name',
);

const [download] = await Promise.all([
  page.waitForEvent('download', { timeout: 20_000 }),
  exportButton.click(),
]);
const filename = download.suggestedFilename();
check(/^quote-.*\.pdf$/.test(filename), `unexpected export filename: ${filename}`);
log.push(`exported ${filename}`);

/* Saving, reopening and the storage notice. */
await page.getByRole('button', { name: /^save document$/i }).click();
await page.waitForTimeout(300);
check(
  (await page.getByRole('status').innerText()).toLowerCase().includes('saved'),
  'no confirmation after saving',
);

await page.getByRole('button', { name: /^new document$/i }).click();
await page.waitForTimeout(200);
check(
  (await page.getByLabel(/client name/i).inputValue()) === '',
  'starting a new document kept the old client',
);
check(
  (await page.getByLabel(/your name or business/i).inputValue()) === 'Estúdio Açaí',
  'starting a new document lost the issuer',
);

await page.getByRole('button', { name: /^open /i }).first().click();
await page.waitForTimeout(200);
check(
  (await page.getByLabel(/client name/i).inputValue()) === 'Comércio Irmãos',
  'reopening a saved document did not restore it',
);
log.push('saved, started a new one, reopened the saved one');

/* Keyboard: the first stop is the skip link. */
await page.goto(URL, { waitUntil: 'networkidle' });
await page.keyboard.press('Tab');
const firstStop = await page.evaluate(() => document.activeElement?.textContent?.trim() ?? '');
check(/skip to the editor/i.test(firstStop), `the first tab stop was "${firstStop}"`);
log.push('keyboard: the first tab stop is the skip link');

await context.close();
await browser.close();

console.log(log.join('\n'));
console.log(failures.length ? `\nFAILED\n${failures.join('\n')}` : '\nPASSED');
process.exit(failures.length ? 1 : 0);
