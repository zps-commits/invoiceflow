import type { Cents } from '@/types/document';

/**
 * Rounding, in one place.
 *
 * Half away from zero, which is what a person doing this by hand does, and
 * what a client expects when they check the arithmetic. Every amount that
 * gets printed is rounded here, and the total is the sum of the rounded
 * parts rather than a rounding of the exact sum — so the lines on the page
 * add up to the figure at the bottom. A total that is a cent away from its
 * own lines is the one error nobody forgives.
 */
export function roundToCent(value: number): Cents {
  if (!Number.isFinite(value)) return 0;
  // A float like 2399.9999999997 is 2400 in intent; nudge before rounding
  // so the binary representation does not cost a cent.
  const corrected = Math.round(value * 1e6) / 1e6;
  return corrected < 0 ? -Math.round(-corrected) : Math.round(corrected);
}

/** Quantity is thousandths of a unit, so 1.5 becomes 1500. */
export const QUANTITY_SCALE = 1000;

/** Percentages are hundredths of a percent, so 7.5% becomes 750. */
export const PERCENT_SCALE = 100;

export function applyPercent(amount: Cents, basisPoints: number): Cents {
  if (!Number.isFinite(basisPoints)) return 0;
  return roundToCent((amount * basisPoints) / (100 * PERCENT_SCALE));
}

export function lineTotal(quantityMilli: number, unitPriceCents: Cents): Cents {
  if (!Number.isFinite(quantityMilli) || !Number.isFinite(unitPriceCents)) return 0;
  return roundToCent((quantityMilli * unitPriceCents) / QUANTITY_SCALE);
}

export const sum = (values: number[]): number => values.reduce((total, v) => total + v, 0);

/** Guards every number that reaches arithmetic. */
export function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}
