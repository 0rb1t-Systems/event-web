import { organizerApi } from "@/lib/api";
import type { WrappedSuccess } from "@/lib/publicEventsAdapters";

/** Exact shape from EventAnalyticsService::forEvent — do not invent fields. */
export type OrganizerEventAnalytics = {
  event_id: number;
  views: number;
  registrations: number;
  conversion_rate: number | null;
  revenue: number;
  currency: string;
  check_ins: number;
  attendance_rate: number | null;
  average_rating: number | null;
  feedback_count: number;
};

type AnalyticsResponse = WrappedSuccess<OrganizerEventAnalytics>;

export async function getOrganizerEventAnalytics(
  eventId: number,
): Promise<OrganizerEventAnalytics> {
  const { data } = await organizerApi.get<AnalyticsResponse>(
    `/organizer/events/${eventId}/analytics`,
  );
  return data.data;
}
