import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '@/App';
import { resetStorage, getSnapshot } from '@/lib/storage/documents';

/**
 * Flows through the real interface. The arithmetic is covered by the unit
 * tests; these check the things only a rendered tree can answer.
 */

beforeEach(() => {
  window.localStorage.clear();
  resetStorage();
});

const typeIn = async (user: ReturnType<typeof userEvent.setup>, label: RegExp | string, value: string) => {
  const field = screen.getByLabelText(label);
  await user.clear(field);
  if (value) await user.type(field, value);
  return field;
};

async function fillMinimum(user: ReturnType<typeof userEvent.setup>) {
  await typeIn(user, /your name or business/i, 'Estudio Acai');
  await typeIn(user, /client name/i, 'Cliente Um');
  await typeIn(user, /^description$/i, 'Consulting');
}

describe('the editor', () => {
  it('opens on a quote with one empty item', () => {
    render(<App />);
    expect(screen.getByLabelText(/^type$/i)).toHaveValue('quote');
    expect(screen.getAllByLabelText(/^description$/i)).toHaveLength(1);
  });

  it('refuses to export while the document has faults', () => {
    render(<App />);
    expect(screen.getByRole('button', { name: /export pdf/i })).toBeDisabled();
    expect(screen.getByText(/add your name or business/i)).toBeInTheDocument();
  });

  it('enables export once the required fields are filled', async () => {
    const user = userEvent.setup();
    render(<App />);
    await fillMinimum(user);
    expect(screen.getByRole('button', { name: /export pdf/i })).toBeEnabled();
  });

  it('adds and removes items, always keeping one', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: /add item/i }));
    expect(screen.getAllByLabelText(/^description$/i)).toHaveLength(2);

    await user.click(screen.getAllByRole('button', { name: /^remove:/i })[0]!);
    expect(screen.getAllByLabelText(/^description$/i)).toHaveLength(1);

    await user.click(screen.getAllByRole('button', { name: /^remove:/i })[0]!);
    expect(screen.getAllByLabelText(/^description$/i)).toHaveLength(1);
  });

  it('shows the total updating as the price changes', async () => {
    const user = userEvent.setup();
    render(<App />);
    await typeIn(user, /^unit price$/i, '250');
    // Subtotal appears in the editor and again on the sheet.
    expect(screen.getAllByText('R$ 250,00').length).toBeGreaterThan(0);
  });

  it('applies a percentage discount to the total', async () => {
    const user = userEvent.setup();
    render(<App />);
    await typeIn(user, /^unit price$/i, '200');
    await user.selectOptions(screen.getByLabelText(/^kind$/i), 'percent');
    await typeIn(user, /percent off/i, '10');
    expect(screen.getAllByText('R$ 180,00').length).toBeGreaterThan(0);
  });

  it('relabels the figures when the currency changes, without converting', async () => {
    const user = userEvent.setup();
    render(<App />);
    await typeIn(user, /^unit price$/i, '100');
    expect(screen.getAllByText('R$ 100,00').length).toBeGreaterThan(0);

    await user.selectOptions(screen.getByLabelText(/^currency$/i), 'USD');
    expect(screen.getAllByText('$100.00').length).toBeGreaterThan(0);
    expect(screen.queryByText('R$ 100,00')).not.toBeInTheDocument();
  });

  it('switches the due-date label between a quote and an invoice', async () => {
    const user = userEvent.setup();
    render(<App />);
    expect(screen.getByLabelText(/valid until/i)).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText(/^type$/i), 'invoice');
    expect(screen.getByLabelText(/^due$/i)).toBeInTheDocument();
  });
});

