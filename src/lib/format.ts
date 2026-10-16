import type { Cents, CurrencyCode } from '@/types/document';
import { QUANTITY_SCALE, PERCENT_SCALE } from '@/domain/calculations/money';

const LOCALES: Record<CurrencyCode, string> = { BRL: 'pt-BR', USD: 'en-US' };

/**
 * Currency selection changes the label and the formatting. It never
 * converts: an amount does not change when the currency does, and the
 * interface says so rather than leaving it to be discovered.
 */
export function money(cents: Cents, currency: CurrencyCode): string {
  return new Intl.NumberFormat(LOCALES[currency], { style: 'currency', currency }).format(
    cents / 100,
  );
}

export function quantity(quantityMilli: number, currency: CurrencyCode): string {
  return new Intl.NumberFormat(LOCALES[currency], {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  }).format(quantityMilli / QUANTITY_SCALE);
}

export function percent(basisPoints: number, currency: CurrencyCode): string {
  return new Intl.NumberFormat(LOCALES[currency], {
    style: 'percent',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(basisPoints / (100 * PERCENT_SCALE));
}

export function isoToDisplay(iso: string, currency: CurrencyCode): string {
  const date = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat(LOCALES[currency], { dateStyle: 'long' }).format(date);
}

/** Reads what someone typed into cents. Both decimal separators accepted. */
export function parseMoney(raw: string): Cents | null {
  const cleaned = raw.trim().replace(/\s/g, '').replace(',', '.');
  if (cleaned === '') return null;
  if (!/^-?\d*\.?\d*$/.test(cleaned)) return null;
  const value = Number(cleaned);
  return Number.isFinite(value) ? Math.round(value * 100) : null;
}

/** Reads a quantity into thousandths of a unit. */
export function parseQuantity(raw: string): number | null {
  const cleaned = raw.trim().replace(/\s/g, '').replace(',', '.');
  if (cleaned === '') return null;
  if (!/^-?\d*\.?\d*$/.test(cleaned)) return null;
  const value = Number(cleaned);
  return Number.isFinite(value) ? Math.round(value * QUANTITY_SCALE) : null;
}

/** Reads a percentage into hundredths of a percent. */
export function parsePercent(raw: string): number | null {
  const cleaned = raw.trim().replace(/\s/g, '').replace(',', '.').replace('%', '');
  if (cleaned === '') return null;
  if (!/^-?\d*\.?\d*$/.test(cleaned)) return null;
  const value = Number(cleaned);
  return Number.isFinite(value) ? Math.round(value * PERCENT_SCALE) : null;
}

export const centsToInput = (cents: Cents): string => (cents / 100).toFixed(2);
export const quantityToInput = (q: number): string => String(q / QUANTITY_SCALE);
export const percentToInput = (bp: number): string => String(bp / PERCENT_SCALE);
