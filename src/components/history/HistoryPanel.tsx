import { useSyncExternalStore, useState } from 'react';
import { Copy, FileText, Trash2 } from 'lucide-react';
import type { CommercialDocument } from '@/types/document';
import {
  clearDocuments,
  deleteDocument,
  getServerSnapshot,
  getSnapshot,
  subscribe,
} from '@/lib/storage/documents';
import { totalsFor } from '@/domain/calculations/totals';
import { isoToDisplay, money } from '@/lib/format';

const STATUS_LABEL: Record<CommercialDocument['status'], string> = {
  draft: 'Draft',
  issued: 'Issued',
  cancelled: 'Cancelled',
};

export default function HistoryPanel({
  currentId,
  onOpen,
  onDuplicate,
}: {
  currentId: string;
  onOpen: (document: CommercialDocument) => void;
  onDuplicate: (document: CommercialDocument) => void;
}) {
  const { documents, available } = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [filterType, setFilterType] = useState<'all' | 'quote' | 'invoice'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | CommercialDocument['status']>('all');

  const visible = documents.filter(
    (d) =>
      (filterType === 'all' || d.type === filterType) &&
      (filterStatus === 'all' || d.status === filterStatus),
  );

  return (
    <section className="panel p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="section-title">Saved documents</h2>
        <div className="flex flex-wrap gap-2">
          <label htmlFor="filter-type" className="sr-only">
            Filter by type
          </label>
          <select
            id="filter-type"
            className="field w-auto py-1.5 text-xs"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as typeof filterType)}
          >
            <option value="all">All types</option>
            <option value="quote">Quotes</option>
            <option value="invoice">Invoices</option>
          </select>

          <label htmlFor="filter-status" className="sr-only">
            Filter by status
          </label>
          <select
            id="filter-status"
            className="field w-auto py-1.5 text-xs"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)}
          >
            <option value="all">All statuses</option>
            <option value="draft">Draft</option>
            <option value="issued">Issued</option>
            <option value="cancelled">Cancelled</option>
          </select>

          <button
            type="button"
            onClick={() => {
              // Deleting everything is the one action here with no undo,
              // so it is the one that asks.
              if (window.confirm('Delete every saved document? This cannot be undone.')) {
                clearDocuments();
              }
            }}
            disabled={documents.length === 0}
            className="pressable rounded-field px-2.5 py-1.5 text-xs font-medium text-muted hover:text-negative disabled:opacity-40"
          >
            Clear all
          </button>
        </div>
      </div>

      {!available ? (
        <p className="mt-3 rounded-field border border-line bg-paper p-3 text-xs leading-relaxed text-muted">
          This browser is not letting the page save anything, so documents will not be kept.
          Everything else works, and you can still export a PDF.
        </p>
      ) : null}

      {documents.length === 0 ? (
        <p className="mt-3 text-sm text-muted">
          Nothing saved yet. Save a document and it appears here, in this browser only.
        </p>
      ) : visible.length === 0 ? (
        <p className="mt-3 text-sm text-muted">No document matches those filters.</p>
      ) : (
        <ul className="mt-3 divide-y divide-line">
          {visible.map((document) => {
            const totals = totalsFor(document);
            const isCurrent = document.id === currentId;
            return (
              <li
                key={document.id}
                className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-3"
              >
                <div className="min-w-0">
                  <p className="flex flex-wrap items-baseline gap-2 text-sm">
                    <span className="font-mono">{document.number}</span>
                    <span className="text-muted">
                      {document.type === 'quote' ? 'Quote' : 'Invoice'} ·{' '}
                      {STATUS_LABEL[document.status]}
                    </span>
                    {isCurrent ? (
                      <span className="rounded-field bg-accent-soft px-1.5 py-0.5 text-xs text-accent">
                        Open
                      </span>
                    ) : null}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-muted">
                    {document.client.name || 'No client'} ·{' '}
                    {isoToDisplay(document.issuedOn, document.currency)}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm">
                    {money(totals.totalCents, document.currency)}
                  </span>
                  <button
                    type="button"
                    onClick={() => onOpen(document)}
                    className="pressable rounded-field p-1.5 text-muted hover:text-ink"
                  >
                    <FileText aria-hidden="true" className="size-4" />
                    <span className="sr-only">Open {document.number}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onDuplicate(document)}
                    className="pressable rounded-field p-1.5 text-muted hover:text-ink"
                  >
                    <Copy aria-hidden="true" className="size-4" />
                    <span className="sr-only">Duplicate {document.number}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm(`Delete ${document.number}?`)) {
                        deleteDocument(document.id);
                      }
                    }}
                    className="pressable rounded-field p-1.5 text-muted hover:text-negative"
                  >
                    <Trash2 aria-hidden="true" className="size-4" />
                    <span className="sr-only">Delete {document.number}</span>
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <p className="mt-4 text-xs leading-relaxed text-muted">
        Documents are stored in this browser only. They are not synced between devices, and
        clearing site data deletes them.
      </p>
    </section>
  );
}
