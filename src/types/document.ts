/** Money as an integer number of cents. No float ever holds an amount. */
export type Cents = number;

export type CurrencyCode = 'BRL' | 'USD';

/**
 * A quote and an invoice differ in what they promise, not in how they are
 * calculated. Neither is a Brazilian nota fiscal, and the application says
 * so wherever a document is produced.
 */
export type DocumentType = 'quote' | 'invoice';

/** Local status only. There is no Paid, because nothing here can verify one. */
export type DocumentStatus = 'draft' | 'issued' | 'cancelled';

export type Issuer = {
  name: string;
  email: string;
  phone: string;
  address: string;
  taxId: string;
  /** A data URL, held locally. Never uploaded anywhere. */
  logoDataUrl: string | null;
};

export type Client = {
  name: string;
  company: string;
  email: string;
  phone: string;
  address: string;
  taxId: string;
};

export type LineItem = {
  id: string;
  description: string;
  /** Thousandths of a unit, so 1.5 hours is 1500. Integers all the way down. */
  quantityMilli: number;
  unitPriceCents: Cents;
};

export type DiscountKind = 'none' | 'percent' | 'fixed';

export type Discount = {
  kind: DiscountKind;
  /** Hundredths of a percent when kind is percent, cents when fixed. */
  value: number;
};

/**
 * A commercial charge the issuer adds, not a tax the application computes.
 * The rate is whatever the user types; nothing here knows any country's
 * tax rules and nothing here pretends to.
 */
export type Charge = {
  id: string;
  label: string;
  /** Hundredths of a percent, so 7.5% is 750. */
  rateBasisPoints: number;
};

export type CommercialDocument = {
  /** Internal, unique, never shown. */
  id: string;
  /** Shown to the client. Local numbering, not a fiscal sequence. */
  number: string;
  type: DocumentType;
  status: DocumentStatus;
  currency: CurrencyCode;
  issuedOn: string;
  /** Due date for an invoice, valid-until for a quote. */
  dueOn: string;
  issuer: Issuer;
  client: Client;
  items: LineItem[];
  discount: Discount;
  charges: Charge[];
  notes: string;
  paymentTerms: string;
  createdAt: string;
  updatedAt: string;
};

export type Totals = {
  /** Every line's own rounded amount, in order. */
  lineTotals: Cents[];
  subtotalCents: Cents;
  discountCents: Cents;
  /** What the charges are calculated on, after the discount. */
  chargeBaseCents: Cents;
  /** One amount per charge, in the order the charges are listed. */
  chargeAmounts: Cents[];
  chargesTotalCents: Cents;
  totalCents: Cents;
};
