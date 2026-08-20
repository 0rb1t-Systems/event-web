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
  ArrowLeft, Award, CalendarDays, ExternalLink, MapPin, CheckCircle2, Clock,
  AlertTriangle, Download, Loader2, MessageSquare, Star,
  Ticket as TicketIcon, RefreshCw, XCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import {
  getParticipationInvitation,
  getParticipationFeedback,
  submitFeedback,
  getParticipationCertificate,
  type ApiInvitationDetail,
  type ApiFeedback,
  type ApiCertificateResult,
} from "@/services/participationService";
import { getApiErrorMessage } from "@/lib/apiError";
import { getMediaUrl } from "@/lib/mediaUrl";
import { toast } from "sonner";
import { ParticipantWaafiPayment } from "@/components/participant/ParticipantWaafiPayment";
import InvitationCanvasPreview, { InvitationScaled } from "@/components/invitation/InvitationCanvasPreview";
import { INVITATION_BRAND } from "@/lib/invitationCanvas";

const BRAND = INVITATION_BRAND;

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

// ─── Feedback panel ───────────────────────────────────────────────────────────

const StarRating = ({
  value,
  onChange,
  readonly,
}: {
  value: number;
  onChange?: (n: number) => void;
  readonly?: boolean;
}) => (
  <div className="flex gap-1">
    {[1, 2, 3, 4, 5].map((n) => (
      <button
        key={n}
        type="button"
        disabled={readonly}
        onClick={() => onChange?.(n)}
        className={`transition-transform ${readonly ? "cursor-default" : "hover:scale-110 active:scale-95"}`}
        aria-label={`${n} star${n !== 1 ? "s" : ""}`}
      >
        <Star
          className="w-7 h-7"
          fill={n <= value ? "#FBBF24" : "none"}
          stroke={n <= value ? "#FBBF24" : "currentColor"}
          strokeWidth={1.5}
        />
      </button>
    ))}
  </div>
);

const FeedbackPanel = ({
  participationId,
  initialFeedback,
}: {
  participationId: number;
  initialFeedback: ApiFeedback | null;
}) => {
  const [feedback, setFeedback] = useState<ApiFeedback | null>(initialFeedback);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) {
      toast.error("Please select a rating.");
      return;
    }
    setSubmitting(true);
    try {
      const result = await submitFeedback({
        participation_id: participationId,
        rating,
        comment: comment.trim() || null,
      });
      setFeedback(result);
      toast.success("Thank you for your feedback!");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Could not submit feedback. Please try again."));
    } finally {
      setSubmitting(false);
    }
  };

  // Already submitted — show read-only confirmation
  if (feedback) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card rounded-3xl p-6 space-y-4 shadow-sm"
      >
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-primary" />
          <h2 className="font-display font-semibold text-lg tracking-[-0.01em]">Your feedback</h2>
        </div>
        <div className="flex items-center gap-3">
          <StarRating value={feedback.rating} readonly />
          <span className="text-sm text-muted-foreground">{feedback.rating} / 5</span>
        </div>
        {feedback.comment && (
          <p className="text-sm text-muted-foreground leading-relaxed bg-muted/40 rounded-2xl px-4 py-3">
            {feedback.comment}
          </p>
        )}
        <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
          <CheckCircle2 className="w-3.5 h-3.5" />
          Submitted{feedback.submitted_at ? ` on ${new Date(feedback.submitted_at).toLocaleDateString()}` : ""}
        </div>
      </motion.div>
    );
  }

  // Form
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-3xl p-6 space-y-4 shadow-sm"
    >
      <div className="flex items-center gap-2">
        <MessageSquare className="w-5 h-5 text-primary" />
        <h2 className="font-display font-semibold text-lg tracking-[-0.01em]">How was the event?</h2>
      </div>
      <p className="text-sm text-muted-foreground">Your feedback helps organizers improve future events.</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <p className="text-xs font-medium text-foreground/70 uppercase tracking-wider">Rating</p>
          <StarRating value={rating} onChange={setRating} />
          {rating > 0 && (
            <p className="text-xs text-muted-foreground">
              {["", "Poor", "Fair", "Good", "Very good", "Excellent"][rating]}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <p className="text-xs font-medium text-foreground/70 uppercase tracking-wider">
            Comment <span className="normal-case font-normal text-muted-foreground">(optional)</span>
          </p>
          <Textarea
            placeholder="Share your thoughts about the event…"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            maxLength={5000}
            rows={3}
            className="rounded-2xl resize-none bg-muted/40 border-0 text-sm placeholder:text-muted-foreground/60 focus-visible:ring-2 focus-visible:ring-offset-0"
          />
        </div>

        <Button
          type="submit"
          disabled={submitting || rating === 0}
          className="rounded-full h-11 px-6 font-semibold"
        >
          {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting…</> : "Submit feedback"}
        </Button>
      </form>
    </motion.div>
  );
};

