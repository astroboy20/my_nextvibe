/**
 * store/api/baseQuery.ts
 *
 * This is a React Native / Expo project — tokens are stored in SecureStore,
 * not browser cookies. The real baseQuery (with expo-secure-store + 401
 * refresh queue) lives one level up at store/baseQuery.ts.
 *
 * All API slices in this folder import from "./baseQuery", so we simply
 * re-export everything from the canonical location.
 */
export { API_URL, baseQueryWithReauth, tokenStore } from "../baseQuery";

