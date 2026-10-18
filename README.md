# InvoiceFlow

Quotes and invoices, built in the browser and exported as PDFs. For
freelancers and small businesses who need a document that looks considered
and do not need a subscription to produce one.

Everything runs locally. No account, no server, nothing uploaded.

## The problem

A freelancer sending a quote has three options: a word processor template
that drifts out of alignment the moment an item is added, a spreadsheet that
does the arithmetic but looks like a spreadsheet, or a subscription platform
priced for a business several times their size.

The arithmetic looks trivial and is not. Round each line or round the total?
Does a 10% charge apply before or after the discount? Both have defensible
answers, and a document that does not say which one it used is a document a
client can argue with.

## What it does

- **Two document types.** Quote and invoice, with the right date label on each.
- **Items** with description, quantity and unit price, reorderable.
- **Discount**, percentage or fixed amount.
- **Charges** you define, as percentages, each named.
- **Live preview** of the document as it will print.
- **PDF export** with real pagination and selectable text.
- **Local history**: save, reopen, duplicate, delete, filter.
- **BRL and USD**, as labels rather than a conversion.

## What it deliberately is not

- **Not a fiscal document issuer.** Neither type is a Brazilian nota fiscal,
  no NF-e or NFS-e is emitted, and every exported page says so in its footer.
- **No automatic tax calculation.** Charges are commercial parameters you set.
  Nothing here knows any country's tax rules.
- **No Paid status.** Draft, Issued and Cancelled only, because nothing in a
  browser can verify that money arrived.
- **No sync.** Documents live in one browser and are lost when its site data
  is cleared.

## The arithmetic

Fixed and documented, because the order is the part people disagree about:

```
1. line total   = round(quantity × unit price)
2. subtotal     = sum of the rounded line totals
3. discount     = percentage of the subtotal, or a fixed amount, capped at the subtotal
4. charge base  = subtotal − discount
5. each charge  = round(charge base × rate)
6. total        = charge base + sum of the charges
```

Every amount is rounded once, half away from zero, and the total is the sum
of the rounded parts rather than a rounding of the exact sum. **The printed
lines add up.** A total a cent away from its own lines is the one error a
client never forgives.

The document states the charge base, so a client reading "Delivery (7.5%)"
can see which figure the percentage came off.

### Why integers everywhere

Money is cents, quantities are thousandths of a unit and percentages are
hundredths of a percent. No float holds a value anywhere in the system.

## Stack

React 19 · TypeScript strict · Vite 8 · Tailwind CSS v4 · jsPDF · Vitest ·
Testing Library · Playwright + axe-core.

No backend, no database, no paid service.

## Running it

```bash
npm install
npm run dev
```

| Command | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Type-check and build |
| `npm test` | Unit and component tests |
| `npm run typecheck` | TypeScript, strict |
| `npm run verify:ui` | Browser verification — see below |

```bash
npm run build && npm run preview -- --port 5301
VERIFY_URL=http://localhost:5301 npm run verify:ui
```

## How it is put together

```
src/
  types/document.ts        The shapes. Money is Cents, an integer.
  domain/
    calculations/          money and totals. Pure, no React.
    documents/             numbering, factory, duplication
    validation/            bounds on everything a person can type
  lib/
    format.ts              Intl formatting and parsing, per currency
    pdf/render.ts          The PDF, drawn programmatically
    storage/documents.ts   localStorage, read through useSyncExternalStore
  components/
    forms/ preview/ history/ ui/
  hooks/useDocumentReducer.ts
```

Decisions worth knowing before changing anything:

- **No arithmetic lives in a component.** The totals engine takes plain data
  and returns plain data.
- **Inputs hold the text that was typed**, not a parsed number, so a
  half-written `12,` is never rewritten mid-keystroke. Both decimal
  separators are accepted.
- **Bounds live in the reducer**, not only on the inputs, because a restored
  or duplicated document arrives through the same actions.
- **The PDF is drawn, not screenshotted.** A rasterised page would match the
  preview exactly and produce a file whose text cannot be selected, searched
  or read aloud. The two layouts share every figure, so they can differ in
  placement but never in an amount.
- **Storage is treated as hostile.** The record carries a schema version, and
  anything that fails validation yields an empty list rather than a crash.

## What is verified

Measured on 2026-10-18:

| Check | Result |
|---|---|
| `npm test` | 94 passing |
| `npm run typecheck` | passes, `strict` and `noUncheckedIndexedAccess` |
| `npm run build` | passes |
| axe-core, WCAG 2.1 A + AA, at 1440 / 768 / 390 / 320 | 0 violations |
| Horizontal overflow at those widths | none |
| PDF export in a real browser | a file is produced and handed over |
| Save, new, reopen in a real browser | behave as described |
| First keyboard stop | the skip link |

Not verified: real iOS and Android hardware, screen reader software, and
printing a produced PDF on paper.

## Limitations

- One document open at a time.
- No logo cropping; the image is boxed into the header as supplied.
- The PDF uses Helvetica, which covers accented Latin characters but not
  scripts outside Latin-1.
- Files are capped at 200 documents and 200 items per document.
- No email, no payment links, no reminders.

## Future work

- A Portuguese translation; the interface is written for it but not
  translated yet.
- Recurring invoices from a saved template.
- An embedded font, which would widen the character set beyond Latin-1.