// ─── Certificate panel ─────────────────────────────────────────────────────────

const CertificatePanel = ({
  result,
}: {
  result: ApiCertificateResult;
}) => {
  if (!result.available || !result.certificate) {
    return (
      <div className="bg-card rounded-3xl p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <Award className="w-5 h-5 text-muted-foreground" />
          <h2 className="font-display font-semibold text-lg tracking-[-0.01em]">Certificate</h2>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Your certificate of attendance has not been issued yet. Organizers typically issue certificates
          after the event concludes. Check back later.
        </p>
      </div>
    );
  }

  const cert = result.certificate;
  const downloadUrl = cert.file_url || (cert.file_path ? getMediaUrl(cert.file_path) : null);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-3xl p-6 space-y-4 shadow-sm"
    >
      <div className="flex items-center gap-2">
        <Award className="w-5 h-5 text-primary" />
        <h2 className="font-display font-semibold text-lg tracking-[-0.01em]">Certificate of attendance</h2>
      </div>

      <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-sm font-medium">
        <CheckCircle2 className="w-4 h-4 shrink-0" />
        {cert.verified ? "Verified certificate" : "Certificate issued"}
      </div>

      {cert.issued_at && (
        <p className="text-xs text-muted-foreground">
          Issued on {new Date(cert.issued_at).toLocaleDateString()}
        </p>
      )}

      {downloadUrl && (
        <a
          href={downloadUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2"
        >
          <Button className="rounded-full h-11 px-6 gap-2 font-semibold">
            <Download className="w-4 h-4" />
            Download certificate
            <ExternalLink className="w-3.5 h-3.5 opacity-60" />
          </Button>
        </a>
      )}
    </motion.div>
  );
};


// ─── Print styles injected once ───────────────────────────────────────────────
// Invitation is a fixed 800×1100 canvas. Default Letter margins clip the bottom
// (QR lives near y≈820). Match page size to the canvas, scale to fit as fallback,
// and force backgrounds/images to paint.

