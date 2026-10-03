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
