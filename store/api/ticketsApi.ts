/**
 * store/api/ticketsApi.ts
 *
 * Compatibility shim — re-exports ticket CRUD hooks from the canonical
 * eventApi slice under the names TicketManager and useAuth expect.
 *
 * Real hooks:
 *   useCreateTicketMutation  → useCreateTicketTierMutation
 *   useUpdateTicketMutation  → useUpdateTicketTierMutation
 *   useDeleteTicketMutation  → useDeleteTicketTierMutation
 *   useGetTicketsQuery       → useGetTicketTiersQuery
 */

export {

    // ticketsApi object — needed by useAuth.ts resetApiState.
    // eventsApi owns the ticket endpoints, so we expose the same slice object.
    eventsApi as ticketsApi, useCreateTicketMutation as useCreateTicketTierMutation, useDeleteTicketMutation as useDeleteTicketTierMutation,
    useGetTicketsQuery as useGetTicketTiersQuery, useUpdateTicketMutation as useUpdateTicketTierMutation
} from "./eventApi";

// ─── TicketTier type used by TicketManager ────────────────────────────────────
export interface TicketTier {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  capacity?: number | null;
  quantitySold?: number;
  isActive?: boolean;
  imageUrl?: string | null;
}
