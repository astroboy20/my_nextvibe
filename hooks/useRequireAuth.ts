import type { RootState } from "@/store/store";
import { useRouter } from "expo-router";
import { useCallback } from "react";
import { useSelector } from "react-redux";

/**
 * Returns a `requireAuth()` function to call before any auth-gated action.
 *
 * - Authenticated  → returns true, does nothing.
 * - Unauthenticated → navigates to /(auth)/login and returns false.
 *
 * Usage:
 *   const requireAuth = useRequireAuth();
 *
 *   const handleSubmit = () => {
 *     if (!requireAuth()) return;
 *     // perform auth-gated action
 *   };
 */
export function useRequireAuth() {
  const isAuthenticated = useSelector(
    (state: RootState) => state.auth.isAuthenticated
  );
  const router = useRouter();

  const requireAuth = useCallback((): boolean => {
    if (isAuthenticated) return true;
    router.push("/(auth)/login");
    return false;
  }, [isAuthenticated, router]);

  return requireAuth;
}
