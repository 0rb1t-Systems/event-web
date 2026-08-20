import { organizerApi } from "@/lib/api";
import type { WrappedSuccess } from "@/lib/publicEventsAdapters";

/** Exact shape from EventFinanceService::summary — do not invent refunds/net fields. */
export type OrganizerEventFinance = {
  event_id: number;
  currency: string;
  total_collected: number;
  total_paid_out: number;
  /** Sum of requested + approved + paid amounts (reduces available). */
  total_reserved: number;
  outstanding_balance: number;
};

type FinanceResponse = WrappedSuccess<OrganizerEventFinance>;

export async function getOrganizerEventFinance(
  eventId: number,
): Promise<OrganizerEventFinance> {
  const { data } = await organizerApi.get<FinanceResponse>(
    `/organizer/events/${eventId}/finance`,
  );
  return data.data;
}
