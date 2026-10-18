import { jsPDF } from 'jspdf';
import type { CommercialDocument, Totals } from '@/types/document';
import { isoToDisplay, money, percent, quantity } from '@/lib/format';

/**
 * The PDF.
 *
 * Drawn programmatically rather than rasterised from the preview. A
 * screenshot of the page would match pixel for pixel, but it produces a
 * file several megabytes wide whose text cannot be selected, searched or
 * read by a screen reader — and an invoice is a document people copy
 * numbers out of.
 *
 * The cost of that choice is that this layout and the preview are two
 * implementations. They are kept honest by sharing every figure: both read
 * the same Totals and the same formatters, so they cannot disagree about
 * an amount, only about where it sits on the page.
 *
 * Helvetica is a standard PDF font with WinAnsi encoding, which covers the
 * accented Latin characters Portuguese and Spanish need. A test asserts
 * that a document full of them survives the round trip.
 */

const A4 = { width: 210, height: 297 } as const;
const MARGIN = 16;
const CONTENT_WIDTH = A4.width - MARGIN * 2;
const FOOTER_RESERVE = 20;

const INK = '#18181b';
const MUTED = '#52525b';
const RULE = '#d4d4d8';

type Cursor = { y: number; page: number };

export type PdfResult = { blob: Blob; filename: string; pages: number };

function slug(value: string): string {
  return (
    value
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .toLowerCase() || 'document'
  );
}

export function buildFilename(document: CommercialDocument): string {
  const kind = document.type === 'quote' ? 'quote' : 'invoice';
  return `${kind}-${slug(document.number)}-${slug(document.client.name || 'client')}.pdf`;
}

