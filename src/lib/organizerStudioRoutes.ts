import type { EventSection } from "@/components/event-detail/EventSideNav";

/** Nested studio routes under `/organizer/events/:id` (layout + Outlet). */
export const STUDIO_PATH_BY_SECTION: Record<EventSection, string> = {
  overview: "",
  tickets: "tickets",
  form: "form",
  content: "content",
  branding: "branding",
  promotion: "promotion",
  attendees: "attendees",
  checkin: "checkin",
  settings: "settings",
};

export function studioSectionPath(eventId: number, section: EventSection): string {
  const suffix = STUDIO_PATH_BY_SECTION[section];
  return suffix ? `/organizer/events/${eventId}/${suffix}` : `/organizer/events/${eventId}`;
}

export function sectionFromPathname(pathname: string): EventSection {
  const match = pathname.match(/\/organizer\/events\/\d+(?:\/([^/]+))?/);
  const slug = match?.[1];
  if (!slug) return "overview";
  if (slug === "page") return "content";
  if (slug === "edit") return "overview";
  if (slug === "invitation") return "branding";
  if ((Object.keys(STUDIO_PATH_BY_SECTION) as EventSection[]).some((k) => STUDIO_PATH_BY_SECTION[k] === slug)) {
    return slug as EventSection;
  }
  return "overview";
}
