import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearDocuments,
  deleteDocument,
  findDocument,
  getSnapshot,
  loadSettings,
  resetStorage,
  saveDocument,
  saveSettings,
  startSync,
  subscribe,
} from '@/lib/storage/documents';
import { newDocument, duplicateDocument } from '@/domain/documents/factory';
import { nextNumber, hasNumberCollision, parseNumber } from '@/domain/documents/numbering';

const KEY = 'invoiceflow.documents.v1';

beforeEach(() => {
  window.localStorage.clear();
  resetStorage();
});

const make = (type: 'quote' | 'invoice' = 'quote') => newDocument(type, getSnapshot().documents);

/** A fresh load from disk, which resetStorage alone would wipe. */
function reload() {
  const stored = window.localStorage.getItem(KEY);
  resetStorage();
  if (stored !== null) window.localStorage.setItem(KEY, stored);
}

describe('saving', () => {
  it('starts empty', () => {
    expect(getSnapshot().documents).toEqual([]);
  });

  it('saves a document and finds it again', () => {
    const doc = make();
    saveDocument(doc);
    expect(findDocument(doc.id)?.number).toBe(doc.number);
  });

  it('updates rather than duplicating when the same id is saved twice', () => {
    const doc = make();
    saveDocument(doc);
    saveDocument({ ...doc, notes: 'Changed' });
    expect(getSnapshot().documents).toHaveLength(1);
    expect(findDocument(doc.id)?.notes).toBe('Changed');
  });

  it('survives a reload', () => {
    const doc = make();
    saveDocument(doc);
    reload();
    expect(getSnapshot().documents.map((d) => d.id)).toEqual([doc.id]);
  });

  it('deletes one and leaves the rest', () => {
    const a = make();
    saveDocument(a);
    const b = make();
    saveDocument(b);
    deleteDocument(a.id);
    expect(getSnapshot().documents.map((d) => d.id)).toEqual([b.id]);
  });

  it('clears everything', () => {
    saveDocument(make());
    clearDocuments();
    expect(getSnapshot().documents).toEqual([]);
  });

  it('notifies subscribers on every change', () => {
    const listener = vi.fn();
    const stop = subscribe(listener);
    saveDocument(make());
    expect(listener).toHaveBeenCalledTimes(1);
    stop();
    saveDocument(make());
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

describe('storage treated as hostile', () => {
  it('ignores a blob that is not JSON', () => {
    window.localStorage.setItem(KEY, 'not json');
    reload();
    expect(getSnapshot().documents).toEqual([]);
  });

  it('ignores a record from a different schema version', () => {
    window.localStorage.setItem(KEY, JSON.stringify({ version: 99, documents: [make()] }));
    reload();
    expect(getSnapshot().documents).toEqual([]);
  });

  it('ignores entries missing the fields a document must have', () => {
    window.localStorage.setItem(
      KEY,
      JSON.stringify({ version: 1, documents: [{ id: 'x' }, 42, null] }),
    );
    reload();
    expect(getSnapshot().documents).toEqual([]);
  });

  it('keeps the valid entries and drops the broken ones', () => {
    const good = make();
    window.localStorage.setItem(
      KEY,
      JSON.stringify({ version: 1, documents: [good, { id: 'broken' }] }),
    );
    reload();
    expect(getSnapshot().documents).toHaveLength(1);
  });

  it('reports storage as unavailable when the browser refuses to read', () => {
    resetStorage();
    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('denied');
    });
    expect(getSnapshot().available).toBe(false);
    spy.mockRestore();
  });

  it('keeps a document in memory when the browser refuses to write', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });
    const doc = make();
    saveDocument(doc);
    expect(getSnapshot().documents).toHaveLength(1);
    expect(getSnapshot().available).toBe(false);
    spy.mockRestore();
  });

  it('picks up a change another tab made', () => {
    const stop = startSync();
    const other = make();
    window.localStorage.setItem(KEY, JSON.stringify({ version: 1, documents: [other] }));
    window.dispatchEvent(new StorageEvent('storage', { key: KEY }));
    expect(getSnapshot().documents.map((d) => d.id)).toEqual([other.id]);
    stop();
  });
});

describe('issuer settings', () => {
  it('round-trips the issuer', () => {
    const doc = make();
    const issuer = { ...doc.issuer, name: 'Estúdio Açaí', email: 'ola@example.test' };
    expect(saveSettings(issuer)).toBe(true);
    expect(loadSettings().issuer?.name).toBe('Estúdio Açaí');
  });

  it('returns nothing when none were saved', () => {
    expect(loadSettings().issuer).toBeNull();
  });

  it('ignores settings from a different schema version', () => {
    window.localStorage.setItem(
      'invoiceflow.settings.v1',
      JSON.stringify({ version: 99, issuer: { name: 'Old' } }),
    );
    expect(loadSettings().issuer).toBeNull();
  });
});

describe('numbering', () => {
  it('starts a type at one', () => {
    expect(nextNumber([], 'quote', 2026)).toBe('Q-2026-0001');
    expect(nextNumber([], 'invoice', 2026)).toBe('INV-2026-0001');
  });

  it('continues from the highest, not the count', () => {
    const existing = [
      { number: 'Q-2026-0001', type: 'quote' as const },
      { number: 'Q-2026-0009', type: 'quote' as const },
    ];
    // Deleting the middle must not make the next one reuse 0002.
    expect(nextNumber(existing, 'quote', 2026)).toBe('Q-2026-0010');
  });

  it('counts quotes and invoices separately', () => {
    const existing = [{ number: 'Q-2026-0005', type: 'quote' as const }];
    expect(nextNumber(existing, 'invoice', 2026)).toBe('INV-2026-0001');
  });

  it('restarts in a new year', () => {
    const existing = [{ number: 'Q-2026-0007', type: 'quote' as const }];
    expect(nextNumber(existing, 'quote', 2027)).toBe('Q-2027-0001');
  });

  it('ignores a number it cannot parse', () => {
    const existing = [{ number: 'whatever', type: 'quote' as const }];
    expect(nextNumber(existing, 'quote', 2026)).toBe('Q-2026-0001');
  });

  it('parses and rejects', () => {
    expect(parseNumber('INV-2026-0042')).toEqual({ prefix: 'INV', year: 2026, seq: 42 });
    expect(parseNumber('nope')).toBeNull();
  });

  it('spots a collision', () => {
    expect(hasNumberCollision([{ number: 'Q-1' }, { number: 'q-1' }])).toBe(true);
    expect(hasNumberCollision([{ number: 'Q-1' }, { number: 'Q-2' }])).toBe(false);
  });

  it('gives a new document a number nothing else holds', () => {
    const first = make();
    saveDocument(first);
    const second = newDocument('quote', getSnapshot().documents);
    expect(second.number).not.toBe(first.number);
    expect(hasNumberCollision([first, second])).toBe(false);
  });
});

describe('duplicating', () => {
  it('copies the content but not the identity', () => {
    const original = make();
    original.items[0]!.description = 'Original work';
    saveDocument(original);

    const copy = duplicateDocument(original, getSnapshot().documents);
    expect(copy.id).not.toBe(original.id);
    expect(copy.number).not.toBe(original.number);
    expect(copy.items[0]?.description).toBe('Original work');
  });

  it('gives every copied item its own id', () => {
    const original = make();
    const copy = duplicateDocument(original, []);
    expect(copy.items[0]?.id).not.toBe(original.items[0]?.id);
  });

  it('comes back as a draft', () => {
    const issued = { ...make(), status: 'issued' as const };
    expect(duplicateDocument(issued, []).status).toBe('draft');
  });
});
