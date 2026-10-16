import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import type { CurrencyCode, LineItem } from '@/types/document';
import type { DocumentAction } from '@/hooks/useDocumentReducer';
import { LIMITS } from '@/domain/validation/limits';
import { centsToInput, money, parseMoney, parseQuantity, quantityToInput } from '@/lib/format';
import { lineTotal } from '@/domain/calculations/money';

type Props = {
  items: LineItem[];
  currency: CurrencyCode;
  dispatch: (action: DocumentAction) => void;
};

/**
 * The item table.
 *
 * Inputs hold the text the person typed, not a parsed number, so a
 * half-written "1." or "12," is never rewritten mid-keystroke. The parse
 * happens on change and a value that will not parse simply does not move
 * the stored number.
 */
export default function ItemsEditor({ items, currency, dispatch }: Props) {
  const patch = (id: string, p: Partial<Omit<LineItem, 'id'>>) =>
    dispatch({ type: 'item-patch', id, patch: p });

  return (
    <div>
      {/* The grid is a table on a wide screen and stacked cards on a
          narrow one, because a four-column table at 360px is unusable. */}
      <ul className="space-y-3">
        {items.map((item, index) => {
          const total = lineTotal(item.quantityMilli, item.unitPriceCents);
          return (
            <li
              key={item.id}
              className="rounded-field border border-line bg-paper/60 p-3 sm:grid sm:grid-cols-[minmax(0,1fr)_6rem_8rem_auto] sm:items-end sm:gap-3 sm:border-0 sm:bg-transparent sm:p-0"
            >
              <div>
                <label
                  htmlFor={`desc-${item.id}`}
                  className={index === 0 ? 'mb-1 block text-xs font-medium text-muted' : 'sr-only'}
                >
                  Description
                </label>
                <input
                  id={`desc-${item.id}`}
                  className="field"
                  value={item.description}
                  maxLength={LIMITS.descriptionChars}
                  placeholder="What are you charging for"
                  onChange={(e) => patch(item.id, { description: e.target.value })}
                />
              </div>

              <div className="mt-2 sm:mt-0">
                <label
                  htmlFor={`qty-${item.id}`}
                  className={index === 0 ? 'mb-1 block text-xs font-medium text-muted' : 'sr-only'}
                >
                  Quantity
                </label>
                <input
                  id={`qty-${item.id}`}
                  className="field field-num"
                  inputMode="decimal"
                  defaultValue={quantityToInput(item.quantityMilli)}
                  onChange={(e) => {
                    const parsed = parseQuantity(e.target.value);
                    if (parsed !== null) patch(item.id, { quantityMilli: parsed });
                  }}
                />
              </div>

              <div className="mt-2 sm:mt-0">
                <label
                  htmlFor={`price-${item.id}`}
                  className={index === 0 ? 'mb-1 block text-xs font-medium text-muted' : 'sr-only'}
                >
                  Unit price
                </label>
                <input
                  id={`price-${item.id}`}
                  className="field field-num"
                  inputMode="decimal"
                  defaultValue={centsToInput(item.unitPriceCents)}
                  onChange={(e) => {
                    const parsed = parseMoney(e.target.value);
                    if (parsed !== null) patch(item.id, { unitPriceCents: parsed });
                  }}
                />
              </div>

              <div className="mt-3 flex items-center justify-between gap-2 sm:mt-0 sm:justify-end">
                <span className="font-mono text-sm sm:w-24 sm:text-right">
                  {money(total, currency)}
                </span>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => dispatch({ type: 'item-move', id: item.id, direction: -1 })}
                    disabled={index === 0}
                    className="pressable rounded-field p-1.5 text-muted hover:text-ink disabled:opacity-30"
                  >
                    <ArrowUp aria-hidden="true" className="size-4" />
                    <span className="sr-only">Move up: {item.description || 'item'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => dispatch({ type: 'item-move', id: item.id, direction: 1 })}
                    disabled={index === items.length - 1}
                    className="pressable rounded-field p-1.5 text-muted hover:text-ink disabled:opacity-30"
                  >
                    <ArrowDown aria-hidden="true" className="size-4" />
                    <span className="sr-only">Move down: {item.description || 'item'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => dispatch({ type: 'item-remove', id: item.id })}
                    className="pressable rounded-field p-1.5 text-muted hover:text-negative"
                  >
                    <Trash2 aria-hidden="true" className="size-4" />
                    <span className="sr-only">Remove: {item.description || 'item'}</span>
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <button
        type="button"
        onClick={() => dispatch({ type: 'item-add' })}
        disabled={items.length >= LIMITS.maxItems}
        className="btn-quiet pressable mt-4 inline-flex items-center gap-2"
      >
        <Plus aria-hidden="true" className="size-4" />
        Add item
      </button>
      {items.length >= LIMITS.maxItems ? (
        <p className="mt-2 text-xs text-muted">
          That is {LIMITS.maxItems} items, which is the limit.
        </p>
      ) : null}
    </div>
  );
}
