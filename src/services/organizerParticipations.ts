/**
 * Organizer participations (registrations) for owned events.
 * participantApi must never be used here.
 */

import { organizerApi } from "@/lib/api";
import type { WrappedSuccess } from "@/lib/publicEventsAdapters";

export type OrganizerParticipationStatus =
  | "joined"
  | "waitlisted"
  | "paid"
  | "checked_in"
  | "cancelled";

export type OrganizerPaymentStatus =
  | "not_required"
  | "pending"
  | "paid"
  | "refunded"
  | "failed";

export type OrganizerParticipationUser = {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
};

export type OrganizerParticipationTicket = {
  id: number;
  name: string;
  price?: string | number;
  is_vip?: boolean;
};

export type OrganizerParticipation = {
  id: number;
  event_id: number;
  user_id: number;
  ticket_type_id: number | null;
  status: OrganizerParticipationStatus | string;
  payment_status: OrganizerPaymentStatus | string;
  custom_field_answers: Record<string, unknown> | null;
  qr_token: string | null;
  original_amount?: string | null;
  discount_amount?: string | null;
  final_amount?: string | null;
  discount_code_snapshot?: Record<string, unknown> | null;
  created_at: string;
  updated_at?: string;
  user?: OrganizerParticipationUser | null;
  ticket_type?: OrganizerParticipationTicket | null;
  ticketType?: OrganizerParticipationTicket | null;
  event?: { id: number; title: string } | null;
};

export type CapacitySnapshot = {
  registered_count: number;
  waitlisted_count: number;
  capacity: number | null;
  seats_remaining: number | null;
};

export type OrganizerListMeta = {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
};

type ListResponse = WrappedSuccess<{
  items: OrganizerParticipation[];
  pagination: OrganizerListMeta;
  event_id: number;
  capacity: CapacitySnapshot;
}>;

type OneResponse = WrappedSuccess<OrganizerParticipation>;

export function participationStatus(value: unknown): string {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "value" in (value as object)) {
    return String((value as { value: unknown }).value);
  }
  return String(value ?? "");
}

export function participationTicket(
  row: OrganizerParticipation,
): OrganizerParticipationTicket | null {
  return row.ticket_type ?? row.ticketType ?? null;
}

export async function listOrganizerEventParticipations(
  eventId: number,
  params?: { status?: string; per_page?: number; page?: number },
): Promise<{
  items: OrganizerParticipation[];
  pagination: OrganizerListMeta;
  capacity: CapacitySnapshot;
  event_id: number;
}> {
  const { data } = await organizerApi.get<ListResponse>(
    `/organizer/events/${eventId}/participations`,
    { params },
  );
  return data.data;
}

export async function getOrganizerParticipation(
  id: number,
): Promise<OrganizerParticipation> {
  const { data } = await organizerApi.get<OneResponse>(`/organizer/participations/${id}`);
  return data.data;
}

export async function promoteOrganizerParticipation(
  id: number,
): Promise<OrganizerParticipation> {
  const { data } = await organizerApi.post<OneResponse>(
    `/organizer/participations/${id}/promote`,
  );
  return data.data;
}

/** Reason is optional on Laravel (`nullable|string|max:500`). */
export async function cancelOrganizerParticipation(
  id: number,
  reason?: string | null,
): Promise<OrganizerParticipation> {
  const { data } = await organizerApi.post<OneResponse>(
    `/organizer/participations/${id}/cancel`,
    { reason: reason?.trim() || null },
  );
  return data.data;
}
