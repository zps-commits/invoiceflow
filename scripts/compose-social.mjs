/**
 * Builds the social images.
 *
 * Real captures, placed whole inside a layout the browser renders. No
 * generative model touches a screenshot: it redraws what it is shown,
 * and a redrawn invoice is a fabricated invoice.
 *
 * One rule on every slide: the screen appears WHOLE — never cropped,
 * never bleeding off an edge.
 *
 *   npm run social   → docs/social-media/composed/*.png at 1080x1350
 */
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const OUT = 'docs/social-media/composed';
const SHOTS = '../assets';

/* The application's own tokens. */
const T = {
  paper: '#efeeec',
  surface: '#ffffff',
  line: '#e2e0dd',
  ink: '#18181b',
  muted: '#52525b',
  accent: '#8c1f3d',
  accentDeep: '#5e1429',
  onDeep: '#f0d6dd',
};

const BASE = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    width: 1080px; height: 1350px; overflow: hidden;
    font-family: ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif;
    background: ${T.paper}; color: ${T.ink};
    -webkit-font-smoothing: antialiased;
  }
  .frame { width: 1080px; height: 1350px; display: flex; flex-direction: column; }
  .pad { padding: 84px 84px 0; }
  .eyebrow {
    font-family: ui-monospace, monospace; font-size: 20px; letter-spacing: .14em;
    text-transform: uppercase; color: ${T.muted};
  }
  h1 { font-size: 92px; line-height: .98; letter-spacing: -.035em; font-weight: 650; }
  h2 { font-size: 60px; line-height: 1.06; letter-spacing: -.03em; font-weight: 650; }
  .lede { font-size: 33px; line-height: 1.32; color: ${T.muted}; }
  .shot { display: block; width: 100%; }
  .shot-wrap {
    border-radius: 14px; overflow: hidden; border: 1px solid ${T.line};
    box-shadow: 0 30px 70px -40px rgba(24,24,27,.5); background: ${T.surface};
  }
  .foot {
    margin-top: auto; padding: 0 84px 72px; display: flex; justify-content: space-between;
    align-items: baseline; font-family: ui-monospace, monospace; font-size: 20px; color: ${T.muted};
  }
`;

const SLIDES = [
  {
    name: '1-cover',
    html: `
      <div class="frame" style="flex-direction:row; align-items:center; gap:56px; padding:0 84px">
        <div style="flex:1 1 0; min-width:0">
          <div class="eyebrow">Quotes and invoices</div>
          <h1 style="margin-top:22px">InvoiceFlow</h1>
          <p class="lede" style="margin-top:28px; max-width:17ch">
            A quote your client can select the text of.
          </p>
          <div style="margin-top:40px; font-family:ui-monospace,monospace; font-size:20px; color:${T.accent}">
            06-invoiceflow.vercel.app
          </div>
        </div>
        <div class="shot-wrap" style="flex:0 0 400px">
          <img class="shot" src="${SHOTS}/phone.png" alt="">
        </div>
      </div>`,
  },
  {
    name: '2-problem',
    html: `
      <div class="frame" style="justify-content:center; padding:0 84px">
        <div class="eyebrow">The problem</div>
        <h2 style="margin-top:22px; max-width:16ch">Two bad options for one document</h2>
        <div style="margin-top:52px; display:grid; gap:22px">
          <div style="background:${T.surface}; border:1px solid ${T.line}; border-radius:16px; padding:36px 40px">
            <div class="eyebrow" style="color:${T.accent}">A word processor</div>
            <p style="margin-top:12px; font-size:30px; line-height:1.34">
              The arithmetic is done by hand, and the discount lands on
              whichever number happened to be nearest.
            </p>
          </div>
          <div style="background:${T.surface}; border:1px solid ${T.line}; border-radius:16px; padding:36px 40px">
            <div class="eyebrow" style="color:${T.accent}">A billing service</div>
            <p style="margin-top:12px; font-size:30px; line-height:1.34">
              A monthly fee and an account, for a document that goes out
              four times a month.
            </p>
          </div>
        </div>
        <p style="margin-top:44px; font-size:28px; line-height:1.4; color:${T.muted}; max-width:34ch">
          And a PDF exported as a picture of a page cannot be searched,
          selected or read aloud.
        </p>
      </div>`,
  },
  {
    name: '3-solution',
    html: `
      <div class="frame">
        <div class="pad">
          <div class="eyebrow">What it produces</div>
          <h2 style="margin-top:22px">The preview is<br>the document</h2>
          <p style="margin-top:24px; font-size:27px; line-height:1.4; color:${T.muted}; max-width:38ch">
            One component renders both, so what is reviewed on screen is
            what the client receives.
          </p>
        </div>
        <!-- Scaled to fit, never cropped: the document is the subject of
             this slide, so showing three quarters of it would be worse
             than showing all of it smaller. -->
        <div style="padding:36px 84px 0; display:flex; justify-content:center">
          <div class="shot-wrap" style="width:700px">
            <img class="shot" src="${SHOTS}/sheet.png" alt="">
          </div>
        </div>
        <div class="foot">
          <span>Invented business, invented client, invented figures</span>
        </div>
      </div>`,
  },
  {
    name: '4-build',
    html: `
      <div class="frame" style="background:${T.accentDeep}; color:${T.onDeep}">
        <div class="pad">
          <div class="eyebrow" style="color:#d9a9b7">The build</div>
          <h2 style="margin-top:22px; color:#fdf2f5">React 19 · TypeScript<br>Vite · jsPDF</h2>
          <p style="margin-top:30px; font-size:26px; line-height:1.44; color:#e4bfca; max-width:34ch">
            The PDF is drawn instruction by instruction rather than
            rasterised from the page. That is what keeps its text
            selectable, its pagination real and its table headers
            repeating across pages.
          </p>
          <p style="margin-top:24px; font-size:26px; line-height:1.44; color:#e4bfca; max-width:34ch">
            <strong style="color:#fdf2f5">The defect worth naming:</strong>
            two buttons hid their label below the small breakpoint and
            their icons were hidden from assistive technology — so on a
            phone they had no accessible name at all.
          </p>
        </div>
        <div style="margin-top:auto; padding:0 84px">
          <div style="background:#4a1020; border:1px solid #6b2235; border-radius:14px; padding:34px 40px">
            <pre style="font-family:ui-monospace,monospace; font-size:21px; line-height:1.66; color:#f0d6dd; white-space:pre"><span style="color:#c08c9b">// Line totals, then the discount, then charges on</span>
<span style="color:#c08c9b">// the discounted base — and the function returns</span>
<span style="color:#c08c9b">// that base, so the document can state it.</span>
calculateTotals(items, discount, charges)</pre>
          </div>
        </div>
        <div class="foot" style="color:#d9a9b7">
          <span>100 tests · 0 axe violations at four widths</span>
          <span>06-invoiceflow.vercel.app</span>
        </div>
      </div>`,
  },
];

await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1080, height: 1350 }, deviceScaleFactor: 2 });

for (const slide of SLIDES) {
  // Written out and loaded over file://: the captures are referenced by
  // relative path, and setContent leaves no base URL to resolve them.
  const file = `${OUT}/${slide.name}.html`;
  await writeFile(file, `<meta charset="utf-8"><style>${BASE}</style>${slide.html}`);
  await page.goto(`file://${process.cwd()}/${file}`, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: `${OUT}/${slide.name}.png` });
  await rm(file);
  console.log(`${OUT}/${slide.name}.png`);
}

await browser.close();
