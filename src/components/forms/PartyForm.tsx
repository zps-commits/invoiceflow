import Field from '@/components/ui/Field';
import type { Client, Issuer } from '@/types/document';
import { LIMITS } from '@/domain/validation/limits';

type IssuerProps = {
  kind: 'issuer';
  value: Issuer;
  onChange: (patch: Partial<Issuer>) => void;
};

type ClientProps = {
  kind: 'client';
  value: Client;
  onChange: (patch: Partial<Client>) => void;
};

/**
 * Both sides of a document take almost the same fields, so they share one
 * form. Only the name is required on either side: asking a freelancer for
 * their client's tax id before they can send a quote is how a tool stops
 * being used.
 */
export default function PartyForm(props: IssuerProps | ClientProps) {
  const { value } = props;
  const isIssuer = props.kind === 'issuer';
  const set = (patch: Record<string, string>) =>
    (props.onChange as (p: Record<string, string>) => void)(patch);

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Field
        label={isIssuer ? 'Your name or business' : 'Client name'}
        value={value.name}
        onChange={(name) => set({ name })}
        maxLength={LIMITS.nameChars}
        className="sm:col-span-2"
      />
      {!isIssuer ? (
        <Field
          label="Company"
          value={(value as Client).company}
          onChange={(company) => set({ company })}
          maxLength={LIMITS.nameChars}
          className="sm:col-span-2"
        />
      ) : null}
      <Field label="Email" type="email" value={value.email} onChange={(email) => set({ email })} />
      <Field label="Phone" type="tel" value={value.phone} onChange={(phone) => set({ phone })} />
      <Field
        label="Address"
        value={value.address}
        onChange={(address) => set({ address })}
        maxLength={LIMITS.addressChars}
        className="sm:col-span-2"
        multiline
        rows={2}
      />
      <Field
        label="Tax identification"
        value={value.taxId}
        onChange={(taxId) => set({ taxId })}
        hint="Optional. Printed as typed; nothing here validates or files it."
        className="sm:col-span-2"
      />
    </div>
  );
}
