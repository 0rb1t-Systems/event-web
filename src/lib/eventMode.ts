export const EVENT_MODES = ["in_person", "online", "hybrid"] as const;
export type EventMode = (typeof EVENT_MODES)[number];

export function asEventMode(value: unknown): EventMode {
  if (value === "online" || value === "hybrid" || value === "in_person") return value;
  if (value && typeof value === "object" && "value" in (value as object)) {
    return asEventMode((value as { value: unknown }).value);
  }
  return "in_person";
}

export function eventModeRequiresUrl(mode: string | null | undefined): boolean {
  const m = asEventMode(mode);
  return m === "online" || m === "hybrid";
}

/** Maps Laravel event_mode onto the existing cinematic location_type union. */
export function eventModeToLocationType(mode: string | null | undefined): "physical" | "hybrid" | "virtual" {
  const m = asEventMode(mode);
  if (m === "online") return "virtual";
  if (m === "hybrid") return "hybrid";
  return "physical";
}

export function parseWhyAttendInput(text: string): string[] | null {
  const items = text
    .split("\n")
    .map((line) => line.trim().slice(0, 200))
    .filter(Boolean)
    .slice(0, 6);
  return items.length ? items : null;
}

export function formatWhyAttend(items: string[] | null | undefined): string {
  return Array.isArray(items) ? items.join("\n") : "";
}

export function catalogPlaceLabel(event: {
  city?: string | null;
  address?: string | null;
  event_mode?: unknown;
}): string {
  if (event.city?.trim()) return event.city.trim();
  const mode = asEventMode(event.event_mode);
  if (mode === "online") return "Online";
  if (mode === "hybrid") return "Hybrid";
  return event.address?.trim() || "";
}
