import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Share2 } from "lucide-react";
import { toast } from "sonner";
import { PublicSiteHeader } from "@/components/layout/PublicSiteHeader";
import { Hero } from "./Hero";
import { StickyRegisterBar } from "./StickyRegisterBar";
import { PublicModule, EventDetailSidebar, Sponsors } from "./PublicModule";
import { EventFactsBar } from "./EventFactsBar";
import { EventCard } from "./EventCard";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { useAuth } from "@/contexts/AuthContext";
import { formatTicketPrice } from "@/lib/ticketMoney";
import { PULSE } from "./pulseTheme";

type Event = any;
type EventModule = any;

interface Props {
  event: Event;
  modules: EventModule[];
  registerLabel?: string;
  registerDisabled?: boolean;
  lockedSlot?: React.ReactNode;
  onRegisterClick?: () => void;
}

function dateOnly(iso: string | null | undefined) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
}

function timeOnly(iso: string | null | undefined) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function timeRange(start?: string | null, end?: string | null) {
  const a = timeOnly(start);
  const b = timeOnly(end);
  if (a && b) return `${a} - ${b}`;
  return a || b || "";
}

function startingFromLabel(event: Event) {
  const tiers: Array<{ price: number; currency?: string; capacity?: number | null }> =
    Array.isArray(event.ticket_tiers) ? event.ticket_tiers : [];
  if (tiers.length === 0) return "Free";
  const open = tiers.filter((t) => t.capacity == null || t.capacity > 0);
  const pool = open.length > 0 ? open : tiers;
  const lowest = pool.reduce((min, t) => (t.price < min.price ? t : min), pool[0]);
  return formatTicketPrice(lowest.price, lowest.currency || "USD");
}

function splitBodyModules(body: EventModule[]) {
  const galleryIdx = body.findIndex((m) => m.type === "gallery");
  if (galleryIdx === -1) {
    return { columnModules: body, galleryModule: null, trailingModules: [] as EventModule[] };
  }
  return {
    columnModules: body.slice(0, galleryIdx),
    galleryModule: body[galleryIdx],
    trailingModules: body.slice(galleryIdx + 1),
  };
}

function EventSidebar({
  lockedSlot,
  priceLabel,
  registerLabel,
  registerDisabled,
  onRegisterClick,
  onShare,
  event,
  locationModule,
  organizer,
  sponsorsModule,
}: {
  lockedSlot?: React.ReactNode;
  priceLabel: string;
  registerLabel: string;
  registerDisabled?: boolean;
  onRegisterClick: () => void;
  onShare: () => void;
  event: Event;
  locationModule?: EventModule;
  organizer?: string;
  sponsorsModule?: EventModule;
}) {
  return (
    <aside className="space-y-4 lg:sticky lg:top-20">
      <section
        id="register"
        className="scroll-mt-28 rounded-2xl border border-border bg-card p-5 text-card-foreground sm:p-6"
      >
        {lockedSlot ? (
          lockedSlot
        ) : (
          <>
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
              Starting from
            </p>
            <p
              className="mt-1 font-display text-2xl font-bold tabular-nums tracking-tight"
              style={{ color: PULSE.tealDark }}
            >
              {priceLabel}
            </p>
            <button
              type="button"
              onClick={onRegisterClick}
              disabled={registerDisabled}
              className="mt-5 flex h-12 w-full items-center justify-center rounded-full text-sm font-semibold text-white disabled:opacity-60"
              style={{ background: PULSE.teal }}
            >
              {registerLabel}
            </button>
            <button
              type="button"
              onClick={onShare}
              className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-full border border-border text-sm font-medium text-foreground hover:bg-muted"
            >
              <Share2 className="h-4 w-4" />
              Share
            </button>
          </>
        )}
      </section>

      <EventDetailSidebar event={event} module={locationModule} />

      {organizer ? (
        <div className="rounded-2xl border border-border bg-card p-5 text-card-foreground">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
            Organized by
          </p>
          <div className="mt-3 flex items-center gap-3">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
              style={{ background: PULSE.ink }}
            >
              {organizer.charAt(0).toUpperCase()}
            </div>
            <p className="font-display text-sm font-semibold">{organizer}</p>
          </div>
        </div>
      ) : null}

      {sponsorsModule ? (
        <Sponsors module={sponsorsModule} brandColor={PULSE.teal} index={0} />
      ) : null}
    </aside>
  );
}