let printStylesInjected = false;
function ensurePrintStyles() {
  if (printStylesInjected) return;
  printStylesInjected = true;
  const style = document.createElement("style");
  style.textContent = `
@media print {
  @page {
    size: 8.333in 11.458in;
    margin: 0;
  }
  html, body {
    margin: 0 !important;
    padding: 0 !important;
    width: 100% !important;
    height: 100% !important;
    background: white !important;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
  body * {
    visibility: hidden !important;
  }
  #print-root,
  #print-root * {
    visibility: visible !important;
  }
  #print-root {
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    position: fixed !important;
    inset: 0 !important;
    width: 100% !important;
    height: 100% !important;
    margin: 0 !important;
    padding: 0 !important;
    background: white !important;
    overflow: hidden !important;
    z-index: 9999 !important;
  }
  #print-root .invitation-print-sheet {
    position: relative !important;
    width: 800px !important;
    height: 1100px !important;
    max-width: none !important;
    margin: 0 !important;
    overflow: hidden !important;
    box-shadow: none !important;
    border-radius: 0 !important;
    transform: scale(min(100vw / 800px, 100vh / 1100px)) !important;
    transform-origin: center center !important;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
  #print-root img {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
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
  const [feedback, setFeedback] = useState<ApiFeedback | null | "unloaded">("unloaded");
  const [certificate, setCertificate] = useState<ApiCertificateResult | null>(null);

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
      .then(async (d) => {
        if (cancelled) return;
        setDetail(d);

        // Load feedback + certificate in parallel only for checked-in participations
        if (d.status === "checked_in") {
          const [fb, cert] = await Promise.allSettled([
            getParticipationFeedback(numericId),
            getParticipationCertificate(numericId),
          ]);
          if (!cancelled) {
            setFeedback(fb.status === "fulfilled" ? fb.value : null);
            setCertificate(cert.status === "fulfilled" ? cert.value : null);
          }
        } else {
          if (!cancelled) setFeedback("unloaded");
        }
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

    const canvas = document.getElementById("invitation-canvas");
    if (!canvas) {
      toast.error("Invitation is not ready to print yet.");
      return;
    }
    if (detail.qr_token && !qrDataUrl) {
      toast.error("QR code is still loading. Try again in a moment.");
      return;
    }

    // Clone into a dedicated print root so we never yank the live (scaled) canvas.
    // Restoring the live node while Chrome's print dialog is open was clipping the
    // bottom of the 800×1100 sheet (QR) and breaking layout in Save as PDF.
    let root = document.getElementById("print-root");
    if (!root) {
      root = document.createElement("div");
      root.id = "print-root";
      root.setAttribute("aria-hidden", "true");
      root.style.cssText = "display:none;position:fixed;inset:0;z-index:9999;background:white;";
      document.body.appendChild(root);
    }

    root.replaceChildren();
    const sheet = canvas.cloneNode(true) as HTMLElement;
    sheet.removeAttribute("id");
    sheet.classList.add("invitation-print-sheet");
    root.appendChild(sheet);

    let cleaned = false;
    const cleanup = () => {
      if (cleaned) return;
      cleaned = true;
      root.replaceChildren();
      window.removeEventListener("afterprint", cleanup);
    };

    window.addEventListener("afterprint", cleanup);
    // Defer so the clone is laid out before Chrome snapshots the page.
    requestAnimationFrame(() => {
      window.print();
    });
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
  const isCheckedIn = detail.status === "checked_in";
  const isPaymentPending = detail.payment_status === "pending";
  const isPaymentFailed = detail.payment_status === "failed";
  const isPaymentRefunded = detail.payment_status === "refunded";
  const ticketValid = hasValidTicket(detail.status, detail.payment_status);
  // "Check status" is useful whenever the payment outcome may still be resolving
  const showCheckStatus = isPaymentPending || isPaymentFailed;
  const eventTitle = detail.event?.title ?? "Event";
  const eventId = detail.event?.id;
  const invitation = detail.invitation;
  const feedbackLoaded = feedback !== "unloaded";
  const feedbackValue = feedbackLoaded ? feedback : null;

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
              <InvitationCanvasPreview
                printRef={printRef}
                model={{
                  eventTitle: detail.event?.title ?? "Event",
                  startsAt: detail.event?.starts_at,
                  venue: detail.event?.address ?? detail.event?.city,
                  ticketName: detail.ticket_type?.name,
                  attendeeName: user?.name ?? "Guest",
                  invitation,
                  qrDataUrl,
                }}
              />
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

        {/* ── Certificate — only for checked-in ── */}
        <AnimatePresence>
          {isCheckedIn && certificate && (
            <motion.div
              key="cert"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <CertificatePanel result={certificate} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Feedback — only for checked-in ── */}
        <AnimatePresence>
          {isCheckedIn && feedbackLoaded && (
            <motion.div
              key="feedback"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <FeedbackPanel
                participationId={detail.id}
                initialFeedback={feedbackValue}
              />
            </motion.div>
          )}
        </AnimatePresence>

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
