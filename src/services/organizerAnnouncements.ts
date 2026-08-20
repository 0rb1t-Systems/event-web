import { organizerApi } from "@/lib/api";
import type { WrappedSuccess } from "@/lib/publicEventsAdapters";

export type OrganizerAnnouncement = {
  id: number;
  event_id: number;
  subject: string;
  body: string;
  sent_at: string | null;
  sent_by: number | null;
  created_at?: string;
  updated_at?: string;
};

export type OrganizerListMeta = {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
};

type ListResponse = WrappedSuccess<{
  items: OrganizerAnnouncement[];
  pagination: OrganizerListMeta;
}>;

type OneResponse = WrappedSuccess<OrganizerAnnouncement>;

export async function listOrganizerAnnouncements(
  eventId: number,
  params?: { per_page?: number; page?: number },
): Promise<{ items: OrganizerAnnouncement[]; pagination: OrganizerListMeta }> {
  const { data } = await organizerApi.get<ListResponse>(
    `/organizer/events/${eventId}/announcements`,
    { params },
  );
  return data.data;
}

/** POST queues mail to non-cancelled participants. Message includes recipient count. */
export async function sendOrganizerAnnouncement(
  eventId: number,
  body: { subject: string; body: string },
): Promise<{ announcement: OrganizerAnnouncement; message: string }> {
  const { data } = await organizerApi.post<OneResponse>(
    `/organizer/events/${eventId}/announcements`,
    body,
  );
  return { announcement: data.data, message: data.message ?? "Announcement sent" };
}
