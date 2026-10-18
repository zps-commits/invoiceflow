# InvoiceFlow — case study

A quote and invoice generator built as a portfolio piece. It describes a
demonstration: there are no users, no clients and no revenue, and every
figure quoted below is a verification result.

## The problem

A freelancer sending a quote picks between a word processor template that
drifts out of alignment when an item is added, a spreadsheet that does the
arithmetic and looks like a spreadsheet, or a subscription priced for a
much larger business.

The part that is actually hard is narrow and unglamorous: **the printed
lines have to add up**, and the document has to say which order the
arithmetic happened in. A 10% charge applied before a discount and the same
charge applied after it are different numbers, both defensible, and a
document that does not say which it used is a document a client can argue
with.

## The solution

One screen: the editor on the left, the document as it will print on the
right, updating as you type. Export produces a PDF with selectable text and
real pagination. Documents save in the browser and can be reopened,
duplicated or deleted. No account, no server.

## Technical decisions

**Every value is an integer.** Money is cents, quantities are thousandths
of a unit, percentages are hundredths of a percent. No float holds a value
anywhere, which removes an entire class of bug before it can exist.

**Rounding happens once per printed amount, and the total is the sum of the
rounded parts.** Rounding the exact sum instead would leave a total that
disagrees with its own lines by a cent. That is the error a client notices
and nobody forgives.

**The document states the base each percentage was taken from.** Returning
the charge base as its own figure, rather than only using it internally,
meant the sheet could print "Charges calculated on R$ 900,00" and end the
argument before it starts.

**The PDF is drawn, not screenshotted.** Rasterising the preview would
guarantee a pixel-perfect match and produce a multi-megabyte file whose
text cannot be selected, searched or read by a screen reader — for a
document people copy account numbers out of. The cost is two layouts; they
are kept honest by sharing every figure and every formatter, so they can
disagree about placement but never about an amount.

**Inputs hold typed text, not parsed numbers.** A numeric state cannot
represent `12,` or `0.`, so it rewrites the field mid-keystroke. Parsing
happens on change, and a value that will not parse leaves the stored number
alone.

**Bounds live in the reducer.** A description with no ceiling breaks the
PDF layout; an input's maxlength does not help when the value arrives from
a restored or duplicated document instead.

**Storage carries a schema version and is treated as hostile.** Without a
version, changing the document shape turns every saved record into a crash
on the next read.

**There is no Paid status.** Draft, Issued and Cancelled only, because
nothing running in a browser can verify that money arrived, and a status
that is only ever set by hand on trust is worse than its absence.

## Difficulties

**A critical accessibility failure that only a browser found.** The New and
Save buttons hide their text label below the small breakpoint, and their
icons are `aria-hidden`. On a phone they were buttons with no accessible
name at all — invisible to a screen reader, and flagged critical by axe on
the first run of the browser verification. Ninety-four unit tests had
nothing to say about it.

**And the fix was wrong twice.** Adding a second, screen-reader-only label
left both spans in the accessibility tree, so the name became "Save Save
document" and six tests broke. One explicit `aria-label` per button, with
the visible word as decoration, is what gives a stable name at every width
and in every environment.

**Three pixels of overflow at 320px.** The document table's fixed column
widths totalled more than a 320-pixel sheet has to give. Found by measuring
in the browser, not by looking.

**I committed once with six tests failing.** The commit was chained behind
`npm test` with `&&`, and the chain ran anyway. The commit message claimed
the suite passed. It was corrected rather than left standing, which is the
only reason it is worth writing down.

## Results

Measured on 2026-10-18. Verification results, not commercial ones.

| Check | Result |
|---|---|
| Unit and component tests | 94 passing |
| TypeScript strict + `noUncheckedIndexedAccess` | passes |
| Build | passes |
| axe-core, WCAG 2.1 A + AA, four widths | 0 violations |
| Horizontal overflow | none |
| PDF export in a browser | a real file is produced |
| Sixty-item document | paginates, headers repeat |
| Accented characters in the PDF | render |

Not verified: real mobile hardware, screen reader software, and a produced
PDF printed on paper.

## What I took from it

The interesting work was in the two sentences the document prints: the one
saying what the charge base was, and the one saying this is not a fiscal
document. Both exist because the alternative is a client discovering the
answer later, and in a commercial document that discovery is expensive.

The second thing: a browser verification script earns its keep on the first
run. It found a critical accessibility defect that the entire unit suite
was structurally incapable of seeing.
