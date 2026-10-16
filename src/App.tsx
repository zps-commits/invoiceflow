import { useMemo, useState } from 'react';
import type { CommercialDocument, DocumentType } from '@/types/document';
import { newDocument } from '@/domain/documents/factory';
import { useDocumentReducer } from '@/hooks/useDocumentReducer';
import { totalsFor } from '@/domain/calculations/totals';
import PartyForm from '@/components/forms/PartyForm';
import ItemsEditor from '@/components/forms/ItemsEditor';
import TotalsEditor from '@/components/forms/TotalsEditor';
import DocumentSheet from '@/components/preview/DocumentSheet';
import Field from '@/components/ui/Field';

export default function App() {
  const [initial] = useState<CommercialDocument>(() => newDocument('quote', []));
  const [doc, dispatch] = useDocumentReducer(initial);
  const totals = useMemo(() => totalsFor(doc), [doc]);

  return (
    <div className="min-h-dvh">
      <a
        href="#editor"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-field focus:bg-accent focus:px-4 focus:py-2 focus:text-surface"
      >
        Skip to the editor
      </a>

      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-[86rem] flex-wrap items-center justify-between gap-3 px-5 py-3.5 sm:px-8">
          <div className="flex items-baseline gap-3">
            <span className="text-base font-semibold tracking-tight">InvoiceFlow</span>
            <span className="text-sm text-muted">Quotes and invoices, as PDFs</span>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-[86rem] gap-8 px-5 py-8 sm:px-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start">
        <div id="editor" className="min-w-0 space-y-6">
          <section className="panel p-5">
            <h2 className="section-title">Document</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="doc-type" className="mb-1 block text-xs font-medium text-muted">
                  Type
                </label>
                <select
                  id="doc-type"
                  className="field"
                  value={doc.type}
                  onChange={(e) =>
                    dispatch({ type: 'meta', patch: { type: e.target.value as DocumentType } })
                  }
                >
                  <option value="quote">Quote</option>
                  <option value="invoice">Invoice</option>
                </select>
              </div>

              <div>
                <label htmlFor="doc-currency" className="mb-1 block text-xs font-medium text-muted">
                  Currency
                </label>
                <select
                  id="doc-currency"
                  className="field"
                  value={doc.currency}
                  onChange={(e) =>
                    dispatch({
                      type: 'meta',
                      patch: { currency: e.target.value as CommercialDocument['currency'] },
                    })
                  }
                >
                  <option value="BRL">BRL</option>
                  <option value="USD">USD</option>
                </select>
                <p className="mt-1 text-xs leading-snug text-muted">
                  Relabels the figures. It does not convert between currencies.
                </p>
              </div>

              <Field
                label="Number"
                value={doc.number}
                onChange={(number) => dispatch({ type: 'meta', patch: { number } })}
                hint="Internal to you. Not an official fiscal sequence."
              />

              <div className="grid grid-cols-2 gap-3">
                <Field
                  label="Issued"
                  type="date"
                  value={doc.issuedOn}
                  onChange={(issuedOn) => dispatch({ type: 'meta', patch: { issuedOn } })}
                />
                <Field
                  label={doc.type === 'quote' ? 'Valid until' : 'Due'}
                  type="date"
                  value={doc.dueOn}
                  onChange={(dueOn) => dispatch({ type: 'meta', patch: { dueOn } })}
                />
              </div>
            </div>
          </section>

          <section className="panel p-5">
            <h2 className="section-title">From</h2>
            <div className="mt-3">
              <PartyForm
                kind="issuer"
                value={doc.issuer}
                onChange={(patch) => dispatch({ type: 'issuer', patch })}
              />
            </div>
          </section>

          <section className="panel p-5">
            <h2 className="section-title">To</h2>
            <div className="mt-3">
              <PartyForm
                kind="client"
                value={doc.client}
                onChange={(patch) => dispatch({ type: 'client', patch })}
              />
            </div>
          </section>

          <section className="panel p-5">
            <h2 className="section-title">Items</h2>
            <div className="mt-3">
              <ItemsEditor items={doc.items} currency={doc.currency} dispatch={dispatch} />
            </div>
          </section>

          <section className="panel p-5">
            <TotalsEditor
              discount={doc.discount}
              charges={doc.charges}
              totals={totals}
              currency={doc.currency}
              dispatch={dispatch}
            />
          </section>

          <section className="panel space-y-3 p-5">
            <h2 className="section-title">Wording</h2>
            <Field
              label="Payment terms"
              value={doc.paymentTerms}
              onChange={(paymentTerms) => dispatch({ type: 'meta', patch: { paymentTerms } })}
              placeholder="Bank details, deadlines, how you want to be paid"
              multiline
              rows={3}
            />
            <Field
              label="Notes"
              value={doc.notes}
              onChange={(notes) => dispatch({ type: 'meta', patch: { notes } })}
              placeholder="Anything the client should read"
              multiline
              rows={3}
            />
          </section>
        </div>

        <div className="min-w-0 lg:sticky lg:top-8">
          <h2 className="section-title mb-3">Preview</h2>
          <DocumentSheet document={doc} totals={totals} />
        </div>
      </main>
    </div>
  );
}
