import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { CalendarDays, Loader2, MapPin } from "lucide-react";
import { getMediaUrl } from "@/lib/mediaUrl";
import {
  DEFAULT_CUSTOMIZATIONS,
  DEFAULT_OVERLAY_POSITIONS,
  INVITATION_BRAND,
  INVITATION_CANVAS_H,
  INVITATION_CANVAS_W,
  fmtInvitationDate,
  fmtInvitationShortDate,
  fmtInvitationTime,
  normalizeInvitationConfig,
} from "@/lib/invitationCanvas";
import type { Customizations, InvitationConfig, OverlayPositions } from "@/services/participationService";

export type InvitationPreviewModel = {
  eventTitle: string;
  startsAt?: string | null;
  venue?: string | null;
  ticketName?: string | null;
  attendeeName?: string | null;
  invitation: InvitationConfig;
  qrDataUrl?: string | null;
};

function resolveOverlay(invitation: NonNullable<InvitationConfig>): OverlayPositions {
  const normalized = normalizeInvitationConfig(invitation) ?? invitation;
  return {
    ...DEFAULT_OVERLAY_POSITIONS,
    ...(normalized.system_template?.overlay_positions ?? {}),
    ...(normalized.overlay_positions ?? {}),
  };
}

function resolveCustom(invitation: NonNullable<InvitationConfig>): Customizations {
  const normalized = normalizeInvitationConfig(invitation) ?? invitation;
  return {
    ...DEFAULT_CUSTOMIZATIONS,
    ...(normalized.system_template?.customizations ?? {}),
    ...(normalized.customizations ?? {}),
  };
}

function resolveBg(invitation: NonNullable<InvitationConfig>): string | undefined {
  const normalized = normalizeInvitationConfig(invitation) ?? invitation;
  return getMediaUrl(
    normalized.background_image_path
      ?? normalized.system_template?.preview_image_path
      ?? null,
  );
}

export function InvitationScaled({
  children,
  overlay,
}: {
  children: ReactNode;
  overlay?: ReactNode;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => setScale(el.getBoundingClientRect().width / INVITATION_CANVAS_W);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div
      ref={containerRef}
      className="overflow-hidden rounded-3xl shadow-[0_20px_60px_-20px_rgba(0,0,0,0.2)] w-full"
      style={{ paddingBottom: `${(INVITATION_CANVAS_H / INVITATION_CANVAS_W) * 100}%`, position: "relative" }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: INVITATION_CANVAS_W,
          height: INVITATION_CANVAS_H,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
        }}
      >
        {children}
      </div>
      {overlay ? <div className="absolute inset-0 z-10">{overlay}</div> : null}
    </div>
  );
}

