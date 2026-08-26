/**
 * GamificationHub — entry point imported by edit-event.tsx
 *
 * Props match what edit-event.tsx passes:
 *   eventId, eventStatus, liveCount, onCreateGame
 *
 * Internally it fetches event plan data from the games list
 * and delegates rendering to GamificationHubContent.
 */
import { useGetGamesQuery } from '@/store/api/gamesApi';
import React from 'react';
import GamificationHubContent from './GamificationHubContent';

interface Props {
  eventId: string;
  eventStatus?: string;
  /** unused — live count is derived internally from session data */
  liveCount?: number;
  onCreateGame?: () => void;
  eventName?: string;
  eventStartsAt?: string;
  hasPayment?: boolean;
}

export default function GamificationHub({
  eventId,
  eventStatus,
  eventName = '',
  eventStartsAt,
  hasPayment = false,
}: Props) {
  // Derive eventPlan from the games response if the backend returns it
  const { data: gamesData } = useGetGamesQuery(eventId);
  const eventPlan = (gamesData as any)?.meta?.eventPlan ?? null;

  return (
    <GamificationHubContent
      eventId={eventId}
      eventName={eventName}
      eventStartsAt={eventStartsAt}
      eventStatus={eventStatus}
      hasPayment={hasPayment}
      eventPlan={eventPlan}
    />
  );
}