describe('the preview', () => {
  it('shows what the editor says', async () => {
    const user = userEvent.setup();
    render(<App />);
    await typeIn(user, /client name/i, 'Comercio Irmaos');
    const sheet = document.querySelector('[data-document-sheet]') as HTMLElement;
    expect(within(sheet).getByText('Comercio Irmaos')).toBeInTheDocument();
  });

  it('always carries the not-a-fiscal-document notice', () => {
    render(<App />);
    const sheet = document.querySelector('[data-document-sheet]') as HTMLElement;
    expect(within(sheet).getByText(/not a fiscal document/i)).toBeInTheDocument();
  });

  it('states the base a charge was calculated on', async () => {
    const user = userEvent.setup();
    render(<App />);
    await typeIn(user, /^unit price$/i, '100');
    await user.click(screen.getByRole('button', { name: /add charge/i }));
    await typeIn(user, /rate, percent/i, '10');
    const sheet = document.querySelector('[data-document-sheet]') as HTMLElement;
    expect(within(sheet).getByText(/charges calculated on/i)).toBeInTheDocument();
  });
});

describe('saving and history', () => {
  it('starts with nothing saved', () => {
    render(<App />);
    expect(screen.getByText(/nothing saved yet/i)).toBeInTheDocument();
  });

  it('saves the open document', async () => {
    const user = userEvent.setup();
    render(<App />);
    await fillMinimum(user);
    await user.click(screen.getByRole('button', { name: /^save document$/i }));
    expect(getSnapshot().documents).toHaveLength(1);
    expect(screen.getByRole('status')).toHaveTextContent(/saved/i);
  });

  it('gives the next document a different number', async () => {
    const user = userEvent.setup();
    render(<App />);
    await fillMinimum(user);
    const first = (screen.getByLabelText(/^number$/i) as HTMLInputElement).value;
    await user.click(screen.getByRole('button', { name: /^save document$/i }));
    await user.click(screen.getByRole('button', { name: /^new document$/i }));
    expect((screen.getByLabelText(/^number$/i) as HTMLInputElement).value).not.toBe(first);
  });

  it('keeps the issuer when starting a new document', async () => {
    const user = userEvent.setup();
    render(<App />);
    await fillMinimum(user);
    await user.click(screen.getByRole('button', { name: /^save document$/i }));
    await user.click(screen.getByRole('button', { name: /^new document$/i }));
    expect(screen.getByLabelText(/your name or business/i)).toHaveValue('Estudio Acai');
  });

  it('reopens a saved document', async () => {
    const user = userEvent.setup();
    render(<App />);
    await fillMinimum(user);
    await user.click(screen.getByRole('button', { name: /^save document$/i }));
    await user.click(screen.getByRole('button', { name: /^new document$/i }));
    expect(screen.getByLabelText(/client name/i)).toHaveValue('');

    await user.click(screen.getByRole('button', { name: /^open /i }));
    expect(screen.getByLabelText(/client name/i)).toHaveValue('Cliente Um');
  });

  it('duplicates into a new draft with a new number', async () => {
    const user = userEvent.setup();
    render(<App />);
    await fillMinimum(user);
    await user.click(screen.getByRole('button', { name: /^save document$/i }));
    const original = (screen.getByLabelText(/^number$/i) as HTMLInputElement).value;

    await user.click(screen.getByRole('button', { name: /^duplicate /i }));
    expect((screen.getByLabelText(/^number$/i) as HTMLInputElement).value).not.toBe(original);
    expect(screen.getByLabelText(/client name/i)).toHaveValue('Cliente Um');
  });

  it('filters the list by type', async () => {
    const user = userEvent.setup();
    render(<App />);
    await fillMinimum(user);
    await user.click(screen.getByRole('button', { name: /^save document$/i }));

    await user.selectOptions(screen.getByLabelText(/filter by type/i), 'invoice');
    expect(screen.getByText(/no document matches those filters/i)).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText(/filter by type/i), 'quote');
    expect(screen.queryByText(/no document matches those filters/i)).not.toBeInTheDocument();
  });

  it('says so when the browser refuses to store anything', async () => {
    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('denied');
    });
    resetStorage();
    render(<App />);
    expect(screen.getByText(/not letting the page save anything/i)).toBeInTheDocument();
    spy.mockRestore();
  });
});
