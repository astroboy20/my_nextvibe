import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithReauth } from '../baseQuery';

// ── Types ─────────────────────────────────────────────────────────────────────

export type PlanType =
  | 'VIBETAGS_SINGLE'
  | 'VIBETAGS_BUNDLE'
  | 'GAMIFICATION_SINGLE'
  | 'GAMIFICATION_BUNDLE'
  | 'MEGA_BUNDLE_SINGLE'
  | 'MEGA_BUNDLE_FULL';

export interface PlanQuote {
  planType: PlanType;
  baseAmount: number;
  finalAmount: number;
  volumeDiscountPercent: number;
  couponDiscountAmount: number;
  gamesIncluded?: number | null;
}

export interface PublishPreview {
  isFreePublish: boolean;
  tier: string;
  gameSessionCount: number;
  vibetagCount: number;
  availablePlans: PlanQuote[];
}

// ── API slice ─────────────────────────────────────────────────────────────────

export const paymentApi = createApi({
  reducerPath: 'paymentApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['PublishPreview'],
  endpoints: (build) => ({

    // GET /v1/events/:eventId/publish-preview
    getPublishPreview: build.query<
      { success: boolean; data: PublishPreview },
      string
    >({
      query: (eventId) => `/v1/events/${eventId}/publish-preview`,
      providesTags: (_, __, id) => [{ type: 'PublishPreview', id }],
    }),

    // POST /v1/organizer/payment/quote
    getQuote: build.mutation<
      { success: boolean; data: PlanQuote },
      { eventId: string; planType: PlanType; couponCode?: string }
    >({
      query: (body) => ({
        url: '/v1/organizer/payment/quote',
        method: 'POST',
        body,
      }),
    }),

    // POST /v1/organizer/payment/initiate
    initiatePlanPayment: build.mutation<
      { success: boolean; data: { status: string; checkoutUrl?: string } },
      { eventId: string; planType: PlanType; couponCode?: string }
    >({
      query: (body) => ({
        url: '/v1/organizer/payment/initiate',
        method: 'POST',
        body,
      }),
    }),

    // POST /v1/organizer/payment/vibetag-addon
    initiateVibeTagAddon: build.mutation<
      { success: boolean; data: { status: string; checkoutUrl?: string } },
      { eventId: string; bundle: boolean; couponCode?: string; vibeTagId?: string }
    >({
      query: (body) => ({
        url: '/v1/organizer/payment/vibetag-addon',
        method: 'POST',
        body,
      }),
    }),
  }),
});

export const {
  useGetPublishPreviewQuery,
  useGetQuoteMutation,
  useInitiatePlanPaymentMutation,
  useInitiateVibeTagAddonMutation,
} = paymentApi;
