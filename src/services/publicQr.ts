/**
 * Public door scanner — API-key only. Event access is gated by scan_token (no login).
 */

import { publicApi } from "@/lib/api";
import type { WrappedSuccess } from "@/lib/publicEventsAdapters";
import type {
  OrganizerCheckInStats,
  OrganizerQrScanLog,
  OrganizerQrValidateResponse,
} from "@/services/organizerQr";

export async function unlockPublicScanner(scanToken: string): Promise<{
  event_id: number;
  title: string;
  status: string;
  event_mode?: string | null;
}> {
  const { data } = await publicApi.post<
    WrappedSuccess<{
      event_id: number;
      title: string;
      status: string;
      event_mode?: string | null;
    }>
  >("/public/scanner/unlock", { scan_token: scanToken.trim() });
  return data.data;
}

export async function validatePublicQrScan(body: {
  scanToken: string;
  token: string;
  gate?: string | null;
  eventId: number;
}): Promise<OrganizerQrValidateResponse> {
  const { data } = await publicApi.post<WrappedSuccess<OrganizerQrValidateResponse>>(
    "/public/qr-scan-logs/validate",
    {
      scan_token: body.scanToken.trim(),
      token: body.token.trim(),
      event_id: body.eventId,
      ...(body.gate ? { gate: body.gate } : {}),
    },
  );
  return data.data;
}

export async function getPublicEventQrScanLogs(
  eventId: number,
  scanToken: string,
): Promise<{
  event_id: number;
  stats: OrganizerCheckInStats;
  scan_logs: OrganizerQrScanLog[];
}> {
  const { data } = await publicApi.post<
    WrappedSuccess<{
      event_id: number;
      stats: OrganizerCheckInStats;
      scan_logs: OrganizerQrScanLog[];
    }>
  >(`/public/scanner/events/${eventId}/qr-scan-logs`, {
    scan_token: scanToken.trim(),
  });
  return data.data;
}
