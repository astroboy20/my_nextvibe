# Implementation Plan: Stripe Card Payments

## Overview

Add a native Stripe Payment Sheet path for non-NGN ticket events, running in parallel with the existing Bachs/Ercaspay flow. The implementation proceeds in dependency order: types + currency helper first, then the RTK Query API layer, then the core `useCardCheckout` hook, then the SDK provider/deep-link wiring, then TicketModal integration, and finally logout cleanup and app.json config.

All secrets (`paymentIntentClientSecret`, `customerSessionClientSecret`) must never be stored in persistent storage or logged.

## Tasks

- [x] 1. Add currency routing helper and shared Stripe types
  - [x] 1.1 Create `lib/stripe.ts` with `STRIPE_CURRENCIES`, `StripeCurrency`, and `isStripeCurrency`
    - Export `STRIPE_CURRENCIES = ['USD', 'GBP', 'EUR', 'CAD'] as const`
    - Export `type StripeCurrency = typeof STRIPE_CURRENCIES[number]`
    - Export pure function `isStripeCurrency(currency?: string | null): boolean` — returns `true` iff currency is in `STRIPE_CURRENCIES`; `undefined`/`null`/`'NGN'`/arbitrary strings return `false`
    - Also export all shared TypeScript interfaces from the design: `InitiateStripePaymentSheetInput`, `StripePaymentSheetResponse` (note: uses `customerSessionClientSecret`, NOT `customerEphemeralKeySecret`), `VerifyPurchaseStatus`, `VerifyPurchaseResponse`, `TicketIssuance`, `CheckoutOutcome`
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

  - [ ]* 1.2 Write property test for `isStripeCurrency` (Property 1)
    - **Property 1: Currency Routing is a Total Partition**
    - Use `fast-check` with `fc.oneof(fc.constantFrom('USD','GBP','EUR','CAD','NGN','JPY',''), fc.string())` to assert: returns `true` iff currency is exactly one of the four Stripe currencies
    - Tag comment: `// Feature: stripe-card-payments, Property 1: Currency routing is a total partition`
    - Also add example-based table tests for each of `USD`, `GBP`, `EUR`, `CAD`, `NGN`, `undefined`, `null`, `''`, `'usd'` (lowercase), arbitrary strings
    - Minimum 100 fast-check iterations
    - _Requirements: 1.1, 1.2, 1.3_

- [x] 2. Add `formatPrice` CAD support in `components/event/Rsvp/helper.ts`
  - Extend the `sym` map in `formatPrice` to include `CAD: 'CA$'`
  - No other changes to this file
  - _Requirements: 8.5_

  - [ ]* 2.1 Write unit tests for `formatPrice` (Property 10)
    - **Property 10: Price Formatting Preserves Currency Symbol**
    - Example-based tests for `USD`, `GBP`, `EUR`, `CAD`, `NGN`, zero price → `"Free"`, non-integer prices
    - Use `fast-check` with `fc.float({ min: 0.01 })` paired with each supported currency to assert the output contains a recognisable symbol/code prefix and the numeric value
    - Tag comment: `// Feature: stripe-card-payments, Property 10: Price formatting preserves currency symbol`
    - _Requirements: 8.5_

- [x] 3. Add Stripe RTK Query endpoints to `store/api/paymentApi.ts`
  - Import `InitiateStripePaymentSheetInput`, `StripePaymentSheetResponse`, `VerifyPurchaseResponse` from `lib/stripe`
  - Add `initiateStripePaymentSheet` mutation endpoint:
    - Type: `builder.mutation<{ success: boolean; data: StripePaymentSheetResponse }, InitiateStripePaymentSheetInput>`
    - POST to `/v1/payments/stripe/payment-sheet` with request body (no price field)
  - Add `verifyStripePurchase` query endpoint:
    - Type: `builder.query<{ success: boolean; data: VerifyPurchaseResponse }, string>`
    - GET `/v1/payments/verify/${purchaseId}`
  - Export `useInitiateStripePaymentSheetMutation` and `useLazyVerifyStripePurchaseQuery` from the slice
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

  - [ ]* 3.1 Write unit tests for the new `paymentApi` endpoint query builders
    - Verify `initiateStripePaymentSheet` produces correct `url`, `method: 'POST'`, and body shape (with `eventId` + `ticketTiers`, without `price`)
    - Verify `verifyStripePurchase` produces the correct GET URL for a given `purchaseId`
    - _Requirements: 9.1, 9.2, 9.5_

