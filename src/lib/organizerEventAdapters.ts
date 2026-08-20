import { getMediaUrl } from "@/lib/mediaUrl";
import { asEventMode, type EventMode } from "@/lib/eventMode";
import type { OrganizerEvent, OrganizerEventImage, OrganizerEventWriteBody } from "@/services/organizerEvents";

/** Studio UI shape used by surviving Lovable event-detail components. */
export type OrganizerEventStudio = {
  id: number;
  name: string;
  title: string;
  description: string | null;
  status: string;
  city: string | null;
  address: string | null;
  event_mode: EventMode;
  online_url: string | null;
  why_attend: string[] | null;
  location_value: string | null;
  event_date: string | null;
  event_end_date: string | null;
  starts_at: string | null;
  ends_at: string | null;
  capacity: number | null;
  registration_deadline: string | null;
  banner_path: string | null;
  background_image_url: string | null;
  monetized: boolean;
  featured: boolean;
  registrations_count: number;
  registered_count: number;
  waitlisted_count: number;
  event_category_id: number | null;
  category?: { id: number; name: string } | null;
  images: OrganizerEventImage[];
  ticket_tiers: Array<{ id: number; name: string; price: number; currency?: string | null }>;
  updated_at?: string;
  latitude: number | null;
  longitude: number | null;
};

function coverUrl(event: OrganizerEvent): string | null {
  const first = event.images?.[0]?.path;
  return getMediaUrl(event.banner_path) ?? getMediaUrl(first) ?? null;
}

export function toStudioEvent(event: OrganizerEvent): OrganizerEventStudio {
  const tickets = event.ticketTypes ?? event.ticket_types ?? [];
  return {
    id: event.id,
    name: event.title,
    title: event.title,
    description: event.description,
    status: typeof event.status === "string" ? event.status : String(event.status),
    city: event.city,
    address: event.address,
    event_mode: asEventMode(event.event_mode),
    online_url: event.online_url ?? null,
    why_attend: Array.isArray(event.why_attend) ? event.why_attend : null,
    location_value: event.address,
    event_date: event.starts_at,
    event_end_date: event.ends_at,
    starts_at: event.starts_at,
    ends_at: event.ends_at,
    capacity: event.capacity,
    registration_deadline: event.registration_deadline,
    banner_path: event.banner_path,
    background_image_url: coverUrl(event),
    monetized: Boolean(event.monetized),
    featured: Boolean(event.featured),
    registrations_count: event.registrations_count ?? event.registered_count ?? 0,
    registered_count: event.registered_count ?? event.registrations_count ?? 0,
    waitlisted_count: event.waitlisted_count ?? 0,
    event_category_id: event.event_category_id,
    category: event.category ?? null,
    images: event.images ?? [],
    ticket_tiers: tickets.map((t) => ({
      id: t.id,
      name: t.name,
      price: Number(t.price) || 0,
      currency: t.currency ?? "USD",
    })),
    updated_at: event.updated_at,
    latitude: event.latitude == null ? null : Number(event.latitude),
    longitude: event.longitude == null ? null : Number(event.longitude),
  };
}

function emptyToNull(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

/** Maps studio field patches onto Laravel writable keys only. */
export function studioPatchToWriteBody(patch: Record<string, unknown>): OrganizerEventWriteBody {
  const body: OrganizerEventWriteBody = {};
  if ("name" in patch || "title" in patch) {
    const title = String(patch.title ?? patch.name ?? "").trim();
    if (title) body.title = title;
  }
  if ("description" in patch) body.description = emptyToNull(patch.description as string | null);
  if ("city" in patch) body.city = emptyToNull(patch.city as string | null);
  if ("address" in patch || "location_value" in patch) {
    body.address = emptyToNull((patch.address ?? patch.location_value) as string | null);
  }
  if ("event_mode" in patch) body.event_mode = asEventMode(patch.event_mode);
  if ("online_url" in patch) body.online_url = emptyToNull(patch.online_url as string | null);
  if ("why_attend" in patch) {
    const raw = patch.why_attend;
    body.why_attend = Array.isArray(raw)
      ? raw.map((item) => String(item).trim()).filter(Boolean).slice(0, 6)
      : null;
    if (body.why_attend && body.why_attend.length === 0) body.why_attend = null;
  }
  if ("event_date" in patch || "starts_at" in patch) {
    body.starts_at = emptyToNull((patch.starts_at ?? patch.event_date) as string | null);
  }
  if ("event_end_date" in patch || "ends_at" in patch) {
    body.ends_at = emptyToNull((patch.ends_at ?? patch.event_end_date) as string | null);
  }
  if ("capacity" in patch) {
    const n = patch.capacity;
    body.capacity = n === null || n === "" ? null : Number(n);
  }
  if ("registration_deadline" in patch) {
    body.registration_deadline = emptyToNull(patch.registration_deadline as string | null);
  }
  if ("event_category_id" in patch) {
    const n = patch.event_category_id;
    body.event_category_id = n === null || n === "" ? null : Number(n);
  }
  if ("banner_path" in patch) body.banner_path = emptyToNull(patch.banner_path as string | null);
  return body;
}

export function formatEventStatus(status: string): string {
  return status.replace(/_/g, " ");
}

export const EVENT_STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  published: "Published",
  registration_open: "Registration open",
  sold_out: "Sold out",
  registration_closed: "Registration closed",
  ongoing: "Ongoing",
  completed: "Completed",
  cancelled: "Cancelled",
};

export function isPublicCatalogStatus(status: string): boolean {
  return [
    "published",
    "registration_open",
    "sold_out",
    "registration_closed",
    "ongoing",
  ].includes(status);
}
