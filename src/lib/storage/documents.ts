import type { CommercialDocument } from '@/types/document';

/**
 * Saved documents, in the browser.
 *
 * The record carries a schema version. Without one, a change to the
 * document shape silently turns every saved document into a crash on the
 * next read; with one, an older record can be migrated or refused on
 * purpose. Everything read back is validated field by field, because
 * localStorage is user-editable and survives across versions of the code.
 */

const KEY = 'invoiceflow.documents.v1';
const SETTINGS_KEY = 'invoiceflow.settings.v1';
const SCHEMA_VERSION = 1;
const LIMIT = 200;

type Envelope = { version: number; documents: CommercialDocument[] };

export type StorageSnapshot = {
  documents: CommercialDocument[];
  /** False when the browser refuses to store, which the interface says out loud. */
  available: boolean;
};

const EMPTY: StorageSnapshot = { documents: [], available: true };

let snapshot: StorageSnapshot = EMPTY;
let loaded = false;
const listeners = new Set<() => void>();

const emit = () => {
  for (const listener of listeners) listener();
};

function isDocument(value: unknown): value is CommercialDocument {
  if (typeof value !== 'object' || value === null) return false;
  const d = value as Record<string, unknown>;
  return (
    typeof d.id === 'string' &&
    typeof d.number === 'string' &&
    (d.type === 'quote' || d.type === 'invoice') &&
    (d.status === 'draft' || d.status === 'issued' || d.status === 'cancelled') &&
    (d.currency === 'BRL' || d.currency === 'USD') &&
    Array.isArray(d.items) &&
    typeof d.issuer === 'object' &&
    d.issuer !== null &&
    typeof d.client === 'object' &&
    d.client !== null
  );
}

function parse(raw: string | null): CommercialDocument[] {
  if (!raw) return [];
  try {
    const value: unknown = JSON.parse(raw);
    if (typeof value !== 'object' || value === null) return [];
    const envelope = value as Partial<Envelope>;
    // A record from a future version is left alone rather than guessed at.
    if (envelope.version !== SCHEMA_VERSION) return [];
    if (!Array.isArray(envelope.documents)) return [];
    return envelope.documents.filter(isDocument).slice(0, LIMIT);
  } catch {
    return [];
  }
}

function load() {
  if (loaded) return;
  loaded = true;
  try {
    snapshot = { documents: parse(window.localStorage.getItem(KEY)), available: true };
  } catch {
    // Private browsing and blocked site data both throw rather than
    // returning null. The application still works; it just cannot remember.
    snapshot = { documents: [], available: false };
  }
}

function commit(documents: CommercialDocument[]) {
  const capped = documents.slice(0, LIMIT);
  let available = snapshot.available;
  try {
    const envelope: Envelope = { version: SCHEMA_VERSION, documents: capped };
    window.localStorage.setItem(KEY, JSON.stringify(envelope));
  } catch {
    // Out of quota, or storage denied. Keep them in memory for this
    // session so the action is not silently lost.
    available = false;
  }
  snapshot = { documents: capped, available };
  emit();
}

export function subscribe(listener: () => void): () => void {
  load();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getSnapshot(): StorageSnapshot {
  load();
  return snapshot;
}

export function getServerSnapshot(): StorageSnapshot {
  return EMPTY;
}

export function saveDocument(document: CommercialDocument): void {
  load();
  const stamped = { ...document, updatedAt: new Date().toISOString() };
  const index = snapshot.documents.findIndex((d) => d.id === document.id);
  const next =
    index >= 0
      ? snapshot.documents.map((d) => (d.id === document.id ? stamped : d))
      : [stamped, ...snapshot.documents];
  commit(next);
}

export function deleteDocument(id: string): void {
  load();
  commit(snapshot.documents.filter((d) => d.id !== id));
}

export function clearDocuments(): void {
  load();
  commit([]);
}

export function findDocument(id: string): CommercialDocument | null {
  load();
  return snapshot.documents.find((d) => d.id === id) ?? null;
}

/** Another tab saved or deleted something. Without this the tabs disagree. */
export function startSync(): () => void {
  const onStorage = (event: StorageEvent) => {
    if (event.key !== null && event.key !== KEY) return;
    snapshot = {
      documents: parse(window.localStorage.getItem(KEY)),
      available: snapshot.available,
    };
    emit();
  };
  window.addEventListener('storage', onStorage);
  return () => window.removeEventListener('storage', onStorage);
}

/* ── Issuer settings, kept separately so they outlive any one document ── */

export type Settings = { issuer: CommercialDocument['issuer'] | null };

export function loadSettings(): Settings {
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { issuer: null };
    const value: unknown = JSON.parse(raw);
    if (typeof value !== 'object' || value === null) return { issuer: null };
    const settings = value as { version?: number; issuer?: unknown };
    if (settings.version !== SCHEMA_VERSION) return { issuer: null };
    const issuer = settings.issuer as CommercialDocument['issuer'] | undefined;
    return issuer && typeof issuer.name === 'string' ? { issuer } : { issuer: null };
  } catch {
    return { issuer: null };
  }
}

export function saveSettings(issuer: CommercialDocument['issuer']): boolean {
  try {
    window.localStorage.setItem(
      SETTINGS_KEY,
      JSON.stringify({ version: SCHEMA_VERSION, issuer }),
    );
    return true;
  } catch {
    return false;
  }
}

/** Test seam: drops the cache and what is on disk. */
export function resetStorage(): void {
  loaded = false;
  snapshot = EMPTY;
  try {
    window.localStorage.removeItem(KEY);
    window.localStorage.removeItem(SETTINGS_KEY);
  } catch {
    // Nothing to clear if storage was never available.
  }
  emit();
}
