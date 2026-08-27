import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithReauth } from "./baseQuery";

// ─── Shared types ────────────────────────────────────────────────────────────

export type EventTier = "MICRO" | "SMALL" | "MEDIUM" | "LARGE" | "ENTERPRISE";

export type PlanType =
  | "VIBETAGS_SINGLE"
  | "VIBETAGS_BUNDLE"
  | "GAMIFICATION_SINGLE"
  | "GAMIFICATION_BUNDLE"
  | "MEGA_BUNDLE_SINGLE"
  | "MEGA_BUNDLE_FULL";

export interface PlanQuote {
  planType: PlanType;
  tier: EventTier;
  baseAmount: number;
  volumeDiscountPercent: number;
  volumeDiscountAmount: number;
  couponDiscountAmount: number;
  finalAmount: number;
  gamesIncluded?: number;
  couponCode?: string;
}

export interface PublishPreviewResponse {
  eventId: string;
  tier: EventTier;
  eventCapacity: number | null;
  gameSessionCount: number;
  gamePhases: string[];
  vibetagCount: number;
  vibetagPhases: string[];
  isFreePublish: boolean;
  availablePlans: PlanQuote[];
}

export interface InitiatePaymentResponse {
  paymentId: string;
  paymentReference: string;
  quote: PlanQuote;
  expiresAt?: string;
  status: "PENDING" | "COMPLETED";
  checkoutUrl: string | null;
  free?: boolean;
}

export type VerifyStatus = "completed" | "pending" | "failed";

export interface VerifyPaymentResponse {
  status: VerifyStatus;
  paymentId?: string;
  message?: string;
}

export interface OrganizerPayment {
  id: string;
  type: string;
  planType: PlanType | null;
  tier: EventTier;
  baseAmount: number;
  finalAmount: number;
  paymentStatus: string;
  paymentReference: string;
  paidAt: string | null;
  createdAt: string;
  event?: { id: string; name: string };
  couponCode?: string | null;
}

// ─── API ─────────────────────────────────────────────────────────────────────

export const organizerPaymentApi = createApi({
  reducerPath: "organizerPaymentApi",
  baseQuery: baseQueryWithReauth,
  tagTypes: ["OrganizerPayments"],
  keepUnusedDataFor: 300,

  endpoints: (builder) => ({
    /**
     * POST /v1/organizer-payments/quote
     * Re-price a specific plan with an optional coupon code.
     */
    getQuote: builder.mutation<
      { success: boolean; data: PlanQuote },
      { eventId: string; planType: PlanType; couponCode?: string }
    >({
      query: (body) => ({
        url: "/v1/organizer-payments/quote",
        method: "POST",
        body,
      }),
    }),

    /**
     * POST /v1/organizer-payments/plan/initiate
     * Start a plan purchase payment to publish a DRAFT event.
     * Returns checkoutUrl — redirect organizer there.
     */
    initiatePlanPayment: builder.mutation<
      { success: boolean; data: InitiatePaymentResponse },
      { eventId: string; planType: PlanType; couponCode?: string }
    >({
      query: (body) => ({
        url: "/v1/organizer-payments/plan/initiate",
        method: "POST",
        body,
      }),
      invalidatesTags: ["OrganizerPayments"],
    }),

    /**
     * POST /v1/organizer-payments/additional-game/initiate
     * Unlock a game session over quota on a PUBLISHED event.
     */
    initiateAdditionalGamePayment: builder.mutation<
      { success: boolean; data: InitiatePaymentResponse },
      { eventId: string; gameSessionId: string; couponCode?: string }
    >({
      query: (body) => ({
        url: "/v1/organizer-payments/additional-game/initiate",
        method: "POST",
        body,
      }),
      invalidatesTags: ["OrganizerPayments"],
    }),

    /**
     * POST /v1/organizer-payments/vibetag-addon/initiate
     * Add VibeTags to a PUBLISHED event.
     * bundle: false = VIBETAGS_SINGLE, true = VIBETAGS_BUNDLE
     */
    initiateVibeTagAddonPayment: builder.mutation<
      { success: boolean; data: InitiatePaymentResponse },
      { eventId: string; bundle: boolean; couponCode?: string }
    >({
      query: (body) => ({
        url: "/v1/organizer-payments/vibetag-addon/initiate",
        method: "POST",
        body,
      }),
      invalidatesTags: ["OrganizerPayments"],
    }),

    /**
     * GET /v1/organizer-payments/verify/:paymentId
     * Idempotent check after organizer returns from Ercaspay checkout.
     * Poll every 2s while status === "pending".
     */
    verifyOrganizerPayment: builder.query<
      { success: boolean; data: VerifyPaymentResponse },
      string
    >({
      query: (paymentId) =>
        `/v1/organizer-payments/verify/${paymentId}`,
      providesTags: (_, __, paymentId) => [
        { type: "OrganizerPayments", id: paymentId },
      ],
    }),

    /**
     * GET /v1/organizer-payments/my-payments?page=1&limit=20
     * Paginated payment history for the authenticated organizer.
     */
    getMyOrganizerPayments: builder.query<
      { success: boolean; data: OrganizerPayment[]; total: number; page: number; limit: number },
      { page?: number; limit?: number } | void
    >({
      query: (params) => {
        const p = new URLSearchParams();
        if (params?.page) p.set("page", String(params.page));
        if (params?.limit) p.set("limit", String(params.limit));
        const qs = p.toString();
        return `/v1/organizer-payments/my-payments${qs ? `?${qs}` : ""}`;
      },
      providesTags: ["OrganizerPayments"],
    }),
  }),
});

export const {
  useGetQuoteMutation,
  useInitiatePlanPaymentMutation,
  useInitiateAdditionalGamePaymentMutation,
  useInitiateVibeTagAddonPaymentMutation,
  useVerifyOrganizerPaymentQuery,
  useLazyVerifyOrganizerPaymentQuery,
  useGetMyOrganizerPaymentsQuery,
} = organizerPaymentApi;
