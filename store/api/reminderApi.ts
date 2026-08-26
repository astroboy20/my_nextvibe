/**
 * reminderApi.ts
 *
 * RTK Query slice for event reminder templates and delivery logs.
 *
 * Endpoints:
 *   GET    /v1/events/:eventId/reminders               → getReminders
 *   PUT    /v1/events/:eventId/reminders               → upsertReminder
 *   PATCH  /v1/events/:eventId/reminders/:templateId   → toggleReminder
 *   DELETE /v1/events/:eventId/reminders/:templateId   → deleteReminder
 *   GET    /v1/events/:eventId/reminders/logs          → getReminderLogs
 *   POST   /v1/events/:eventId/reminders/import-csv    → importCsvReminders
 */

import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithReauth } from '../baseQuery';

// ── Types ─────────────────────────────────────────────────────────────────────

export type ReminderTiming =
  | 'SEVEN_DAYS'
  | 'FIVE_DAYS'
  | 'THREE_DAYS'
  | 'ONE_DAY';

export type RsvpStatus = 'CONFIRMED' | 'WAITLISTED';

export interface ReminderTemplate {
  id: string;
  timing: ReminderTiming;
  rsvpStatus: RsvpStatus;
  subject: string;
  message: string;
  enabled: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ReminderLogEntry {
  id: string;
  timing: ReminderTiming;
  rsvpStatus: RsvpStatus;
  sent: boolean;
  sentAt?: string | null;
  error?: string | null;
  user: {
    displayName?: string;
    username?: string;
    avatarUrl?: string | null;
  };
}

export interface ReminderLogSummaryEntry {
  sent: number;
  failed: number;
  pending: number;
}

export interface ReminderLogsResponse {
  logs: ReminderLogEntry[];
  summary: Record<ReminderTiming, ReminderLogSummaryEntry>;
}

export interface CsvImportResponse {
  message: string;
  totalRows: number;
  added: number;
  skipped: number;
  unmatched: number;
  inviteSent: number;
  unmatchedEmails: string[];
}

// ── API slice ─────────────────────────────────────────────────────────────────

export const reminderApi = createApi({
  reducerPath: 'reminderApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Reminders', 'ReminderLogs'],
  endpoints: (build) => ({

    // GET /v1/events/:eventId/reminders
    getReminders: build.query<ReminderTemplate[], string>({
      query: (eventId) => `/v1/events/${eventId}/reminders`,
      transformResponse: (res: any) =>
        Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [],
      providesTags: (_, __, eventId) => [{ type: 'Reminders', id: eventId }],
    }),

    // PUT /v1/events/:eventId/reminders
    upsertReminder: build.mutation<
      { success: boolean; data: ReminderTemplate },
      {
        eventId: string;
        timing: ReminderTiming;
        rsvpStatus: RsvpStatus;
        subject: string;
        message: string;
      }
    >({
      query: ({ eventId, ...body }) => ({
        url: `/v1/events/${eventId}/reminders`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: (_, __, { eventId }) => [{ type: 'Reminders', id: eventId }],
    }),

    // PATCH /v1/events/:eventId/reminders/:templateId
    toggleReminder: build.mutation<
      { success: boolean; data: ReminderTemplate },
      { eventId: string; templateId: string; enabled: boolean }
    >({
      query: ({ eventId, templateId, enabled }) => ({
        url: `/v1/events/${eventId}/reminders/${templateId}`,
        method: 'PATCH',
        body: { enabled },
      }),
      invalidatesTags: (_, __, { eventId }) => [{ type: 'Reminders', id: eventId }],
    }),

    // DELETE /v1/events/:eventId/reminders/:templateId
    deleteReminder: build.mutation<
      { success: boolean },
      { eventId: string; templateId: string }
    >({
      query: ({ eventId, templateId }) => ({
        url: `/v1/events/${eventId}/reminders/${templateId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_, __, { eventId }) => [{ type: 'Reminders', id: eventId }],
    }),

    // GET /v1/events/:eventId/reminders/logs
    getReminderLogs: build.query<ReminderLogsResponse, string>({
      query: (eventId) => `/v1/events/${eventId}/reminders/logs`,
      transformResponse: (res: any) => ({
        logs: Array.isArray(res?.data?.logs) ? res.data.logs : [],
        summary: res?.data?.summary ?? {},
      }),
      providesTags: (_, __, eventId) => [{ type: 'ReminderLogs', id: eventId }],
    }),

    // POST /v1/events/:eventId/reminders/import-csv
    importCsvReminders: build.mutation<
      CsvImportResponse,
      { eventId: string; timing: ReminderTiming; file: { uri: string; name: string; type: string } }
    >({
      query: ({ eventId, timing, file }) => {
        const formData = new FormData();
        formData.append('timing', timing);
        // React Native file object for FormData
        formData.append('file', {
          uri: file.uri,
          name: file.name,
          type: file.type,
        } as any);
        return {
          url: `/v1/events/${eventId}/reminders/import-csv`,
          method: 'POST',
          body: formData,
        };
      },
      transformResponse: (res: any) => res?.data ?? res,
      invalidatesTags: (_, __, { eventId }) => [
        { type: 'Reminders', id: eventId },
        { type: 'ReminderLogs', id: eventId },
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
