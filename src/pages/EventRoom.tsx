/**
 * /registrations/:registrationId/room
 *
 * Dedicated participant event room (not the ticket/invitation canvas):
 * join link, announcements, ask-a-speaker, feedback after the event ends.
 */

import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Loader2,
  MapPin,
  MessageSquare,
  RefreshCw,
  Ticket as TicketIcon,
  Video,
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { EventRoomExtras } from "@/components/participant/EventRoomExtras";
import { getApiErrorMessage } from "@/lib/apiError";
import { getMediaUrl } from "@/lib/mediaUrl";
import { asEventMode } from "@/lib/eventMode";
import {
  getParticipationFeedback,
  getParticipationInvitation,
  submitFeedback,
  type ApiFeedback,
  type ApiInvitationDetail,
} from "@/services/participationService";

function fmtDate(iso: string | null | undefined) {
  if (!iso) return "Date TBA";
  try {
    return new Intl.DateTimeFormat(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function StarRating({
  value,
  onChange,
  readonly,
}: {
  value: number;
  onChange?: (n: number) => void;
  readonly?: boolean;
}) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={readonly}
          onClick={() => onChange?.(n)}
          className={`text-xl leading-none ${readonly ? "cursor-default" : "cursor-pointer"} ${
            n <= value ? "text-amber-400" : "text-muted-foreground/30"
          }`}
          aria-label={`${n} stars`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

function FeedbackBlock({
  participationId,
  initialFeedback,
}: {
  participationId: number;
  initialFeedback: ApiFeedback | null;
}) {
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
      toast.error(getApiErrorMessage(err, "Could not submit feedback."));
    } finally {
      setSubmitting(false);
    }
  };

  if (feedback) {
    return (
      <div className="bg-card rounded-3xl p-5 sm:p-6 space-y-3 shadow-sm">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-muted-foreground" />
          <h2 className="font-display font-semibold text-lg">Your feedback</h2>
        </div>
        <div className="flex items-center gap-3">
          <StarRating value={feedback.rating} readonly />
          <span className="text-sm text-muted-foreground">{feedback.rating} / 5</span>
        </div>
        {feedback.comment && (
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{feedback.comment}</p>
        )}
        <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
          <CheckCircle2 className="w-3.5 h-3.5" /> Submitted
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="bg-card rounded-3xl p-5 sm:p-6 space-y-4 shadow-sm">
      <div className="flex items-center gap-2">
        <MessageSquare className="w-4 h-4 text-muted-foreground" />
        <h2 className="font-display font-semibold text-lg">How was the event?</h2>
      </div>
      <p className="text-sm text-muted-foreground">Share a rating after the event ends. Only you and the organizer see it.</p>
      <StarRating value={rating} onChange={setRating} />
      <Textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Optional comment…"
        rows={3}
        className="rounded-2xl"
      />
      <Button type="submit" className="rounded-full" disabled={submitting || rating === 0}>
        {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
        Submit feedback
      </Button>
    </form>
  );
}

export default function EventRoom() {
  const { registrationId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [detail, setDetail] = useState<ApiInvitationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<ApiFeedback | null | "unloaded">("unloaded");

  const numericId = Number(registrationId);

  const load = useCallback(() => {
    if (!Number.isFinite(numericId) || numericId <= 0) {
      setLoading(false);
      setError("Invalid registration.");
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);

    getParticipationInvitation(numericId)
      .then(async (d) => {
        if (cancelled) return;
        setDetail(d);
        const eventEnded =
          d.event?.status === "completed" ||
          (!!d.event?.ends_at && new Date(d.event.ends_at).getTime() < Date.now());
        if (eventEnded && d.status !== "cancelled") {
          try {
            const fb = await getParticipationFeedback(numericId);
            if (!cancelled) setFeedback(fb);
          } catch {
            if (!cancelled) setFeedback(null);
          }
        } else if (!cancelled) {
          setFeedback("unloaded");
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const status = (err as { response?: { status?: number } })?.response?.status;
        if (status === 401 || status === 403) {
          navigate(`/auth?redirect=/registrations/${registrationId}/room`, { replace: true });
          return;
        }
        if (status === 404) {
          setError("Registration not found.");
          return;
        }
        setError(getApiErrorMessage(err) || "Couldn't load event room.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [numericId, registrationId, navigate]);

  useEffect(() => {
    const cleanup = load();
    return () => {
      cleanup?.();
    };
  }, [load]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-background">
        <div className="max-w-md w-full bg-card rounded-3xl p-10 text-center space-y-4">
          <TicketIcon className="w-10 h-10 mx-auto text-muted-foreground" />
          <h1 className="text-2xl font-display font-bold">Event room unavailable</h1>
          <p className="text-sm text-muted-foreground">{error ?? "Registration not found."}</p>
          <Button variant="outline" className="rounded-full" onClick={() => navigate("/dashboard/home")}>
            <ArrowLeft className="w-4 h-4 mr-2" /> My registrations
          </Button>
        </div>
      </div>
    );
  }

  const event = detail.event;
  const eventId = event?.id;
  const eventTitle = event?.title ?? "Event";
  const eventMode = asEventMode(event?.event_mode);
  const isOnline = eventMode === "online" || eventMode === "hybrid";
  const banner = event?.banner_url ?? getMediaUrl(event?.banner_path);
  const eventEnded =
    event?.status === "completed" ||
    (!!event?.ends_at && new Date(event.ends_at).getTime() < Date.now());
  const showFeedback = eventEnded && detail.status !== "cancelled" && feedback !== "unloaded";
  const ticketValid =
    detail.status !== "cancelled" &&
    detail.status !== "waitlisted" &&
    (detail.payment_status === "paid" || detail.payment_status === "not_required");

  return (
    <div className="min-h-screen bg-background">
      <div className="relative h-40 sm:h-52 bg-muted overflow-hidden">
        {banner ? (
          <img src={banner} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/20 via-muted to-background" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
      </div>

      <div className="max-w-2xl mx-auto px-4 -mt-16 relative z-10 pb-16 space-y-6">
        <button
          type="button"
          onClick={() => navigate("/dashboard/home")}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors px-2 h-9 rounded-full hover:bg-muted"
        >
          <ArrowLeft className="w-4 h-4" />
          My registrations
        </button>

        <div className="bg-card rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
          <div className="space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
              Event room
            </p>
            <h1 className="font-display font-bold text-2xl sm:text-3xl tracking-[-0.02em] leading-tight">
              {eventTitle}
            </h1>
            {user?.name && (
              <p className="text-sm text-muted-foreground">Welcome, {user.name}</p>
            )}
          </div>

          <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
            {event?.starts_at && (
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="w-4 h-4" />
                {fmtDate(event.starts_at)}
              </span>
            )}
            {isOnline ? (
              <span className="inline-flex items-center gap-1.5">
                <Video className="w-4 h-4" />
                Online event
              </span>
            ) : event?.city || event?.address ? (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="w-4 h-4" />
                {event.city || event.address}
              </span>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            <Button asChild className="rounded-full" variant="outline" size="sm">
              <Link to={`/registrations/${detail.id}`}>
                <TicketIcon className="w-3.5 h-3.5 mr-1.5" />
                View ticket
              </Link>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="rounded-full"
              onClick={() => load()}
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
              Refresh
            </Button>
          </div>
        </div>

        {detail.status === "waitlisted" && (
          <div className="rounded-3xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-900 dark:text-amber-200">
            You are on the waitlist. Room features unlock when you get a confirmed seat.
          </div>
        )}

        {detail.status === "cancelled" && (
          <div className="rounded-3xl border border-destructive/30 bg-destructive/10 p-4 text-sm">
            This registration was cancelled.
          </div>
        )}

        {ticketValid && eventId && (
          <EventRoomExtras
            participationId={detail.id}
            eventId={eventId}
            onlineUrl={event?.online_url}
            isOnline={isOnline}
          />
        )}

        {showFeedback && (
          <FeedbackBlock
            participationId={detail.id}
            initialFeedback={feedback === "unloaded" ? null : feedback}
          />
        )}
      </div>
    </div>
  );
}
