/**
 * /registrations/:registrationId
 *
 * Full participant registration detail:
 *  - Participation status + payment status
 *  - Digital invitation canvas (template/custom/default)
 *  - QR code (from qr_token)
 *  - PDF/image download via browser print
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import QRCode from "qrcode";
import {
  ArrowLeft, CalendarDays, MapPin, CheckCircle2, Clock, AlertTriangle,
  Download, Loader2, Ticket as TicketIcon, RefreshCw, XCircle,
} from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import {
  getParticipationInvitation,
  type ApiInvitationDetail,
  type InvitationConfig,
  type OverlayPositions,
  type Customizations,
} from "@/services/participationService";
import { getApiErrorMessage } from "@/lib/apiError";
import { getMediaUrl } from "@/lib/mediaUrl";
import { toast } from "sonner";
import { ParticipantWaafiPayment } from "@/components/participant/ParticipantWaafiPayment";

// ─── Constants ────────────────────────────────────────────────────────────────

const CANVAS_W = 800;
const CANVAS_H = 1100;
const BRAND = "#7C3AED";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string | null | undefined, tz = "Africa/Mogadishu") {
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

function fmtShortDate(iso: string | null | undefined) {
  if (!iso) return "";
  try {
    return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(new Date(iso));
  } catch { return iso; }
}

function fmtTime(iso: string | null | undefined, tz = "Africa/Mogadishu") {
  if (!iso) return "";
  try {
    return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit", timeZone: tz }).format(new Date(iso));
  } catch { return ""; }
}

type Status = ApiInvitationDetail["status"];
type PaymentStatus = ApiInvitationDetail["payment_status"];

function statusMeta(status: Status, paymentStatus: PaymentStatus) {
  if (status === "cancelled") return { label: "Cancelled", icon: <XCircle className="w-4 h-4" />, cls: "bg-muted text-muted-foreground" };
  if (status === "waitlisted") return { label: "Waitlisted", icon: <Clock className="w-4 h-4" />, cls: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" };
  if (status === "checked_in") return { label: "Checked in", icon: <CheckCircle2 className="w-4 h-4" />, cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" };
  if (paymentStatus === "pending") return { label: "Awaiting payment", icon: <AlertTriangle className="w-4 h-4" />, cls: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" };
  if (paymentStatus === "failed") return { label: "Payment failed", icon: <AlertTriangle className="w-4 h-4" />, cls: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" };
  if (paymentStatus === "refunded") return { label: "Payment refunded", icon: <XCircle className="w-4 h-4" />, cls: "bg-muted text-muted-foreground" };
  if (paymentStatus === "paid" || status === "paid") return { label: "Confirmed · Paid", icon: <CheckCircle2 className="w-4 h-4" />, cls: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" };
  return { label: "Registered", icon: <CheckCircle2 className="w-4 h-4" />, cls: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" };
}

/**
 * A ticket is valid — invitation, QR, and download may be shown — only when:
 *   - participation is not waitlisted or cancelled (no confirmed spot)
 *   - payment is confirmed (paid) or not required (free event)
 *
 * All other payment states (pending, failed, refunded) must NOT show a valid ticket.
 */
function hasValidTicket(status: Status, paymentStatus: PaymentStatus): boolean {
  if (status === "cancelled" || status === "waitlisted") return false;
  return paymentStatus === "paid" || paymentStatus === "not_required";
}

// ─── Default invitation canvas (no backend template) ─────────────────────────

