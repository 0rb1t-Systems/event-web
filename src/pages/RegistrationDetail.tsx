/**
 * /registrations/:registrationId
 *
 * Participant registration / ticket detail:
 *  - Status + payment
 *  - Static EventHub ticket stub (QR when valid)
 *  - PNG download of that stub (ticket only)
 */

import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft, Award, ExternalLink, CheckCircle2, Clock,
  AlertTriangle, Download, Loader2, CalendarDays, Share2,
  Ticket as TicketIcon, RefreshCw, XCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import {
  getParticipationInvitation,
  getParticipationCertificate,
  type ApiInvitationDetail,
  type ApiCertificateResult,
} from "@/services/participationService";
import { getApiErrorMessage } from "@/lib/apiError";
import { getMediaUrl } from "@/lib/mediaUrl";
import { toast } from "sonner";
import { ParticipantWaafiPayment } from "@/components/participant/ParticipantWaafiPayment";
import { asEventMode } from "@/lib/eventMode";
import { PublicSiteHeader } from "@/components/layout/PublicSiteHeader";
import { PurchasedTicketStub } from "@/components/participant/PurchasedTicketStub";
import { downloadTicketPng } from "@/lib/ticketImage";

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
 *   - participation is not cancelled
 *   - payment is confirmed (paid) or not required (free event)
 *
 * All other payment states (pending, failed, refunded) must NOT show a valid ticket.
 */
function hasValidTicket(status: Status, paymentStatus: PaymentStatus): boolean {
  if (status === "cancelled") return false;
  return paymentStatus === "paid" || paymentStatus === "not_required";
}

function padSerial(id: number) {
  return `EH-${String(id).padStart(5, "0")}`;
}

function googleCalendarUrl(title: string, startIso?: string | null, location?: string | null) {
  if (!startIso) return null;
  const start = new Date(startIso);
  if (Number.isNaN(start.getTime())) return null;
  const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    dates: `${fmt(start)}/${fmt(end)}`,
  });
  if (location) params.set("location", location);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

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


// ─── Main component ───────────────────────────────────────────────────────────

