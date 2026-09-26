/**
 * Shared types and helpers for the Stripe card payment integration.
 *
 * Key rules:
 * - The server derives the price; never send a price field to the API.
 * - Secrets (paymentIntentClientSecret, customerSessionClientSecret) must
 *   never be stored in persistent storage or appear in logs.
 * - Card path is only available for events whose settlementCurrency is one
 *   of the STRIPE_CURRENCIES. Everything else stays on the Bachs/Ercaspay path.
 */

// ─── Currency routing ─────────────────────────────────────────────────────────

export const STRIPE_CURRENCIES = ['USD', 'GBP', 'EUR', 'CAD'] as const;
export type StripeCurrency = (typeof STRIPE_CURRENCIES)[number];

/**
 * Pure routing function — returns true iff the given settlementCurrency
 * should use the Stripe Payment Sheet path.
 *
 * undefined / null / 'NGN' / any other string → false (Bachs path).
 */
export function isStripeCurrency(currency?: string | null): boolean {
  return STRIPE_CURRENCIES.includes(currency as StripeCurrency);
}

// ─── Payment Sheet API ────────────────────────────────────────────────────────

/** POST /v1/payments/stripe/payment-sheet — request body */
export interface InitiateStripePaymentSheetInput {
  eventId: string;
  /** Tiers + quantities only. Never include a price field. */
  ticketTiers: { tierId: string; quantity: number }[];
}

/**
 * POST /v1/payments/stripe/payment-sheet — response data.
 *
 * Note: the session secret field is `customerSessionClientSecret`,
 * NOT `customerEphemeralKeySecret`. This is the correct Stripe v2
 * Customer Sessions field name.
 */
export interface StripePaymentSheetResponse {
  purchaseId: string;
  paymentIntentClientSecret: string;
  /** Passed to initPaymentSheet as `customerSessionClientSecret` */
  customerSessionClientSecret: string;
  customerId: string;
  publishableKey: string;
  /** Display only — major currency units (e.g. 25.5 = $25.50) */
  totalAmount: number;
  currency: string;
}

// ─── Verification API ─────────────────────────────────────────────────────────

export type VerifyPurchaseStatus = 'pending' | 'already_completed' | 'failed';

/** GET /v1/payments/verify/:purchaseId — response data */
export interface VerifyPurchaseResponse {
  status: VerifyPurchaseStatus;
  tickets?: TicketIssuance[];
  /** Present when status === 'failed' */
  reason?: string;
}

export interface TicketIssuance {
  ticketNumber: string;
  qrCode: string;
  status: string;
  ticketTier: {
    name: string;
    price: number;
    perks?: string[];
  };
  event: {
    id: string;
    name: string;
    startsAt: string;
    locationName: string;
  };
}

// ─── Hook types ───────────────────────────────────────────────────────────────

export interface CardCheckoutInput {
  eventId: string;
  tierId: string;
  quantity: number;
}

export type CheckoutOutcome =
  | { outcome: 'success'; purchaseId: string; tickets: TicketIssuance[] }
  | { outcome: 'cancelled' }
  | { outcome: 'error'; message: string }
  /** Payment captured but tickets not yet visible — user should check history */
  | { outcome: 'processing'; purchaseId: string };

export interface UseCardCheckoutResult {
  pay: (input: CardCheckoutInput) => Promise<CheckoutOutcome>;
  busy: boolean;
}