- [x] 4. Implement `useCardCheckout` hook in `hooks/useCardCheckout.ts`
  - Import `useInitiateStripePaymentSheetMutation` and `useLazyVerifyStripePurchaseQuery` from `store/api/paymentApi`
  - Import types from `lib/stripe`
  - Import `initStripe`, `initPaymentSheet`, `presentPaymentSheet` from `@stripe/stripe-react-native`
  - Constants at the top of the file:
    - `RETURN_URL = 'mynextvibe://stripe-redirect'`
    - `MAX_ATTEMPTS = 15`
    - `POLL_INTERVAL_MS = 2000`
  - Implement `pay(input: CardCheckoutInput): Promise<CheckoutOutcome>` following the state-machine in the design:
    1. Set `busy = true`
    2. Call `initiateStripePaymentSheet` — on error return `{ outcome: 'error', message }`; do not retry
    3. Call `initStripe({ publishableKey })` from response
    4. Call `initPaymentSheet` with `paymentIntentClientSecret`, `customerSessionClientSecret`, `customerId`, `merchantDisplayName`, `returnURL: RETURN_URL`, `allowsDelayedPaymentMethods: false`
    5. Call `presentPaymentSheet()` — on `Canceled` code return `{ outcome: 'cancelled' }`; on other error return `{ outcome: 'error', message: error.message }`
    6. Poll `verifyStripePurchase` via the lazy query's `fetch`/`initiate` up to `MAX_ATTEMPTS` times with `POLL_INTERVAL_MS` delay between attempts. Network errors (null result / thrown) do NOT increment the attempt counter. `"pending"` increments. `"already_completed"` → return success. `"failed"` → return error with `reason`. After `MAX_ATTEMPTS` pending responses → return `{ outcome: 'processing', purchaseId }`
  - Secrets must NOT be stored in state or logged
  - Always reset `busy = false` in a `finally` block
  - Return `UseCardCheckoutResult: { pay, busy }`
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 3.1, 3.2, 3.3, 3.4, 4.1, 4.2, 4.3, 4.4, 4.5_

  - [ ]* 4.1 Write property test for SDK initialisation with server key (Property 2)
    - **Property 2: Stripe SDK Is Initialised with Server-Provided Key**
    - Use `fc.record({ publishableKey: fc.string({ minLength: 1 }), paymentIntentClientSecret: fc.string({ minLength: 1 }), customerSessionClientSecret: fc.string({ minLength: 1 }), customerId: fc.string({ minLength: 1 }), purchaseId: fc.string({ minLength: 1 }), totalAmount: fc.float({ min: 0.01 }), currency: fc.constantFrom('USD','GBP','EUR','CAD') })` to assert that `initStripe` is called with exactly `{ publishableKey }` from the response and `initPaymentSheet` is called with `returnURL === 'mynextvibe://stripe-redirect'` and `allowsDelayedPaymentMethods === false`
    - Tag comment: `// Feature: stripe-card-payments, Property 2: SDK initialised with server-provided key`
    - _Requirements: 2.2, 2.3, 5.2_

  - [ ]* 4.2 Write property test for API failure preventing sheet presentation (Property 3)
    - **Property 3: API Failure Prevents Sheet Presentation**
    - Use `fc.oneof(fc.constant('networkError'), fc.integer({ min: 400, max: 599 }))` to simulate various error scenarios; assert `presentPaymentSheet` is never called and outcome is `{ outcome: 'error', message }` with non-empty `message`
    - Tag comment: `// Feature: stripe-card-payments, Property 3: API failure prevents sheet presentation`
    - _Requirements: 2.6, 2.7_

  - [ ]* 4.3 Write property test for non-canceled payment sheet error (Property 4)
    - **Property 4: Non-Canceled Payment Sheet Error Sets Error State**
    - Use `fc.constantFrom(...allStripeErrorCodes).filter(c => c !== 'Canceled')` to assert outcome is `{ outcome: 'error', message }` containing the error description
    - Tag comment: `// Feature: stripe-card-payments, Property 4: Non-canceled error sets error state`
    - _Requirements: 3.4_

  - [ ]* 4.4 Write property test for terminal poll status producing correct outcome (Property 5)
    - **Property 5: Terminal Poll Status Produces Correct Outcome**
    - Use `fc.integer({ min: 1, max: 15 })` for the attempt index at which terminal status arrives, paired with `fc.constantFrom('already_completed', 'failed')` to assert correct `CheckoutOutcome` for each terminal case
    - Tag comment: `// Feature: stripe-card-payments, Property 5: Terminal poll status produces correct outcome`
    - _Requirements: 4.2, 4.3_

  - [ ]* 4.5 Write property test for polling timeout (Property 6)
    - **Property 6: Poll Timeout Produces Processing Outcome**
    - Use `fc.string({ minLength: 1 })` for `purchaseId`; fix all 15 poll responses as `"pending"`; assert outcome is `{ outcome: 'processing', purchaseId }` with the same `purchaseId` returned by the Payment Sheet API
    - Tag comment: `// Feature: stripe-card-payments, Property 6: Poll timeout produces processing outcome`
    - _Requirements: 4.4_

  - [ ]* 4.6 Write property test for network errors continuing the poll loop (Property 7)
    - **Property 7: Network Errors During Polling Do Not Terminate the Loop**
    - Use `fc.integer({ min: 1, max: 14 })` to pick an attempt where a network error occurs; assert the hook continues polling and does not return a terminal error outcome due to that error alone
    - Tag comment: `// Feature: stripe-card-payments, Property 7: Network errors continue polling`
    - _Requirements: 4.5_

  - [ ]* 4.7 Write example-based unit tests for `useCardCheckout` outcome branches
    - API failure → `{ outcome: 'error' }`
    - `Canceled` sheet → `{ outcome: 'cancelled' }`, Verify_API never called
    - Non-canceled sheet error → `{ outcome: 'error', message }`
    - `already_completed` on first poll → `{ outcome: 'success', purchaseId, tickets }`
    - `failed` on third poll → `{ outcome: 'error', message }`
    - All 15 polls return `pending` → `{ outcome: 'processing', purchaseId }`
    - Network error on attempt 5, then `already_completed` on attempt 6 → `{ outcome: 'success' }`
    - _Requirements: 2.6, 3.2, 3.3, 3.4, 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 5. Checkpoint — Core hook and API layer complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Create `StripeDeepLinkHandler` component in `components/stripe/StripeDeepLinkHandler.tsx`
  - Side-effect-only component (renders `null`)
  - On mount, call `handleURLCallback` with the initial URL via `Linking.getInitialURL()` (use Expo Linking API from `expo-linking` per Expo v56 docs)
  - Subscribe to `Linking.addEventListener('url', ...)` to forward all subsequent deep links to `handleURLCallback` from `@stripe/stripe-react-native`
  - Unsubscribe on unmount
  - Handles any `mynextvibe://` URL — the Stripe SDK ignores URLs it doesn't own
  - _Requirements: 5.3_

  - [ ]* 6.1 Write unit tests for `StripeDeepLinkHandler` (Property 8)
    - **Property 8: Deep Link URLs Are Forwarded to the Stripe SDK**
    - Mock `expo-linking` and `handleURLCallback`; use `fc.string()` appended to `'mynextvibe://stripe-redirect'` to assert `handleURLCallback` is called with the exact URL for any incoming link
    - Tag comment: `// Feature: stripe-card-payments, Property 8: Deep link URLs forwarded to Stripe SDK`
    - _Requirements: 5.3_

