import { describe, expect, it } from 'vitest';
import { buildFilename, renderDocumentPdf } from '@/lib/pdf/render';
import { totalsFor } from '@/domain/calculations/totals';
import type { CommercialDocument, LineItem } from '@/types/document';

const item = (over: Partial<LineItem> = {}): LineItem => ({
  id: crypto.randomUUID(),
  description: 'Consulting',
  quantityMilli: 1000,
  unitPriceCents: 25_000,
  ...over,
});

const doc = (over: Partial<CommercialDocument> = {}): CommercialDocument => ({
  id: 'd1',
  number: 'Q-2026-0001',
  type: 'quote',
  status: 'draft',
  currency: 'BRL',
  issuedOn: '2026-10-16',
  dueOn: '2026-11-16',
  issuer: {
    name: 'Estúdio Açaí',
    email: 'ola@example.test',
    phone: '+55 81 0000-0000',
    address: 'Rua das Flores, 100\nRecife',
    taxId: '00.000.000/0001-00',
    logoDataUrl: null,
  },
  client: {
    name: 'João Conceição',
    company: 'Comércio Irmãos Ltda',
    email: 'joao@example.test',
    phone: '',
    address: 'Avenida Boa Viagem, 2000',
    taxId: '',
  },
  items: [item()],
  discount: { kind: 'none', value: 0 },
  charges: [],
  notes: '',
  paymentTerms: '',
  createdAt: '2026-10-16T00:00:00.000Z',
  updatedAt: '2026-10-16T00:00:00.000Z',
  ...over,
});

const render = (d: CommercialDocument) => renderDocumentPdf(d, totalsFor(d));

describe('pdf export', () => {
  it('produces a non-trivial pdf blob', async () => {
    const result = render(doc());
    expect(result.blob.type).toBe('application/pdf');
    expect(result.blob.size).toBeGreaterThan(1000);
  });

  it('starts with the pdf magic bytes', async () => {
    const result = render(doc());
    const head = new Uint8Array(await result.blob.slice(0, 5).arrayBuffer());
    expect(String.fromCharCode(...head)).toBe('%PDF-');
  });

  it('fits a short document on one page', () => {
    expect(render(doc()).pages).toBe(1);
  });

  it('paginates a document with many items', () => {
    const many = Array.from({ length: 60 }, (_, i) =>
      item({ description: `Line ${i + 1}`, unitPriceCents: 1000 + i }),
    );
    const result = render(doc({ items: many }));
    expect(result.pages).toBeGreaterThan(1);
  });

  it('survives descriptions far longer than one line', () => {
    const long = item({ description: 'Detalhe '.repeat(80).trim() });
    const result = render(doc({ items: [long] }));
    expect(result.pages).toBeGreaterThanOrEqual(1);
    expect(result.blob.size).toBeGreaterThan(1000);
  });

  it('survives long notes and payment terms', () => {
    const result = render(
      doc({
        notes: 'Observação detalhada. '.repeat(60),
        paymentTerms: 'Condições de pagamento. '.repeat(60),
      }),
    );
    expect(result.blob.size).toBeGreaterThan(1000);
  });

  it('renders accented characters without throwing', () => {
    const result = render(
      doc({
        items: [item({ description: 'Manutenção · instalação · avaliação (ção, ãe, ü, ñ)' })],
        notes: 'Pagamento à vista. Não há acréscimo.',
      }),
    );
    expect(result.blob.size).toBeGreaterThan(1000);
  });

  it('renders a discount and several charges', () => {
    const result = render(
      doc({
        discount: { kind: 'percent', value: 1250 },
        charges: [
          { id: 'c1', label: 'Deslocamento', rateBasisPoints: 500 },
          { id: 'c2', label: 'Urgência', rateBasisPoints: 1000 },
        ],
      }),
    );
    expect(result.blob.size).toBeGreaterThan(1000);
  });

  it('does not fail on a logo that is not a readable image', () => {
    const broken = doc();
    broken.issuer.logoDataUrl = 'data:image/png;base64,not-an-image';
    expect(() => render(broken)).not.toThrow();
  });

  it('renders an empty document rather than refusing', () => {
    const empty = doc({
      items: [],
      issuer: { name: '', email: '', phone: '', address: '', taxId: '', logoDataUrl: null },
      client: { name: '', company: '', email: '', phone: '', address: '', taxId: '' },
    });
    expect(render(empty).pages).toBe(1);
  });
});

describe('filenames', () => {
  it('uses the type, number and client', () => {
    expect(buildFilename(doc())).toBe('quote-q-2026-0001-joao-conceicao.pdf');
  });

  it('strips accents and punctuation', () => {
    const named = doc({ client: { ...doc().client, name: 'Açaí & Cia. Ltda' } });
    expect(buildFilename(named)).toMatch(/^quote-q-2026-0001-acai-cia-ltda\.pdf$/);
  });

  it('falls back when the client has no name', () => {
    const anonymous = doc({ client: { ...doc().client, name: '' } });
    expect(buildFilename(anonymous)).toContain('client');
  });

  it('names an invoice an invoice', () => {
    expect(buildFilename(doc({ type: 'invoice' })).startsWith('invoice-')).toBe(true);
  });
});
