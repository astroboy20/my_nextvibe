import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithReauth } from "./baseQuery";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ReminderTiming =
  | "ONE_DAY"
  | "THREE_DAYS"
  | "FIVE_DAYS"
  | "SEVEN_DAYS";

export type RsvpStatus = "CONFIRMED" | "WAITLISTED";

export interface ReminderTemplate {
  id: string;
  eventId: string;
  timing: ReminderTiming;
  rsvpStatus: RsvpStatus;
  subject: string;
  message: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ReminderLog {
  id: string;
  timing: ReminderTiming;
  rsvpStatus: RsvpStatus;
  sent: boolean;
  sentAt: string | null;
  error: string | null;
  user: {
    id: string;
    username: string;
    displayName: string;
    email: string;
  };
  template: {
    timing: ReminderTiming;
    rsvpStatus: RsvpStatus;
    subject: string;
  };
}

export interface ReminderLogSummaryItem {
  sent: number;
  failed: number;
  pending: number;
}

export interface ReminderLogsResponse {
  summary: Record<ReminderTiming, ReminderLogSummaryItem>;
  logs: ReminderLog[];
}

export interface UpsertReminderPayload {
  timing: ReminderTiming;
  rsvpStatus: RsvpStatus;
  subject: string;
  message: string;
  enabled?: boolean;
}

export interface CsvImportResponse {
  message: string;
  totalRows: number;
  added: number;
  skipped: number;
  unmatched: number;
  unmatchedEmails: string[];
  inviteSent: number;
}

// ─── API ──────────────────────────────────────────────────────────────────────

export const reminderApi = createApi({
  reducerPath: "reminderApi",
  baseQuery: baseQueryWithReauth,
  tagTypes: ["Reminders", "ReminderLogs"],
  keepUnusedDataFor: 300,

  endpoints: (builder) => ({
    /** GET /v1/events/:eventId/reminders */
    getReminders: builder.query<ReminderTemplate[], string>({
      query: (eventId) => `/v1/events/${eventId}/reminders`,
      transformResponse: (res: any) => res?.data ?? res ?? [],
      providesTags: (_, __, eventId) => [{ type: "Reminders", id: eventId }],
    }),

    /** POST /v1/events/:eventId/reminders — upsert */
    upsertReminder: builder.mutation<
      ReminderTemplate,
      { eventId: string } & UpsertReminderPayload
    >({
      query: ({ eventId, ...body }) => ({
        url: `/v1/events/${eventId}/reminders`,
        method: "POST",
        body,
      }),
      transformResponse: (res: any) => res?.data ?? res,
      invalidatesTags: (_, __, { eventId }) => [
        { type: "Reminders", id: eventId },
      ],
    }),

    /** PATCH /v1/events/:eventId/reminders/:templateId/toggle */
    toggleReminder: builder.mutation<
      ReminderTemplate,
      { eventId: string; templateId: string; enabled: boolean }
    >({
      query: ({ eventId, templateId, enabled }) => ({
        url: `/v1/events/${eventId}/reminders/${templateId}/toggle`,
        method: "PATCH",
        body: { enabled },
      }),
      transformResponse: (res: any) => res?.data ?? res,
      invalidatesTags: (_, __, { eventId }) => [
        { type: "Reminders", id: eventId },
      ],
    }),

    /** DELETE /v1/events/:eventId/reminders/:templateId */
    deleteReminder: builder.mutation<
      { message: string },
      { eventId: string; templateId: string }
    >({
      query: ({ eventId, templateId }) => ({
        url: `/v1/events/${eventId}/reminders/${templateId}`,
        method: "DELETE",
      }),
      invalidatesTags: (_, __, { eventId }) => [
        { type: "Reminders", id: eventId },
      ],
    }),

    /** GET /v1/events/:eventId/reminders/logs */
    getReminderLogs: builder.query<ReminderLogsResponse, string>({
      query: (eventId) => `/v1/events/${eventId}/reminders/logs`,
      transformResponse: (res: any) => res?.data ?? res,
      providesTags: (_, __, eventId) => [{ type: "ReminderLogs", id: eventId }],
    }),

    /** POST /v1/events/:eventId/reminders/import-csv?timing=...&channel=EMAIL */
    importCsvReminders: builder.mutation<
      CsvImportResponse,
      { eventId: string; timing: ReminderTiming; file: File }
    >({
      query: ({ eventId, timing, file }) => {
        const formData = new FormData();
        formData.append("file", file);
        return {
          url: `/v1/events/${eventId}/reminders/import-csv?timing=${timing}&channel=EMAIL`,
          method: "POST",
          body: formData,
        };
      },
      transformResponse: (res: any) => res?.data ?? res,
      // Refresh delivery logs after import so new pending records appear immediately
      invalidatesTags: (_, __, { eventId }) => [
        { type: "ReminderLogs", id: eventId },
      ],
    }),
  }),
});

export const {
  useGetRemindersQuery,
  useUpsertReminderMutation,
  useToggleReminderMutation,
  useDeleteReminderMutation,
  useGetReminderLogsQuery,
  useImportCsvRemindersMutation,
} = reminderApi;