- [x] 7. Add `StripeProvider` and `StripeDeepLinkHandler` to `app/_layout.tsx`
  - Import `StripeProvider` from `@stripe/stripe-react-native`
  - Import `StripeDeepLinkHandler` from `components/stripe/StripeDeepLinkHandler`
  - In `RootLayout`, wrap `RootLayoutInner` with `<StripeProvider publishableKey="" urlScheme="mynextvibe">`
  - Mount `<StripeDeepLinkHandler />` as a sibling of `<App />` inside the provider (placed inside `StripeProvider` so `handleURLCallback` has SDK context)
  - _Requirements: 6.1, 6.2, 6.3_

  - [ ]* 7.1 Write integration/render test for `StripeProvider` in app root
    - Assert the app root renders with `StripeProvider` as an ancestor, with `publishableKey=""` and `urlScheme="mynextvibe"`
    - _Requirements: 6.1, 6.3_

- [x] 8. Add Stripe logout cleanup to `app/_layout.tsx`
  - Inside the `App` component (or extracted as `useLogoutStripeCleanup`), add a `useRef` to track previous `isAuthenticated` value
  - In a `useEffect` watching `isAuthenticated`: when transitioning from `true` → `false`, call `resetPaymentSheetCustomer()` from `@stripe/stripe-react-native` before the navigation reset driven by `useAuthRouting`
  - This guarantees `resetPaymentSheetCustomer()` fires prior to `router.replace('/(auth)/login')`
  - _Requirements: 7.1, 7.2_

  - [ ]* 8.1 Write integration test for logout Stripe cleanup
    - Mock `resetPaymentSheetCustomer`; dispatch `clearAuth` action; assert `resetPaymentSheetCustomer` was called before any navigation reset
    - _Requirements: 7.1, 7.2_

