import type { CommercialDocument, Totals } from '@/types/document';
import { isoToDisplay, money, percent, quantity } from '@/lib/format';

/**
 * The document, as it will print.
 *
 * This is one component used twice: on screen as the live preview, and
 * off-screen as the source the PDF is rendered from. Keeping it single
 * is what makes "the preview matches the PDF" a property of the code
 * rather than a promise in the README.
 */
export default function DocumentSheet({
  document: doc,
  totals,
  forPdf = false,
}: {
  document: CommercialDocument;
  totals: Totals;
  /** Fixed A4 width in px for the PDF render; responsive on screen. */
  forPdf?: boolean;
}) {
  const { currency } = doc;
  const heading = doc.type === 'quote' ? 'Quote' : 'Invoice';
  const dueLabel = doc.type === 'quote' ? 'Valid until' : 'Due';

  return (
    <article
      data-document-sheet
      className={
        forPdf
          ? 'sheet mx-auto w-full text-ink'
          : 'sheet mx-auto w-full max-w-[794px] p-4 text-ink sm:p-8 lg:p-12'
      }
      style={forPdf ? { width: 794, padding: 48 } : undefined}
    >
      <header className="flex flex-wrap items-start justify-between gap-6">
        <div className="min-w-0">
          {doc.issuer.logoDataUrl ? (
            <img
              src={doc.issuer.logoDataUrl}
              alt=""
              className="mb-3 max-h-16 w-auto object-contain"
            />
          ) : null}
          <p className="text-base font-semibold">{doc.issuer.name || 'Your business'}</p>
          <div className="mt-1 space-y-0.5 text-xs leading-relaxed text-muted">
            {doc.issuer.email ? <p>{doc.issuer.email}</p> : null}
            {doc.issuer.phone ? <p>{doc.issuer.phone}</p> : null}
            {doc.issuer.address ? <p className="whitespace-pre-line">{doc.issuer.address}</p> : null}
            {doc.issuer.taxId ? <p>{doc.issuer.taxId}</p> : null}
          </div>
        </div>

        <div className="text-right">
          <h1 className="text-2xl font-semibold tracking-tight">{heading}</h1>
          <p className="mt-1 font-mono text-sm">{doc.number}</p>
          <dl className="mt-3 space-y-0.5 text-xs text-muted">
            <div className="flex justify-end gap-2">
              <dt>Issued</dt>
              <dd className="text-ink">{isoToDisplay(doc.issuedOn, currency)}</dd>
            </div>
            <div className="flex justify-end gap-2">
              <dt>{dueLabel}</dt>
              <dd className="text-ink">{isoToDisplay(doc.dueOn, currency)}</dd>
            </div>
          </dl>
        </div>
      </header>

      <section className="mt-8">
        <p className="section-title">Billed to</p>
        <p className="mt-1 font-medium">{doc.client.name || 'Client name'}</p>
        <div className="mt-0.5 space-y-0.5 text-xs leading-relaxed text-muted">
          {doc.client.company ? <p>{doc.client.company}</p> : null}
          {doc.client.email ? <p>{doc.client.email}</p> : null}
          {doc.client.phone ? <p>{doc.client.phone}</p> : null}
          {doc.client.address ? <p className="whitespace-pre-line">{doc.client.address}</p> : null}
          {doc.client.taxId ? <p>{doc.client.taxId}</p> : null}
        </div>
      </section>

      <table className="mt-8 w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-ink/15 text-left">
            <th scope="col" className="py-2 pr-2 text-xs font-semibold sm:pr-3 uppercase tracking-wide text-muted">
              Description
            </th>
            <th scope="col" className="w-12 py-2 px-1 text-right sm:w-20 sm:px-2 text-xs font-semibold uppercase tracking-wide text-muted">
              Qty
            </th>
            <th scope="col" className="w-20 py-2 px-1 text-right sm:w-28 sm:px-2 text-xs font-semibold uppercase tracking-wide text-muted">
              Unit
            </th>
            <th scope="col" className="w-20 py-2 pl-1 text-right sm:w-28 sm:pl-2 text-xs font-semibold uppercase tracking-wide text-muted">
              Amount
            </th>
          </tr>
        </thead>
        <tbody>
          {doc.items.map((item, index) => (
            <tr key={item.id} className="border-b border-line align-top">
              <td className="py-2 pr-2 break-words sm:pr-3">{item.description || '—'}</td>
              <td className="py-2 px-1 text-right font-mono sm:px-2">
                {quantity(item.quantityMilli, currency)}
              </td>
              <td className="py-2 px-1 text-right font-mono sm:px-2">
                {money(item.unitPriceCents, currency)}
              </td>
              <td className="py-2 pl-1 text-right font-mono sm:pl-2">
                {money(totals.lineTotals[index] ?? 0, currency)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-6 flex justify-end">
        <dl className="w-full max-w-xs space-y-1 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-muted">Subtotal</dt>
            <dd className="font-mono">{money(totals.subtotalCents, currency)}</dd>
          </div>

          {totals.discountCents > 0 ? (
            <div className="flex justify-between gap-4">
              <dt className="text-muted">
                Discount
                {doc.discount.kind === 'percent'
                  ? ` (${percent(doc.discount.value, currency)})`
                  : ''}
              </dt>
              <dd className="font-mono">−{money(totals.discountCents, currency)}</dd>
            </div>
          ) : null}

          {doc.charges.map((charge, index) => (
            <div key={charge.id} className="flex justify-between gap-4">
              <dt className="text-muted">
                {charge.label.trim() || 'Charge'} ({percent(charge.rateBasisPoints, currency)})
              </dt>
              <dd className="font-mono">{money(totals.chargeAmounts[index] ?? 0, currency)}</dd>
            </div>
          ))}

          {doc.charges.length > 0 ? (
            <p className="pt-1 text-[0.6875rem] leading-snug text-muted">
              Charges calculated on {money(totals.chargeBaseCents, currency)}.
            </p>
          ) : null}

          <div className="mt-2 flex justify-between gap-4 border-t border-ink/20 pt-2">
            <dt className="font-semibold">Total</dt>
            <dd className="font-mono text-base font-semibold">
              {money(totals.totalCents, currency)}
            </dd>
          </div>
        </dl>
      </div>

      {doc.paymentTerms.trim() ? (
        <section className="mt-8">
          <p className="section-title">Payment terms</p>
          <p className="mt-1 whitespace-pre-line text-xs leading-relaxed text-muted">
            {doc.paymentTerms}
          </p>
        </section>
      ) : null}

      {doc.notes.trim() ? (
        <section className="mt-5">
          <p className="section-title">Notes</p>
          <p className="mt-1 whitespace-pre-line text-xs leading-relaxed text-muted">{doc.notes}</p>
        </section>
      ) : null}

      <footer className="mt-10 border-t border-line pt-3">
        <p className="text-[0.625rem] leading-relaxed text-muted">
          This document is a commercial {doc.type === 'quote' ? 'quote' : 'invoice'}. It is not a
          fiscal document and does not replace any tax obligation. Numbering is internal to the
          issuer and is not an official sequence.
        </p>
      </footer>
    </article>
  );
}
