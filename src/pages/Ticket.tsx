import { useEffect, useRef, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import QRCode from "qrcode";
import { ArrowLeft, Loader2, CalendarDays, MapPin, CheckCircle2, Download, Ticket as TicketIcon, Clock, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { getParticipation, type ApiParticipation } from "@/services/participationService";
import { getApiErrorMessage } from "@/lib/apiError";
import { getMediaUrl } from "@/lib/mediaUrl";

function formatDateTime(iso: string | null, tz?: string | null) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return new Intl.DateTimeFormat(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZone: tz || undefined,
      timeZoneName: "short",
    }).format(d);
  } catch {
    return iso;
  }
}

const BRAND_DEFAULT = "#7C3AED";

function deriveTicketData(p: ApiParticipation) {
  return {
    id: String(p.id),
    event_id: p.event_id ? String(p.event_id) : null,
    status: p.status,
    payment_status: p.payment_status,
    qr_token: p.qr_token,
    attendee_name: null as string | null, // resolved from user session below
    ticket_name: p.ticket_type?.name ?? null,
    event_name: p.event?.title ?? "Event",
    event_date: p.event?.starts_at ?? null,
    end_date: p.event?.ends_at ?? null,
    timezone: "Africa/Mogadishu" as const,
    location: p.event?.address ?? null,
    cover_image_url: p.event?.banner_url ?? (p.event?.banner_path ? getMediaUrl(p.event.banner_path) : null),
    primary_color: BRAND_DEFAULT,
  };
}

const WaitlistBadge = () => (
  <div className="mt-5 rounded-full bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400 px-4 py-2 text-xs font-medium flex items-center justify-center gap-2">
    <Clock className="w-4 h-4" />
    You&apos;re on the waitlist
  </div>
);

const PendingPaymentBadge = () => (
  <div className="mt-5 rounded-full bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400 px-4 py-2 text-xs font-medium flex items-center justify-center gap-2">
    <AlertTriangle className="w-4 h-4" />
    Payment pending
  </div>
);

