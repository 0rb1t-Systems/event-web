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
  Sparkles,
  Ticket as TicketIcon,
  Video,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { PublicSiteHeader } from "@/components/layout/PublicSiteHeader";
import { useMyParticipations } from "@/hooks/queries/useParticipations";
import { roomSwitcherList } from "@/lib/nextEvent";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EventRoomExtras } from "@/components/participant/EventRoomExtras";
import { Reveal, StaggerGroup, StaggerItem } from "@/components/motion/Reveal";
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
    <div className="flex gap-1.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={readonly}
          onClick={() => onChange?.(n)}
          className={`text-2xl leading-none transition-transform ${
            readonly ? "cursor-default" : "cursor-pointer hover:scale-110 active:scale-95"
          } ${n <= value ? "text-amber-400" : "text-muted-foreground/25"}`}
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
      <div className="rounded-[1.75rem] border border-border/50 bg-card/80 backdrop-blur-sm p-6 sm:p-7 space-y-4 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
          </span>
          <div>
            <h2 className="font-display font-semibold text-lg tracking-[-0.01em]">Your feedback</h2>
            <p className="text-xs text-muted-foreground">Thanks for helping improve future events</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <StarRating value={feedback.rating} readonly />
          <span className="text-sm text-muted-foreground tabular-nums">{feedback.rating} / 5</span>
        </div>
        {feedback.comment && (
          <p className="text-sm text-muted-foreground whitespace-pre-wrap rounded-2xl bg-muted/40 px-4 py-3">
            {feedback.comment}
          </p>
        )}
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => void handleSubmit(e)}
      className="rounded-[1.75rem] border border-border/50 bg-card/80 backdrop-blur-sm p-6 sm:p-7 space-y-5 shadow-sm"
    >
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <MessageSquare className="w-5 h-5" />
        </span>
        <div>
          <h2 className="font-display font-semibold text-lg tracking-[-0.01em]">How was the event?</h2>
          <p className="text-xs text-muted-foreground">Only you and the organizer see this</p>
        </div>
      </div>
      <StarRating value={rating} onChange={setRating} />
      <Textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Optional comment…"
        rows={3}
        className="rounded-2xl bg-muted/30 border-0 focus-visible:ring-2"
      />
      <Button type="submit" className="rounded-full h-11 px-6" disabled={submitting || rating === 0}>
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
  const { data: parts } = useMyParticipations(!!user);

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
      <div className="house-page min-h-screen flex flex-col">
        <PublicSiteHeader />
        <div className="flex-1 flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Opening your event room…</p>
        </div>
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="house-page min-h-screen flex flex-col">
        <PublicSiteHeader />
        <div className="flex-1 flex items-center justify-center px-4">
        <div className="max-w-md w-full rounded-2xl border border-border bg-card p-10 text-center space-y-4 house-card">
          <TicketIcon className="w-10 h-10 mx-auto text-muted-foreground" />
          <h1 className="text-2xl font-display font-semibold tracking-tight">Event room unavailable</h1>
          <p className="text-sm text-muted-foreground">{error ?? "Registration not found."}</p>
          <Button variant="outline" onClick={() => navigate(`/registrations/${registrationId}`)}>
            <ArrowLeft className="w-4 h-4 mr-2" /> View ticket
          </Button>
        </div>
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
    (detail.payment_status === "paid" || detail.payment_status === "not_required");
  const firstName = user?.name?.split(" ")[0];
  const switcher = roomSwitcherList(parts?.items ?? []);

  return (
    <div className="house-page min-h-[100dvh]">
      <PublicSiteHeader />
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard/rooms")}>
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            Event rooms
          </Button>
          <div className="flex items-center gap-2">
            {switcher.length > 1 && (
              <Select
                value={String(detail.id)}
                onValueChange={(id) => navigate(`/registrations/${id}/room`)}
              >
                <SelectTrigger className="h-9 w-[10.5rem]">
                  <SelectValue placeholder="Switch event" />
                </SelectTrigger>
                <SelectContent>
                  {switcher.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.event?.title ?? `Ticket ${p.id}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Button type="button" size="sm" variant="outline" onClick={() => load()}>
              <RefreshCw className="w-3.5 h-3.5 sm:mr-1.5" />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
            <Button asChild size="sm">
              <Link to={`/registrations/${detail.id}`}>
                <TicketIcon className="w-3.5 h-3.5 mr-1.5" />
                View ticket
              </Link>
            </Button>
          </div>
        </div>

        <section className="relative overflow-hidden rounded-[1.5rem] border border-border bg-card house-card">
          {banner ? (
            <div className="relative h-48 overflow-hidden sm:h-56">
              <img src={banner} alt="" className="absolute inset-0 h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-white via-white/20 to-transparent" />
            </div>
          ) : null}
          <div className="relative px-6 py-8 sm:px-8">
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-primary">
              <Sparkles className="mr-1.5 inline h-3.5 w-3.5" />
              Event room
            </p>
            <h1 className="mt-2 font-display text-2xl font-semibold tracking-tight">
              {eventTitle}
            </h1>
            {firstName && (
              <p className="mt-3 max-w-[40ch] text-muted-foreground">
                {firstName}, this is your door for the event.
              </p>
            )}
            <div className="mt-5 flex flex-wrap gap-3 text-sm text-muted-foreground">
              {event?.starts_at && (
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays className="w-3.5 h-3.5 text-primary" />
                  {fmtDate(event.starts_at)}
                </span>
              )}
              {isOnline ? (
                <span className="inline-flex items-center gap-1.5">
                  <Video className="w-3.5 h-3.5 text-primary" />
                  Online
                </span>
              ) : event?.city || event?.address ? (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-primary" />
                  {event.city || event.address}
                </span>
              ) : null}
            </div>
          </div>
        </section>
      </div>

      <div className="mx-auto max-w-3xl px-4 pb-20 space-y-5 sm:px-6">
        {detail.status === "cancelled" && (
          <Reveal>
            <div className="rounded-[1.5rem] border border-destructive/25 bg-destructive/10 p-4 sm:p-5 text-sm">
              This registration was cancelled.
            </div>
          </Reveal>
        )}

        {ticketValid && eventId && (
          <StaggerGroup className="space-y-5" amount={0.12}>
            <StaggerItem>
              <EventRoomExtras
                participationId={detail.id}
                eventId={eventId}
                onlineUrl={event?.online_url}
                isOnline={isOnline}
              />
            </StaggerItem>
          </StaggerGroup>
        )}

        {showFeedback && (
          <Reveal delay={0.08}>
            <FeedbackBlock
              participationId={detail.id}
              initialFeedback={feedback === "unloaded" ? null : feedback}
            />
          </Reveal>
        )}
      </div>
    </div>
  );
}
