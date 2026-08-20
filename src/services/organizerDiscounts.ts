import { organizerApi } from "@/lib/api";
import type { WrappedSuccess } from "@/lib/publicEventsAdapters";

export type DiscountCodeType = "percent" | "fixed";

export type OrganizerDiscountCode = {
  id: number;
  code: string;
  event_id: number | null;
  organizer_id: number;
  type: DiscountCodeType | string;
  value: string | number;
  usage_limit: number | null;
  usage_count: number;
  expires_at: string | null;
  active: boolean;
};

export type DiscountCodeWriteBody = {
  code?: string;
  type?: DiscountCodeType;
  value?: number;
  usage_limit?: number | null;
  expires_at?: string | null;
  active?: boolean;
};

type IndexResponse = WrappedSuccess<{
  event_id: number;
  discount_codes: OrganizerDiscountCode[];
}>;

export async function listOrganizerDiscountCodes(eventId: number): Promise<OrganizerDiscountCode[]> {
  const { data } = await organizerApi.get<IndexResponse>(`/organizer/events/${eventId}/discount-codes`);
  return data.data.discount_codes;
}

export async function createOrganizerDiscountCode(
  eventId: number,
  body: DiscountCodeWriteBody,
): Promise<OrganizerDiscountCode> {
  const { data } = await organizerApi.post<WrappedSuccess<OrganizerDiscountCode>>(
    `/organizer/events/${eventId}/discount-codes`,
    body,
  );
  return data.data;
}

export async function updateOrganizerDiscountCode(
  id: number,
  body: DiscountCodeWriteBody,
): Promise<OrganizerDiscountCode> {
  const { data } = await organizerApi.patch<WrappedSuccess<OrganizerDiscountCode>>(
    `/organizer/discount-codes/${id}`,
    body,
  );
  return data.data;
}

export async function updateOrganizerDiscountActive(
  id: number,
  active: boolean,
): Promise<OrganizerDiscountCode> {
  const { data } = await organizerApi.patch<WrappedSuccess<OrganizerDiscountCode>>(
    `/organizer/discount-codes/${id}/active`,
    { active },
  );
  return data.data;
}

export async function deleteOrganizerDiscountCode(id: number): Promise<void> {
  await organizerApi.delete(`/organizer/discount-codes/${id}`);
}

export function discountValueNumber(code: OrganizerDiscountCode): number {
  const n = typeof code.value === "number" ? code.value : Number(code.value);
  return Number.isFinite(n) ? n : 0;
}
