import { useReducer } from 'react';
import type {
  Charge,
  Client,
  CommercialDocument,
  Discount,
  Issuer,
  LineItem,
} from '@/types/document';
import { newItem } from '@/domain/documents/factory';
import { clampText, LIMITS } from '@/domain/validation/limits';

/**
 * One reducer for the whole document.
 *
 * Bounds are applied here rather than only on the inputs, because an input
 * is not the only way a value arrives: a restored document from storage or
 * a duplicated one goes through the same actions.
 */
export type DocumentAction =
  | { type: 'replace'; document: CommercialDocument }
  | { type: 'meta'; patch: Partial<Pick<CommercialDocument, 'number' | 'type' | 'status' | 'currency' | 'issuedOn' | 'dueOn' | 'notes' | 'paymentTerms'>> }
  | { type: 'issuer'; patch: Partial<Issuer> }
  | { type: 'client'; patch: Partial<Client> }
  | { type: 'item-add' }
  | { type: 'item-remove'; id: string }
  | { type: 'item-patch'; id: string; patch: Partial<Omit<LineItem, 'id'>> }
  | { type: 'item-move'; id: string; direction: -1 | 1 }
  | { type: 'discount'; discount: Discount }
  | { type: 'charge-add' }
  | { type: 'charge-remove'; id: string }
  | { type: 'charge-patch'; id: string; patch: Partial<Omit<Charge, 'id'>> };

function touched(document: CommercialDocument): CommercialDocument {
  return { ...document, updatedAt: new Date().toISOString() };
}

export function documentReducer(
  state: CommercialDocument,
  action: DocumentAction,
): CommercialDocument {
  switch (action.type) {
    case 'replace':
      return action.document;

    case 'meta': {
      const patch = { ...action.patch };
      if (patch.notes !== undefined) patch.notes = clampText(patch.notes, LIMITS.notesChars);
      if (patch.paymentTerms !== undefined) {
        patch.paymentTerms = clampText(patch.paymentTerms, LIMITS.termsChars);
      }
      if (patch.number !== undefined) patch.number = clampText(patch.number, LIMITS.numberChars);
      return touched({ ...state, ...patch });
    }

    case 'issuer': {
      const patch = { ...action.patch };
      if (patch.name !== undefined) patch.name = clampText(patch.name, LIMITS.nameChars);
      if (patch.address !== undefined) patch.address = clampText(patch.address, LIMITS.addressChars);
      return touched({ ...state, issuer: { ...state.issuer, ...patch } });
    }

    case 'client': {
      const patch = { ...action.patch };
      if (patch.name !== undefined) patch.name = clampText(patch.name, LIMITS.nameChars);
      if (patch.address !== undefined) patch.address = clampText(patch.address, LIMITS.addressChars);
      return touched({ ...state, client: { ...state.client, ...patch } });
    }

    case 'item-add':
      if (state.items.length >= LIMITS.maxItems) return state;
      return touched({ ...state, items: [...state.items, newItem()] });

    case 'item-remove': {
      // A document always keeps one line. Removing the last one empties it
      // rather than leaving a document that cannot be edited back into shape.
      const remaining = state.items.filter((item) => item.id !== action.id);
      return touched({ ...state, items: remaining.length > 0 ? remaining : [newItem()] });
    }

    case 'item-patch': {
      const patch = { ...action.patch };
      if (patch.description !== undefined) {
        patch.description = clampText(patch.description, LIMITS.descriptionChars);
      }
      if (patch.quantityMilli !== undefined) {
        patch.quantityMilli = Math.min(Math.max(0, patch.quantityMilli), LIMITS.maxQuantityMilli);
      }
      if (patch.unitPriceCents !== undefined) {
        patch.unitPriceCents = Math.min(Math.max(0, patch.unitPriceCents), LIMITS.maxUnitPriceCents);
      }
      return touched({
        ...state,
        items: state.items.map((item) => (item.id === action.id ? { ...item, ...patch } : item)),
      });
    }

    case 'item-move': {
      const index = state.items.findIndex((item) => item.id === action.id);
      const target = index + action.direction;
      if (index < 0 || target < 0 || target >= state.items.length) return state;
      const items = [...state.items];
      const [moved] = items.splice(index, 1);
      items.splice(target, 0, moved!);
      return touched({ ...state, items });
    }

    case 'discount':
      return touched({ ...state, discount: { ...action.discount, value: Math.max(0, action.discount.value) } });

    case 'charge-add':
      if (state.charges.length >= LIMITS.maxCharges) return state;
      return touched({
        ...state,
        charges: [...state.charges, { id: crypto.randomUUID(), label: '', rateBasisPoints: 0 }],
      });

    case 'charge-remove':
      return touched({ ...state, charges: state.charges.filter((c) => c.id !== action.id) });

    case 'charge-patch': {
      const patch = { ...action.patch };
      if (patch.label !== undefined) patch.label = clampText(patch.label, LIMITS.labelChars);
      if (patch.rateBasisPoints !== undefined) {
        patch.rateBasisPoints = Math.min(Math.max(0, patch.rateBasisPoints), 100 * 100);
      }
      return touched({
        ...state,
        charges: state.charges.map((c) => (c.id === action.id ? { ...c, ...patch } : c)),
      });
    }

    default:
      return state;
  }
}

export function useDocumentReducer(initial: CommercialDocument) {
  return useReducer(documentReducer, initial);
}
