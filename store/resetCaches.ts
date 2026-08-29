/**
 * resetAllApiCaches
 *
 * Wipes every RTK Query slice immediately.
 * Accepts the store directly to avoid circular imports — authApi cannot import
 * this file because resetCaches imports authApi (for authApi.util.resetApiState
 * would create: authApi → resetCaches → authApi).
 *
 * Instead callers pass the store.dispatch or the RTK dispatch handle.
 * authApi is NOT reset here — its "User" tag becomes stale automatically once
 * clearAuth() removes isAuthenticated, and the fresh /v1/users/me is fetched
 * on the next authenticated render.
 */

import { adminApi } from "./api/admin";
import { analyticsApi } from "./api/analyticsApi";
import { campaignApi } from "./api/campaignApi";
import { discoverApi } from "./api/discoverApi";
import { eventsApi } from "./api/eventApi";
import { gamesApi } from "./api/gameApi";
import { launchApi } from "./api/launchApi";
import { messagingApi } from "./api/messagingApi";
import { notificationApi } from "./api/notificationApi";
import { organizerPaymentApi } from "./api/organizerPaymentApi";
import { paymentApi } from "./api/paymentApi";
import { payoutApi } from "./api/payoutApi";
import { pledgeApi } from "./api/pledgeApi";
import { reminderApi } from "./api/reminderApi";
import { socialApi } from "./api/socialApi";
import { userApi } from "./api/userApi";

// Accept any dispatch — store.dispatch, useAppDispatch(), or RTK's dispatch param
type DispatchFn = (action: any) => any;

export function resetAllApiCaches(dispatch: DispatchFn): void {
  dispatch(eventsApi.util.resetApiState());
  dispatch(gamesApi.util.resetApiState());
  dispatch(userApi.util.resetApiState());
  dispatch(messagingApi.util.resetApiState());
  dispatch(socialApi.util.resetApiState());
  dispatch(paymentApi.util.resetApiState());
  dispatch(notificationApi.util.resetApiState());
  dispatch(adminApi.util.resetApiState());
  dispatch(organizerPaymentApi.util.resetApiState());
  dispatch(reminderApi.util.resetApiState());
  dispatch(pledgeApi.util.resetApiState());
  dispatch(discoverApi.util.resetApiState());
  dispatch(launchApi.util.resetApiState());
  dispatch(analyticsApi.util.resetApiState());
  dispatch(campaignApi.util.resetApiState());
  dispatch(payoutApi.util.resetApiState());
}
