/**
 * Participant participation and payment service.
 *
 * All calls use participantApi (X-API-Key + Bearer participant_token).
 * Never mix with publicApi or organizerApi.
 */

import { participantApi } from "@/lib/api";
import { normalizeInvitationConfig } from "@/lib/invitationCanvas";
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
  discount_code_id?: number | null;
  original_amount?: string | null;
  discount_amount?: string | null;
  final_amount?: string | null;
  event?: {
    id: number;
    title: string;
    starts_at?: string | null;
    ends_at?: string | null;
    address?: string | null;
    city?: string | null;
    banner_path?: string | null;
    banner_url?: string | null;
    event_mode?: string | null;
    online_url?: string | null;
    status?: string | null;
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
  /** Optional code string; Laravel quotes and snapshots on join. */
  discount_code?: string | null;
};

export type ChargeBody = {
  participation_id: number;
  payer_phone: string;
};

// ─── List / pagination ────────────────────────────────────────────────────────

export type ParticipationListMeta = {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
};

export type ParticipationListResponse = WrappedSuccess<{
  items: ApiParticipation[];
  pagination: ParticipationListMeta;
}>;

// ─── Invitation ───────────────────────────────────────────────────────────────

export type OverlayPositions = Record<
  string,
  { x?: number; y?: number; width?: number; height?: number; font_size?: number; font_color?: string }
>;

export type Customizations = {
  primary_color?: string;
  secondary_color?: string;
  font_family?: string;
  header_text?: string;
  [key: string]: unknown;
};

export type SystemTemplate = {
  id: number;
  name: string;
  preview_image_path?: string | null;
  overlay_positions?: OverlayPositions | null;
  customizations?: Customizations | null;
};

export type InvitationConfig = {
  mode: "template" | "custom" | null;
  system_template?: SystemTemplate | null;
  background_image_path?: string | null;
  customizations?: Customizations | null;
  overlay_positions?: OverlayPositions | null;
} | null;

export type ApiInvitationDetail = {
  id: number;
  status: ApiParticipation["status"];
  payment_status: ApiParticipation["payment_status"];
  qr_token: string | null;
  created_at: string;
  event: ApiParticipation["event"];
  ticket_type: ApiParticipation["ticket_type"];
  invitation: InvitationConfig;
  canvas: { width: number; height: number };
};

type InvitationDetailResponse = WrappedSuccess<ApiInvitationDetail>;

// Wrapped responses
type ParticipationResponse = WrappedSuccess<ApiParticipation>;
type PaymentResponse = WrappedSuccess<ApiPayment>;

// ─── Feedback ─────────────────────────────────────────────────────────────────

export type ApiFeedback = {
  id: number;
  participation_id: number;
  rating: number;
  comment: string | null;
  hidden: boolean;
  submitted_at: string | null;
  created_at?: string;
};

type FeedbackResponse = WrappedSuccess<ApiFeedback | null>;

export type SubmitFeedbackBody = {
  participation_id: number;
  rating: number;
  comment?: string | null;
};

// ─── Certificate ──────────────────────────────────────────────────────────────

export type ApiCertificate = {
  id: number;
  issued_at: string | null;
  file_path: string | null;
  file_url: string | null;
  verified: boolean;
};

export type ApiCertificateResult = {
  available: boolean;
  certificate: ApiCertificate | null;
};

type CertificateResponse = WrappedSuccess<ApiCertificateResult>;

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

/** GET /participant/participations — paginated list of own participations */
export async function listParticipations(params?: {
  status?: string;
  per_page?: number;
  page?: number;
}): Promise<{ items: ApiParticipation[]; pagination: ParticipationListMeta }> {
  const resp = await participantApi.get<ParticipationListResponse>("/participant/participations", { params });
  return resp.data.data;
}

/** GET /participant/participations/{id}/invitation */
export async function getParticipationInvitation(id: number): Promise<ApiInvitationDetail> {
  const resp = await participantApi.get<InvitationDetailResponse>(
    `/participant/participations/${id}/invitation`,
  );
  const detail = resp.data.data;
  return { ...detail, invitation: normalizeInvitationConfig(detail.invitation) };
}

/** GET /participant/participations/{id}/feedback — returns null if not yet submitted */
export async function getParticipationFeedback(id: number): Promise<ApiFeedback | null> {
  const resp = await participantApi.get<FeedbackResponse>(
    `/participant/participations/${id}/feedback`,
  );
  return resp.data.data ?? null;
}

/** POST /participant/event-feedback */
export async function submitFeedback(body: SubmitFeedbackBody): Promise<ApiFeedback> {
  const resp = await participantApi.post<WrappedSuccess<ApiFeedback>>(
    "/participant/event-feedback",
    body,
  );
  return resp.data.data;
}

/** GET /participant/participations/{id}/certificate */
export async function getParticipationCertificate(id: number): Promise<ApiCertificateResult> {
  const resp = await participantApi.get<CertificateResponse>(
    `/participant/participations/${id}/certificate`,
  );
  return resp.data.data;
}

export type ApiAnnouncement = {
  id: number;
  subject: string;
  body: string;
  sent_at?: string | null;
  created_at?: string | null;
};

export type ApiDiscussion = {
  id: number;
  event_id: number;
  speaker_id: number | null;
  body: string;
  status: string;
  created_at?: string;
  speaker?: { id: number; name: string } | null;
};

/** GET /participant/participations/{id}/announcements */
export async function getParticipationAnnouncements(id: number): Promise<ApiAnnouncement[]> {
  const resp = await participantApi.get<
    WrappedSuccess<{ event_id: number; announcements: ApiAnnouncement[] }>
  >(`/participant/participations/${id}/announcements`);
  return resp.data.data.announcements ?? [];
}

/** GET /participant/events/{eventId}/discussions — own questions only */
export async function listMyEventDiscussions(eventId: number): Promise<ApiDiscussion[]> {
  const resp = await participantApi.get<WrappedSuccess<{ items: ApiDiscussion[] }>>(
    `/participant/events/${eventId}/discussions`,
  );
  return resp.data.data.items ?? [];
}

export async function createEventDiscussion(
  eventId: number,
  body: { body: string; speaker_id?: number | null },
): Promise<ApiDiscussion> {
  const resp = await participantApi.post<WrappedSuccess<ApiDiscussion>>(
    `/participant/events/${eventId}/discussions`,
    body,
  );
  return resp.data.data;
}

export async function updateEventDiscussion(
  eventId: number,
  discussionId: number,
  body: string,
): Promise<ApiDiscussion> {
  const resp = await participantApi.patch<WrappedSuccess<ApiDiscussion>>(
    `/participant/events/${eventId}/discussions/${discussionId}`,
    { body },
  );
  return resp.data.data;
}

export async function deleteEventDiscussion(eventId: number, discussionId: number): Promise<void> {
  await participantApi.delete(`/participant/events/${eventId}/discussions/${discussionId}`);
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