export function renderDocumentPdf(doc: CommercialDocument, totals: Totals): PdfResult {
  const pdf = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
  const cursor: Cursor = { y: MARGIN, page: 1 };

  const setText = (size: number, colour = INK, style: 'normal' | 'bold' = 'normal') => {
    pdf.setFont('helvetica', style);
    pdf.setFontSize(size);
    pdf.setTextColor(colour);
  };

  /** Starts a new page when the next block will not fit above the footer. */
  const ensureRoom = (needed: number) => {
    if (cursor.y + needed <= A4.height - FOOTER_RESERVE) return;
    pdf.addPage();
    cursor.page += 1;
    cursor.y = MARGIN;
  };

  const rule = () => {
    pdf.setDrawColor(RULE);
    pdf.setLineWidth(0.2);
    pdf.line(MARGIN, cursor.y, MARGIN + CONTENT_WIDTH, cursor.y);
  };

  /* ── Header ─────────────────────────────────────────────────────── */

  let headerLeftY = cursor.y;

  if (doc.issuer.logoDataUrl) {
    try {
      // A logo of unknown proportions is boxed rather than stretched.
      pdf.addImage(doc.issuer.logoDataUrl, 'PNG', MARGIN, headerLeftY, 0, 14, undefined, 'FAST');
      headerLeftY += 18;
    } catch {
      // An unreadable image must not take the whole export down with it.
    }
  }

  setText(11, INK, 'bold');
  pdf.text(doc.issuer.name || 'Your business', MARGIN, headerLeftY + 4);
  headerLeftY += 8;

  setText(8, MUTED);
  for (const line of [doc.issuer.email, doc.issuer.phone, doc.issuer.taxId].filter(Boolean)) {
    pdf.text(String(line), MARGIN, headerLeftY);
    headerLeftY += 4;
  }
  if (doc.issuer.address.trim()) {
    for (const line of pdf.splitTextToSize(doc.issuer.address, 70) as string[]) {
      pdf.text(line, MARGIN, headerLeftY);
      headerLeftY += 4;
    }
  }

  const right = MARGIN + CONTENT_WIDTH;
  setText(20, INK, 'bold');
  pdf.text(doc.type === 'quote' ? 'QUOTE' : 'INVOICE', right, cursor.y + 6, { align: 'right' });

  setText(10, INK);
  pdf.text(doc.number, right, cursor.y + 13, { align: 'right' });

  setText(8, MUTED);
  pdf.text(`Issued  ${isoToDisplay(doc.issuedOn, doc.currency)}`, right, cursor.y + 19, {
    align: 'right',
  });
  pdf.text(
    `${doc.type === 'quote' ? 'Valid until' : 'Due'}  ${isoToDisplay(doc.dueOn, doc.currency)}`,
    right,
    cursor.y + 23.5,
    { align: 'right' },
  );

  cursor.y = Math.max(headerLeftY, cursor.y + 30) + 6;

  /* ── Billed to ──────────────────────────────────────────────────── */

  setText(7, MUTED, 'bold');
  pdf.text('BILLED TO', MARGIN, cursor.y);
  cursor.y += 5;

  setText(10, INK, 'bold');
  pdf.text(doc.client.name || 'Client name', MARGIN, cursor.y);
  cursor.y += 5;

  setText(8, MUTED);
  const clientLines = [doc.client.company, doc.client.email, doc.client.phone, doc.client.taxId]
    .filter(Boolean)
    .map(String);
  if (doc.client.address.trim()) {
    clientLines.push(...(pdf.splitTextToSize(doc.client.address, 90) as string[]));
  }
  for (const line of clientLines) {
    pdf.text(line, MARGIN, cursor.y);
    cursor.y += 4;
  }

  cursor.y += 6;

  /* ── Items ──────────────────────────────────────────────────────── */

  const COL = {
    description: MARGIN,
    quantity: MARGIN + 104,
    unit: MARGIN + 132,
    amount: MARGIN + CONTENT_WIDTH,
  };
  const DESCRIPTION_WIDTH = 100;

  const tableHeader = () => {
    setText(7, MUTED, 'bold');
    pdf.text('DESCRIPTION', COL.description, cursor.y);
    pdf.text('QTY', COL.quantity, cursor.y, { align: 'right' });
    pdf.text('UNIT', COL.unit, cursor.y, { align: 'right' });
    pdf.text('AMOUNT', COL.amount, cursor.y, { align: 'right' });
    cursor.y += 2;
    rule();
    cursor.y += 4;
  };

  ensureRoom(16);
  tableHeader();

  doc.items.forEach((item, index) => {
    const lines = pdf.splitTextToSize(
      item.description.trim() || '—',
      DESCRIPTION_WIDTH,
    ) as string[];
    const rowHeight = Math.max(lines.length * 4.2, 6) + 3;

    // A row that will not fit starts the next page, and the column
    // headings are repeated there so page two is still readable alone.
    if (cursor.y + rowHeight > A4.height - FOOTER_RESERVE) {
      pdf.addPage();
      cursor.page += 1;
      cursor.y = MARGIN;
      tableHeader();
    }

    setText(9, INK);
    lines.forEach((line, lineIndex) => {
      pdf.text(line, COL.description, cursor.y + lineIndex * 4.2);
    });
    pdf.text(quantity(item.quantityMilli, doc.currency), COL.quantity, cursor.y, {
      align: 'right',
    });
    pdf.text(money(item.unitPriceCents, doc.currency), COL.unit, cursor.y, { align: 'right' });
    pdf.text(money(totals.lineTotals[index] ?? 0, doc.currency), COL.amount, cursor.y, {
      align: 'right',
    });

    cursor.y += rowHeight;
    pdf.setDrawColor(RULE);
    pdf.setLineWidth(0.1);
    pdf.line(MARGIN, cursor.y - 2.5, MARGIN + CONTENT_WIDTH, cursor.y - 2.5);
  });

  /* ── Totals ─────────────────────────────────────────────────────── */

  const totalRows: [string, string][] = [['Subtotal', money(totals.subtotalCents, doc.currency)]];
  if (totals.discountCents > 0) {
    const label =
      doc.discount.kind === 'percent'
        ? `Discount (${percent(doc.discount.value, doc.currency)})`
        : 'Discount';
    totalRows.push([label, `-${money(totals.discountCents, doc.currency)}`]);
  }
  doc.charges.forEach((charge, index) => {
    totalRows.push([
      `${charge.label.trim() || 'Charge'} (${percent(charge.rateBasisPoints, doc.currency)})`,
      money(totals.chargeAmounts[index] ?? 0, doc.currency),
    ]);
  });

  // The totals block is kept whole: a total separated from its own
  // subtotal by a page break is how a client ends up disputing a figure.
  ensureRoom(totalRows.length * 5 + 22);
  cursor.y += 4;

  const labelX = MARGIN + CONTENT_WIDTH - 60;
  setText(9, MUTED);
  for (const [label, value] of totalRows) {
    pdf.setTextColor(MUTED);
    pdf.text(label, labelX, cursor.y);
    pdf.setTextColor(INK);
    pdf.text(value, MARGIN + CONTENT_WIDTH, cursor.y, { align: 'right' });
    cursor.y += 5;
  }

  if (doc.charges.length > 0) {
    setText(7, MUTED);
    pdf.text(
      `Charges calculated on ${money(totals.chargeBaseCents, doc.currency)}.`,
      MARGIN + CONTENT_WIDTH,
      cursor.y,
      { align: 'right' },
    );
    cursor.y += 5;
  }

  cursor.y += 1;
  pdf.setDrawColor(INK);
  pdf.setLineWidth(0.3);
  pdf.line(labelX, cursor.y, MARGIN + CONTENT_WIDTH, cursor.y);
  cursor.y += 6;

  setText(12, INK, 'bold');
  pdf.text('Total', labelX, cursor.y);
  pdf.text(money(totals.totalCents, doc.currency), MARGIN + CONTENT_WIDTH, cursor.y, {
    align: 'right',
  });
  cursor.y += 10;

  /* ── Wording ────────────────────────────────────────────────────── */

  const block = (title: string, body: string) => {
    if (!body.trim()) return;
    const lines = pdf.splitTextToSize(body, CONTENT_WIDTH) as string[];
    ensureRoom(lines.length * 4 + 10);
    setText(7, MUTED, 'bold');
    pdf.text(title, MARGIN, cursor.y);
    cursor.y += 4.5;
    setText(8, MUTED);
    for (const line of lines) {
      pdf.text(line, MARGIN, cursor.y);
      cursor.y += 4;
    }
    cursor.y += 4;
  };

  block('PAYMENT TERMS', doc.paymentTerms);
  block('NOTES', doc.notes);

  /* ── Footer on every page ───────────────────────────────────────── */

  const disclaimer =
    `This document is a commercial ${doc.type}. It is not a fiscal document and does not ` +
    'replace any tax obligation. Numbering is internal to the issuer.';
  const total = pdf.getNumberOfPages();

  for (let page = 1; page <= total; page += 1) {
    pdf.setPage(page);
    const footerY = A4.height - 12;
    pdf.setDrawColor(RULE);
    pdf.setLineWidth(0.2);
    pdf.line(MARGIN, footerY - 4, MARGIN + CONTENT_WIDTH, footerY - 4);
    setText(6.5, MUTED);
    for (const [i, line] of (pdf.splitTextToSize(disclaimer, CONTENT_WIDTH - 20) as string[]).entries()) {
      pdf.text(line, MARGIN, footerY + i * 3);
    }
    pdf.text(`${page} / ${total}`, MARGIN + CONTENT_WIDTH, footerY, { align: 'right' });
  }

  return {
    blob: pdf.output('blob'),
    filename: buildFilename(doc),
    pages: total,
  };
}

/** Hands the browser a file to save. Returns false if the browser refused. */
export function downloadPdf(result: PdfResult): boolean {
  try {
    const url = URL.createObjectURL(result.blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = result.filename;
    document.body.append(link);
    link.click();
    link.remove();
    // Revoked on the next tick: revoking synchronously can cancel the save.
    setTimeout(() => URL.revokeObjectURL(url), 0);
    return true;
  } catch {
    return false;
  }
}
