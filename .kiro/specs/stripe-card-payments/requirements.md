# Requirements Document

## Introduction

This feature replaces the existing Bachs/Ercaspay payment flow with Stripe's Payment Sheet for events priced in USD, GBP, EUR, or CAD. The app currently uses a single checkout path for all paid events (POST `/v1/payments/purchase` → redirect to a hosted `checkoutUrl`). The new feature introduces a parallel native payment path using `@stripe/stripe-react-native`'s Payment Sheet for non-NGN events, while keeping the Bachs checkout intact for NGN events. The publishable key is fetched from the server at payment time, never hardcoded. Ticket issuance is confirmed by polling a verification endpoint — never inferred from `presentPaymentSheet()` success alone.

---

## Glossary

- **Stripe_Payment_Sheet**: The native bottom-sheet UI provided by `@stripe/stripe-react-native` that collects and processes card payment details.
- **Payment_Sheet_API**: The backend endpoint `POST /v1/payments/stripe/payment-sheet` that creates a Stripe PaymentIntent and returns the secrets and key needed to initialise the Payment Sheet.
- **Verify_API**: The backend endpoint `GET /v1/payments/verify/:purchaseId` that reports the ticket-issuance outcome after a Stripe payment attempt.
- **Bachs_Checkout**: The existing payment flow using `POST /v1/payments/purchase` that returns a `checkoutUrl` and opens it in `expo-web-browser`. Used exclusively for NGN events.
- **Settlement_Currency**: The `settlementCurrency` field on an event's ticket tier returned by `GET /v1/events/:id/tickets`. Determines which payment path is used.
- **Ticket_Tier**: A purchasable ticket type belonging to an event, identified by `tierId` and `quantity`.
- **Purchase_ID**: An opaque server-assigned identifier returned by the Payment_Sheet_API, used to poll the Verify_API for ticket-issuance status.
- **Client_Secret**: A Stripe-issued short-lived secret returned by the Payment_Sheet_API. Must never be stored in persistent storage or included in logs.
- **useCardCheckout**: The React hook that encapsulates the full Stripe payment lifecycle: calling Payment_Sheet_API, initialising the SDK, presenting the sheet, and polling Verify_API.
- **Deep_Link_Scheme**: The custom URL scheme `mynextvibe://` registered in `app.json` that handles 3DS bank-authentication redirects back into the app.
- **Poll_Interval**: The 2-second delay between consecutive calls to Verify_API during status polling.
- **Poll_Timeout**: The maximum duration of 30 seconds the app will poll Verify_API before treating the purchase as inconclusive.

---

## Requirements

### Requirement 1: Currency-Based Payment Path Routing

**User Story:** As an event attendee, I want the app to automatically select the right payment provider based on the event's currency, so that I always pay through the correct and supported channel.

#### Acceptance Criteria

1. WHEN a user opens the ticket selection modal for an event whose ticket tier has `settlementCurrency` in `['USD', 'GBP', 'EUR', 'CAD']`, THE Ticket_Modal SHALL present a "Pay with Card" button that triggers the Stripe Payment Sheet flow.
2. WHEN a user opens the ticket selection modal for an event whose ticket tier has `settlementCurrency` of `'NGN'` or any other value not in `['USD', 'GBP', 'EUR', 'CAD']`, THE Ticket_Modal SHALL present the existing Bachs checkout flow unchanged.
3. WHEN a ticket tier has no `settlementCurrency` field, THE Ticket_Modal SHALL treat it as `'NGN'` and route to the Bachs checkout flow.
4. THE Ticket_Modal SHALL determine the payment path from the `settlementCurrency` of the selected ticket tier, not from any other event-level field.

---

### Requirement 2: Payment Sheet Initialisation

**User Story:** As an event attendee, I want the payment sheet to be initialised with fresh credentials from the server, so that my card details are handled securely by Stripe.

#### Acceptance Criteria

