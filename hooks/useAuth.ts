/**
 * useAuth
 *
 * Convenience hook for consuming auth state from any component.
 *
 * Usage:
 *   const { user, isAuthenticated, isBootstrapped, logout } = useAuth();
 */

import { analyticsApi } from '@/store/api/analyticsApi';
import { useLogoutMutation } from '@/store/api/authApi';
import { eventsApi } from '@/store/api/eventsApi';
import { gamesApi } from '@/store/api/gamesApi';
import { paymentApi } from '@/store/api/paymentApi';
import { reminderApi } from '@/store/api/reminderApi';
import { socialApi } from '@/store/api/socialApi';
import { tagsApi } from '@/store/api/tagsApi';
import { ticketsApi } from '@/store/api/ticketsApi';
import { usersApi } from '@/store/api/usersApi';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { clearAuth } from '@/store/slices/authSlice';
import { useRouter } from 'expo-router';

export function useAuth() {
  const dispatch = useAppDispatch();
  const router   = useRouter();

  const user            = useAppSelector((s) => s.auth.user);
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated);
  const isBootstrapped  = useAppSelector((s) => s.auth.isBootstrapped);

  const [logoutMutation, { isLoading: isLoggingOut }] = useLogoutMutation();

  function resetAllCaches() {
    // Flush every RTK Query cache so no stale data leaks to the next user session
    dispatch(usersApi.util.resetApiState());
    dispatch(eventsApi.util.resetApiState());
    dispatch(socialApi.util.resetApiState());
    dispatch(gamesApi.util.resetApiState());
    dispatch(reminderApi.util.resetApiState());
    dispatch(tagsApi.util.resetApiState());
    dispatch(ticketsApi.util.resetApiState());
    dispatch(analyticsApi.util.resetApiState());
    dispatch(paymentApi.util.resetApiState());
  }

  async function logout() {
    try {
      await logoutMutation().unwrap();
    } catch {
      // Even if the server call fails, clear local state
      dispatch(clearAuth());
    }
    // clearAuth is also called inside the mutation's queryFn on success,
    // but dispatch again here is safe (idempotent) and ensures router fires
    dispatch(clearAuth());
    resetAllCaches();
    router.replace('/(auth)/login');
  }

  return {
    /** Current authenticated user — null when logged out */
    user,
    isAuthenticated,
    /** True once bootstrap has finished — use to gate the splash screen */
    isBootstrapped,
    isLoggingOut,
    logout,
  };
}
