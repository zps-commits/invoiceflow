import { useId } from 'react';

type Props = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
  error?: string | null;
  placeholder?: string;
  type?: 'text' | 'email' | 'tel' | 'date';
  maxLength?: number;
  numeric?: boolean;
  className?: string;
  multiline?: boolean;
  rows?: number;
};

/** One labelled control. The hint is on screen, never behind a tooltip. */
export default function Field({
  label,
  value,
  onChange,
  hint,
  error,
  placeholder,
  type = 'text',
  maxLength,
  numeric = false,
  className,
  multiline = false,
  rows = 3,
}: Props) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ');

  const shared = {
    id,
    value,
    placeholder,
    maxLength,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      onChange(e.target.value),
    'aria-invalid': error ? (true as const) : undefined,
    'aria-describedby': describedBy || undefined,
    className: numeric ? 'field field-num' : 'field',
  };

  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1 block text-xs font-medium text-muted">
        {label}
      </label>
      {multiline ? (
        <textarea {...shared} rows={rows} spellCheck />
      ) : (
        <input
          {...shared}
          type={type}
          inputMode={numeric ? 'decimal' : undefined}
          autoComplete="off"
          spellCheck={false}
        />
      )}
      {hint ? (
        <p id={hintId} className="mt-1 text-xs leading-snug text-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} role="alert" className="mt-1 text-xs font-medium text-negative">
          {error}
        </p>
      ) : null}
    </div>
  );
}
