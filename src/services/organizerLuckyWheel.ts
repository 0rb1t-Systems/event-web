/**
 * Organizer lucky wheel for owned events.
 */

import { organizerApi } from "@/lib/api";
import type { WrappedSuccess } from "@/lib/publicEventsAdapters";
import type { OrganizerParticipation } from "@/services/organizerParticipations";

export type LuckyWheelWinner = {
  id: number;
  lucky_wheel_attempt_id: number;
  participation_id: number;
  participation?: OrganizerParticipation | null;
  created_at?: string;
};

export type LuckyWheelAttempt = {
  id: number;
  event_id: number;
  winner_count: number;
  participant_count: number;
  created_by?: number | null;
  created_at: string;
  updated_at?: string;
  winners?: LuckyWheelWinner[];
};

export type LuckyWheelState = {
  event_id: number;
  participant_count: number;
  participants: OrganizerParticipation[];
  attempts: LuckyWheelAttempt[];
};

type StateResponse = WrappedSuccess<LuckyWheelState>;
type SpinResponse = WrappedSuccess<LuckyWheelAttempt>;

export async function getOrganizerLuckyWheel(eventId: number): Promise<LuckyWheelState> {
  const { data } = await organizerApi.get<StateResponse>(
    `/organizer/events/${eventId}/lucky-wheel`,
  );
  return data.data;
}

export async function spinOrganizerLuckyWheel(
  eventId: number,
  winnerCount: number,
): Promise<LuckyWheelAttempt> {
  const { data } = await organizerApi.post<SpinResponse>(
    `/organizer/events/${eventId}/lucky-wheel/spin`,
    { winner_count: winnerCount },
  );
  return data.data;
}
