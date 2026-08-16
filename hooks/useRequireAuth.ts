"use client";

import { useSelector } from "react-redux";
import { RootState } from "@/app/provider/store";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import Cookies from "js-cookie";

/**
 * Returns a `requireAuth(extraParams?)` function to call before any auth-gated action.
 *
 * - Authenticated → returns true, does nothing.
 * - Unauthenticated → redirects to /auth/login?from=<current-url> and returns false.
 *
 * The `from` value encodes the full pathname + current search params so the
 * user lands back on the exact tab/state after login.
 *
 * You can pass `extraParams` (e.g. { session: "abc", round: "xyz" }) to merge
 * additional search params into the `from` URL — useful when the action is
 * triggered mid-game and you want to restore the exact game state after login.
 *
 * Usage:
 *   const requireAuth = useRequireAuth();
 *   const handleSubmit = () => {
 *     if (!requireAuth({ tab: "games", session: sessionId, round: roundId })) return;
 *     // perform action
 *   };
 */
export function useRequireAuth() {
  const isAuthenticated = useSelector(
    (state: RootState) => state.user.isAuthenticated
  );
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const requireAuth = useCallback(
    (extraParams?: Record<string, string>): boolean => {
      const hasToken = !!Cookies.get("accessToken");
      if (isAuthenticated || hasToken) return true;

      // Build the full from-URL: current path + existing search params + any extras
      const p = new URLSearchParams(searchParams.toString());
      if (extraParams) {
        Object.entries(extraParams).forEach(([k, v]) => {
          if (v) p.set(k, v);
        });
      }
      const qs = p.toString();
      const from = encodeURIComponent(pathname + (qs ? `?${qs}` : ""));
      router.push(`/auth/login?from=${from}`);
      return false;
    },
    [isAuthenticated, pathname, searchParams, router]
  );

  return requireAuth;
}
