/**
 * StripeDeepLinkHandler
 *
 * A side-effect-only component that bridges the Expo deep-link system with
 * the Stripe React Native SDK. It must be mounted _inside_ <StripeProvider>
 * so that `handleURLCallback` has access to the Stripe SDK context.
 *
 * Responsibilities:
 * 1. On mount, forward the initial launch URL (if any) to the Stripe SDK so
 *    that 3DS redirects work when the app is launched cold from a deep link.
 * 2. Subscribe to subsequent URL events and forward each URL to the SDK.
 * 3. On unmount, remove the subscription to avoid memory leaks.
 *
 * The Stripe SDK internally filters URLs — only those that belong to a Stripe
 * 3DS flow are acted upon. All other `mynextvibe://` URLs are silently ignored.
 *
 * Requirements: 5.3
 */

import { handleURLCallback } from "@stripe/stripe-react-native";
import * as Linking from "expo-linking";
import { useEffect } from "react";

export function StripeDeepLinkHandler(): null {
  useEffect(() => {
    // ── Handle launch URL (app opened from a deep link while closed) ──────
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleURLCallback(url).catch(() => {
          // Stripe silently ignores unrecognised URLs — this path is a
          // safety net for unexpected SDK-level errors.
        });
      }
    });

    // ── Subscribe to subsequent deep links (app in foreground/background) ──
    const subscription = Linking.addEventListener("url", ({ url }) => {
      handleURLCallback(url).catch(() => {
        // Same as above: swallow errors from non-Stripe URLs.
      });
    });

    // ── Cleanup: remove listener on unmount ───────────────────────────────
    return () => {
      subscription.remove();
    };
  }, []); // Empty deps — register once on mount, clean up on unmount.

  // This component is side-effect only; it renders nothing.
  return null;
}
