import { describe, expect, it } from 'vitest';
import { calculateTotals, discountAmount, documentProblems } from '@/domain/calculations/totals';
import { applyPercent, lineTotal, roundToCent } from '@/domain/calculations/money';
import type { Charge, CommercialDocument, Discount, LineItem } from '@/types/document';

const item = (over: Partial<LineItem> = {}): LineItem => ({
  id: 'i1',
  description: 'Work',
  quantityMilli: 1000,
  unitPriceCents: 10_000,
  ...over,
});

const none: Discount = { kind: 'none', value: 0 };
const charge = (rate: number, id = 'c1'): Charge => ({ id, label: 'Charge', rateBasisPoints: rate });

describe('1. rounding', () => {
  it('rounds half away from zero', () => {
    expect(roundToCent(10.5)).toBe(11);
    expect(roundToCent(11.5)).toBe(12);
    expect(roundToCent(-10.5)).toBe(-11);
  });

  it('corrects a binary representation that would cost a cent', () => {
    expect(roundToCent(2399.9999999997)).toBe(2400);
  });

  it('returns zero rather than NaN for a value that is not a number', () => {
    expect(roundToCent(Number.NaN)).toBe(0);
    expect(roundToCent(Number.POSITIVE_INFINITY)).toBe(0);
  });
});

describe('2. line totals', () => {
  it('multiplies a whole quantity by the unit price', () => {
    expect(lineTotal(3000, 2500)).toBe(7500);
  });

  it('handles a fractional quantity', () => {
    // 1.5 hours at 100.00
    expect(lineTotal(1500, 10_000)).toBe(15_000);
  });

  it('rounds a line that lands between cents', () => {
    // 0.333 units at 10.00 = 3.33
    expect(lineTotal(333, 1000)).toBe(333);
  });

  it('returns zero for inputs that are not numbers', () => {
    expect(lineTotal(Number.NaN, 1000)).toBe(0);
    expect(lineTotal(1000, Number.NaN)).toBe(0);
  });
});

describe('3. subtotal', () => {
  it('is the sum of the rounded lines', () => {
    const totals = calculateTotals(
      [item({ unitPriceCents: 1033 }), item({ id: 'i2', unitPriceCents: 2067 })],
      none,
      [],
    );
    expect(totals.subtotalCents).toBe(3100);
    expect(totals.lineTotals).toEqual([1033, 2067]);
  });

  it('is zero with no items', () => {
    expect(calculateTotals([], none, []).subtotalCents).toBe(0);
  });
});

describe('4. percentage discount', () => {
  it('takes the percentage off the subtotal', () => {
    const totals = calculateTotals([item({ unitPriceCents: 20_000 })], { kind: 'percent', value: 1000 }, []);
    expect(totals.discountCents).toBe(2000); // 10% of 200.00
    expect(totals.totalCents).toBe(18_000);
  });

  it('clamps a discount over one hundred percent', () => {
    const totals = calculateTotals([item()], { kind: 'percent', value: 50_000 }, []);
    expect(totals.discountCents).toBe(10_000);
    expect(totals.totalCents).toBe(0);
  });

  it('ignores a negative percentage rather than inflating the total', () => {
    expect(discountAmount(10_000, { kind: 'percent', value: -500 })).toBe(0);
  });
});

describe('5. fixed discount', () => {
  it('takes the amount off', () => {
    const totals = calculateTotals([item({ unitPriceCents: 20_000 })], { kind: 'fixed', value: 5000 }, []);
    expect(totals.discountCents).toBe(5000);
    expect(totals.totalCents).toBe(15_000);
  });

  it('never takes the total below zero', () => {
    const totals = calculateTotals([item({ unitPriceCents: 1000 })], { kind: 'fixed', value: 99_999 }, []);
    expect(totals.discountCents).toBe(1000);
    expect(totals.totalCents).toBe(0);
  });

  it('is nothing when the kind is none, whatever the value says', () => {
    expect(discountAmount(10_000, { kind: 'none', value: 5000 })).toBe(0);
  });
});

describe('6. charges', () => {
  it('applies a percentage to the discounted subtotal, not the subtotal', () => {
    const totals = calculateTotals(
      [item({ unitPriceCents: 100_000 })],
      { kind: 'percent', value: 1000 }, // 10% off -> 900.00
      [charge(1000)], // 10% of 900.00
    );
    expect(totals.chargeBaseCents).toBe(90_000);
    expect(totals.chargeAmounts).toEqual([9000]);
    expect(totals.totalCents).toBe(99_000);
  });

  it('states the base the percentage was taken from', () => {
    const totals = calculateTotals([item()], { kind: 'fixed', value: 2500 }, [charge(500)]);
    expect(totals.chargeBaseCents).toBe(7500);
  });

  it('adds several charges', () => {
    const totals = calculateTotals([item({ unitPriceCents: 100_000 })], none, [
      charge(500, 'a'),
      charge(250, 'b'),
    ]);
    expect(totals.chargeAmounts).toEqual([5000, 2500]);
    expect(totals.chargesTotalCents).toBe(7500);
    expect(totals.totalCents).toBe(107_500);
  });

  it('ignores a negative rate', () => {
    const totals = calculateTotals([item()], none, [charge(-500)]);
    expect(totals.chargeAmounts).toEqual([0]);
  });
});

