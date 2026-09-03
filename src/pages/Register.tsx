import { useState, useCallback, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useParams, useNavigate } from "react-router-dom";
import {
  Loader2, Clock, AlertTriangle, XCircle, Ticket as TicketIcon,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { publicApi } from "@/lib/api";
import { getApiErrorMessage } from "@/lib/apiError";
import {
  adaptPublicEventDetailToUi,
  type PublicEventDetailResponse,
  type PublicEventUiModel,
} from "@/lib/publicEventsAdapters";
import { PublicEventPage } from "@/components/event-public/PublicEventPage";
import { EventCountdown } from "@/components/event-public/EventCountdown";
import { PULSE } from "@/components/event-public/pulseTheme";
import { toast } from "sonner";
import { getMediaUrl } from "@/lib/mediaUrl";
import type { TicketTier } from "@/components/event-detail/TicketTiersManager";
import {
  createParticipation,
  listParticipations,
  type ApiParticipation,
} from "@/services/participationService";
import {
  validateParticipantDiscountCode,
  type DiscountQuote,
} from "@/services/participantDiscounts";
import { CheckoutLayout } from "@/components/event-checkout/CheckoutLayout";
import { TicketSelectStep } from "@/components/event-checkout/TicketSelectStep";
import { WaafiPayStep } from "@/components/event-checkout/WaafiPayStep";

type LockedReason =
  | "coming_soon"
  | "sold_out"
  | "registration_closed"
  | "deadline_passed"
  | "cancelled"
  | "completed"
  | "unavailable";

function resolveLockedReason(event: PublicEventUiModel): LockedReason | null {
  if (event.registration_gates?.allowed === true) return null;
  if (event.status === "sold_out") return "sold_out";
  if (event.status === "cancelled") return "cancelled";
  if (event.status === "completed") return "completed";
  if (event.status === "registration_closed") return "registration_closed";
  if (event.registration_gates?.reason === "deadline_passed") return "deadline_passed";
  if (event.status === "ongoing") return "registration_closed";
  if (event.status === "published" || event.status === "draft") return "coming_soon";
  return "unavailable";
}

const LOCKED_COPY: Record<
  LockedReason,
  { title: string; body: string; icon: "clock" | "sold" | "closed" | "ended" | "cancel" }
> = {
  coming_soon: {
    title: "Coming soon",
    body: "Registration is not open yet. Check back when the organizer opens tickets.",
    icon: "clock",
  },
  sold_out: {
    title: "Sold out",
    body: "All seats for this event have been taken. Registration is no longer available.",
    icon: "sold",
  },
  registration_closed: {
    title: "Registration closed",
    body: "The organizer has closed registration for this event.",
    icon: "closed",
  },
  deadline_passed: {
    title: "Registration ended",
    body: "The registration deadline has passed. New registrations are no longer accepted.",
    icon: "ended",
  },
  cancelled: {
    title: "Event cancelled",
    body: "This event has been cancelled. Registration is not available.",
    icon: "cancel",
  },
  completed: {
    title: "Event ended",
    body: "This event has already finished. Registration is closed.",
    icon: "ended",
  },
  unavailable: {
    title: "Registration unavailable",
    body: "Registration is not available for this event right now.",
    icon: "closed",
  },
};

const RegistrationLockedPanel = ({
  reason,
  startsAt,
}: {
  reason: LockedReason;
  startsAt?: string | null;
}) => {
  const copy = LOCKED_COPY[reason];
  const Icon =
    copy.icon === "clock"
      ? Clock
      : copy.icon === "sold"
        ? TicketIcon
        : copy.icon === "cancel"
          ? XCircle
          : AlertTriangle;

  return (
    <div className="flex flex-col items-start gap-3">
      <Icon className="h-7 w-7 text-muted-foreground" />
      <h2 className="font-display text-lg font-bold tracking-tight">{copy.title}</h2>
      <p className="text-sm leading-relaxed text-muted-foreground">{copy.body}</p>
      {reason === "coming_soon" ? <EventCountdown targetIso={startsAt} tone="light" className="mt-1 justify-start" /> : null}
    </div>
  );
};

type PageView =
  | { kind: "detail" }
  | { kind: "select" }
  | { kind: "waafi"; participation: ApiParticipation }
  | { kind: "fail"; participation: ApiParticipation; reason: string };

const Register = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const eventId = id ? Number(id) : NaN;

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retryNonce, setRetryNonce] = useState(0);

  const [event, setEvent] = useState<PublicEventUiModel | null>(null);
  const [modules, setModules] = useState<any[]>([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [consent, setConsent] = useState(false);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [discountCode, setDiscountCode] = useState("");
  const [discountQuote, setDiscountQuote] = useState<DiscountQuote | null>(null);
  const [discountApplying, setDiscountApplying] = useState(false);
  const [discountError, setDiscountError] = useState<string | null>(null);

  const [view, setView] = useState<PageView>({ kind: "detail" });

  const chargeInFlightRef = useRef(false);

  const tickets: TicketTier[] = event?.ticket_tiers ?? [];

  useEffect(() => {
    if (tickets.length === 1 && !selectedTicketId) setSelectedTicketId(tickets[0].id);
  }, [tickets, selectedTicketId]);

  const clearDiscount = useCallback(() => {
    setDiscountQuote(null);
    setDiscountError(null);
    setDiscountCode("");
  }, []);

  const handleSelectTicket = useCallback((ticketId: string) => {
    setSelectedTicketId(ticketId);
    setDiscountQuote(null);
    setDiscountError(null);
  }, []);

  const handleApplyDiscount = useCallback(async () => {
    if (!event || !selectedTicketId || !discountCode.trim()) return;
    if (!user) {
      navigate(`/auth?redirect=${encodeURIComponent(`/events/${event.id}`)}`);
      return;
    }
    setDiscountApplying(true);
    setDiscountError(null);
    try {
      const quote = await validateParticipantDiscountCode(event.id, {
        code: discountCode.trim(),
        ticket_type_id: Number(selectedTicketId),
      });
      setDiscountQuote(quote);
      setDiscountCode(quote.code);
      toast.success(`Code ${quote.code} applied`);
    } catch (err) {
      setDiscountQuote(null);
      setDiscountError(getApiErrorMessage(err, "This discount code can't be used."));
    } finally {
      setDiscountApplying(false);
    }
  }, [discountCode, event, navigate, selectedTicketId, user]);

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (!chargeInFlightRef.current) return;
      e.preventDefault();
      e.returnValue = "A payment is in progress. Are you sure you want to leave?";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  const formatSessionTime = (iso: string | null | undefined) => {
    if (!iso) return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  };

  const buildModules = (ui: PublicEventUiModel): any[] => {
    const sessions = ui.sessions ?? [];
    const speakers = ui.speakers ?? [];
    const sponsors = ui.sponsors ?? [];

    const speakerPhoto = (sp: { photo_url?: string | null; photo_path?: string | null }) =>
      sp.photo_url ?? (sp.photo_path ? getMediaUrl(sp.photo_path) : undefined);

    const scheduleItems =
      sessions.length > 0
        ? sessions
            .slice()
            .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
            .map((s) => {
              const nested = s.speaker ?? null;
              const byId =
                s.speaker_id != null ? speakers.find((sp) => sp.id === s.speaker_id) : undefined;
              const sp = nested ?? byId;
              return {
                time: formatSessionTime(s.starts_at),
                endTime: formatSessionTime(s.ends_at),
                title: s.title || s.room || "Session",
                description: s.description || undefined,
                room: s.room || undefined,
                starts_at: s.starts_at,
                speaker: sp
                  ? { name: sp.name, avatar: speakerPhoto(sp) }
                  : undefined,
              };
            })
        : [];

    const people =
      speakers.length > 0
        ? speakers.map((sp) => ({
            name: sp.name,
            role: sp.title || sp.organization || "",
            avatar: speakerPhoto(sp),
            bio: sp.bio || undefined,
          }))
        : [];

    const partners =
      sponsors.length > 0
        ? sponsors.map((s) => {
            const raw =
              (s as { logo_url?: string | null }).logo_url || s.logo_path || null;
            return {
              name: s.name,
              logo: raw ? getMediaUrl(raw) : undefined,
            };
          })
        : [];

    const galleryUrls = (ui.images ?? [])
      .map((im) => (im.path ? getMediaUrl(im.path) : undefined))
      .filter(Boolean) as string[];

    const whyBullets = (ui.why_attend ?? []).map((b) => String(b).trim()).filter(Boolean).slice(0, 6);

    const modulesOut: any[] = [];

    if (whyBullets.length > 0) {
      modulesOut.push({
        id: "why-attend",
        type: "why_attend",
        enabled: true,
        position: 0,
        title: "Why Attend",
        content: { heading: "Why attend this event", bullets: whyBullets },
      });
    }

    if (scheduleItems.length > 0) {
      modulesOut.push({
        id: "schedule",
        type: "schedule",
        enabled: true,
        position: 1,
        title: "Schedule",
        content: { heading: "Agenda", items: scheduleItems },
      });
    }

    if (people.length > 0) {
      modulesOut.push({
        id: "speakers",
        type: "speakers",
        enabled: true,
        position: 2,
        title: "Speakers",
        content: { heading: "Featured speakers", people },
      });
    }

    if (partners.length > 0) {
      modulesOut.push({
        id: "sponsors",
        type: "sponsors",
        enabled: true,
        position: 3,
        title: "Partners",
        content: {
          heading: "Partners",
          partners,
          logos: partners.map((p) => p.logo).filter(Boolean) as string[],
        },
      });
    }

    const hasVenue = ui.location_type !== "virtual" && !!(ui.city || ui.location);
    const isOnline = ui.location_type === "virtual" || ui.location_type === "hybrid";
    if (hasVenue || isOnline) {
      modulesOut.push({
        id: "location",
        type: "location",
        enabled: true,
        position: 4,
        title: "Location",
        content: {
          heading: ui.location_type === "virtual" ? "Online event" : "Venue",
          venue: ui.city ?? (ui.location_type === "virtual" ? "Online event" : undefined),
          address: ui.location ?? (isOnline && !hasVenue ? "Meeting link shared after registration" : undefined),
          image_url: ui.background_image_url || galleryUrls[0],
          showMap: hasVenue,
        },
      });
    }

    if (galleryUrls.length > 0) {
      modulesOut.push({
        id: "gallery",
        type: "gallery",
        enabled: true,
        position: 5,
        title: "Gallery",
        content: { heading: "Gallery", images: galleryUrls },
      });
    }

    return modulesOut;
  };

  useEffect(() => {
    if (!Number.isFinite(eventId)) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    let cancelled = false;
    let redirected = false;
    setLoading(true);
    setNotFound(false);
    setLoadError(null);

    const eventPromise = publicApi.get<PublicEventDetailResponse>(`/events/${eventId}`);
    const participationPromise =
      user && Number.isFinite(eventId)
        ? listParticipations({ per_page: 50 }).catch(() => null)
        : Promise.resolve(null);

    Promise.all([eventPromise, participationPromise])
      .then(([eventResp, participationResult]) => {
        if (cancelled) return;

        if (participationResult) {
          const existing = participationResult.items.find(
            (p) => p.event_id === eventId && p.status !== "cancelled",
          );
          if (existing) {
            redirected = true;
            navigate(`/registrations/${existing.id}`, { replace: true });
            return;
          }
        }

        const apiEvent = eventResp.data.data;
        setEvent(adaptPublicEventDetailToUi(apiEvent));
        setModules(buildModules(adaptPublicEventDetailToUi(apiEvent)));
      })
      .catch((err: any) => {
        if (cancelled) return;
        const status = err?.response?.status;
        if (status === 404) {
          setNotFound(true);
        } else {
          setLoadError(getApiErrorMessage(err));
        }
      })
      .finally(() => {
        if (cancelled || redirected) return;
        setLoading(false);
      });

    return () => { cancelled = true; };
  }, [eventId, retryNonce, user, navigate]);

  const registrationAllowed = event?.registration_gates?.allowed === true;
  const lockedReason = event ? resolveLockedReason(event) : null;
  const submitDisabled = !registrationAllowed;

  const registerLabel = (() => {
    if (!event) return "Register";
    if (registrationAllowed) return "Register";
    if (lockedReason) return LOCKED_COPY[lockedReason].title;
    return "Registration closed";
  })();

  const openCheckout = () => {
    if (!event || submitDisabled || lockedReason) return;
    if (!user) {
      navigate(`/auth?redirect=${encodeURIComponent(`/events/${event.id}`)}`);
      return;
    }
    setView({ kind: "select" });
    window.scrollTo({ top: 0, behavior: "auto" });
  };

  const handleComplete = async () => {
    if (!event) return;
    if (submitDisabled) {
      toast.error(registerLabel);
      return;
    }
    if (!user) {
      navigate(`/auth?redirect=${encodeURIComponent(`/events/${event.id}`)}`);
      return;
    }
    if (!consent) {
      toast.error("Please accept the privacy policy to register.");
      return;
    }
    if (tickets.length > 0 && !selectedTicketId) {
      toast.error("Please choose a ticket to continue.");
      return;
    }

    setIsSubmitting(true);
    const selectedTicketNum = selectedTicketId ? Number(selectedTicketId) : null;

    try {
      const participation = await createParticipation({
        event_id: event.id,
        ticket_type_id: selectedTicketNum || undefined,
        discount_code: discountQuote?.code || undefined,
      });

      if (participation.status === "waitlisted") {
        toast.error("This event is sold out.");
        return;
      }

      if (
        participation.payment_status === "not_required" ||
        participation.payment_status === "paid"
      ) {
        navigate(`/registrations/${participation.id}`);
        return;
      }

      if (participation.payment_status === "pending") {
        setView({ kind: "waafi", participation });
        return;
      }

      navigate(`/registrations/${participation.id}`);
    } catch (err: any) {
      const msg = getApiErrorMessage(err);
      const status = err?.response?.status;
      if (status === 422) {
        const errors = err?.response?.data?.errors;
        if (errors) {
          const firstError = Object.values(errors).flat()[0] as string;
          toast.error(firstError || msg);
        } else {
          toast.error(msg);
        }
      } else if (
        msg.toLowerCase().includes("already has an active participation") ||
        msg.toLowerCase().includes("duplicate")
      ) {
        toast.error("You're already registered for this event. Check your tickets.");
        setTimeout(() => navigate("/dashboard/home"), 1500);
      } else if (
        msg.toLowerCase().includes("deadline") ||
        msg.toLowerCase().includes("deadline has passed")
      ) {
        toast.error("Registration deadline has passed.");
      } else if (msg.toLowerCase().includes("closed") || msg.toLowerCase().includes("registration closed")) {
        toast.error("Registration is closed for this event.");
      } else if (msg.toLowerCase().includes("sold out") || msg.toLowerCase().includes("capacity reached")) {
        toast.error("This event is sold out.");
      } else if (msg.toLowerCase().includes("ticket type") && msg.toLowerCase().includes("invalid")) {
        toast.error("The selected ticket is no longer available.");
      } else if (msg.toLowerCase().includes("sales are disabled")) {
        toast.error("This ticket type is no longer on sale.");
      } else if (
        msg.toLowerCase().includes("discount") ||
        String(err?.response?.data?.errors?.error_code?.[0] || "").startsWith("discount_")
      ) {
        toast.error(msg || "This discount code can't be used.");
        setDiscountQuote(null);
        setDiscountError(msg);
      } else {
        toast.error(msg || "Registration failed. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePaymentSuccess = (participation: ApiParticipation) => {
    chargeInFlightRef.current = false;
    navigate(`/registrations/${participation.id}`);
  };

  const handlePaymentFailure = (reason: string) => {
    chargeInFlightRef.current = false;
    if (view.kind === "waafi") {
      setView({ kind: "fail", participation: view.participation, reason });
    }
  };

  const handlePaymentCancel = () => {
    chargeInFlightRef.current = false;
    if (view.kind === "waafi") {
      toast("You can finish payment from your registration page. Unpaid seats are released after 15 minutes.");
      navigate(`/registrations/${view.participation.id}`);
    } else {
      setView({ kind: "detail" });
    }
  };

  if (loading) {
    return (
      <div className="pulse-event min-h-screen overflow-x-hidden bg-background text-foreground">
        <div className="mx-4 mt-4 h-[42vh] rounded-[1.75rem] sm:mx-6" style={{ background: `linear-gradient(180deg, ${PULSE.navy}, ${PULSE.sky})` }} />
        <div className="mx-auto max-w-3xl space-y-4 px-4 py-10">
          <Skeleton className="h-10 w-2/3 rounded-full" />
          <Skeleton className="h-5 w-full rounded-full" />
          <Skeleton className="h-5 w-5/6 rounded-full" />
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="pulse-event flex min-h-screen flex-col bg-background text-foreground">
        <div className="flex flex-1 items-center justify-center px-4">
        <Card className="w-full max-w-md rounded-[1.75rem] border-border bg-card">
          <CardContent className="p-8 text-center">
            <h1 className="mb-2 font-display text-2xl font-bold">Couldn&apos;t load event</h1>
            <p className="mb-6 text-muted-foreground">{loadError}</p>
            <Button className="rounded-full" onClick={() => setRetryNonce((n) => n + 1)}>
              Retry
            </Button>
          </CardContent>
        </Card>
        </div>
      </div>
    );
  }

  if (notFound || !event) {
    return (
      <div className="pulse-event flex min-h-screen flex-col bg-background text-foreground">
        <div className="flex flex-1 items-center justify-center px-4">
        <Card className="w-full max-w-md rounded-[1.75rem] border-border bg-card">
          <CardContent className="p-8 text-center">
            <h1 className="mb-2 font-display text-2xl font-bold">Event not found</h1>
            <p className="mb-6 text-muted-foreground">This event may have ended or is not publicly available.</p>
            <Button className="rounded-full" onClick={() => navigate("/")}>
              Return to Home
            </Button>
          </CardContent>
        </Card>
        </div>
      </div>
    );
  }

  const selectedTicket = tickets.find((t) => t.id === selectedTicketId);
  const unitPrice = selectedTicket?.price ?? 0;
  const quoteFinal = discountQuote ? Number(discountQuote.final_amount) : null;
  const displayTotal =
    quoteFinal != null && Number.isFinite(quoteFinal) ? quoteFinal : unitPrice;
  const currency = selectedTicket?.currency || "USD";
  const ticketName = selectedTicket?.name || "Admission";

  const backToEvent = () => setView({ kind: "detail" });

  if (view.kind === "select" || view.kind === "waafi" || view.kind === "fail") {
    if (view.kind === "waafi") chargeInFlightRef.current = true;

    const stepId =
      view.kind === "select" ? "selection" as const : "payment" as const;

    return (
      <CheckoutLayout
        eventId={event.id}
        eventName={event.name}
        current={stepId}
        onBackToEvent={backToEvent}
      >
        {view.kind === "select" ? (
          <TicketSelectStep
            tickets={tickets}
            selectedId={selectedTicketId}
            onSelect={handleSelectTicket}
            discountCode={discountCode}
            onDiscountCodeChange={(v) => {
              setDiscountCode(v);
              if (discountQuote) setDiscountQuote(null);
              if (discountError) setDiscountError(null);
            }}
            discountQuote={discountQuote}
            discountApplying={discountApplying}
            discountError={discountError}
            onApplyDiscount={() => void handleApplyDiscount()}
            onClearDiscount={clearDiscount}
            consent={consent}
            onConsentChange={setConsent}
            isSubmitting={isSubmitting}
            onComplete={() => void handleComplete()}
          />
        ) : view.kind === "fail" ? (
          <div className="mx-auto max-w-md rounded-2xl border border-border bg-card p-8 text-center">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
              <AlertTriangle className="h-8 w-8 text-destructive" />
            </div>
            <h2 className="font-display text-lg font-semibold tracking-tight">Payment failed</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {view.reason} You can try paying again without re-registering.
            </p>
            <Button
              className="mt-6 h-11 rounded-full px-6 text-white"
              style={{ background: PULSE.teal }}
              onClick={() => setView({ kind: "waafi", participation: view.participation })}
            >
              Try payment again
            </Button>
          </div>
        ) : (
          <WaafiPayStep
            participation={view.participation}
            eventName={event.name}
            eventImage={event.background_image_url}
            ticketName={ticketName}
            currency={currency}
            unitPrice={unitPrice}
            discountQuote={discountQuote}
            displayTotal={displayTotal}
            waafiAmount={
              view.participation.final_amount
              ?? (selectedTicket?.price != null ? String(selectedTicket.price) : undefined)
            }
            onWaafiSuccess={handlePaymentSuccess}
            onWaafiFailure={handlePaymentFailure}
            onWaafiCancel={handlePaymentCancel}
          />
        )}
      </CheckoutLayout>
    );
  }

  return (
    <div className="overflow-x-hidden">
      <PublicEventPage
        event={event}
        modules={modules}
        registerLabel={registerLabel}
        registerDisabled={submitDisabled || !!lockedReason}
        onRegisterClick={openCheckout}
        lockedSlot={
          lockedReason ? (
            <RegistrationLockedPanel reason={lockedReason} startsAt={event.event_date} />
          ) : undefined
        }
      />
    </div>
  );
};

export default Register;
