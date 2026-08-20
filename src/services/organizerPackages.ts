/**
 * Organizer packages, subscription, quota, and self-subscribe / upgrade.
 * Browser never submits amount — only package_id + optional payer_phone.
 */

import { organizerApi } from "@/lib/api";
import type { WrappedSuccess } from "@/lib/publicEventsAdapters";
import type { OrganizerQuota } from "@/types/organizer";

export type OrganizerPackage = {
  id: number;
  name: string;
  description?: string | null;
  price: string | number;
  event_quota: number | null;
  duration_value?: number | null;
  duration_unit?: string | null;
  duration_label?: string | null;
  tier_rank?: number;
  status: string;
  is_current?: boolean;
  upgrade_allowed?: boolean;
  selectable?: boolean;
  blocked_reason?: string | null;
  action?: "subscribe" | "upgrade" | null;
};

export type OrganizerPackageSnapshot = {
  package_id?: number;
  package_name?: string;
  package_price?: string;
  event_quota?: number | null;
  duration_value?: number | null;
  duration_unit?: string | null;
  duration_label?: string | null;
  tier_rank?: number;
};

export type OrganizerSubscriptionRow = {
  id: number;
  organizer_id: number;
  package_id: number;
  status: string;
  source?: string | null;
  started_at: string | null;
  expires_at: string | null;
  seconds_remaining?: number | null;
  package_snapshot?: OrganizerPackageSnapshot | null;
  package: {
    id: number;
    name: string;
    price: string | number;
    event_quota: number | null;
    duration_value?: number | null;
    duration_unit?: string | null;
    duration_label?: string | null;
    tier_rank?: number;
    status: string;
  } | null;
  quota_usage: OrganizerQuota;
};

export type OrganizerSubscriptionPayload = {
  active: OrganizerSubscriptionRow | null;
  history: OrganizerSubscriptionRow[];
};

export type OrganizerQuotaDetail = OrganizerQuota & {
  has_active_subscription: boolean;
  package: {
    id: number;
    name: string;
    event_quota: number | null;
    duration_value?: number | null;
    duration_unit?: string | null;
    duration_label?: string | null;
    tier_rank?: number;
  } | null;
  subscription?: {
    id: number;
    status: string;
    started_at: string | null;
    expires_at: string | null;
    seconds_remaining?: number | null;
  } | null;
};

export type OrganizerSubscriptionOrder = {
  id: number;
  organizer_id: number;
  package_id: number;
  action: string;
  amount: string | number;
  currency: string;
  status: string;
  reference_id: string;
  payer_phone?: string | null;
  failure_code?: string | null;
  failure_reason?: string | null;
  package_snapshot?: OrganizerPackageSnapshot | null;
  previous_subscription_id?: number | null;
  resulting_subscription_id?: number | null;
  completed_at?: string | null;
  expires_at?: string | null;
  created_at?: string | null;
  package?: { id: number; name: string; price: string | number } | null;
};

export type SubscribeResult = {
  outcome: "activated" | "payment_failed";
  message: string;
  order: OrganizerSubscriptionOrder;
  subscription: OrganizerSubscriptionRow | null;
};

type PackagesResponse = WrappedSuccess<OrganizerPackage[]>;
type SubscriptionResponse = WrappedSuccess<OrganizerSubscriptionPayload>;
type QuotaResponse = WrappedSuccess<OrganizerQuotaDetail>;
type SubscribeResponse = WrappedSuccess<SubscribeResult>;
type OrdersListResponse = {
  success: boolean;
  data: OrganizerSubscriptionOrder[];
  pagination?: unknown;
};

/** Waafi phone approval can take up to ~180s — match backend timeout with buffer. */
const SUBSCRIBE_TIMEOUT_MS = 190_000;

export function packagePriceNumber(price: string | number): number {
  const n = typeof price === "number" ? price : Number(price);
  return Number.isFinite(n) ? n : 0;
}

export function isFreePackage(pkg: Pick<OrganizerPackage, "price">): boolean {
  return packagePriceNumber(pkg.price) <= 0;
}

export async function listOrganizerPackages(): Promise<OrganizerPackage[]> {
  const { data } = await organizerApi.get<PackagesResponse>("/organizer/packages");
  return data.data;
}

export async function getOrganizerSubscription(): Promise<OrganizerSubscriptionPayload> {
  const { data } = await organizerApi.get<SubscriptionResponse>("/organizer/subscription");
  return data.data;
}

export async function getOrganizerQuota(): Promise<OrganizerQuotaDetail> {
  const { data } = await organizerApi.get<QuotaResponse>("/organizer/quota");
  return data.data;
}

export async function getOrganizerSubscriptionHistory(): Promise<OrganizerSubscriptionRow[]> {
  const { data } = await organizerApi.get<WrappedSuccess<{ history: OrganizerSubscriptionRow[] }>>(
    "/organizer/subscriptions/history",
  );
  return data.data.history;
}

export async function listOrganizerSubscriptionOrders(params?: {
  status?: string;
  per_page?: number;
  page?: number;
}): Promise<OrganizerSubscriptionOrder[]> {
  const { data } = await organizerApi.get<OrdersListResponse>("/organizer/subscription-orders", {
    params,
  });
  return data.data;
}

export async function getOrganizerSubscriptionOrder(id: number): Promise<OrganizerSubscriptionOrder> {
  const { data } = await organizerApi.get<WrappedSuccess<OrganizerSubscriptionOrder>>(
    `/organizer/subscription-orders/${id}`,
  );
  return data.data;
}

/**
 * Subscribe or upgrade. Server derives action. Do not send amount/price/action.
 */
export async function subscribeOrganizerPackage(body: {
  package_id: number;
  payer_phone?: string;
}): Promise<SubscribeResult> {
  const { data } = await organizerApi.post<SubscribeResponse>(
    "/organizer/subscriptions",
    {
      package_id: body.package_id,
      ...(body.payer_phone?.trim() ? { payer_phone: body.payer_phone.trim() } : {}),
    },
    { timeout: SUBSCRIBE_TIMEOUT_MS },
  );
  return data.data;
}