describe('7. the printed lines add up', () => {
  it('total equals discounted subtotal plus the sum of the charge amounts', () => {
    const totals = calculateTotals(
      [item({ unitPriceCents: 3333 }), item({ id: 'i2', quantityMilli: 2500, unitPriceCents: 777 })],
      { kind: 'percent', value: 733 },
      [charge(1725, 'a'), charge(312, 'b')],
    );
    const fromParts =
      totals.subtotalCents -
      totals.discountCents +
      totals.chargeAmounts.reduce((a, b) => a + b, 0);
    expect(totals.totalCents).toBe(fromParts);
  });

  it('subtotal equals the sum of the printed line totals', () => {
    const totals = calculateTotals(
      [item({ unitPriceCents: 1 }), item({ id: 'i2', quantityMilli: 333, unitPriceCents: 997 })],
      none,
      [],
    );
    expect(totals.subtotalCents).toBe(totals.lineTotals.reduce((a, b) => a + b, 0));
  });
});

describe('8. never NaN or Infinity', () => {
  it('survives inputs that are not numbers', () => {
    const totals = calculateTotals(
      [item({ quantityMilli: Number.NaN }), item({ id: 'i2', unitPriceCents: Number.POSITIVE_INFINITY })],
      { kind: 'percent', value: Number.NaN },
      [charge(Number.NaN)],
    );
    for (const value of [
      totals.subtotalCents,
      totals.discountCents,
      totals.chargeBaseCents,
      totals.chargesTotalCents,
      totals.totalCents,
      ...totals.lineTotals,
      ...totals.chargeAmounts,
    ]) {
      expect(Number.isFinite(value)).toBe(true);
    }
  });

  it('every amount is a whole number of cents', () => {
    const totals = calculateTotals(
      [item({ quantityMilli: 1333, unitPriceCents: 777 })],
      { kind: 'percent', value: 1234 },
      [charge(987)],
    );
    for (const value of [totals.subtotalCents, totals.discountCents, totals.totalCents]) {
      expect(Number.isInteger(value)).toBe(true);
    }
  });
});

describe('9. percentages', () => {
  it('reads hundredths of a percent', () => {
    expect(applyPercent(100_000, 750)).toBe(7500); // 7.5%
    expect(applyPercent(100_000, 1)).toBe(10); // 0.01%
  });
});

const doc = (over: Partial<CommercialDocument> = {}): CommercialDocument => ({
  id: 'd1',
  number: 'Q-0001',
  type: 'quote',
  status: 'draft',
  currency: 'BRL',
  issuedOn: '2026-10-16',
  dueOn: '2026-11-16',
  issuer: { name: 'Me', email: '', phone: '', address: '', taxId: '', logoDataUrl: null },
  client: { name: 'Them', company: '', email: '', phone: '', address: '', taxId: '' },
  items: [item()],
  discount: none,
  charges: [],
  notes: '',
  paymentTerms: '',
  createdAt: '2026-10-16T00:00:00.000Z',
  updatedAt: '2026-10-16T00:00:00.000Z',
  ...over,
});

describe('10. document faults', () => {
  it('finds none in a complete document', () => {
    expect(documentProblems(doc())).toEqual([]);
  });

  it('flags a document with no items', () => {
    expect(documentProblems(doc({ items: [] })).map((p) => p.code)).toContain('no-items');
  });

  it('flags an item with no description', () => {
    const codes = documentProblems(doc({ items: [item({ description: '  ' })] })).map((p) => p.code);
    expect(codes).toContain('item-without-description');
  });

  it.each([
    ['zero', 0],
    ['negative', -1000],
    ['fractional', 10.5],
  ])('flags a %s quantity', (_label, quantityMilli) => {
    const codes = documentProblems(doc({ items: [item({ quantityMilli })] })).map((p) => p.code);
    expect(codes).toContain('invalid-quantity');
  });

  it('flags a negative price', () => {
    const codes = documentProblems(doc({ items: [item({ unitPriceCents: -1 })] })).map((p) => p.code);
    expect(codes).toContain('invalid-price');
  });

  it('flags a charge above one hundred percent', () => {
    const codes = documentProblems(doc({ charges: [charge(20_000)] })).map((p) => p.code);
    expect(codes).toContain('charge-out-of-range');
  });

  it('flags a missing issuer or client name', () => {
    const codes = documentProblems(
      doc({
        issuer: { name: '', email: '', phone: '', address: '', taxId: '', logoDataUrl: null },
        client: { name: '', company: '', email: '', phone: '', address: '', taxId: '' },
      }),
    ).map((p) => p.code);
    expect(codes).toContain('issuer-without-name');
    expect(codes).toContain('client-without-name');
  });
});
