import type { CommercialDocument, DocumentType, Issuer, LineItem } from '@/types/document';
import { nextNumber } from './numbering';

export const EMPTY_ISSUER: Issuer = {
  name: '',
  email: '',
  phone: '',
  address: '',
  taxId: '',
  logoDataUrl: null,
};

export function newItem(): LineItem {
  return { id: crypto.randomUUID(), description: '', quantityMilli: 1000, unitPriceCents: 0 };
}

function isoDate(offsetDays = 0): string {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

/**
 * A new document, numbered against whatever already exists so two
 * documents never carry the same number.
 *
 * A quote defaults to thirty days of validity and an invoice to thirty
 * days to pay. Both are starting points the user changes.
 */
export function newDocument(
  type: DocumentType,
  existing: Pick<CommercialDocument, 'number' | 'type'>[],
  issuer: Issuer = EMPTY_ISSUER,
): CommercialDocument {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    number: nextNumber(existing, type),
    type,
    status: 'draft',
    currency: 'BRL',
    issuedOn: isoDate(),
    dueOn: isoDate(30),
    issuer: { ...issuer },
    client: { name: '', company: '', email: '', phone: '', address: '', taxId: '' },
    items: [newItem()],
    discount: { kind: 'none', value: 0 },
    charges: [],
    notes: '',
    paymentTerms: '',
    createdAt: now,
    updatedAt: now,
  };
}

/** A copy, with a new identity and number, back in draft. */
export function duplicateDocument(
  source: CommercialDocument,
  existing: Pick<CommercialDocument, 'number' | 'type'>[],
): CommercialDocument {
  const now = new Date().toISOString();
  return {
    ...structuredClone(source),
    id: crypto.randomUUID(),
    number: nextNumber(existing, source.type),
    status: 'draft',
    issuedOn: isoDate(),
    dueOn: isoDate(30),
    createdAt: now,
    updatedAt: now,
    items: source.items.map((item) => ({ ...item, id: crypto.randomUUID() })),
    charges: source.charges.map((charge) => ({ ...charge, id: crypto.randomUUID() })),
  };
}
