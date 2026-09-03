/**
 * resetAllApiCaches
 *
 * Wipes every RTK Query cache immediately, including authApi.
 * 
 * Called on:
 *  - Logout: Clear all previous user's data
 *  - Login/Register: Clear all data BEFORE setting new user to prevent flash of old data
 * 
 * Accepts the store dispatch to avoid circular imports.
 */

import { adminApi } from "./api/admin";
import { analyticsApi } from "./api/analyticsApi";
import { authApi } from "./api/authApi";
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
  // Reset authApi FIRST to clear user queries immediately
  dispatch(authApi.util.resetApiState());
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
