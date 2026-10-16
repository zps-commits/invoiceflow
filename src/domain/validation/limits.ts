/**
 * Bounds on everything a person can type.
 *
 * These are not style preferences. A description with no ceiling breaks
 * the PDF layout, and a quantity with no ceiling produces a total nobody
 * can read. Each limit is enforced where the value is parsed, not only in
 * the input's maxlength, because the input is not the only way in.
 */
export const LIMITS = {
  descriptionChars: 300,
  nameChars: 120,
  addressChars: 300,
  notesChars: 2000,
  termsChars: 1000,
  labelChars: 60,
  numberChars: 40,
  /** 999,999 units, in thousandths. */
  maxQuantityMilli: 999_999_000,
  /** Ten million in the currency, in cents. */
  maxUnitPriceCents: 1_000_000_000,
  maxItems: 200,
  maxCharges: 10,
  /** A logo bigger than this bloats every saved document. */
  maxLogoBytes: 512 * 1024,
} as const;

export function clampText(value: string, max: number): string {
  return value.length > max ? value.slice(0, max) : value;
}

export function clampInt(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.round(value)));
}
