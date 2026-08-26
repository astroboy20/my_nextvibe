/**
 * ticketsApi.ts
 *
 * Ticket tier management for an event organiser.
 *
 * Endpoints
 * ──────────
 * GET    /v1/events/:eventId/tickets               → getEventTickets
 * POST   /v1/events/:eventId/tickets               → createTicketTier
 * PATCH  /v1/events/:eventId/tickets/:ticketId     → updateTicketTier  (imageUrl only after creation)
 * DELETE /v1/events/:eventId/tickets/:ticketId     → deleteTicketTier  (only if quantitySold === 0)
 */

import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithReauth } from '../baseQuery';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface TicketTier {
  id: string;
  name: string;
  description?: string | null;
  perks?: string | null;
  price: number;
  currency: string;
  quantity?: number | null;   // null = unlimited
  quantitySold: number;
  imageUrl?: string | null;
  saleEndsAt?: string | null;
  ticketLink?: string | null;
}

export interface CreateTicketPayload {
  name: string;
  price: number;
  description?: string;
  quantity?: number;
  currency?: string;
  perks?: string;
  ticketEndDate?: string;   // ISO string
  ticketLink?: string;
  imageUrl?: string | null;
}

// ── API slice ─────────────────────────────────────────────────────────────────

export const ticketsApi = createApi({
  reducerPath: 'ticketsApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Tickets'],
  endpoints: (build) => ({

    // GET /v1/events/:eventId/tickets
    getEventTickets: build.query<TicketTier[], string>({
      query: (eventId) => `/v1/events/${eventId}/tickets`,
      transformResponse: (res: any) =>
        Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [],
      providesTags: (_, __, eventId) => [{ type: 'Tickets', id: eventId }],
    }),

    // POST /v1/events/:eventId/tickets
    createTicketTier: build.mutation<
      { success: boolean; data: TicketTier },
      { eventId: string; ticketData: CreateTicketPayload }
    >({
      query: ({ eventId, ticketData }) => ({
        url: `/v1/events/${eventId}/tickets`,
        method: 'POST',
        body: ticketData,
      }),
      transformResponse: (res: any) => res,
      invalidatesTags: (_, __, { eventId }) => [{ type: 'Tickets', id: eventId }],
    }),

    // PATCH /v1/events/:eventId/tickets/:ticketId
    // Backend only accepts imageUrl after creation — all other fields are locked
    updateTicketTier: build.mutation<
      { success: boolean; data: TicketTier },
      { eventId: string; ticketId: string; ticketData: { imageUrl: string | null } }
    >({
      query: ({ eventId, ticketId, ticketData }) => ({
        url: `/v1/events/${eventId}/tickets/${ticketId}`,
        method: 'PATCH',
        body: ticketData,
      }),
      invalidatesTags: (_, __, { eventId }) => [{ type: 'Tickets', id: eventId }],
    }),

    // DELETE /v1/events/:eventId/tickets/:ticketId
    deleteTicketTier: build.mutation<
      { success: boolean },
      { eventId: string; ticketId: string }
    >({
      query: ({ eventId, ticketId }) => ({
        url: `/v1/events/${eventId}/tickets/${ticketId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_, __, { eventId }) => [{ type: 'Tickets', id: eventId }],
    }),
  }),
});

export const {
  useGetEventTicketsQuery,
  useCreateTicketTierMutation,
  useUpdateTicketTierMutation,
  useDeleteTicketTierMutation,
} = ticketsApi;
