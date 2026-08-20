import type { Customizations, InvitationConfig, OverlayPositions, SystemTemplate } from "@/services/participationService";

export const INVITATION_CANVAS_W = 800;
export const INVITATION_CANVAS_H = 1100;
export const INVITATION_BRAND = "#7C3AED";

export const DEFAULT_OVERLAY_POSITIONS: OverlayPositions = {
  qr_code: { x: 300, y: 820, width: 200, height: 200 },
  participant_name: { x: 80, y: 220, font_size: 36, font_color: "#111827" },
  event_title: { x: 80, y: 290, font_size: 28, font_color: "#111827" },
  event_date: { x: 80, y: 360, font_size: 20, font_color: "#374151" },
  event_time: { x: 80, y: 400, font_size: 18, font_color: "#374151" },
  event_venue: { x: 80, y: 450, font_size: 18, font_color: "#374151" },
  ticket_type: { x: 80, y: 500, font_size: 16, font_color: "#4B5563" },
  organizer_logo: { x: 80, y: 60, width: 120, height: 60 },
};

export const DEFAULT_CUSTOMIZATIONS: Customizations = {
  primary_color: "#0ea5e9",
  secondary_color: "#0369a1",
  font_family: "Inter",
  header_text: "You are invited",
};

export const OVERLAY_FIELD_KEYS = [
  "participant_name",
  "event_title",
  "event_date",
  "event_time",
  "event_venue",
  "ticket_type",
  "qr_code",
  "organizer_logo",
] as const;

export type OverlayFieldKey = (typeof OVERLAY_FIELD_KEYS)[number];
export type OverlaySlot = OverlayPositions[string];
export type LogicalPoint = { x: number; y: number };
export type LogicalRect = { x: number; y: number; width: number; height: number };

const CUSTOMIZATION_KEYS = ["primary_color", "secondary_color", "font_family", "header_text", "logo_path"] as const;
const SIZE_KEYS = new Set(["qr_code", "organizer_logo"]);

export function clampLogical(n: number, min: number, max: number) {
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}

/** Map a pointer on the *displayed* canvas box to locked 800×1100 space. Never persist screen pixels. */
export function screenPointToLogical(clientX: number, clientY: number, displayed: DOMRect): LogicalPoint {
  const x = displayed.width <= 0 ? 0 : ((clientX - displayed.left) / displayed.width) * INVITATION_CANVAS_W;
  const y = displayed.height <= 0 ? 0 : ((clientY - displayed.top) / displayed.height) * INVITATION_CANVAS_H;
  return {
    x: clampLogical(x, 0, INVITATION_CANVAS_W),
    y: clampLogical(y, 0, INVITATION_CANVAS_H),
  };
}

export function logicalRectToPercent(rect: LogicalRect) {
  return {
    left: `${(rect.x / INVITATION_CANVAS_W) * 100}%`,
    top: `${(rect.y / INVITATION_CANVAS_H) * 100}%`,
    width: `${(rect.width / INVITATION_CANVAS_W) * 100}%`,
    height: `${(rect.height / INVITATION_CANVAS_H) * 100}%`,
  };
}

export function isSizedOverlay(key: string) {
  return SIZE_KEYS.has(key);
}

/** Hit box for drag UI. Text fields get a inferred box; only QR/logo persist width/height. */
export function overlayHitBox(key: string, slot: OverlaySlot | undefined): LogicalRect {
  const x = slot?.x ?? 0;
  const y = slot?.y ?? 0;
  if (isSizedOverlay(key)) {
    return {
      x,
      y,
      width: slot?.width ?? (key === "qr_code" ? 200 : 120),
      height: slot?.height ?? (key === "qr_code" ? 200 : 60),
    };
  }
  const font = slot?.font_size ?? 18;
  return {
    x,
    y,
    width: Math.min(640, INVITATION_CANVAS_W - x - 16),
    height: Math.max(28, Math.round(font * 1.6)),
  };
}

export function sanitizeOverlayPositions(overlays: OverlayPositions): OverlayPositions {
  const out: OverlayPositions = {};
  for (const key of OVERLAY_FIELD_KEYS) {
    const slot = overlays[key];
    if (!slot || typeof slot !== "object") continue;
    const next: OverlaySlot = {};
    if (typeof slot.x === "number") next.x = Math.round(clampLogical(slot.x, 0, INVITATION_CANVAS_W));
    if (typeof slot.y === "number") next.y = Math.round(clampLogical(slot.y, 0, INVITATION_CANVAS_H));
    if (isSizedOverlay(key)) {
      if (typeof slot.width === "number") next.width = Math.round(clampLogical(slot.width, 40, INVITATION_CANVAS_W));
      if (typeof slot.height === "number") next.height = Math.round(clampLogical(slot.height, 40, INVITATION_CANVAS_H));
    } else {
      if (typeof slot.font_size === "number") next.font_size = Math.round(clampLogical(slot.font_size, 8, 96));
      if (typeof slot.font_color === "string" && slot.font_color) next.font_color = slot.font_color;
    }
    out[key] = next;
  }
  return out;
}

export function sanitizeCustomizations(custom: Customizations): Customizations {
  const out: Customizations = {};
  for (const key of CUSTOMIZATION_KEYS) {
    const value = custom[key];
    if (typeof value === "string") out[key] = value;
  }
  return out;
}

export function fmtInvitationDate(iso: string | null | undefined, tz = "Africa/Mogadishu") {
  if (!iso) return "Date TBA";
  try {
    return new Intl.DateTimeFormat(undefined, {
      weekday: "long", month: "long", day: "numeric",
      hour: "numeric", minute: "2-digit",
      timeZone: tz, timeZoneName: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function fmtInvitationShortDate(iso: string | null | undefined) {
  if (!iso) return "";
  try {
    return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(new Date(iso));
  } catch {
    return iso;
  }
}

/** Laravel system templates use default_* and thumbnail_path; participant canvas uses overlay_positions / preview_image_path. */
export function normalizeInvitationConfig(raw: InvitationConfig | null | undefined): InvitationConfig {
  if (!raw) return null;
  const sys = raw.system_template as (SystemTemplate & {
    background_image_path?: string | null;
    thumbnail_path?: string | null;
    default_overlay_positions?: OverlayPositions | null;
    default_customizations?: Customizations | null;
  }) | null | undefined;
  if (!sys) return raw;
  return {
    ...raw,
    system_template: {
      id: sys.id,
      name: sys.name,
      preview_image_path: sys.preview_image_path ?? sys.background_image_path ?? sys.thumbnail_path ?? null,
      overlay_positions: sys.overlay_positions ?? sys.default_overlay_positions ?? null,
      customizations: sys.customizations ?? sys.default_customizations ?? null,
    },
  };
}

export function fmtInvitationTime(iso: string | null | undefined, tz = "Africa/Mogadishu") {
  if (!iso) return "";
  try {
    return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit", timeZone: tz }).format(new Date(iso));
  } catch {
    return "";
  }
}
