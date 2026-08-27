import { configureStore } from "@reduxjs/toolkit";
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
import authReducer from "./slices/authSlice";

export const store = configureStore({
    reducer: {
        auth: authReducer,
        [authApi.reducerPath]: authApi.reducer,
        [gamesApi.reducerPath]: gamesApi.reducer,
        [eventsApi.reducerPath]: eventsApi.reducer,
        [userApi.reducerPath]: userApi.reducer,
        [messagingApi.reducerPath]: messagingApi.reducer,
        [socialApi.reducerPath]: socialApi.reducer,
        [paymentApi.reducerPath]: paymentApi.reducer,
        [notificationApi.reducerPath]: notificationApi.reducer,
        [adminApi.reducerPath]: adminApi.reducer,
        [organizerPaymentApi.reducerPath]: organizerPaymentApi.reducer,
        [reminderApi.reducerPath]: reminderApi.reducer,
        [pledgeApi.reducerPath]: pledgeApi.reducer,
        [discoverApi.reducerPath]: discoverApi.reducer,
        [launchApi.reducerPath]: launchApi.reducer,
        [analyticsApi.reducerPath]: analyticsApi.reducer,
        [campaignApi.reducerPath]: campaignApi.reducer,
        [payoutApi.reducerPath]: payoutApi.reducer,
    },
    middleware: (getDefaultMiddleware) => {
        return getDefaultMiddleware().concat(
            authApi.middleware,
            gamesApi.middleware,
            eventsApi.middleware,
            userApi.middleware,
            messagingApi.middleware,
            socialApi.middleware,
            paymentApi.middleware,
            notificationApi.middleware,
            adminApi.middleware,
            organizerPaymentApi.middleware,
            reminderApi.middleware,
            pledgeApi.middleware,
            discoverApi.middleware,
            launchApi.middleware,
            analyticsApi.middleware,
            campaignApi.middleware,
            payoutApi.middleware,
        )
    }
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch