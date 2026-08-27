import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithReauth } from "./baseQuery";

// ─── Shared types ────────────────────────────────────────────────────────────

export type PayoutStatus =
  | "REQUESTED"
  | "APPROVED"
  | "PROCESSING"
  | "PAID"
  | "REJECTED"
  | "FAILED";

export type PayoutRail =
  | "NIGERIAN_BANK"
  | "US_ACH"
  | "UK_FASTER_PAYMENTS"
  | "SEPA"
  | "SWIFT"
  | "WISE"
  | "PAYPAL"
  | "MOBILE_MONEY";

export type PayoutAccountStatus = "UNVERIFIED" | "VERIFIED" | "REJECTED";

export type LedgerEntryType =
  | "TICKET_SALE"
  | "TICKET_REFUND"
  | "PROVIDER_FEE"
  | "PAYOUT_RESERVED"
  | "PAYOUT_REVERSED"
  | "ADJUSTMENT_CREDIT"
  | "ADJUSTMENT_DEBIT";

/**
 * Money always arrives as a STRING, never a number.
 *
 * The backend stores amounts as Postgres DECIMAL and serialises them as strings
 * so nothing is lost to JavaScript float precision on the way over. Don't
 * `parseFloat` and add them — format for display, and let the server do the
 * arithmetic. See `formatMoney` in @/utils/money.
 */
export type MoneyString = string;

export interface CurrencyBalance {
  currency: string;
  /** Earned, but the event hasn't ended yet — not withdrawable. */
  pending: MoneyString;
  /** Withdrawable right now. */
  available: MoneyString;
  /** Tied up in a payout that's requested but not yet paid. */
  reserved: MoneyString;
  paidOut: MoneyString;
  lifetimeEarned: MoneyString;
}

export interface LedgerEntry {
  id: string;
  currency: string;
  direction: "CREDIT" | "DEBIT";
  amount: MoneyString;
  type: LedgerEntryType;
  availableAt: string | null;
  description: string | null;
  createdAt: string;
  event: { id: string; name: string } | null;
  payout: { id: string; reference: string; status: PayoutStatus } | null;
}

export interface StatementResponse {
  entries: LedgerEntry[];
  pagination: { page: number; limit: number; total: number; pages: number };
}

export interface SupportedCurrency {
  code: string;
  decimals: number;
  symbol: string;
  name: string;
}

export interface SupportedRail {
  rail: PayoutRail;
  label: string;
  requiredFields: string[];
  optionalFields: string[];
}

export interface SupportedResponse {
  currencies: SupportedCurrency[];
  rails: SupportedRail[];
}

/** What the organizer sees — the account number is masked server-side. */
export interface PayoutAccount {
  id: string;
  label: string | null;
  rail: PayoutRail;
  railLabel: string;
  currency: string;
  country: string;
  accountName: string;
  /** e.g. "••••6789" */
  maskedAccount: string;
  details: Record<string, string>;
  isDefault: boolean;
  status: PayoutAccountStatus;
  createdAt: string;
}

export interface Payout {
  id: string;
  reference: string;
  amount: MoneyString;
  currency: string;
  status: PayoutStatus;
  destination: {
    rail: PayoutRail;
    accountName: string;
    maskedAccount: string | null;
  };
  event: { id: string; name: string } | null;
  requestedAt: string;
  paidAt: string | null;
  externalReference: string | null;
  failureReason: string | null;
  notes: string | null;
}

/** Admin view — carries full destination details and the organizer. */
export interface AdminPayout {
  id: string;
  reference: string;
  amount: MoneyString;
  currency: string;
  status: PayoutStatus;
  destinationSnapshot: {
    rail: PayoutRail;
    currency: string;
    country: string;
    accountName: string;
    details: Record<string, string>;
    last4: string;
  };
  organizer: {
    id: string;
    email: string;
    displayName: string | null;
    username: string;
  };
  event: { id: string; name: string } | null;
  requestedAt: string;
  reviewedAt: string | null;
  paidAt: string | null;
  externalReference: string | null;
  failureReason: string | null;
  notes: string | null;
}

export interface AdminPayoutsResponse {
  payouts: AdminPayout[];
  /** Outstanding liability per currency — never summed across currencies. */
  outstandingByCurrency: {
    currency: string;
    status: PayoutStatus;
    count: number;
    total: MoneyString;
  }[];
  pagination: { page: number; limit: number; total: number; pages: number };
}

export interface PayoutListResponse {
  payouts: Payout[];
  pagination: { page: number; limit: number; total: number; pages: number };
}

/** A Nigerian bank as Paystack knows it. `code` is what the API needs. */
export interface Bank {
  code: string;
  name: string;
  slug: string;
}

/** The bank's own answer to "who owns this account number?". */
export interface ResolvedAccount {
  accountNumber: string;
  accountName: string;
  bankCode: string;
  bankName: string;
}

/** Every backend response is wrapped by the global ResponseInterceptor. */
type Envelope<T> = { success: boolean; data: T };

// ─── API ─────────────────────────────────────────────────────────────────────

export const payoutApi = createApi({
  reducerPath: "payoutApi",
  baseQuery: baseQueryWithReauth,
  tagTypes: ["Balance", "Statement", "PayoutAccounts", "Payouts", "AdminPayouts"],

  endpoints: (builder) => ({
    // ─── Earnings ───────────────────────────────────────────────────────────

    /**
     * GET /v1/earnings/balance
     * One row per currency. Never sum these together.
     */
    getBalances: builder.query<Envelope<CurrencyBalance[]>, void>({
      query: () => "/v1/earnings/balance",
      providesTags: ["Balance"],
    }),

    /** GET /v1/earnings/statement — line-by-line money history. */
    getStatement: builder.query<
      Envelope<StatementResponse>,
      { currency?: string; page?: number; limit?: number } | void
    >({
      query: (params) => {
        const p = new URLSearchParams();
        if (params?.currency) p.set("currency", params.currency);
        if (params?.page) p.set("page", String(params.page));
        if (params?.limit) p.set("limit", String(params.limit));
        const qs = p.toString();
        return `/v1/earnings/statement${qs ? `?${qs}` : ""}`;
      },
      providesTags: ["Statement"],
    }),

    // ─── Payout accounts ────────────────────────────────────────────────────

    /**
     * GET /v1/payout-accounts/supported
     * Drives the add-account form — tells us which fields each rail needs, so
     * per-country shapes aren't hardcoded in the UI.
     */
    getSupportedPayoutOptions: builder.query<Envelope<SupportedResponse>, void>({
      query: () => "/v1/payout-accounts/supported",
      // Static config; cache it for the session.
      keepUnusedDataFor: 3600,
    }),

    /**
     * GET /v1/payout-accounts/banks
     * Nigerian banks from Paystack. Picking from this list is what removes the
     * need to type a bank code at all.
     */
    getBanks: builder.query<Envelope<Bank[]>, { country?: string } | void>({
      query: (params) =>
        `/v1/payout-accounts/banks${params?.country ? `?country=${params.country}` : ""}`,
      // Changes at most a few times a year.
      keepUnusedDataFor: 3600,
    }),

    /**
     * GET /v1/payout-accounts/resolve-account
     * Asks the bank who owns an account number, so the name can be confirmed
     * before saving. A lazy query — it fires when the number is complete, not
     * on every keystroke.
     */
    resolveAccount: builder.query<
      Envelope<ResolvedAccount>,
      { accountNumber: string; bankCode: string }
    >({
      query: ({ accountNumber, bankCode }) =>
        `/v1/payout-accounts/resolve-account?accountNumber=${encodeURIComponent(
          accountNumber,
        )}&bankCode=${encodeURIComponent(bankCode)}`,
    }),

    getPayoutAccounts: builder.query<
      Envelope<PayoutAccount[]>,
      { currency?: string } | void
    >({
      query: (params) =>
        `/v1/payout-accounts${params?.currency ? `?currency=${params.currency}` : ""}`,
      providesTags: ["PayoutAccounts"],
    }),

    createPayoutAccount: builder.mutation<
      Envelope<PayoutAccount>,
      {
        label?: string;
        rail: PayoutRail;
        currency: string;
        country: string;
        /** Ignored for NIGERIAN_BANK — the server uses the bank's own record. */
        accountName?: string;
        details: Record<string, string>;
        isDefault?: boolean;
      }
    >({
      query: (body) => ({
        url: "/v1/payout-accounts",
        method: "POST",
        body,
      }),
      invalidatesTags: ["PayoutAccounts"],
    }),

    setDefaultPayoutAccount: builder.mutation<Envelope<PayoutAccount>, string>({
      query: (id) => ({
        url: `/v1/payout-accounts/${id}/default`,
        method: "PATCH",
      }),
      invalidatesTags: ["PayoutAccounts"],
    }),

    deletePayoutAccount: builder.mutation<
      Envelope<{ success: boolean; id: string }>,
      string
    >({
      query: (id) => ({
        url: `/v1/payout-accounts/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["PayoutAccounts"],
    }),

    // ─── Payouts (organizer) ────────────────────────────────────────────────

    /**
     * POST /v1/payouts
     * Reserves the amount immediately, so the balance must be refetched after —
     * hence invalidating Balance and Statement alongside Payouts.
     */
    requestPayout: builder.mutation<
      Envelope<Payout>,
      {
        payoutAccountId: string;
        currency: string;
        amount: number;
        eventId?: string;
        notes?: string;
      }
    >({
      query: (body) => ({
        url: "/v1/payouts",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Payouts", "Balance", "Statement"],
    }),

    getMyPayouts: builder.query<
      Envelope<PayoutListResponse>,
      { status?: PayoutStatus; page?: number; limit?: number } | void
    >({
      query: (params) => {
        const p = new URLSearchParams();
        if (params?.status) p.set("status", params.status);
        if (params?.page) p.set("page", String(params.page));
        if (params?.limit) p.set("limit", String(params.limit));
        const qs = p.toString();
        return `/v1/payouts${qs ? `?${qs}` : ""}`;
      },
      providesTags: ["Payouts"],
    }),

    getPayout: builder.query<Envelope<Payout>, string>({
      query: (id) => `/v1/payouts/${id}`,
      providesTags: (_r, _e, id) => [{ type: "Payouts", id }],
    }),

    // ─── Payouts (admin) ────────────────────────────────────────────────────

    getAdminPayouts: builder.query<
      Envelope<AdminPayoutsResponse>,
      { status?: PayoutStatus; currency?: string; page?: number; limit?: number } | void
    >({
      query: (params) => {
        const p = new URLSearchParams();
        if (params?.status) p.set("status", params.status);
        if (params?.currency) p.set("currency", params.currency);
        if (params?.page) p.set("page", String(params.page));
        if (params?.limit) p.set("limit", String(params.limit));
        const qs = p.toString();
        return `/v1/admin/payouts${qs ? `?${qs}` : ""}`;
      },
      providesTags: ["AdminPayouts"],
    }),

    approvePayout: builder.mutation<
      Envelope<AdminPayout>,
      { id: string; notes?: string }
    >({
      query: ({ id, ...body }) => ({
        url: `/v1/admin/payouts/${id}/approve`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["AdminPayouts"],
    }),

    /** externalReference is required — it's the proof the money left. */
    markPayoutPaid: builder.mutation<
      Envelope<AdminPayout>,
      { id: string; externalReference: string; notes?: string }
    >({
      query: ({ id, ...body }) => ({
        url: `/v1/admin/payouts/${id}/paid`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["AdminPayouts"],
    }),

    rejectPayout: builder.mutation<
      Envelope<AdminPayout>,
      { id: string; reason: string }
    >({
      query: ({ id, ...body }) => ({
        url: `/v1/admin/payouts/${id}/reject`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["AdminPayouts"],
    }),

    markPayoutFailed: builder.mutation<
      Envelope<AdminPayout>,
      { id: string; reason: string }
    >({
      query: ({ id, ...body }) => ({
        url: `/v1/admin/payouts/${id}/failed`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["AdminPayouts"],
    }),
  }),
});

export const {
  useGetBalancesQuery,
  useGetStatementQuery,
  useGetSupportedPayoutOptionsQuery,
  useGetBanksQuery,
  useLazyResolveAccountQuery,
  useGetPayoutAccountsQuery,
  useCreatePayoutAccountMutation,
  useSetDefaultPayoutAccountMutation,
  useDeletePayoutAccountMutation,
  useRequestPayoutMutation,
  useGetMyPayoutsQuery,
  useGetPayoutQuery,
  useGetAdminPayoutsQuery,
  useApprovePayoutMutation,
  useMarkPayoutPaidMutation,
  useRejectPayoutMutation,
  useMarkPayoutFailedMutation,
} = payoutApi;