const Ticket = () => {
  const { registrationId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [participation, setParticipation] = useState<ApiParticipation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const downloadRef = useRef<HTMLAnchorElement>(null);

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate(user ? "/dashboard/home" : "/");
    }
  };

  useEffect(() => {
    if (!registrationId) {
      setLoading(false);
      return;
    }

    const numericId = Number(registrationId);
    if (!Number.isFinite(numericId) || numericId <= 0) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    getParticipation(numericId)
      .then((p) => {
        if (cancelled) return;
        setParticipation(p);
      })
      .catch((err: any) => {
        if (cancelled) return;
        const status = err?.response?.status;
        if (status === 401 || status === 403) {
          navigate(`/auth?redirect=/registrations/${registrationId}`, { replace: true });
          return;
        }
        setError(getApiErrorMessage(err) || "Could not load your ticket.");
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => { cancelled = true; };
  }, [registrationId, navigate]);

  // Generate QR for the qr_token (not the raw ID)
  useEffect(() => {
    const qrValue = participation?.qr_token || registrationId;
    if (!qrValue) return;
    QRCode.toDataURL(qrValue, {
      width: 720,
      margin: 2,
      color: { dark: "#000000", light: "#ffffff" },
    })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(""));
  }, [participation, registrationId]);

  const handleDownload = () => {
    if (!qrDataUrl || !participation) return;
    const a = downloadRef.current;
    if (!a) return;
    const ticket = deriveTicketData(participation);
    a.href = qrDataUrl;
    a.download = `${ticket.event_name.replace(/[^\w-]+/g, "_")}_ticket.png`;
    a.click();
    toast.success("Ticket saved");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-7 h-7 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-background">
        <div className="max-w-md w-full bg-card rounded-3xl p-10 text-center">
          <AlertTriangle className="w-10 h-10 mx-auto mb-4 text-destructive" />
          <h1 className="text-2xl font-display font-bold mb-2">Couldn&apos;t load ticket</h1>
          <p className="text-muted-foreground text-sm mb-6">{error}</p>
          <Button onClick={handleBack} variant="outline" className="rounded-full h-11 px-5">
            <ArrowLeft className="w-4 h-4 mr-2" />
            {user ? "Back to my tickets" : "Back to home"}
          </Button>
        </div>
      </div>
    );
  }

  if (!participation) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-background">
        <div className="max-w-md w-full bg-card rounded-3xl p-10 text-center">
          <TicketIcon className="w-10 h-10 mx-auto mb-4 text-muted-foreground" />
          <h1 className="text-2xl font-display font-bold mb-2">Ticket not found</h1>
          <p className="text-muted-foreground text-sm mb-6">
            This ticket link is invalid or the event is no longer live.
          </p>
          <Button onClick={handleBack} variant="outline" className="rounded-full h-11 px-5">
            <ArrowLeft className="w-4 h-4 mr-2" />
            {user ? "Back to my tickets" : "Back to home"}
          </Button>
        </div>
      </div>
    );
  }

  const ticket = deriveTicketData(participation);
  ticket.attendee_name = user?.name ?? null;

  const brand = ticket.primary_color || BRAND_DEFAULT;
  const checkedIn = ticket.status === "checked_in";
  const isWaitlisted = ticket.status === "waitlisted";
  const paymentPending = ticket.payment_status === "pending";
  const qrValue = participation.qr_token || registrationId || "";

  return (
    <div className="min-h-screen bg-background px-4 py-8 sm:py-14 flex items-center justify-center overflow-x-hidden">
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-md"
      >
        <button
          type="button"
          onClick={handleBack}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4 -ml-1 px-2 h-9 rounded-full hover:bg-muted"
        >
          <ArrowLeft className="w-4 h-4" />
          {user ? "My tickets" : "Back"}
        </button>
        <div className="rounded-[28px] overflow-hidden bg-card shadow-[0_24px_70px_-20px_rgba(0,0,0,0.25)]">
          {/* Header band */}
          <div
            className="px-6 pt-7 pb-6 text-white relative"
            style={{ background: `linear-gradient(135deg, ${brand}, ${brand}cc)` }}
          >
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] opacity-90">
              <TicketIcon className="w-3.5 h-3.5" />
              Your ticket
            </div>
            <h1 className="font-display font-bold text-2xl sm:text-3xl mt-2 leading-tight tracking-[-0.02em]">
              {ticket.event_name}
            </h1>
            <div className="mt-4 text-sm/relaxed opacity-95">
              <div className="flex items-start gap-2">
                <CalendarDays className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{formatDateTime(ticket.event_date, ticket.timezone)}</span>
              </div>
              {ticket.location && (
                <div className="flex items-start gap-2 mt-1.5">
                  <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{ticket.location}</span>
                </div>
              )}
            </div>
          </div>

          {/* Perforation */}
          <div className="relative h-6 bg-card">
            <div className="absolute inset-x-4 top-1/2 -translate-y-1/2 border-t border-dashed border-border" />
            <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-background" />
            <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-background" />
          </div>

          {/* QR + details */}
          <div className="px-6 pb-7">
            {isWaitlisted || paymentPending ? (
              <div className="rounded-2xl bg-muted/40 flex items-center justify-center py-12">
                {isWaitlisted
                  ? <Clock className="w-14 h-14 text-muted-foreground/50" />
                  : <AlertTriangle className="w-14 h-14 text-muted-foreground/50" />}
              </div>
            ) : (
              <div className="rounded-2xl bg-white p-4 flex items-center justify-center">
                {qrDataUrl ? (
                  <img src={qrDataUrl} alt="Ticket QR code" className="w-full max-w-[260px] aspect-square" />
                ) : (
                  <div className="w-[260px] aspect-square flex items-center justify-center">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                )}
              </div>
            )}

            <div className="mt-5 space-y-2 text-center">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Attendee</p>
              <p className="font-display font-semibold text-lg">{ticket.attendee_name || "—"}</p>
              {ticket.ticket_name && (
                <p className="text-xs text-muted-foreground">{ticket.ticket_name}</p>
              )}
            </div>

            {checkedIn ? (
              <div className="mt-5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 px-4 py-2 text-xs font-medium flex items-center justify-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                Checked in
              </div>
            ) : isWaitlisted ? (
              <WaitlistBadge />
            ) : paymentPending ? (
              <PendingPaymentBadge />
            ) : (
              <div className="mt-5 rounded-full bg-muted text-muted-foreground px-4 py-2 text-xs font-medium text-center">
                Show this QR at the door
              </div>
            )}

            {!isWaitlisted && !paymentPending && (
              <Button
                onClick={handleDownload}
                className="w-full mt-5 rounded-full h-11 bg-foreground text-background hover:bg-foreground/90"
              >
                <Download className="w-4 h-4 mr-2" />
                Save ticket
              </Button>
            )}

            <p className="text-[11px] text-muted-foreground text-center mt-4">
              Bookmark this page to keep your ticket handy.
            </p>
          </div>
        </div>

        {ticket.event_id && (
          <div className="text-center mt-5">
            <Link
              to={`/events/${ticket.event_id}`}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              View event page
            </Link>
          </div>
        )}

        <a ref={downloadRef} className="hidden" />
      </motion.div>
    </div>
  );
};

export default Ticket;
