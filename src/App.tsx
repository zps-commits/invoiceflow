import { useEffect, useMemo, useState } from 'react';
import { Download, FilePlus2, Save } from 'lucide-react';
import type { CommercialDocument, DocumentType } from '@/types/document';
import { newDocument } from '@/domain/documents/factory';
import { useDocumentReducer } from '@/hooks/useDocumentReducer';
import { totalsFor } from '@/domain/calculations/totals';
import PartyForm from '@/components/forms/PartyForm';
import ItemsEditor from '@/components/forms/ItemsEditor';
import TotalsEditor from '@/components/forms/TotalsEditor';
import DocumentSheet from '@/components/preview/DocumentSheet';
import Field from '@/components/ui/Field';
import { downloadPdf, renderDocumentPdf } from '@/lib/pdf/render';
import { documentProblems } from '@/domain/calculations/totals';
import HistoryPanel from '@/components/history/HistoryPanel';
import { duplicateDocument } from '@/domain/documents/factory';
import {
  getSnapshot,
  loadSettings,
  saveDocument,
  saveSettings,
  startSync,
} from '@/lib/storage/documents';

/** One sentence per fault, so the message is never a code. */
const PROBLEM_TEXT: Record<string, string> = {
  'no-items': 'Add at least one item.',
  'item-without-description': 'Every item needs a description.',
  'invalid-quantity': 'A quantity must be a positive number.',
  'invalid-price': 'A price cannot be negative.',
  'charge-out-of-range': 'A charge must be between 0 and 100 percent.',
  'issuer-without-name': 'Add your name or business.',
  'client-without-name': 'Add the client name.',
  'negative-total': 'The total cannot be below zero.',
};

export default function App() {
  const [initial] = useState<CommercialDocument>(() => {
    // A returning user gets their own details back without retyping them.
    const settings = loadSettings();
    return newDocument('quote', getSnapshot().documents, settings.issuer ?? undefined);
  });
  const [doc, dispatch] = useDocumentReducer(initial);
  const totals = useMemo(() => totalsFor(doc), [doc]);
  const problems = useMemo(() => documentProblems(doc), [doc]);
  const [exportState, setExportState] = useState<{ error: string | null; busy: boolean }>({
    error: null,
    busy: false,
  });

  /* Another tab saving or deleting should show up here too. */
  useEffect(() => startSync(), []);

  const [saved, setSaved] = useState<string | null>(null);

  function save() {
    saveDocument(doc);
    // The issuer outlives any one document, so it is kept separately.
    saveSettings(doc.issuer);
    setSaved(doc.number);
    window.setTimeout(() => setSaved(null), 2500);
  }

  function startNew(type: CommercialDocument['type'] = doc.type) {
    dispatch({
      type: 'replace',
      document: newDocument(type, getSnapshot().documents, doc.issuer),
    });
  }

  function exportPdf() {
    setExportState({ error: null, busy: true });
    try {
      const result = renderDocumentPdf(doc, totals);
      const saved = downloadPdf(result);
      setExportState({
        error: saved ? null : 'Your browser blocked the download.',
        busy: false,
      });
    } catch {
      // A failed render must not leave the button spinning forever.
      setExportState({ error: 'The PDF could not be produced.', busy: false });
    }
  }

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
            <span className="hidden text-sm text-muted sm:inline">Quotes and invoices, as PDFs</span>
          </div>

          <div className="flex items-center gap-3">
            {problems.length > 0 ? (
              <span className="text-xs text-muted">
                {problems.length} thing{problems.length === 1 ? '' : 's'} to fix
              </span>
            ) : null}
            <button
              type="button"
              onClick={() => startNew()}
              aria-label="New document"
              className="btn-quiet pressable inline-flex items-center gap-2"
            >
              <FilePlus2 aria-hidden="true" className="size-4" />
              <span aria-hidden="true" className="hidden sm:inline">New</span>
            </button>
            <button
              type="button"
              onClick={save}
              aria-label="Save document"
              className="btn-quiet pressable inline-flex items-center gap-2"
            >
              <Save aria-hidden="true" className="size-4" />
              <span aria-hidden="true" className="hidden sm:inline">Save</span>
            </button>
            <button
              type="button"
              onClick={exportPdf}
              disabled={problems.length > 0 || exportState.busy}
              className="btn-primary pressable inline-flex items-center gap-2"
            >
              <Download aria-hidden="true" className="size-4" />
              {exportState.busy ? 'Preparing…' : 'Export PDF'}
            </button>
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

          <HistoryPanel
            currentId={doc.id}
            onOpen={(document) => dispatch({ type: 'replace', document })}
            onDuplicate={(document) =>
              dispatch({
                type: 'replace',
                document: duplicateDocument(document, getSnapshot().documents),
              })
            }
          />

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
          <div className="mb-3 flex items-baseline justify-between gap-4">
            <h2 className="section-title">Preview</h2>
            <span className="text-xs text-muted">What the PDF will say</span>
          </div>

          {problems.length > 0 ? (
            <div className="mb-3 rounded-field border border-negative/30 bg-negative/5 p-3">
              <p className="text-xs font-medium text-negative">
                Fix these before exporting
              </p>
              <ul className="mt-1.5 space-y-0.5 text-xs text-negative">
                {problems.slice(0, 4).map((problem) => (
                  <li key={`${problem.code}-${problem.detail}`}>{PROBLEM_TEXT[problem.code] ?? problem.code}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {saved ? (
            <p role="status" className="mb-3 text-xs font-medium text-positive">
              Saved {saved} in this browser.
            </p>
          ) : null}

          {exportState.error ? (
            <p role="alert" className="mb-3 text-xs font-medium text-negative">
              {exportState.error}
            </p>
          ) : null}

          <DocumentSheet document={doc} totals={totals} />
        </div>
      </main>
    </div>
  );
}
