/**
 * useCardCheckout
 *
 * Encapsulates the full Stripe Payment Sheet lifecycle:
 *   1. POST /v1/payments/stripe/payment-sheet → receive secrets + publishableKey
 *   2. initStripe with the server-provided publishableKey
 *   3. initPaymentSheet with the received credentials
 *   4. presentPaymentSheet → user completes / cancels / errors
 *   5. Poll GET /v1/payments/verify/:purchaseId until a terminal status
 *
 * Key invariants:
 * - The server always derives the price; we never send an amount.
 * - presentPaymentSheet() success does NOT mean tickets are issued.
 *   Tickets are issued by the backend on Stripe's webhook; we must poll.
 * - Secrets never leave this hook into persistent storage or logs.
 * - Each call to pay() creates a new purchase — never auto-retry the POST.
 */

import {
    initStripe,
    PaymentSheetError,
    useStripe,
} from "@stripe/stripe-react-native";
import { useState } from "react";
import type {
    CardCheckoutInput,
    CheckoutOutcome,
    UseCardCheckoutResult,
} from "../lib/stripe";
import {
    useInitiateStripePaymentSheetMutation,
    useLazyVerifyStripePurchaseQuery,
} from "../store/api/paymentApi";

// ─── Constants ────────────────────────────────────────────────────────────────

/** Deep link that Stripe redirects to after 3DS bank authentication. */
const RETURN_URL = "mynextvibe://stripe-redirect";

/**
 * Maximum number of pending poll responses before giving up and returning
 * { outcome: 'processing' }. 15 × 2 s ≈ 30 s total.
 */
const MAX_ATTEMPTS = 15;

/** Milliseconds to wait between consecutive verify calls. */
const POLL_INTERVAL_MS = 2000;

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useCardCheckout(): UseCardCheckoutResult {
  const [busy, setBusy] = useState(false);

  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const [initiateStripePaymentSheet] = useInitiateStripePaymentSheetMutation();
  const [fetchVerify] = useLazyVerifyStripePurchaseQuery();

  async function pay(input: CardCheckoutInput): Promise<CheckoutOutcome> {
    if (busy) {
      return { outcome: "error", message: "Checkout already in progress." };
    }

    setBusy(true);

    try {
      // ── Step 1: Create the purchase on our server ──────────────────────────
      // The body intentionally omits any price field — the server derives it.
      const apiResult = await initiateStripePaymentSheet({
        eventId: input.eventId,
        ticketTiers: [{ tierId: input.tierId, quantity: input.quantity }],
      });

      if (apiResult.error) {
        const msg =
          (apiResult.error as any)?.data?.error?.message ??
          "Payment setup failed. Please try again.";
        return { outcome: "error", message: msg };
      }

      const params = apiResult.data!.data;

      // Destructure only what we need; never store secrets in component state
      // or pass them anywhere outside this function scope.
      const {
        publishableKey,
        paymentIntentClientSecret,
        customerSessionClientSecret,
        customerId,
        purchaseId,
      } = params;

      // ── Step 2: Initialise the Stripe SDK with the server's key ───────────
      // Using the key the server sent keeps test/live modes in sync.
      await initStripe({
        publishableKey,
        urlScheme: "mynextvibe",
      });

      // ── Step 3: Configure the Payment Sheet ───────────────────────────────
      const { error: initError } = await initPaymentSheet({
        merchantDisplayName: "NextVibe",
        paymentIntentClientSecret,
        customerId,
        customerSessionClientSecret,
        returnURL: RETURN_URL,
        // Only instant-confirmation methods (cards, wallets). Bank debits that
        // settle over days would leave buyers in an uncertain state.
        allowsDelayedPaymentMethods: false,
      });

      if (initError) {
        return { outcome: "error", message: initError.message };
      }

      // ── Step 4: Present the sheet ─────────────────────────────────────────
      const { error: payError } = await presentPaymentSheet();

      if (payError) {
        if (payError.code === PaymentSheetError.Canceled) {
          // User dismissed the sheet — no error, back to the checkout screen.
          return { outcome: "cancelled" };
        }
        return { outcome: "error", message: payError.message };
      }

      // ── Step 5: Poll for ticket issuance ──────────────────────────────────
      // The sheet returning without an error means Stripe accepted the card,
      // but our backend issues tickets only after receiving Stripe's webhook.
      return await pollForTickets(purchaseId);
    } catch {
      return {
        outcome: "error",
        message: "Something went wrong. Please try again.",
      };
    } finally {
      setBusy(false);
    }
  }

  /**
   * Polls GET /v1/payments/verify/:purchaseId until a terminal status
   * (already_completed | failed) or MAX_ATTEMPTS pending responses.
   *
   * Polling rules:
   * - Network errors (null result / thrown) do NOT consume an attempt slot —
   *   the hook simply waits for the next tick and retries.
   * - Only "pending" status responses consume an attempt slot.
   * - On timeout the buyer HAS paid — return "processing", not an error.
   */
  async function pollForTickets(purchaseId: string): Promise<CheckoutOutcome> {
    let pendingCount = 0;

    while (pendingCount < MAX_ATTEMPTS) {
      try {
        const result = await fetchVerify(purchaseId, true /* preferCacheValue: false */);
        const status = result?.data?.data?.status;

        if (status === "already_completed") {
          return {
            outcome: "success",
            purchaseId,
            tickets: result.data!.data.tickets ?? [],
          };
        }

        if (status === "failed") {
          const reason =
            result.data?.data?.reason ?? "Payment failed. Please try again.";
          return { outcome: "error", message: reason };
        }

        if (status === "pending") {
          // Valid response — consume one attempt slot.
          pendingCount++;
        }
        // null / undefined status (unexpected shape) → treat as network error,
        // don't increment, just wait and retry.
      } catch {
        // Network error — do not increment pendingCount, just wait.
      }

      await sleep(POLL_INTERVAL_MS);
    }

    // Timed out. The payment was taken — do not show a failure message.
    // The user will see their tickets in "My Tickets" once the webhook fires.
    return { outcome: "processing", purchaseId };
  }

  return { pay, busy };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