export function PublicEventPage({
  event,
  modules,
  registerLabel = "Register",
  registerDisabled,
  lockedSlot,
  onRegisterClick,
}: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleRegisterClick = () => {
    if (registerDisabled) return;
    if (!user) {
      navigate(`/auth?redirect=${encodeURIComponent(`/events/${event.id}`)}`);
      return;
    }
    onRegisterClick?.();
  };

  const handleShare = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: event.name, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      toast.success("Link copied.");
    } catch {
      /* cancelled */
    }
  };

  const { columnModules, galleryModule, trailingModules, locationModule, sponsorsModule } = useMemo(() => {
    const sorted = modules
      .filter((m) => m.enabled && m.type !== "faq")
      .sort((a, b) => a.position - b.position);
    const body = sorted.filter((m) => m.type !== "location" && m.type !== "sponsors");
    const split = splitBodyModules(body);
    return {
      ...split,
      locationModule: sorted.find((m) => m.type === "location"),
      sponsorsModule: sorted.find((m) => m.type === "sponsors"),
    };
  }, [modules]);

  const locationLabel =
    event.location_type === "physical" ? "In-Person" :
    event.location_type === "hybrid" ? "Hybrid" : "Virtual";

  const venueLabel =
    event.location_type === "virtual"
      ? "Online"
      : event.city || event.location || null;

  const description = typeof event.description === "string" ? event.description.trim() : "";
  const priceLabel = startingFromLabel(event);
  const organizer = event.organizer_business_name as string | undefined;

  const sidebarProps = {
    lockedSlot,
    priceLabel,
    registerLabel,
    registerDisabled,
    onRegisterClick: handleRegisterClick,
    onShare: () => void handleShare(),
    event,
    locationModule,
    organizer,
    sponsorsModule,
  };

  return (
    <div className="pulse-event min-h-screen overflow-x-hidden bg-background text-foreground">
      <PublicSiteHeader />

      <Hero
        event={event}
        onRegisterClick={handleRegisterClick}
        registerLabel={registerLabel}
        registerDisabled={registerDisabled}
      />

      <EventFactsBar
        dateLabel={dateOnly(event.event_date) || null}
        timeLabel={timeRange(event.event_date, event.event_end_date) || null}
        venueLabel={venueLabel}
        accessLabel={locationLabel}
      />

      <StickyRegisterBar
        brandColor={PULSE.teal}
        eventName={event.name}
        onRegisterClick={handleRegisterClick}
        registerLabel={registerLabel}
        registerDisabled={registerDisabled}
      />

      <div className="px-4 pb-8 pt-8 sm:px-6 sm:pb-10 sm:pt-9 lg:px-8">
        <div className="mx-auto max-w-6xl space-y-6 sm:space-y-8">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start lg:gap-8">
            <div className="space-y-4 sm:space-y-5">
              {description ? (
                <EventCard id="about" heading="About the event">
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                    {description}
                  </p>
                </EventCard>
              ) : null}

              {columnModules.map((m, i) => (
                <PublicModule key={m.id} module={m} brandColor={PULSE.teal} index={i} />
              ))}
            </div>

            <EventSidebar {...sidebarProps} />
          </div>

          {galleryModule ? (
            <PublicModule
              key={galleryModule.id}
              module={galleryModule}
              brandColor={PULSE.teal}
              index={columnModules.length}
              fullWidth
            />
          ) : null}

          {trailingModules.length > 0 ? (
            <div className="space-y-4 sm:space-y-5">
              {trailingModules.map((m, i) => (
                <PublicModule
                  key={m.id}
                  module={m}
                  brandColor={PULSE.teal}
                  index={columnModules.length + (galleryModule ? 1 : 0) + i}
                />
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <SiteFooter />
      <div className="h-24" aria-hidden />
    </div>
  );
}
