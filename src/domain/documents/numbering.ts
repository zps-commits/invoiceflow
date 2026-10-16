import type { CommercialDocument, DocumentType } from '@/types/document';

/**
 * Document numbering.
 *
 * Local only, and the interface says so wherever it appears: this is not a
 * fiscal sequence and carries no legal weight. The point is that a client
 * can quote a number back at you and both of you mean the same document.
 *
 * Numbers are per type and per year, so a quote and an invoice issued the
 * same week do not collide, and January does not continue from December.
 */

const PREFIX: Record<DocumentType, string> = { quote: 'Q', invoice: 'INV' };

export function parseNumber(value: string): { prefix: string; year: number; seq: number } | null {
  const match = /^([A-Z]+)-(\d{4})-(\d{4,})$/.exec(value.trim());
  if (!match) return null;
  return { prefix: match[1]!, year: Number(match[2]), seq: Number(match[3]) };
}

export function formatNumber(type: DocumentType, year: number, seq: number): string {
  return `${PREFIX[type]}-${year}-${String(seq).padStart(4, '0')}`;
}

/**
 * The next free number for a type and year, given what already exists.
 * It takes the highest sequence rather than the count, so deleting a
 * document never causes the next one to reuse a number somebody has
 * already seen.
 */
export function nextNumber(
  existing: Pick<CommercialDocument, 'number' | 'type'>[],
  type: DocumentType,
  year: number = new Date().getFullYear(),
): string {
  let highest = 0;
  for (const document of existing) {
    if (document.type !== type) continue;
    const parsed = parseNumber(document.number);
    if (!parsed || parsed.year !== year || parsed.prefix !== PREFIX[type]) continue;
    if (parsed.seq > highest) highest = parsed.seq;
  }
  return formatNumber(type, year, highest + 1);
}

/** True when two documents in a list share a number. */
export function hasNumberCollision(documents: Pick<CommercialDocument, 'number'>[]): boolean {
  const seen = new Set<string>();
  for (const document of documents) {
    const key = document.number.trim().toLowerCase();
    if (seen.has(key)) return true;
    seen.add(key);
  }
  return false;
}
