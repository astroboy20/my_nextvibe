import { useFocusEffect } from 'expo-router';
import { useCallback, useRef } from 'react';

/**
 * useRefetchOnFocus
 *
 * Refetches data whenever the screen comes back into focus.
 * Skips the very first focus (initial mount) so it never
 * doubles up with RTK Query's own on-mount fetch.
 *
 * Pass any number of RTK Query `refetch` functions:
 *   useRefetchOnFocus(refetch);
 *   useRefetchOnFocus(refetchA, refetchB);
 *
 * Safe to call with skipped queries — RTK throws if refetch() is called
 * before the query has started; the try/catch swallows that gracefully.
 */
export function useRefetchOnFocus(...refetchFns: Array<() => void>): void {
  // Keep a ref to the latest fns so the focus callback never goes stale
  const fnsRef = useRef(refetchFns);
  fnsRef.current = refetchFns;

  const mountedRef = useRef(false);

  useFocusEffect(
    useCallback(() => {
      if (!mountedRef.current) {
        mountedRef.current = true;
        return;
      }
      fnsRef.current.forEach((fn) => {
        try {
          fn();
        } catch {
          // RTK Query throws "Cannot refetch a query that has not been started yet"
          // when a query is skipped. Swallow it — the query simply won't refetch.
        }
      });
    }, []) // empty deps — fnsRef.current always has the latest fns
  );
}
