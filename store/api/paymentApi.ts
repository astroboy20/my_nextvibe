import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithReauth } from "./baseQuery";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PurchaseSummary {
  purchaseId: string;
  paymentStatus: "PENDING" | "COMPLETED" | "FAILED";
  paidAt: string | null;
  totalAmount: number | null;
  currency: string | null;
  customerName: string | null;
  /** null when the record was not found in our DB but Ercaspay confirmed payment */
  event: {
    id: string;
    name: string;
    description: string;
    startsAt: string;
    endsAt: string;
    locationName: string;
    flierUrl: string | null;
    mode: string;
  } | null;
  tickets: Array<{
    ticketNumber: string;
    tierName: string;
    tierPrice: number;
    status: "VALID" | "USED" | "CANCELLED";
    qrCode: string;
  }>;
  /** true when event/tickets are unavailable — record fetched from Ercaspay only */
  _fromErcaspay?: boolean;
}

export const paymentApi = createApi({
  reducerPath: "paymentApi",
  baseQuery: baseQueryWithReauth,
  tagTypes: ["Purchases"],
  keepUnusedDataFor: 300,

  endpoints: (builder) => ({
    /** POST /v1/payments/purchase — initiate ticket purchase → checkoutUrl + purchaseId */
    initiatePurchase: builder.mutation<
      {
        success: boolean;
        data: {
          purchaseId: string;
          paymentReference: string;
          totalAmount: number;
          checkoutUrl: string;
          expiresAt: string;
        };
      },
      {
        eventId: string;
        ticketTiers: { tierId: string; quantity: number }[];
      }
    >({
      query: (body) => ({
        url: "/v1/payments/purchase",
        method: "POST",
        body,
      }),
    }),

    /** GET /v1/payments/purchases/:purchaseId/summary — public, for confirmation page */
    getPurchaseSummary: builder.query<
      { success: boolean; data: PurchaseSummary },
      { purchaseId: string; reference?: string; transRef?: string }
    >({
      query: ({ purchaseId, reference, transRef }) => {
        const p = new URLSearchParams();
        if (reference) p.set("reference", reference);
        if (transRef) p.set("transRef", transRef);
        const qs = p.toString();
        return `/v1/payments/purchases/${purchaseId}/summary${qs ? `?${qs}` : ""}`;
      },
    }),

    /** GET /v1/payments/purchases?limit=20&page=1 — user's purchase history */
    getUserPurchases: builder.query<any, { limit?: number; page?: number } | void>({
      query: (params) => {
        const p = new URLSearchParams();
        if (params?.limit) p.set("limit", String(params.limit));
        if (params?.page) p.set("page", String(params.page));
        const qs = p.toString();
        return `/v1/payments/purchases${qs ? `?${qs}` : ""}`;
      },
      providesTags: ["Purchases"],
    }),

    /** GET /v1/payments/purchases/:id — full purchase detail (auth-gated) */
    getPurchaseById: builder.query<any, string>({
      query: (id) => `/v1/payments/purchases/${id}`,
    }),
  }),
});

export const {
  useInitiatePurchaseMutation,
  useGetPurchaseSummaryQuery,
  useGetUserPurchasesQuery,
  useGetPurchaseByIdQuery,
} = paymentApi;
