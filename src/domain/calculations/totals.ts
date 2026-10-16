import type { Cents, Charge, CommercialDocument, Discount, LineItem, Totals } from '@/types/document';
import { applyPercent, isFiniteNumber, lineTotal, PERCENT_SCALE, roundToCent, sum } from './money';

/**
 * The order of operations, fixed and documented.
 *
 *   1. Each line is quantity x unit price, rounded to the cent.
 *   2. The subtotal is the sum of those rounded lines.
 *   3. The discount comes off the subtotal.
 *   4. Charges are calculated on the discounted subtotal — that base is
 *      returned as chargeBaseCents so the document can state it rather
 *      than leave the client guessing which figure a percentage was taken
 *      from.
 *   5. The total is the discounted subtotal plus the charges.
 *
 * Charges are commercial parameters the issuer sets. Nothing here knows any
 * country's tax rules, and nothing here computes an official tax.
 */

export const MAX_DISCOUNT_BASIS_POINTS = 100 * PERCENT_SCALE;

export function discountAmount(subtotal: Cents, discount: Discount): Cents {
  if (subtotal <= 0) return 0;

  if (discount.kind === 'percent') {
    if (!isFiniteNumber(discount.value) || discount.value <= 0) return 0;
    // A discount over 100% would pay the client to buy. Clamped, not rejected.
    const clamped = Math.min(discount.value, MAX_DISCOUNT_BASIS_POINTS);
    return Math.min(applyPercent(subtotal, clamped), subtotal);
  }

  if (discount.kind === 'fixed') {
    if (!isFiniteNumber(discount.value) || discount.value <= 0) return 0;
    // A fixed discount larger than the subtotal takes it to zero, never below.
    return Math.min(roundToCent(discount.value), subtotal);
  }

  return 0;
}

export function calculateTotals(
  items: LineItem[],
  discount: Discount,
  charges: Charge[],
): Totals {
  const lineTotals = items.map((item) => lineTotal(item.quantityMilli, item.unitPriceCents));
  const subtotalCents = roundToCent(sum(lineTotals));

  const discountCents = discountAmount(subtotalCents, discount);
  const chargeBaseCents = subtotalCents - discountCents;

  const chargeAmounts = charges.map((charge) =>
    isFiniteNumber(charge.rateBasisPoints) && charge.rateBasisPoints > 0
      ? applyPercent(chargeBaseCents, charge.rateBasisPoints)
      : 0,
  );
  const chargesTotalCents = roundToCent(sum(chargeAmounts));

  return {
    lineTotals,
    subtotalCents,
    discountCents,
    chargeBaseCents,
    chargeAmounts,
    chargesTotalCents,
    // The sum of the rounded parts, so the printed lines add up.
    totalCents: chargeBaseCents + chargesTotalCents,
  };
}

export const totalsFor = (document: CommercialDocument): Totals =>
  calculateTotals(document.items, document.discount, document.charges);

/**
 * Faults that make a document wrong rather than merely incomplete. The
 * editor can save a draft with problems; exporting one is what this stops.
 */
export type DocumentProblem = { code: string; detail: string };

export function documentProblems(document: CommercialDocument): DocumentProblem[] {
  const problems: DocumentProblem[] = [];

  if (document.items.length === 0) {
    problems.push({ code: 'no-items', detail: 'A document needs at least one item.' });
  }

  for (const item of document.items) {
    if (item.description.trim() === '') {
      problems.push({ code: 'item-without-description', detail: item.id });
    }
    if (!Number.isInteger(item.quantityMilli) || item.quantityMilli <= 0) {
      problems.push({ code: 'invalid-quantity', detail: item.id });
    }
    if (!Number.isInteger(item.unitPriceCents) || item.unitPriceCents < 0) {
      problems.push({ code: 'invalid-price', detail: item.id });
    }
  }

  for (const charge of document.charges) {
    if (charge.rateBasisPoints < 0 || charge.rateBasisPoints > 100 * PERCENT_SCALE) {
      problems.push({ code: 'charge-out-of-range', detail: charge.id });
    }
  }

  if (document.issuer.name.trim() === '') {
    problems.push({ code: 'issuer-without-name', detail: 'Who is sending this?' });
  }
  if (document.client.name.trim() === '') {
    problems.push({ code: 'client-without-name', detail: 'Who is it for?' });
  }

  const totals = totalsFor(document);
  if (totals.totalCents < 0) {
    problems.push({ code: 'negative-total', detail: 'The total cannot be below zero.' });
  }

  return problems;
}