export function FallbackInvitation({
  model,
  printRef,
}: {
  model: InvitationPreviewModel;
  printRef?: RefObject<HTMLDivElement | null>;
}) {
  const primary = INVITATION_BRAND;
  const eventTitle = model.eventTitle || "Event";
  const starts = model.startsAt ?? null;
  const venue = model.venue ?? "";
  const ticketName = model.ticketName ?? null;

  return (
    <div
      ref={printRef}
      id="invitation-canvas"
      className="relative overflow-hidden bg-white text-gray-900 select-none"
      style={{ width: INVITATION_CANVAS_W, height: INVITATION_CANVAS_H, maxWidth: "100%" }}
    >
      <div className="absolute inset-x-0 top-0 h-80" style={{ background: `linear-gradient(160deg, ${primary} 0%, hsl(265 90% 50%) 100%)` }} />
      <div className="absolute -top-16 -right-16 w-72 h-72 rounded-full opacity-20" style={{ background: primary }} />
      <div className="relative z-10 px-12 pt-14">
        <p className="text-white/70 text-sm font-semibold tracking-[0.25em] uppercase mb-3">You are invited</p>
        <h1 className="text-white font-bold leading-tight" style={{ fontSize: 36 }}>{eventTitle}</h1>
        {ticketName && (
          <span className="inline-block mt-3 text-xs font-bold uppercase tracking-[0.15em] px-3 py-1 rounded-full" style={{ background: "rgba(255,255,255,0.18)", color: "white" }}>
            {ticketName}
          </span>
        )}
      </div>
      <div className="relative z-10 mx-8 mt-8 bg-white rounded-3xl shadow-lg px-10 py-8 space-y-6">
        <div className="space-y-3">
          {starts && (
            <div className="flex items-start gap-3">
              <CalendarDays className="w-5 h-5 mt-0.5 shrink-0" style={{ color: primary }} />
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Date & Time</p>
                <p className="text-sm font-semibold text-gray-800 mt-0.5">{fmtInvitationDate(starts)}</p>
              </div>
            </div>
          )}
          {venue && (
            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 mt-0.5 shrink-0" style={{ color: primary }} />
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Venue</p>
                <p className="text-sm font-semibold text-gray-800 mt-0.5">{venue}</p>
              </div>
            </div>
          )}
        </div>
        <div className="border-t border-dashed border-gray-200 relative">
          <div className="absolute -left-[calc(2.5rem+1px)] top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-gray-100" />
          <div className="absolute -right-[calc(2.5rem+1px)] top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-gray-100" />
        </div>
        <div className="flex flex-col items-center gap-3">
          {model.qrDataUrl ? (
            <img src={model.qrDataUrl} alt="QR" className="w-40 h-40" />
          ) : (
            <div className="w-40 h-40 bg-gray-100 rounded-xl flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          )}
          <p className="text-[11px] text-gray-400 tracking-widest uppercase">Show at entry</p>
        </div>
      </div>
      <div className="absolute bottom-8 inset-x-0 text-center">
        <p className="text-[11px] text-gray-400 tracking-[0.15em] uppercase">EventHub</p>
      </div>
    </div>
  );
}

export function ConfiguredInvitation({
  model,
  printRef,
}: {
  model: InvitationPreviewModel;
  printRef?: RefObject<HTMLDivElement | null>;
}) {
  const invitation = model.invitation;
  if (!invitation) return <FallbackInvitation model={model} printRef={printRef} />;

  const overlay = resolveOverlay(invitation);
  const custom = resolveCustom(invitation);
  const bgUrl = resolveBg(invitation);
  const starts = model.startsAt ?? null;
  const venue = model.venue ?? "";
  const ticketName = model.ticketName ?? null;
  const attendeeName = model.attendeeName || "Guest";

  const qrPos = overlay.qr_code ?? DEFAULT_OVERLAY_POSITIONS.qr_code!;
  const namePos = overlay.participant_name ?? DEFAULT_OVERLAY_POSITIONS.participant_name!;
  const titlePos = overlay.event_title ?? DEFAULT_OVERLAY_POSITIONS.event_title!;
  const datePos = overlay.event_date ?? DEFAULT_OVERLAY_POSITIONS.event_date!;
  const timePos = overlay.event_time ?? DEFAULT_OVERLAY_POSITIONS.event_time!;
  const venuePos = overlay.event_venue ?? DEFAULT_OVERLAY_POSITIONS.event_venue!;
  const ticketPos = overlay.ticket_type ?? DEFAULT_OVERLAY_POSITIONS.ticket_type!;
  const logoPos = overlay.organizer_logo ?? DEFAULT_OVERLAY_POSITIONS.organizer_logo!;
  const logoUrl = getMediaUrl(typeof custom.logo_path === "string" ? custom.logo_path : null);

  return (
    <div
      ref={printRef}
      id="invitation-canvas"
      className="relative overflow-hidden"
      style={{
        width: INVITATION_CANVAS_W,
        height: INVITATION_CANVAS_H,
        maxWidth: "100%",
        background: bgUrl ? `url(${bgUrl}) center/cover no-repeat` : (custom.primary_color ?? INVITATION_BRAND),
        fontFamily: custom.font_family ?? "Inter, sans-serif",
      }}
    >
      {logoUrl && (
        <img
          src={logoUrl}
          alt=""
          className="absolute object-contain"
          style={{ left: logoPos.x, top: logoPos.y, width: logoPos.width ?? 120, height: logoPos.height ?? 60 }}
        />
      )}
      {custom.header_text && (
        <div className="absolute font-bold text-white" style={{ left: 80, top: 80, fontSize: 22, letterSpacing: "0.2em", opacity: 0.85 }}>
          {custom.header_text}
        </div>
      )}
      <div className="absolute" style={{ left: namePos.x, top: namePos.y, fontSize: namePos.font_size ?? 36, color: namePos.font_color ?? "#111827", fontWeight: 700 }}>
        {attendeeName}
      </div>
      <div className="absolute" style={{ left: titlePos.x, top: titlePos.y, fontSize: titlePos.font_size ?? 28, color: titlePos.font_color ?? "#111827", fontWeight: 600 }}>
        {model.eventTitle}
      </div>
      {starts && (
        <>
          <div className="absolute" style={{ left: datePos.x, top: datePos.y, fontSize: datePos.font_size ?? 20, color: datePos.font_color ?? "#374151" }}>
            {fmtInvitationShortDate(starts)}
          </div>
          <div className="absolute" style={{ left: timePos.x, top: timePos.y, fontSize: timePos.font_size ?? 18, color: timePos.font_color ?? "#374151" }}>
            {fmtInvitationTime(starts)}
          </div>
        </>
      )}
      {venue && (
        <div className="absolute" style={{ left: venuePos.x, top: venuePos.y, fontSize: venuePos.font_size ?? 18, color: venuePos.font_color ?? "#374151" }}>
          {venue}
        </div>
      )}
      {ticketName && (
        <div className="absolute" style={{ left: ticketPos.x, top: ticketPos.y, fontSize: ticketPos.font_size ?? 16, color: ticketPos.font_color ?? "#4B5563" }}>
          {ticketName}
        </div>
      )}
      <div
        className="absolute flex items-center justify-center bg-white rounded-xl p-2"
        style={{ left: qrPos.x, top: qrPos.y, width: qrPos.width ?? 200, height: qrPos.height ?? 200 }}
      >
        {model.qrDataUrl ? (
          <img src={model.qrDataUrl} alt="QR" style={{ width: "100%", height: "100%" }} />
        ) : (
          <div className="w-full h-full bg-muted rounded-lg" />
        )}
      </div>
    </div>
  );
}

export default function InvitationCanvasPreview({
  model,
  printRef,
}: {
  model: InvitationPreviewModel;
  printRef?: RefObject<HTMLDivElement | null>;
}) {
  if (!model.invitation) {
    return <FallbackInvitation model={model} printRef={printRef} />;
  }
  return <ConfiguredInvitation model={model} printRef={printRef} />;
}
