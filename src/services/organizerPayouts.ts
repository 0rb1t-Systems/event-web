/**
 * Organizer per-event payout requests.
 * No approve / reject / record-payment (admin-only).
 */

import { organizerApi } from "@/lib/api";
import type { WrappedSuccess } from "@/lib/publicEventsAdapters";
import type { OrganizerEventFinance } from "@/services/organizerFinance";

export type OrganizerPayoutStatus =
  | "requested"
  | "approved"
  | "paid"
  | "rejected"
  | string;

export type OrganizerPayoutRequest = {
  id: number;
  organizer_id: number;
  event_id: number;
  requested_amount: string | number;
  status: OrganizerPayoutStatus;
  /** Snapshotted % at request creation — never live platform rate. */
  commission_rate: string | number;
  commission_amount: string | number | null;
  net_amount: string | number | null;
  admin_notes: string | null;
  reviewed_by: number | null;
  reviewed_at: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at?: string;
  event?: { id: number; title: string } | null;
  organizer?: { id: number; business_name?: string } | null;
};

export type OrganizerPayoutSnapshotAmounts = {
  commission_amount: string;
  net_amount: string;
};

export type OrganizerListMeta = {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
};

type ListResponse = WrappedSuccess<{
  items: OrganizerPayoutRequest[];
  pagination: OrganizerListMeta;
}>;

type EventListResponse = WrappedSuccess<{
  items: OrganizerPayoutRequest[];
  pagination: OrganizerListMeta;
  event_finance: OrganizerEventFinance;
  available_amount: number;
}>;

type CreateResponse = WrappedSuccess<OrganizerPayoutRequest>;

type ShowResponse = WrappedSuccess<{
  payout: OrganizerPayoutRequest;
  snapshot_amounts: OrganizerPayoutSnapshotAmounts;
  event_finance: OrganizerEventFinance;
  available_amount: number;
}>;

export function payoutStatus(value: unknown): string {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "value" in (value as object)) {
    return String((value as { value: unknown }).value);
  }
  return String(value ?? "");
}

export function asMoneyNumber(value: string | number | null | undefined): number {
  if (value == null || value === "") return 0;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

/** Client preview from snapshotted rate (same formula as PayoutRequest::computeAmountsFromSnapshot). */
export function computeCommissionFromSnapshot(
  requested: number,
  ratePercent: number,
): { commission_amount: number; net_amount: number } {
  const commission = Math.round(requested * (ratePercent / 100) * 100) / 100;
  const net = Math.round((requested - commission) * 100) / 100;
  return { commission_amount: commission, net_amount: net };
}

export async function listOrganizerPayoutRequests(params?: {
  per_page?: number;
  page?: number;
}): Promise<{ items: OrganizerPayoutRequest[]; pagination: OrganizerListMeta }> {
  const { data } = await organizerApi.get<ListResponse>("/organizer/payout-requests", {
    params,
  });
  return data.data;
}

export async function listOrganizerEventPayoutRequests(
  eventId: number,
  params?: { per_page?: number; page?: number },
): Promise<{
  items: OrganizerPayoutRequest[];
  pagination: OrganizerListMeta;
  event_finance: OrganizerEventFinance;
  available_amount: number;
}> {
  const { data } = await organizerApi.get<EventListResponse>(
    `/organizer/events/${eventId}/payout-requests`,
    { params },
  );
  return data.data;
}

export async function createOrganizerEventPayoutRequest(
  eventId: number,
  requestedAmount: number,
): Promise<OrganizerPayoutRequest> {
  const { data } = await organizerApi.post<CreateResponse>(
    `/organizer/events/${eventId}/payout-requests`,
    { requested_amount: requestedAmount },
  );
  return data.data;
}

export async function getOrganizerPayoutRequest(id: number): Promise<{
  payout: OrganizerPayoutRequest;
  snapshot_amounts: OrganizerPayoutSnapshotAmounts;
  event_finance: OrganizerEventFinance;
  available_amount: number;
}> {
  const { data } = await organizerApi.get<ShowResponse>(
    `/organizer/payout-requests/${id}`,
  );
  return data.data;
}
