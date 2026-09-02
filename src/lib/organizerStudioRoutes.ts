export type EventSection =
  | "overview" | "tickets" | "content" | "branding"
  | "attendees" | "lucky-wheel" | "scanner" | "finance" | "analytics" | "settings";

/** Nested studio routes under `/organizer/events/:id` (layout + Outlet). */
export const STUDIO_PATH_BY_SECTION: Record<EventSection, string> = {
  overview: "",
  tickets: "tickets",
  content: "content",
  branding: "branding",
  attendees: "attendees",
  "lucky-wheel": "lucky-wheel",
  scanner: "scanner",
  finance: "finance",
  analytics: "analytics",
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
  // Legacy registration-form tab — removed from product
  if (slug === "form") return "tickets";
  // Removed Lovable promotion — treat as overview if somehow visited before redirect
  if (slug === "promotion") return "overview";
  // Legacy check-in path
  if (slug === "checkin") return "scanner";
  if ((Object.keys(STUDIO_PATH_BY_SECTION) as EventSection[]).some((k) => STUDIO_PATH_BY_SECTION[k] === slug)) {
    return slug as EventSection;
  }
  return "overview";
}