export default function RegistrationDetail() {
  const { registrationId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [detail, setDetail] = useState<ApiInvitationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [certificate, setCertificate] = useState<ApiCertificateResult | null>(null);
  const [downloading, setDownloading] = useState(false);

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

        if (d.status === "checked_in") {
          try {
            const cert = await getParticipationCertificate(numericId);
            if (!cancelled) setCertificate(cert);
          } catch {
            /* optional */
          }
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

  const handleDownload = async () => {
    if (!detail || !hasValidTicket(detail.status, detail.payment_status) || downloading) return;
    setDownloading(true);
    try {
      await downloadTicketPng({
        id: detail.id,
        title: detail.event?.title ?? "Event",
        startsAt: detail.event?.starts_at,
        ticketType: detail.ticket_type?.name,
        qrToken: asEventMode(detail.event?.event_mode) === "online" ? null : detail.qr_token,
        valid: true,
        statusLabel: statusMeta(detail.status, detail.payment_status).label,
      });
    } catch {
      toast.error("Couldn't download the ticket. Try again.");
    } finally {
      setDownloading(false);
    }
  };

  const handleBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate("/dashboard/home");
  };

  // ── Loading ──

  if (loading) {
    return (
      <div className="house-page min-h-screen">
        <PublicSiteHeader />
        <div className="px-4 py-8 sm:py-14">
        <div className="max-w-2xl mx-auto space-y-6">
          <Skeleton className="h-9 w-48 rounded-full" />
          <Skeleton className="h-6 w-64" />
          <Skeleton className="h-[480px] w-full rounded-3xl" />
          <Skeleton className="h-12 w-full rounded-full" />
        </div>
        </div>
      </div>
    );
  }

  // ── Error ──

  if (error) {
    return (
      <div className="house-page min-h-screen flex flex-col">
        <PublicSiteHeader />
        <div className="flex-1 flex items-center justify-center px-4">
        <div className="max-w-md w-full house-card bg-card rounded-3xl border border-border p-10 text-center">
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
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="house-page min-h-screen flex flex-col">
        <PublicSiteHeader />
        <div className="flex-1 flex items-center justify-center px-4">
        <div className="max-w-md w-full house-card bg-card rounded-3xl border border-border p-10 text-center">
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
      </div>
    );
  }

  const meta = statusMeta(detail.status, detail.payment_status);
  const isCancelled = detail.status === "cancelled";
  const isCheckedIn = detail.status === "checked_in";
  const isPaymentPending = detail.payment_status === "pending";
  const isPaymentFailed = detail.payment_status === "failed";
  const isPaymentRefunded = detail.payment_status === "refunded";
  const ticketValid = hasValidTicket(detail.status, detail.payment_status);
  const eventMode = asEventMode(detail.event?.event_mode);
  const isOnline = eventMode === "online";
  const eventEnded =
    detail.event?.status === "completed" ||
    (!!detail.event?.ends_at && new Date(detail.event.ends_at).getTime() < Date.now());
  // "Check status" is useful whenever the payment outcome may still be resolving
  const showCheckStatus = isPaymentPending && !isCancelled;
  const eventTitle = detail.event?.title ?? "Event";
  const eventId = detail.event?.id;
  const showFeedbackHint = eventEnded && detail.status !== "cancelled";
  const eventLocation = [detail.event?.address, detail.event?.city].filter(Boolean).join(", ") || null;
  const calendarHref = googleCalendarUrl(eventTitle, detail.event?.starts_at, eventLocation);

  const handleShare = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: eventTitle, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      toast.success("Link copied.");
    } catch {
      /* user cancelled */
    }
  };

  return (
    <div className="house-page min-h-[100dvh] overflow-x-hidden">
    <PublicSiteHeader />
    <div className="px-4 py-8 sm:py-14">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="max-w-2xl mx-auto space-y-6"
      >
        {/* Back + enter room (room is a separate page from this ticket) */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={handleBack}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors -ml-1 px-2 h-9 rounded-full hover:bg-muted"
          >
            <ArrowLeft className="w-4 h-4" />
            My Tickets
          </button>
          {ticketValid && (
            <Button asChild size="sm" className="rounded-full">
              <Link to="/dashboard/rooms">
                Event rooms
              </Link>
            </Button>
          )}
        </div>

        {ticketValid ? (
          <div className="text-center space-y-2 pb-2">
            <h1 className="font-display text-2xl font-semibold tracking-tight">Registration confirmed</h1>
            <p className="text-sm text-muted-foreground">
              Order <span className="font-mono font-semibold text-foreground">{padSerial(detail.id)}</span> is in your wallet
              {user?.email ? (
                <>
                  . Details were sent to{" "}
                  <span className="text-primary">{user.email}</span>
                </>
              ) : (
                "."
              )}
            </p>
          </div>
        ) : (
          <h1 className="font-display text-2xl font-semibold tracking-tight">Your registration</h1>
        )}

        <PurchasedTicketStub
          id="ticket-stub"
          ticket={{
            id: detail.id,
            title: eventTitle,
            location: eventLocation,
            startsAt: detail.event?.starts_at,
            ticketType: detail.ticket_type?.name,
            qrToken: ticketValid && !isOnline ? detail.qr_token : null,
            valid: ticketValid,
            statusLabel: meta.label,
          }}
        />

        {ticketValid ? (
          <div className="flex flex-wrap justify-center gap-2">
            <Button className="rounded-full" onClick={() => void handleDownload()} disabled={downloading}>
              {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              Download ticket
            </Button>
            {calendarHref ? (
              <Button variant="outline" className="rounded-full" asChild>
                <a href={calendarHref} target="_blank" rel="noreferrer">
                  <CalendarDays className="w-4 h-4" />
                  Add to calendar
                </a>
              </Button>
            ) : null}
            <Button type="button" variant="outline" className="rounded-full" onClick={() => void handleShare()}>
              <Share2 className="w-4 h-4" />
              Share event
            </Button>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className={`inline-flex items-center gap-2 text-sm font-semibold px-3 py-1.5 rounded-full ${meta.cls}`}>
            {meta.icon}
            {meta.label}
          </div>
          {showCheckStatus && (
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs gap-1.5"
              onClick={load}
            >
              <RefreshCw className="w-3 h-3" /> Check status
            </Button>
          )}
        </div>

        {/* Cancelled explanation */}
        {isCancelled && (
          <div className="rounded-2xl bg-muted/50 border border-border p-5">
            <div className="flex items-center gap-2 font-semibold text-muted-foreground">
              <XCircle className="w-5 h-5" /> This registration is cancelled
            </div>
            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
              Your registration was cancelled. Your ticket is no longer valid.
              {isPaymentFailed
                ? " Payment did not go through, so this seat was released."
                : ""}
            </p>
            {isPaymentFailed && eventId ? (
              <Button asChild className="mt-4 rounded-full h-10">
                <Link to={`/events/${eventId}`}>Register again</Link>
              </Button>
            ) : null}
          </div>
        )}

        {/* ── Payment pending — resume Waafi payment ── */}
        {isPaymentPending && !isCancelled && (
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
        {isPaymentFailed && !isCancelled && (
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

        {/* Feedback lives in the event room after the event ends */}
        {showFeedbackHint && (
          <div className="rounded-3xl border border-border/60 bg-muted/30 p-4 text-center text-sm text-muted-foreground">
            Feedback is available in the{" "}
            <Link to={`/registrations/${detail.id}/room`} className="text-primary font-medium hover:underline">
              event room
            </Link>
            .
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
      </motion.div>
    </div>
    </div>
  );
}