1. WHEN a user confirms a Stripe-eligible ticket selection, THE useCardCheckout Hook SHALL POST to `/v1/payments/stripe/payment-sheet` with `{ eventId, ticketTiers: [{ tierId, quantity }] }` and no price field.
2. WHEN the Payment_Sheet_API responds successfully, THE useCardCheckout Hook SHALL call `initStripe({ publishableKey })` using the `publishableKey` returned in the response before presenting the sheet.
3. WHEN the Payment_Sheet_API responds successfully, THE useCardCheckout Hook SHALL call `initPaymentSheet` with the `paymentIntentClientSecret`, `customerEphemeralKeySecret`, and `customerId` values returned by the server, setting `merchantDisplayName` and `returnURL` to `mynextvibe://stripe-redirect`.
4. THE useCardCheckout Hook SHALL NOT send the ticket price to the Payment_Sheet_API.
5. THE useCardCheckout Hook SHALL NOT store the `paymentIntentClientSecret` or `customerEphemeralKeySecret` in persistent storage or include them in application logs.
6. IF the Payment_Sheet_API call fails, THEN THE useCardCheckout Hook SHALL surface a user-visible error message and SHALL NOT proceed to present the Payment Sheet.
7. THE useCardCheckout Hook SHALL NOT automatically retry the Payment_Sheet_API call on failure.

---

### Requirement 3: Payment Sheet Presentation

**User Story:** As an event attendee, I want a native card payment sheet to appear after I confirm my ticket selection, so that I can enter my payment details in a secure, familiar UI.

#### Acceptance Criteria

1. WHEN `initPaymentSheet` completes without error, THE useCardCheckout Hook SHALL call `presentPaymentSheet` to display the Stripe Payment Sheet to the user.
2. WHEN `presentPaymentSheet` returns without an error code, THE useCardCheckout Hook SHALL proceed to the verification polling step and SHALL NOT treat the sheet success as confirmation that tickets have been issued.
3. WHEN `presentPaymentSheet` returns with `Canceled` error code, THE useCardCheckout Hook SHALL dismiss the sheet silently without showing an error to the user and SHALL NOT call the Verify_API.
4. WHEN `presentPaymentSheet` returns with any error code other than `Canceled`, THE useCardCheckout Hook SHALL display a user-visible error message containing the error description.

---

### Requirement 4: Purchase Verification Polling

**User Story:** As an event attendee, I want the app to confirm my ticket issuance from the server before showing me a success screen, so that I am never shown a false confirmation.

#### Acceptance Criteria

1. WHEN `presentPaymentSheet` returns without a cancellation or error, THE useCardCheckout Hook SHALL begin polling `GET /v1/payments/verify/:purchaseId` at a Poll_Interval of 2 seconds.
2. WHEN the Verify_API returns a status of `"already_completed"`, THE useCardCheckout Hook SHALL stop polling and notify the caller of a successful ticket issuance.
3. WHEN the Verify_API returns a status of `"failed"`, THE useCardCheckout Hook SHALL stop polling and notify the caller of a failed ticket issuance with the server-supplied reason.
4. WHEN polling has continued for longer than the Poll_Timeout of 30 seconds without a terminal status, THE useCardCheckout Hook SHALL stop polling and notify the caller that the status is inconclusive, instructing the user to check their purchase history.
5. IF a Verify_API request fails with a network error during polling, THEN THE useCardCheckout Hook SHALL retry the request on the next Poll_Interval tick rather than stopping immediately.

---

### Requirement 5: Deep Link Handling for 3DS Authentication

**User Story:** As an event attendee paying with a card that requires 3D Secure authentication, I want to be returned to the app automatically after bank authentication, so that my payment flow is not broken.

#### Acceptance Criteria

