import { Plus, Trash2 } from 'lucide-react';
import type { CurrencyCode, Discount, Charge, Totals } from '@/types/document';
import type { DocumentAction } from '@/hooks/useDocumentReducer';
import { LIMITS } from '@/domain/validation/limits';
import { centsToInput, money, parseMoney, parsePercent, percentToInput } from '@/lib/format';

type Props = {
  discount: Discount;
  charges: Charge[];
  totals: Totals;
  currency: CurrencyCode;
  dispatch: (action: DocumentAction) => void;
};

export default function TotalsEditor({ discount, charges, totals, currency, dispatch }: Props) {
  return (
    <div className="space-y-6">
      <section>
        <h3 className="section-title">Discount</h3>
        <div className="mt-2 flex flex-wrap items-end gap-3">
          <div>
            <label htmlFor="discount-kind" className="mb-1 block text-xs font-medium text-muted">
              Kind
            </label>
            <select
              id="discount-kind"
              className="field w-auto"
              value={discount.kind}
              onChange={(e) =>
                dispatch({
                  type: 'discount',
                  discount: { kind: e.target.value as Discount['kind'], value: discount.value },
                })
              }
            >
              <option value="none">None</option>
              <option value="percent">Percentage</option>
              <option value="fixed">Fixed amount</option>
            </select>
          </div>

          {discount.kind !== 'none' ? (
            <div>
              <label htmlFor="discount-value" className="mb-1 block text-xs font-medium text-muted">
                {discount.kind === 'percent' ? 'Percent off' : 'Amount off'}
              </label>
              <input
                id="discount-value"
                className="field field-num w-32"
                inputMode="decimal"
                defaultValue={
                  discount.kind === 'percent'
                    ? percentToInput(discount.value)
                    : centsToInput(discount.value)
                }
                onChange={(e) => {
                  const parsed =
                    discount.kind === 'percent'
                      ? parsePercent(e.target.value)
                      : parseMoney(e.target.value);
                  if (parsed !== null) {
                    dispatch({ type: 'discount', discount: { kind: discount.kind, value: parsed } });
                  }
                }}
              />
            </div>
          ) : null}
        </div>
      </section>

      <section>
        <h3 className="section-title">Charges</h3>
        <p className="mt-1 text-xs leading-relaxed text-muted">
          Percentages of the subtotal after the discount. These are commercial charges you set —
          nothing here calculates any country&apos;s taxes.
        </p>

        {charges.length > 0 ? (
          <ul className="mt-3 space-y-2">
            {charges.map((charge) => (
              <li key={charge.id} className="flex items-end gap-2">
                <div className="min-w-0 flex-1">
                  <label htmlFor={`charge-label-${charge.id}`} className="sr-only">
                    Charge name
                  </label>
                  <input
                    id={`charge-label-${charge.id}`}
                    className="field"
                    placeholder="What this charge is"
                    maxLength={LIMITS.labelChars}
                    value={charge.label}
                    onChange={(e) =>
                      dispatch({ type: 'charge-patch', id: charge.id, patch: { label: e.target.value } })
                    }
                  />
                </div>
                <div className="w-24">
                  <label htmlFor={`charge-rate-${charge.id}`} className="sr-only">
                    Rate, percent
                  </label>
                  <input
                    id={`charge-rate-${charge.id}`}
                    className="field field-num"
                    inputMode="decimal"
                    defaultValue={percentToInput(charge.rateBasisPoints)}
                    onChange={(e) => {
                      const parsed = parsePercent(e.target.value);
                      if (parsed !== null) {
                        dispatch({
                          type: 'charge-patch',
                          id: charge.id,
                          patch: { rateBasisPoints: parsed },
                        });
                      }
                    }}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => dispatch({ type: 'charge-remove', id: charge.id })}
                  className="pressable rounded-field p-2 text-muted hover:text-negative"
                >
                  <Trash2 aria-hidden="true" className="size-4" />
                  <span className="sr-only">Remove charge: {charge.label || 'unnamed'}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}

        <button
          type="button"
          onClick={() => dispatch({ type: 'charge-add' })}
          disabled={charges.length >= LIMITS.maxCharges}
          className="btn-quiet pressable mt-3 inline-flex items-center gap-2"
        >
          <Plus aria-hidden="true" className="size-4" />
          Add charge
        </button>
      </section>

      <dl className="border-t border-line pt-4 text-sm">
        {[
          ['Subtotal', totals.subtotalCents, false],
          ...(totals.discountCents > 0
            ? ([['Discount', -totals.discountCents, false]] as const)
            : []),
          ...charges.map(
            (charge, index) =>
              [
                charge.label.trim() || 'Charge',
                totals.chargeAmounts[index] ?? 0,
                false,
              ] as const,
          ),
        ].map(([label, value], index) => (
          <div key={`${label}-${index}`} className="flex justify-between gap-4 py-1.5">
            <dt className="text-muted">{label}</dt>
            <dd className="font-mono">{money(value as number, currency)}</dd>
          </div>
        ))}
        <div className="mt-2 flex justify-between gap-4 border-t border-line pt-3">
          <dt className="font-medium">Total</dt>
          <dd className="font-mono text-lg font-semibold text-accent">
            {money(totals.totalCents, currency)}
          </dd>
        </div>
      </dl>
    </div>
  );
}
