/**
 * Organizer packages, subscription, and event quota (read-only — no purchase).
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
  status: string;
};

export type OrganizerSubscriptionRow = {
  id: number;
  organizer_id: number;
  package_id: number;
  status: string;
  started_at: string | null;
  expires_at: string | null;
  package: {
    id: number;
    name: string;
    price: string | number;
    event_quota: number | null;
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
  } | null;
};

type PackagesResponse = WrappedSuccess<OrganizerPackage[]>;
type SubscriptionResponse = WrappedSuccess<OrganizerSubscriptionPayload>;
type QuotaResponse = WrappedSuccess<OrganizerQuotaDetail>;

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