const DefaultInvitation = ({
  detail,
  qrDataUrl,
  printRef,
}: {
  detail: ApiInvitationDetail;
  qrDataUrl: string;
  printRef: React.RefObject<HTMLDivElement>;
}) => {
  const primary = BRAND;
  const eventTitle = detail.event?.title ?? "Event";
  const starts = detail.event?.starts_at ?? null;
  const venue = detail.event?.address ?? detail.event?.city ?? "";
  const ticketName = detail.ticket_type?.name ?? null;

  return (
    <div
      ref={printRef}
      id="invitation-canvas"
      className="relative overflow-hidden bg-white text-gray-900 select-none"
      style={{ width: CANVAS_W, height: CANVAS_H, maxWidth: "100%" }}
    >
      {/* Gradient header */}
      <div
        className="absolute inset-x-0 top-0 h-80"
        style={{ background: `linear-gradient(160deg, ${primary} 0%, hsl(265 90% 50%) 100%)` }}
      />

      {/* Decorative circles */}
      <div className="absolute -top-16 -right-16 w-72 h-72 rounded-full opacity-20" style={{ background: primary }} />
      <div className="absolute top-40 -left-20 w-48 h-48 rounded-full opacity-10" style={{ background: "white" }} />

      {/* Header text */}
      <div className="relative z-10 px-12 pt-14">
        <p className="text-white/70 text-sm font-semibold tracking-[0.25em] uppercase mb-3">You are invited</p>
        <h1 className="text-white font-bold leading-tight" style={{ fontSize: 36 }}>
          {eventTitle}
        </h1>
        {ticketName && (
          <span
            className="inline-block mt-3 text-xs font-bold uppercase tracking-[0.15em] px-3 py-1 rounded-full"
            style={{ background: "rgba(255,255,255,0.18)", color: "white" }}
          >
            {ticketName}
          </span>
        )}
      </div>

      {/* Card body */}
      <div className="relative z-10 mx-8 mt-8 bg-white rounded-3xl shadow-lg px-10 py-8 space-y-6">
        {/* Meta rows */}
        <div className="space-y-3">
          {starts && (
            <div className="flex items-start gap-3">
              <CalendarDays className="w-5 h-5 mt-0.5 shrink-0" style={{ color: primary }} />
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Date & Time</p>
                <p className="text-sm font-semibold text-gray-800 mt-0.5">{fmtDate(starts)}</p>
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

        {/* Divider */}
        <div className="border-t border-dashed border-gray-200 relative">
          <div className="absolute -left-[calc(2.5rem+1px)] top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-gray-100" />
          <div className="absolute -right-[calc(2.5rem+1px)] top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-gray-100" />
        </div>

        {/* QR */}
        <div className="flex flex-col items-center gap-3">
          {qrDataUrl ? (
            <img src={qrDataUrl} alt="QR" className="w-40 h-40" />
          ) : (
            <div className="w-40 h-40 bg-gray-100 rounded-xl flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          )}
          <p className="text-[11px] text-gray-400 tracking-widest uppercase">Show at entry</p>
        </div>
      </div>

      {/* Footer */}
      <div className="absolute bottom-8 inset-x-0 text-center">
        <p className="text-[11px] text-gray-400 tracking-[0.15em] uppercase">EventHub</p>
      </div>
    </div>
  );
};

// ─── Configured invitation canvas (template / custom mode) ────────────────────

const ConfiguredInvitation = ({
  detail,
  invitation,
  qrDataUrl,
  printRef,
}: {
  detail: ApiInvitationDetail;
  invitation: NonNullable<InvitationConfig>;
  qrDataUrl: string;
  printRef: React.RefObject<HTMLDivElement>;
}) => {
  const overlay: OverlayPositions = invitation.overlay_positions
    ?? invitation.system_template?.overlay_positions
    ?? {};
  const custom: Customizations = invitation.customizations
    ?? invitation.system_template?.customizations
    ?? {};

  const bgPath = invitation.background_image_path
    ?? invitation.system_template?.preview_image_path
    ?? null;
  const bgUrl = bgPath ? getMediaUrl(bgPath) : null;

  const eventTitle = detail.event?.title ?? "";
  const starts = detail.event?.starts_at ?? null;
  const venue = detail.event?.address ?? detail.event?.city ?? "";
  const ticketName = detail.ticket_type?.name ?? null;

  const qrPos = overlay["qr_code"] ?? { x: 300, y: 820, width: 200, height: 200 };
  const namePos = overlay["participant_name"] ?? { x: 80, y: 220, font_size: 36, font_color: "#111827" };
  const titlePos = overlay["event_title"] ?? { x: 80, y: 290, font_size: 28, font_color: "#111827" };
  const datePos = overlay["event_date"] ?? { x: 80, y: 360, font_size: 20, font_color: "#374151" };
  const timePos = overlay["event_time"] ?? { x: 80, y: 400, font_size: 18, font_color: "#374151" };
  const venuePos = overlay["event_venue"] ?? { x: 80, y: 450, font_size: 18, font_color: "#374151" };
  const ticketPos = overlay["ticket_type"] ?? { x: 80, y: 500, font_size: 16, font_color: "#4B5563" };

  return (
    <div
      ref={printRef}
      id="invitation-canvas"
      className="relative overflow-hidden"
      style={{
        width: CANVAS_W,
        height: CANVAS_H,
        maxWidth: "100%",
        background: bgUrl ? `url(${bgUrl}) center/cover no-repeat` : (custom.primary_color ?? BRAND),
        fontFamily: custom.font_family ?? "Inter, sans-serif",
      }}
    >
      {/* Header text overlay */}
      {custom.header_text && (
        <div
          className="absolute font-bold text-white"
          style={{ left: 80, top: 80, fontSize: 22, letterSpacing: "0.2em", opacity: 0.85 }}
        >
          {custom.header_text}
        </div>
      )}

      {/* Overlay text positions */}
      <div className="absolute" style={{ left: namePos.x, top: namePos.y, fontSize: namePos.font_size ?? 36, color: namePos.font_color ?? "#111827", fontWeight: 700 }}>
        {/* Attendee name shown at name position */}
        {detail.ticket_type?.name ?? ""}
      </div>
      <div className="absolute" style={{ left: titlePos.x, top: titlePos.y, fontSize: titlePos.font_size ?? 28, color: titlePos.font_color ?? "#111827", fontWeight: 600 }}>
        {eventTitle}
      </div>
      {starts && (
        <>
          <div className="absolute" style={{ left: datePos.x, top: datePos.y, fontSize: datePos.font_size ?? 20, color: datePos.font_color ?? "#374151" }}>
            {fmtShortDate(starts)}
          </div>
          <div className="absolute" style={{ left: timePos.x, top: timePos.y, fontSize: timePos.font_size ?? 18, color: timePos.font_color ?? "#374151" }}>
            {fmtTime(starts)}
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

      {/* QR */}
      <div
        className="absolute flex items-center justify-center bg-white rounded-xl p-2"
        style={{ left: qrPos.x, top: qrPos.y, width: qrPos.width ?? 200, height: qrPos.height ?? 200 }}
      >
        {qrDataUrl ? (
          <img src={qrDataUrl} alt="QR" style={{ width: "100%", height: "100%" }} />
        ) : (
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        )}
      </div>
    </div>
  );
};

// InlinePayPanel removed — ParticipantWaafiPayment (shared component) is used directly.

// ─── Responsive scale wrapper ─────────────────────────────────────────────────

/**
 * Renders the 800×1100 canvas scaled down to fit its container width,
 * preserving aspect ratio via a padding-bottom trick.
 */
const InvitationScaled = ({ children }: { children: React.ReactNode }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      const w = el.getBoundingClientRect().width;
      setScale(w / CANVAS_W);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div
      ref={containerRef}
      className="overflow-hidden rounded-3xl shadow-[0_20px_60px_-20px_rgba(0,0,0,0.2)] w-full"
      style={{ paddingBottom: `${(CANVAS_H / CANVAS_W) * 100}%`, position: "relative" }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: CANVAS_W,
          height: CANVAS_H,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
        }}
      >
        {children}
      </div>
    </div>
  );
};

// ─── Print styles injected once ───────────────────────────────────────────────

let printStylesInjected = false;
function ensurePrintStyles() {
  if (printStylesInjected) return;
  printStylesInjected = true;
  const style = document.createElement("style");
  style.textContent = `
@media print {
  body > *:not(#print-root) { display: none !important; }
  #print-root {
    display: block !important;
    position: fixed;
    inset: 0;
    z-index: 9999;
    background: white;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  #invitation-canvas {
    width: 800px !important;
    height: 1100px !important;
    max-width: none !important;
  }
}`;
  document.head.appendChild(style);
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function RegistrationDetail() {
  const { registrationId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [detail, setDetail] = useState<ApiInvitationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState("");

  const printRef = useRef<HTMLDivElement>(null!);
  const printRootRef = useRef<HTMLDivElement>(null);

  const numericId = Number(registrationId);

  const load = useCallback(() => {
    if (!Number.isFinite(numericId) || numericId <= 0) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);

    getParticipationInvitation(numericId)
      .then((d) => {
        if (cancelled) return;
        setDetail(d);
      })
      .catch((err: any) => {
        if (cancelled) return;
        const status = err?.response?.status;
        if (status === 401 || status === 403 || status === 404) {
          if (status === 401 || status === 403) {
            navigate(`/auth?redirect=/registrations/${registrationId}`, { replace: true });
            return;
          }
          setError("Registration not found.");
          return;
        }
        setError(getApiErrorMessage(err) || "Couldn't load registration.");
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => { cancelled = true; };
  }, [numericId, registrationId, navigate]);

  useEffect(() => {
    load();
  }, [load]);

  // Generate QR
  useEffect(() => {
    const token = detail?.qr_token;
    if (!token) {
      setQrDataUrl("");
      return;
    }
    QRCode.toDataURL(token, {
      width: 600,
      margin: 2,
      color: { dark: "#000000", light: "#ffffff" },
    })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(""));
  }, [detail]);

  // Inject print styles once
  useEffect(() => { ensurePrintStyles(); }, []);

  const handleDownload = () => {
    if (!detail || !hasValidTicket(detail.status, detail.payment_status)) return;

    // Move invitation canvas into a print-root div, print, then restore
    const canvas = document.getElementById("invitation-canvas");
    if (!canvas) { window.print(); return; }

    let root = document.getElementById("print-root");
    if (!root) {
      root = document.createElement("div");
      root.id = "print-root";
      root.style.cssText = "display:none;position:fixed;inset:0;z-index:9999;background:white;align-items:center;justify-content:center;";
      document.body.appendChild(root);
    }

    const placeholder = document.createElement("div");
    canvas.parentNode?.insertBefore(placeholder, canvas);
    root.appendChild(canvas);

    window.print();

    // Restore after print dialog closes
    root.removeChild(canvas);
    placeholder.parentNode?.insertBefore(canvas, placeholder);
    placeholder.remove();
  };

  const handleBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate("/dashboard/home");
  };

  // ── Loading ──

  if (loading) {
    return (
      <div className="min-h-screen bg-background px-4 py-8 sm:py-14">
        <div className="max-w-2xl mx-auto space-y-6">
          <Skeleton className="h-9 w-48 rounded-full" />
          <Skeleton className="h-6 w-64" />
          <Skeleton className="h-[480px] w-full rounded-3xl" />
          <Skeleton className="h-12 w-full rounded-full" />
        </div>
      </div>
    );
  }

  // ── Error ──

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-background">
        <div className="max-w-md w-full bg-card rounded-3xl p-10 text-center">
          <AlertTriangle className="w-10 h-10 mx-auto mb-4 text-destructive" />
          <h1 className="text-2xl font-display font-bold mb-2">Couldn't load registration</h1>
          <p className="text-muted-foreground text-sm mb-6">{error}</p>
          <div className="flex gap-3 justify-center">
            <Button variant="outline" className="rounded-full h-11 px-5" onClick={handleBack}>
              <ArrowLeft className="w-4 h-4 mr-2" /> Back
            </Button>
            <Button className="rounded-full h-11 px-5" onClick={load}>
              <RefreshCw className="w-4 h-4 mr-2" /> Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-background">
        <div className="max-w-md w-full bg-card rounded-3xl p-10 text-center">
          <TicketIcon className="w-10 h-10 mx-auto mb-4 text-muted-foreground" />
          <h1 className="text-2xl font-display font-bold mb-2">Registration not found</h1>
          <p className="text-muted-foreground text-sm mb-6">
            This registration link is invalid or belongs to another account.
          </p>
          <Button variant="outline" className="rounded-full h-11 px-5" onClick={handleBack}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Button>
        </div>
      </div>
    );
  }

  const meta = statusMeta(detail.status, detail.payment_status);
  const isWaitlisted = detail.status === "waitlisted";
  const isCancelled = detail.status === "cancelled";
  const isPaymentPending = detail.payment_status === "pending";
  const isPaymentFailed = detail.payment_status === "failed";
  const isPaymentRefunded = detail.payment_status === "refunded";
  const ticketValid = hasValidTicket(detail.status, detail.payment_status);
  // "Check status" is useful whenever the payment outcome may still be resolving
  const showCheckStatus = isPaymentPending || isPaymentFailed;
  const eventTitle = detail.event?.title ?? "Event";
  const eventId = detail.event?.id;
  const invitation = detail.invitation;

  return (
    <div className="min-h-screen bg-background px-4 py-8 sm:py-14 overflow-x-hidden">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="max-w-2xl mx-auto space-y-6"
      >
        {/* Back */}
        <button
          type="button"
          onClick={handleBack}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors -ml-1 px-2 h-9 rounded-full hover:bg-muted"
        >
          <ArrowLeft className="w-4 h-4" />
          My tickets
        </button>

        {/* Header */}
        <div className="space-y-2">
          <h1 className="font-display font-bold text-2xl sm:text-3xl tracking-[-0.02em] leading-tight">
            {eventTitle}
          </h1>
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            {detail.event?.starts_at && (
              <span className="flex items-center gap-1.5">
                <CalendarDays className="w-4 h-4 shrink-0" />
                {fmtDate(detail.event.starts_at)}
              </span>
            )}
            {detail.event?.address && (
              <span className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4 shrink-0" />
                {detail.event.address}
              </span>
            )}
          </div>
        </div>

        {/* Status + meta card */}
        <div className="bg-card rounded-3xl p-6 space-y-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className={`inline-flex items-center gap-2 text-sm font-semibold px-3 py-1.5 rounded-full ${meta.cls}`}>
              {meta.icon}
              {meta.label}
            </div>
            {showCheckStatus && (
              <Button
                size="sm"
                variant="outline"
                className="rounded-full h-8 text-xs gap-1.5"
                onClick={load}
              >
                <RefreshCw className="w-3 h-3" /> Check status
              </Button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-0.5">Registered</p>
              <p className="font-medium">{detail.created_at ? fmtShortDate(detail.created_at) : "—"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-0.5">Ticket</p>
              <p className="font-medium">{detail.ticket_type?.name ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-0.5">Payment</p>
              <p className="font-medium capitalize">{detail.payment_status?.replace(/_/g, " ")}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-0.5">Attendee</p>
              <p className="font-medium truncate">{user?.name ?? "—"}</p>
            </div>
          </div>
        </div>

        {/* Waitlist explanation */}
        {isWaitlisted && (
          <div className="rounded-2xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-5 space-y-2">
            <div className="flex items-center gap-2 font-semibold text-amber-700 dark:text-amber-400">
              <Clock className="w-5 h-5" /> You're on the waitlist
            </div>
            <p className="text-sm text-amber-700/80 dark:text-amber-400/80 leading-relaxed">
              This event is currently at capacity. You've been added to the waitlist.
              We'll send you a notification if a spot becomes available and you're moved up.
              No QR code is issued until your spot is confirmed.
            </p>
          </div>
        )}

        {/* Cancelled explanation */}
        {isCancelled && (
          <div className="rounded-2xl bg-muted/50 border border-border p-5">
            <div className="flex items-center gap-2 font-semibold text-muted-foreground">
              <XCircle className="w-5 h-5" /> This registration is cancelled
            </div>
            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
              Your registration was cancelled. Your ticket is no longer valid.
            </p>
          </div>
        )}

        {/* ── Payment pending — resume Waafi payment ── */}
        {isPaymentPending && !isWaitlisted && !isCancelled && (
          <ParticipantWaafiPayment
            participationId={detail.id}
            eventName={eventTitle}
            ticketName={detail.ticket_type?.name ?? null}
            amount={detail.ticket_type?.price ?? "0"}
            currency="USD"
            onSuccess={() => load()}
            onFailure={(reason) => {
              // Component already shows it inline; also toast so it's not missed while scrolling
              toast.error(reason, { duration: 6000 });
            }}
            onCheckStatus={load}
          />
        )}

        {/* ── Payment failed — show message + retry ── */}
        {isPaymentFailed && !isWaitlisted && !isCancelled && (
          <ParticipantWaafiPayment
            participationId={detail.id}
            eventName={eventTitle}
            ticketName={detail.ticket_type?.name ?? null}
            amount={detail.ticket_type?.price ?? "0"}
            currency="USD"
            onSuccess={() => load()}
            onFailure={(reason) => {
              toast.error(reason, { duration: 6000 });
            }}
            onCheckStatus={load}
          />
        )}

        {/* ── Payment refunded ── */}
        {isPaymentRefunded && (
          <div className="rounded-2xl bg-muted/50 border border-border p-5 space-y-2">
            <div className="flex items-center gap-2 font-semibold text-muted-foreground">
              <XCircle className="w-5 h-5" /> Payment refunded
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              The payment for this registration has been refunded. Your ticket is no longer valid.
              If you believe this is an error, please contact the event organizer.
            </p>
          </div>
        )}

        {/* ── Invitation canvas — only when ticket is valid ── */}
        {ticketValid && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-display font-semibold text-lg tracking-[-0.01em]">Your invitation</h2>
              <Button
                size="sm"
                className="rounded-full h-9 text-sm gap-1.5"
                onClick={handleDownload}
                style={{ background: BRAND }}
              >
                <Download className="w-3.5 h-3.5" />
                Download PDF
              </Button>
            </div>

            <InvitationScaled>
              {invitation ? (
                <ConfiguredInvitation
                  detail={detail}
                  invitation={invitation}
                  qrDataUrl={qrDataUrl}
                  printRef={printRef}
                />
              ) : (
                <DefaultInvitation
                  detail={detail}
                  qrDataUrl={qrDataUrl}
                  printRef={printRef}
                />
              )}
            </InvitationScaled>
          </div>
        )}

        {/* QR standalone (below canvas, for easy mobile scan) — only when ticket is valid */}
        {ticketValid && detail.qr_token && (
          <div className="bg-card rounded-3xl p-6 flex flex-col items-center gap-4 shadow-sm">
            <p className="text-xs uppercase tracking-[0.18em] font-semibold text-muted-foreground">Scan at the door</p>
            <div className="bg-white rounded-2xl p-4 shadow-inner">
              {qrDataUrl ? (
                <img src={qrDataUrl} alt="QR code" className="w-48 h-48 sm:w-56 sm:h-56" />
              ) : (
                <div className="w-48 h-48 flex items-center justify-center">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground text-center">
              Show this QR code at the event entrance.
            </p>
          </div>
        )}

        {/* View event link */}
        {eventId && (
          <div className="text-center">
            <Link to={`/events/${eventId}`} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              View event page
            </Link>
          </div>
        )}

        <div ref={printRootRef} />
      </motion.div>
    </div>
  );
}
