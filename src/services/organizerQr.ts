/**
 * Organizer QR check-in. Identity comes from organizer Bearer token — never send organizer_id.
 */

import { organizerApi } from "@/lib/api";
import type { WrappedSuccess } from "@/lib/publicEventsAdapters";
import axios from "axios";

export type QrScanResultValue = "valid" | "already_used" | "invalid";

export type OrganizerCheckInStats = {
  event_id: number;
  registered: number;
  arrived: number;
  absent: number;
  waitlisted: number;
  scan_attempts: number;
  valid_scans: number;
  already_used_scans: number;
  invalid_scans: number;
};

export type OrganizerQrParticipation = {
  id: number;
  event_id: number;
  status: string;
  payment_status: string;
  qr_token?: string | null;
  updated_at?: string | null;
  created_at?: string | null;
  user?: { id: number; name: string; email?: string } | null;
  ticket_type?: { id: number; name: string } | null;
  ticketType?: { id: number; name: string } | null;
  event?: { id: number; title: string } | null;
};

export type OrganizerQrScanLog = {
  id: number;
  scanned_token: string;
  participation_id: number | null;
  event_id: number | null;
  result: QrScanResultValue | string;
  gate: string | null;
  meta?: Record<string, unknown> | null;
  created_at: string;
  participation?: OrganizerQrParticipation | null;
};

export type OrganizerQrValidateResponse = {
  result: QrScanResultValue | string;
  checked_in: boolean;
  participation: OrganizerQrParticipation | null;
  scan_log: OrganizerQrScanLog;
};

export function qrResultValue(value: unknown): QrScanResultValue | string {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "value" in (value as object)) {
    return String((value as { value: unknown }).value);
  }
  return String(value ?? "invalid");
}

export function participationTicketName(p: OrganizerQrParticipation | null | undefined): string | null {
  if (!p) return null;
  return p.ticket_type?.name ?? p.ticketType?.name ?? null;
}

export function isQrNetworkError(error: unknown): boolean {
  if (!axios.isAxiosError(error)) return false;
  return !error.response;
}

/** POST /organizer/qr-scan-logs/validate — body `{ token, gate? }` only. */
export async function validateOrganizerQrScan(body: {
  token: string;
  gate?: string | null;
}): Promise<OrganizerQrValidateResponse> {
  const { data } = await organizerApi.post<WrappedSuccess<OrganizerQrValidateResponse>>(
    "/organizer/qr-scan-logs/validate",
    {
      token: body.token.trim(),
      ...(body.gate ? { gate: body.gate } : {}),
    },
  );
  return data.data;
}

export async function getOrganizerEventQrScanLogs(eventId: number): Promise<{
  event_id: number;
  stats: OrganizerCheckInStats;
  scan_logs: OrganizerQrScanLog[];
}> {
  const { data } = await organizerApi.get<
    WrappedSuccess<{
      event_id: number;
      stats: OrganizerCheckInStats;
      scan_logs: OrganizerQrScanLog[];
    }>
  >(`/organizer/events/${eventId}/qr-scan-logs`);
  return data.data;
}

export async function getOrganizerEventCheckInStats(
  eventId: number,
): Promise<OrganizerCheckInStats> {
  const { data } = await organizerApi.get<WrappedSuccess<OrganizerCheckInStats>>(
    `/organizer/events/${eventId}/check-in-stats`,
  );
  return data.data;
}
