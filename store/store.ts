import { configureStore } from '@reduxjs/toolkit';
import { authApi } from './api/authApi';
import { eventsApi } from './api/eventsApi';
import { socialApi } from './api/socialApi';
import { usersApi } from './api/usersApi';
import authReducer from './slices/authSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    [authApi.reducerPath]:   authApi.reducer,
    [usersApi.reducerPath]:  usersApi.reducer,
    [eventsApi.reducerPath]: eventsApi.reducer,
    [socialApi.reducerPath]: socialApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(
      authApi.middleware,
      usersApi.middleware,
      eventsApi.middleware,
      socialApi.middleware,
    ),
});

export type RootState   = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
