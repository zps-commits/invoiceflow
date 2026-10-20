# LinkedIn post — English

**Images:** `composed/1-cover.png` … `4-build.png`, in that order (4:5).

---

Most invoice tools export a PDF by taking a picture of the page. The file
looks right and is useless: the client cannot select the total to paste it
into a transfer, cannot search it, and a screen reader finds nothing in it
at all.

InvoiceFlow draws the PDF instead — instruction by instruction, text as
text. That one decision is what gives it selectable figures, real
pagination, table headers that repeat across pages, and a totals block
that is never split in half by a page break.

The quote and invoice builder around it is deliberately small: no account,
no monthly fee, nothing stored on a server. A freelancer sends four of
these a month and should not need a subscription for it.

Three decisions worth stating:

• The order of operations is written down and tested: line totals, then
the discount, then charges on the discounted base — and the function
returns the base it charged on, so the document can state it rather than
leaving the client to work out why the numbers add up that way.
• Money is an integer number of cents, rounded once per line, half away
from zero.
• The logo accepts PNG, JPEG and WebP and refuses SVG, which can carry
script.

Two things I got wrong first:

The New and Save buttons hid their label below the small breakpoint while
their icons were hidden from assistive technology — so on a phone they had
no accessible name at all. My first fix added a second hidden label and
produced the name "Save Save document", breaking six tests.

And a test can assert the wrong thing convincingly: the logo-rejection
test passed because the browser honoured the accept attribute and never
fired the handler. It was testing the file picker, not my guard. It is now
two tests — one on the accept list, one firing the change event directly.

React 19 · TypeScript · Vite · jsPDF · Tailwind v4
100 tests · zero axe violations at 1440, 768, 390 and 320 px, with a real
PDF exported, saved, reopened and downloaded by the checker

Live: https://06-invoiceflow.vercel.app
Source: https://github.com/zps-commits/invoiceflow

A portfolio build. It issues no fiscal document and makes no tax
calculation, and no client, user or revenue figure is claimed.

#TypeScript #React #Accessibility #FrontendDevelopment #PDF
