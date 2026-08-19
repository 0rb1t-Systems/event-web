/**
 * Participant participation and payment service.
 *
 * All calls use participantApi (X-API-Key + Bearer participant_token).
 * Never mix with publicApi or organizerApi.
 */

import { participantApi } from "@/lib/api";
import type { WrappedSuccess } from "@/lib/publicEventsAdapters";

// ─── Response types ───────────────────────────────────────────────────────────

export type ApiParticipation = {
  id: number;
  event_id: number;
  ticket_type_id: number | null;
  status: "joined" | "waitlisted" | "paid" | "checked_in" | "cancelled";
  payment_status: "not_required" | "pending" | "paid" | "refunded" | "failed";
  custom_field_answers: Record<string, unknown> | null;
  qr_token: string | null;
  created_at: string;
  event?: {
    id: number;
    title: string;
    starts_at?: string | null;
    ends_at?: string | null;
    address?: string | null;
    city?: string | null;
    banner_path?: string | null;
  };
  ticket_type?: {
    id: number;
    name: string;
    price: string;
    currency?: string | null;
  } | null;
};

export type ApiPayment = {
  id: number;
  participation_id: number;
  amount: string;
  currency: string;
  status: "pending" | "completed" | "refunded" | "failed";
  reference_id: string | null;
  gateway: string | null;
  failure_code: string | null;
  failure_reason: string | null;
  payer_phone: string | null;
  participation?: ApiParticipation;
  ticket_type?: {
    id: number;
    name: string;
    price: string;
  } | null;
};

export type CreateParticipationBody = {
  event_id: number;
  ticket_type_id?: number | null;
  custom_field_answers?: Record<string, unknown>;
};

export type ChargeBody = {
  participation_id: number;
  payer_phone: string;
};

// Wrapped responses
type ParticipationResponse = WrappedSuccess<ApiParticipation>;
type PaymentResponse = WrappedSuccess<ApiPayment>;

// ─── API functions ────────────────────────────────────────────────────────────

/** POST /participant/participations */
export async function createParticipation(body: CreateParticipationBody): Promise<ApiParticipation> {
  const resp = await participantApi.post<ParticipationResponse>("/participant/participations", body);
  return resp.data.data;
}

/** GET /participant/participations/{id} */
export async function getParticipation(id: number): Promise<ApiParticipation> {
  const resp = await participantApi.get<ParticipationResponse>(`/participant/participations/${id}`);
  return resp.data.data;
}

/**
 * POST /participant/payments/charge
 *
 * Uses a 210-second timeout because WaafiPay holds the HTTP connection for
 * up to 180 seconds waiting for the customer to approve the EVC prompt.
 * Never call this with the default axios timeout (which is no timeout / browser
 * default — but some proxies/carriers will close the connection before 180s).
 */
export async function chargeParticipation(body: ChargeBody): Promise<ApiPayment> {
  const resp = await participantApi.post<PaymentResponse>(
    "/participant/payments/charge",
    body,
    { timeout: 210_000 },
  );
  return resp.data.data;
}
