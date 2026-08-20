import { organizerApi, publicApi } from "@/lib/api";
import type { PublicEventCategoriesResponse, WrappedSuccess } from "@/lib/publicEventsAdapters";

export type OrganizerEventStatus =
  | "draft"
  | "published"
  | "registration_open"
  | "sold_out"
  | "registration_closed"
  | "ongoing"
  | "completed"
  | "cancelled";

export type OrganizerEventImage = {
  id: number;
  event_id: number;
  path: string;
  sort_order?: number;
};

export type OrganizerEventTicketType = {
  id: number;
  name: string;
  is_vip?: boolean;
  price: string;
  currency?: string | null;
};

export type OrganizerEvent = {
  id: number;
  organizer_id: number;
  event_category_id: number | null;
  title: string;
  description: string | null;
  city: string | null;
  address: string | null;
  event_mode?: string | null;
  online_url?: string | null;
  why_attend?: string[] | null;
  latitude: string | number | null;
  longitude: string | number | null;
  banner_path: string | null;
  /** Absolute URL when Laravel appends the accessor (prefer for <img src>). */
  banner_url?: string | null;
  featured: boolean;
  monetized: boolean;
  status: OrganizerEventStatus | string;
  capacity: number | null;
  registrations_count: number;
  views_count?: number;
  registered_count?: number;
  waitlisted_count?: number;
  seats_remaining?: number | null;
  registration_deadline: string | null;
  starts_at: string | null;
  ends_at: string | null;
  created_at?: string;
  updated_at?: string;
  category?: { id: number; name: string } | null;
  images?: OrganizerEventImage[];
  ticketTypes?: OrganizerEventTicketType[];
  ticket_types?: OrganizerEventTicketType[];
};

export type OrganizerEventWriteBody = {
  event_category_id?: number | null;
  title?: string;
  description?: string | null;
  city?: string | null;
  address?: string | null;
  event_mode?: "in_person" | "online" | "hybrid";
  online_url?: string | null;
  why_attend?: string[] | null;
  latitude?: number | null;
  longitude?: number | null;
  banner_path?: string | null;
  capacity?: number | null;
  registration_deadline?: string | null;
  starts_at?: string | null;
  ends_at?: string | null;
};

export type OrganizerEventListMeta = {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
};

type ListResponse = WrappedSuccess<{
  items: OrganizerEvent[];
  pagination: OrganizerEventListMeta;
}>;

type EventResponse = WrappedSuccess<OrganizerEvent>;
type TransitionResponse = WrappedSuccess<{
  event: OrganizerEvent;
  allowed_transitions: string[];
}>;
type ImagesResponse = WrappedSuccess<{
  items: OrganizerEventImage[];
  pagination: OrganizerEventListMeta;
}>;
type ImageResponse = WrappedSuccess<OrganizerEventImage>;

/** Matches Laravel EventStatusMachine::TRANSITIONS */
export const ORGANIZER_EVENT_TRANSITIONS: Record<string, string[]> = {
  draft: ["published", "cancelled"],
  published: ["registration_open", "draft", "cancelled"],
  registration_open: ["sold_out", "registration_closed", "ongoing", "cancelled"],
  sold_out: ["registration_closed", "ongoing", "cancelled"],
  registration_closed: ["ongoing", "cancelled"],
  ongoing: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};

export function allowedEventTransitions(status: string): string[] {
  return ORGANIZER_EVENT_TRANSITIONS[status] ?? [];
}

export async function listOrganizerEvents(params?: {
  status?: string;
  search?: string;
  per_page?: number;
  page?: number;
}): Promise<{ items: OrganizerEvent[]; pagination: OrganizerEventListMeta }> {
  const { data } = await organizerApi.get<ListResponse>("/organizer/events", { params });
  return data.data;
}

export async function createOrganizerEvent(body: OrganizerEventWriteBody): Promise<OrganizerEvent> {
  const { data } = await organizerApi.post<EventResponse>("/organizer/events", body);
  return data.data;
}

export async function getOrganizerEvent(id: number): Promise<OrganizerEvent> {
  const { data } = await organizerApi.get<EventResponse>(`/organizer/events/${id}`);
  return data.data;
}

export async function updateOrganizerEvent(id: number, body: OrganizerEventWriteBody): Promise<OrganizerEvent> {
  const { data } = await organizerApi.patch<EventResponse>(`/organizer/events/${id}`, body);
  return data.data;
}

export async function deleteOrganizerEvent(id: number): Promise<void> {
  await organizerApi.delete(`/organizer/events/${id}`);
}

export async function transitionOrganizerEvent(
  id: number,
  status: string,
): Promise<{ event: OrganizerEvent; allowed_transitions: string[] }> {
  const { data } = await organizerApi.post<TransitionResponse>(
    `/organizer/events/${id}/transition`,
    { status },
  );
  return data.data;
}

export async function listOrganizerEventImages(eventId: number): Promise<OrganizerEventImage[]> {
  const { data } = await organizerApi.get<ImagesResponse>(`/organizer/events/${eventId}/images`, {
    params: { per_page: 50 },
  });
  return data.data.items;
}

export async function uploadOrganizerEventImage(eventId: number, file: File): Promise<OrganizerEventImage> {
  const body = new FormData();
  body.append("image", file);
  const { data } = await organizerApi.post<ImageResponse>(
    `/organizer/events/${eventId}/images`,
    body,
  );
  return data.data;
}

/** Cover/banner only — multipart field `banner` (not gallery `image`). */
export async function uploadOrganizerEventBanner(eventId: number, file: File): Promise<OrganizerEvent> {
  const body = new FormData();
  body.append("banner", file);
  const { data } = await organizerApi.post<EventResponse>(
    `/organizer/events/${eventId}/banner`,
    body,
  );
  return data.data;
}

export async function deleteOrganizerEventImage(eventId: number, imageId: number): Promise<void> {
  await organizerApi.delete(`/organizer/events/${eventId}/images/${imageId}`);
}

export async function listEventCategories(): Promise<Array<{ id: number; name: string }>> {
  const { data } = await publicApi.get<PublicEventCategoriesResponse>("/event-categories", {
    params: { per_page: 200, page: 1 },
  });
  if (Array.isArray(data.data)) return data.data;
  return [];
}

/** Laravel: jpeg/png/jpg/gif/webp, max 4096 KB */
export const GALLERY_MAX_BYTES = 4096 * 1024;
export const GALLERY_ACCEPT = "image/jpeg,image/png,image/gif,image/webp,.jpg,.jpeg,.png,.gif,.webp";

export function validateGalleryFile(file: File): string | null {
  const allowed = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);
  const extOk = /\.(jpe?g|png|gif|webp)$/i.test(file.name);
  if (!allowed.has(file.type) && !extOk) {
    return "Use a JPEG, PNG, GIF, or WebP image.";
  }
  if (file.size > GALLERY_MAX_BYTES) {
    return "Image must be 4 MB or smaller.";
  }
  return null;
}