- [x] 9. Integrate `useCardCheckout` into `components/event/Rsvp/TicketModal.tsx`
  - Import `isStripeCurrency` from `lib/stripe`
  - Import `useCardCheckout` from `hooks/useCardCheckout`
  - Call `const { pay, busy } = useCardCheckout()` unconditionally at the top of the component
  - Update `confirmDisabled` to `(!noTickets && !selected) || isPurchasing || busy`
  - In `handleConfirm`, after the `selected.price === 0` early-return, branch on `isStripeCurrency(selected.currency)`:
    - **Stripe path**: call `const outcome = await pay({ eventId, tierId: selected.id, quantity: qty })`; handle each `CheckoutOutcome`:
      - `success` → `handleDismiss()` + `router.push('/purchase-confirmation?purchaseId=' + outcome.purchaseId)`
      - `cancelled` → (silent, no-op)
      - `error` → `Toast.show({ type: 'error', text1: 'Payment failed', text2: outcome.message })`
      - `processing` → `Toast.show({ type: 'info', text1: 'Payment processing', text2: 'Check your purchase history for confirmation.' })`
    - **Bachs path**: existing `initiatePurchase` flow unchanged
  - Update footer payment note: show `"Secured by Stripe"` note (styled similarly to the existing Ercaspay note, using a blue tint) when `isStripeCurrency(selected?.currency)` is true; existing Ercaspay note otherwise
  - Update `confirmLabel()`: when Stripe path, return `"Pay with Card"` when a ticket is selected and paid; label logic unchanged for Bachs path
  - Update `confirmIcon()`: when Stripe path and paid ticket selected, use `"card-outline"`; unchanged otherwise
  - Update loading indicator: show `"Processing…"` for both `isPurchasing` and `busy` states
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 8.1, 8.2, 8.3, 8.4, 8.5_

  - [ ]* 9.1 Write property test for busy state disabling confirm button (Property 9)
    - **Property 9: Busy State Prevents Re-Entry**
    - Inject the hook in any `busy === true` state; assert the confirm button's `disabled` prop is `true`
    - Tag comment: `// Feature: stripe-card-payments, Property 9: Busy state prevents re-entry`
    - _Requirements: 8.1, 8.2_

- [x] 10. Add `@stripe/stripe-react-native` plugin to `app.json`
  - Add `"@stripe/stripe-react-native"` to the `expo.plugins` array in `app.json`
  - Verify `"scheme": "mynextvibe"` is already present under `expo` and leave it unchanged
  - No other changes to `app.json`
  - _Requirements: 5.1, 5.4_

  - [ ]* 10.1 Write static assertion test for `app.json`
    - Assert `app.json` contains `"scheme": "mynextvibe"`
    - Assert `app.json` plugins array includes `"@stripe/stripe-react-native"`
    - _Requirements: 5.1, 5.4_

- [x] 11. Final checkpoint — Full integration complete
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Tasks 1–4 (currency helper, RTK endpoints, `useCardCheckout`) are the core priority and should be executed first
- The correct field name is `customerSessionClientSecret` throughout — NOT `customerEphemeralKeySecret`
- `RETURN_URL = 'mynextvibe://stripe-redirect'` is the deep link constant used in `initPaymentSheet` and `StripeDeepLinkHandler`
- Polling: 15 attempts × 2 s; network errors do not consume an attempt slot — only `"pending"` responses do
- `verifyStripePurchase` is used imperatively via `useLazyVerifyStripePurchaseQuery`, not as a reactive subscription
- `allowsDelayedPaymentMethods: false` must be set in `initPaymentSheet`
- Secrets must never appear in component state, Redux store, or logs
- The Bachs/Ercaspay path in `TicketModal` is left entirely unchanged
- Before writing any SDK integration code, check https://docs.expo.dev/versions/v56.0.0/ for Expo v56-specific Linking API behaviour