1. THE App SHALL register the `mynextvibe` URL scheme in `app.json` under `expo.scheme` to handle deep link callbacks. *(Note: `app.json` already has `"scheme": "mynextvibe"` — this must be preserved and not modified.)*
2. THE Stripe_Payment_Sheet SHALL be initialised with `returnURL` set to `mynextvibe://stripe-redirect` so that Stripe redirects back to the app after 3DS authentication.
3. WHEN the app receives a `mynextvibe://stripe-redirect` deep link, THE App SHALL pass the URL to the Stripe SDK to resume the interrupted payment flow.
4. THE `@stripe/stripe-react-native` plugin SHALL be added to the Expo plugin list in `app.json` so that the Stripe SDK can register its native deep link handlers.

---

### Requirement 6: Stripe SDK Provider Setup

**User Story:** As a developer, I want the Stripe SDK to be available throughout the app without hardcoding credentials, so that all screens can use the payment features safely.

#### Acceptance Criteria

1. THE App SHALL wrap its root component with a `StripeProvider` from `@stripe/stripe-react-native` configured with a placeholder `publishableKey` (e.g. empty string), because the real key is fetched per-payment from the Payment_Sheet_API and supplied via `initStripe` at runtime.
2. THE App SHALL NOT hardcode a live or test Stripe publishable key in source code or in any environment variable committed to the repository.
3. THE StripeProvider SHALL set `urlScheme` to `"mynextvibe"` to enable deep link handling within the Stripe SDK.

---

### Requirement 7: Session Cleanup on Logout

**User Story:** As an event attendee, I want any saved card information in the Stripe Payment Sheet to be cleared when I log out, so that my payment details are not accessible to the next person who uses the device.

#### Acceptance Criteria

1. WHEN the `clearAuth` Redux action is dispatched (indicating a user logout), THE App SHALL call `resetPaymentSheetCustomer()` from `@stripe/stripe-react-native` to clear any cached Stripe customer state.
2. THE `resetPaymentSheetCustomer()` call SHALL occur before the navigation state is reset to the unauthenticated screen.

---

### Requirement 8: Payment State and Loading Feedback

**User Story:** As an event attendee, I want the UI to clearly communicate what is happening during each stage of the payment process, so that I am never left uncertain about the state of my transaction.

#### Acceptance Criteria

1. WHILE the useCardCheckout Hook is calling the Payment_Sheet_API, THE Ticket_Modal SHALL display a loading indicator and disable the payment button to prevent duplicate submissions.
2. WHILE the useCardCheckout Hook is polling the Verify_API, THE App SHALL display a progress indicator with a message such as "Confirming your tickets…" and prevent the user from re-initiating the purchase.
3. WHEN ticket issuance is confirmed by the Verify_API, THE App SHALL navigate to a purchase confirmation screen displaying the `purchaseId`.
4. WHEN the Verify_API returns a `"failed"` status or polling times out, THE App SHALL display a clear error message distinguishing a payment failure from a timeout and providing next steps (e.g. "Check your purchase history").
5. THE Ticket_Modal SHALL display the ticket price in the event's settlement currency (e.g. "USD 25.00") rather than converting or reformatting it to the device locale.

---

### Requirement 9: API Layer — Stripe Endpoints

**User Story:** As a developer, I want the Stripe payment endpoints to be part of the existing RTK Query payment API slice, so that the payment flow benefits from consistent error handling and type safety.

#### Acceptance Criteria

1. THE `paymentApi` RTK Query slice SHALL expose a `initiateStripePaymentSheet` mutation that POSTs to `/v1/payments/stripe/payment-sheet` with `{ eventId: string, ticketTiers: { tierId: string; quantity: number }[] }`.
2. THE `paymentApi` RTK Query slice SHALL expose a `verifyStripePurchase` query that GETs `/v1/payments/verify/:purchaseId` and returns the purchase status.
3. THE `initiateStripePaymentSheet` mutation response type SHALL include `publishableKey`, `paymentIntentClientSecret`, `customerEphemeralKeySecret`, `customerId`, and `purchaseId` fields.
4. THE `verifyStripePurchase` query response type SHALL include a `status` field typed as `"pending" | "already_completed" | "failed"`.
5. THE `paymentApi` slice SHALL NOT include a price field in the `initiateStripePaymentSheet` mutation input type.
