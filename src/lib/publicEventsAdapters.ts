import type { TicketTier } from "@/components/event-detail/TicketTiersManager";
import { eventModeToLocationType } from "@/lib/eventMode";
import { getMediaUrl } from "@/lib/mediaUrl";

export type LaravelPaginator<T> = {
  current_page: number;
  data: T[];
  per_page: number;
  total: number;
  last_page?: number;
};

// GET /events (raw paginator)
export type PublicEventCatalogItem = {
  id: number;
  organizer_id: number;
  event_category_id: number | null;
  title: string;
  description?: string | null;
  city?: string | null;
  address?: string | null;
  event_mode?: string | null;
  online_url?: string | null;
  why_attend?: string[] | null;
  banner_path?: string | null;
  /** Absolute URL from Laravel `banner_url` accessor when present. */
  banner_url?: string | null;
  featured: boolean;
  monetized: boolean;
  status: string;
  capacity?: number | null;
  registration_deadline?: string | null;
  starts_at?: string | null;
  ends_at?: string | null;
  registered_count: number;
  waitlisted_count: number;
  seats_remaining?: number | null;
  organizer?: { id: number; business_name: string };
  category?: { id: number; name: string } | null;
  images?: Array<{ id: number; path: string; sort_order?: number }>;
  ticket_types?: Array<{
    id: number;
    event_id: number;
    name: string;
    is_vip?: boolean;
    price: string; // decimal as string
    quantity_limit: number | null;
    quantity_sold: number;
    sort_order?: number;
    sales_enabled: boolean;
  }>;
  ticketTypes?: PublicEventCatalogItem["ticket_types"];
  registration_gates?: {
    allowed: boolean;
    reason?: string | null;
    capacity_reached: boolean;
    deadline_passed: boolean;
  };
};

export type PublicEventCatalogResponse = LaravelPaginator<PublicEventCatalogItem>;

// GET /event-categories (raw paginator)
export type PublicEventCategory = { id: number; name: string };
export type PublicEventCategoriesResponse = LaravelPaginator<PublicEventCategory>;

// GET /events/{id} (wrapped success)
export type WrappedSuccess<T> = {
  success: true;
  message?: string;
  status_code: number;
  data: T;
};

export type PublicSpeaker = {
  id: number;
  name: string;
  photo_path?: string | null;
  photo_url?: string | null;
  title?: string | null;
  organization?: string | null;
  bio?: string | null;
  social_links?: unknown;
  sort_order?: number;
};

export type PublicSession = {
  id: number;
  title: string;
  starts_at?: string | null;
  ends_at?: string | null;
  room?: string | null;
  description?: string | null;
  sort_order?: number;
  speaker_id?: number | null;
  speaker?: PublicSpeaker | null;
};

export type PublicEventDetail = PublicEventCatalogItem & {
  speakers?: PublicSpeaker[];
  sponsors?: Array<{
    id: number;
    name: string;
    logo_path?: string | null;
    logo_url?: string | null;
    tier?: unknown;
    sort_order?: number;
  }>;
  sessions?: PublicSession[];
};

export type PublicEventDetailResponse = WrappedSuccess<PublicEventDetail>;

export function adaptTicketTypes(apiTickets: PublicEventCatalogItem["ticket_types"]): TicketTier[] {
  const list = apiTickets ?? [];
  return list
    .filter((t) => t.sales_enabled !== false)
    .map((t) => {
    const rawPrice = typeof t.price === "string" ? Number(t.price) : Number((t as any).price);
    const price = Number.isFinite(rawPrice) ? rawPrice : 0;

    const capacity = t.quantity_limit ?? null;

    return {
      id: String(t.id),
      name: t.name ?? "",
      description: null,
      price,
      currency: "USD",
      capacity,
      is_vip: t.is_vip === true,
    };
  });
}

function resolveBannerSrc(api: PublicEventDetail | PublicEventCatalogItem): string | undefined {
  if (api.banner_url) return api.banner_url;
  if (api.banner_path) return getMediaUrl(api.banner_path);
  return undefined;
}

export function pickBackgroundImage(api: PublicEventDetail | PublicEventCatalogItem): string | undefined {
  const banner = resolveBannerSrc(api);
  if (banner) return banner;
  const firstImage = api.images?.[0]?.path;
  return firstImage ? getMediaUrl(firstImage) : undefined;
}

export function pickHeroBackgroundImage(api: PublicEventDetail | PublicEventCatalogItem): string | undefined {
  const banner = resolveBannerSrc(api);
  if (banner) return banner;
  const firstImagePath = api.images?.[0]?.path;
  return firstImagePath ? getMediaUrl(firstImagePath) : undefined;
}

export type PublicEventUiModel = {
  id: number;
  name: string;
  description?: string | null;

  // Existing cinematic UI expects these fields (it isn't using Laravel naming).
  event_date?: string | null;
  event_end_date?: string | null;
  timezone: string;
  status: string;
  primary_color: string;
  color_mode: "light" | "dark";
  location_type: "physical" | "hybrid" | "virtual";
  location: string | null;

  capacity: number | null;
  organizer_business_name?: string;
  category_name?: string;
  city?: string | null;
  online_url?: string | null;
  why_attend?: string[] | null;

  background_image_url?: string;
  images?: Array<{ path: string }>;

  registration_gates?: PublicEventCatalogItem["registration_gates"];

  ticket_tiers: TicketTier[];
  speakers?: PublicEventDetail["speakers"];
  sponsors?: PublicEventDetail["sponsors"];
  sessions?: PublicEventDetail["sessions"];
};

export function adaptPublicEventDetailToUi(api: PublicEventDetail): PublicEventUiModel {
  const ticket_tiers = adaptTicketTypes(api.ticket_types ?? api.ticketTypes);
  const locationType = eventModeToLocationType(api.event_mode);
  const venueLine = [api.address, api.city].filter(Boolean).join(", ") || null;
  return {
    id: api.id,
    name: api.title,
    description: api.description ?? null,
    event_date: api.starts_at ?? null,
    event_end_date: api.ends_at ?? null,
    timezone: "Africa/Mogadishu",
    status: api.status,
    primary_color: "#178A5C",
    color_mode: "light",
    location_type: locationType,
    location: locationType === "virtual" ? null : venueLine,
    capacity: api.capacity ?? null,
    organizer_business_name: api.organizer?.business_name,
    category_name: api.category?.name ?? undefined,
    city: api.city ?? null,
    online_url: api.online_url ?? null,
    why_attend: Array.isArray(api.why_attend) ? api.why_attend.filter(Boolean) : null,
    background_image_url: pickHeroBackgroundImage(api),
    images: (api.images ?? []).map((im) => ({ path: im.path })),
    registration_gates: api.registration_gates,
    ticket_tiers,
    speakers: api.speakers,
    sponsors: api.sponsors,
    sessions: api.sessions,
  };
}

