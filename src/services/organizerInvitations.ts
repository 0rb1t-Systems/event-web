import { organizerApi } from "@/lib/api";
import type { WrappedSuccess } from "@/lib/publicEventsAdapters";
import type { Customizations, InvitationConfig, OverlayPositions } from "@/services/participationService";
import { getMediaUrl } from "@/lib/mediaUrl";

export type InvitationSystemTemplate = {
  id: number;
  name: string;
  slug?: string;
  thumbnail_path?: string | null;
  background_image_path?: string | null;
  default_overlay_positions?: OverlayPositions | null;
  default_customizations?: Customizations | null;
  active?: boolean;
};

export type EventInvitationTemplate = {
  id: number;
  event_id: number;
  mode: "template" | "custom" | null;
  system_template_id: number | null;
  background_image_path: string | null;
  overlay_positions: OverlayPositions | null;
  customizations: Customizations | null;
  system_template?: InvitationSystemTemplate | null;
};

export type InvitationTemplatePayload = {
  event_id: number;
  template: EventInvitationTemplate | null;
  canvas: { width: number; height: number; orientation?: string };
};

export type InvitationWriteBody = {
  mode: "template" | "custom";
  system_template_id?: number | null;
  customizations?: Customizations | null;
  overlay_positions?: OverlayPositions | null;
};

const BACKGROUND_MAX_BYTES = 5120 * 1024;

function coerceTemplate(raw: EventInvitationTemplate | null | undefined): EventInvitationTemplate | null {
  if (!raw) return null;
  const extra = raw as EventInvitationTemplate & { systemTemplate?: InvitationSystemTemplate | null };
  return {
    ...raw,
    system_template: raw.system_template ?? extra.systemTemplate ?? null,
  };
}

function coercePayload(payload: InvitationTemplatePayload): InvitationTemplatePayload {
  return { ...payload, template: coerceTemplate(payload.template) };
}

export async function listInvitationSystemTemplates(): Promise<InvitationSystemTemplate[]> {
  const { data } = await organizerApi.get<WrappedSuccess<InvitationSystemTemplate[]>>(
    "/organizer/invitation-system-templates",
  );
  return Array.isArray(data.data) ? data.data : [];
}

export function getEventInvitationTemplate(eventId: number): Promise<InvitationTemplatePayload> {
  return organizerApi
    .get<WrappedSuccess<InvitationTemplatePayload>>(`/organizer/events/${eventId}/invitation-template`)
    .then(({ data }) => coercePayload(data.data));
}

export async function saveEventInvitationTemplate(
  eventId: number,
  body: InvitationWriteBody,
  isNew: boolean,
): Promise<InvitationTemplatePayload> {
  const url = `/organizer/events/${eventId}/invitation-template`;
  const { data } = isNew
    ? await organizerApi.post<WrappedSuccess<InvitationTemplatePayload>>(url, body)
    : await organizerApi.patch<WrappedSuccess<InvitationTemplatePayload>>(url, body);
  return coercePayload(data.data);
}

export async function uploadInvitationBackground(eventId: number, file: File): Promise<InvitationTemplatePayload> {
  const body = new FormData();
  body.append("background", file);
  const { data } = await organizerApi.post<WrappedSuccess<InvitationTemplatePayload>>(
    `/organizer/events/${eventId}/invitation-template/background`,
    body,
  );
  return coercePayload(data.data);
}

export function validateInvitationBackground(file: File): string | null {
  const allowed = new Set(["image/jpeg", "image/png", "image/webp"]);
  const extOk = /\.(jpe?g|png|webp)$/i.test(file.name);
  if (!allowed.has(file.type) && !extOk) return "Use a JPEG, PNG, or WebP image.";
  if (file.size > BACKGROUND_MAX_BYTES) return "Background must be 5 MB or smaller.";
  return null;
}

export function eventTemplateToConfig(template: EventInvitationTemplate | null): InvitationConfig {
  if (!template) return null;
  const sys = template.system_template;
  return {
    mode: template.mode,
    background_image_path: template.background_image_path,
    customizations: template.customizations,
    overlay_positions: template.overlay_positions,
    system_template: sys
      ? {
          id: sys.id,
          name: sys.name,
          preview_image_path: sys.background_image_path ?? sys.thumbnail_path,
          overlay_positions: sys.default_overlay_positions,
          customizations: sys.default_customizations,
        }
      : null,
  };
}

export function resolveInvitationBackground(config: InvitationConfig, fallbackSystem?: InvitationSystemTemplate | null): string | undefined {
  const path =
    config?.background_image_path
    || config?.system_template?.preview_image_path
    || fallbackSystem?.background_image_path
    || fallbackSystem?.thumbnail_path
    || null;
  return getMediaUrl(path);
}
