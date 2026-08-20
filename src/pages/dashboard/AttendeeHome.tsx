import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, MapPin, Ticket, ArrowRight, RefreshCw } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { listParticipations, type ApiParticipation } from "@/services/participationService";
import { publicApi } from "@/lib/api";
import { getApiErrorMessage } from "@/lib/apiError";
import { getMediaUrl } from "@/lib/mediaUrl";
import type { PublicEventCatalogItem, PublicEventCatalogResponse } from "@/lib/publicEventsAdapters";

function formatDate(iso: string | null | undefined) {
  if (!iso) return "Date TBA";
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function statusBadge(p: ApiParticipation) {
  const s = p.status;
  const ps = p.payment_status;
  if (s === "cancelled") return { label: "Cancelled", color: "bg-muted text-muted-foreground" };
  if (s === "waitlisted") return { label: "Waitlisted", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" };
  if (s === "checked_in") return { label: "Checked in", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" };
  if (ps === "pending") return { label: "Awaiting payment", color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" };
  if (ps === "paid" || s === "paid") return { label: "Confirmed · Paid", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" };
  if (s === "joined") return { label: "Registered", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" };
  return { label: s, color: "bg-muted text-muted-foreground" };
}

function isUpcoming(p: ApiParticipation) {
  const starts = p.event?.starts_at;
  if (!starts) return true;
  return new Date(starts) > new Date();
}

export default function AttendeeHome() {
  const { user } = useAuth();
  const firstName = user?.name?.split(" ")[0] || "";

  const [participations, setParticipations] = useState<ApiParticipation[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState(true);
  const [ticketsError, setTicketsError] = useState<string | null>(null);

  const [browseEvents, setBrowseEvents] = useState<PublicEventCatalogItem[]>([]);
  const [browseLoading, setBrowseLoading] = useState(true);

  // Fetch own registrations
  useEffect(() => {
    let cancelled = false;
    setTicketsLoading(true);
    setTicketsError(null);

    listParticipations({ per_page: 50 })
      .then(({ items }) => {
        if (cancelled) return;
        setParticipations(items);
      })
      .catch((err: any) => {
        if (cancelled) return;
        setTicketsError(getApiErrorMessage(err) || "Couldn't load your registrations.");
      })
      .finally(() => {
        if (cancelled) return;
        setTicketsLoading(false);
      });

    return () => { cancelled = true; };
  }, []);

  // Fetch public catalog for Browse section
  useEffect(() => {
    let cancelled = false;
    setBrowseLoading(true);

    publicApi
      .get<PublicEventCatalogResponse>("/events", { params: { per_page: 6 } })
      .then((resp) => {
        if (cancelled) return;
        const registeredIds = new Set(participations.map((p) => p.event_id));
        setBrowseEvents(
          (resp.data.data ?? []).filter((e) => !registeredIds.has(e.id)),
        );
      })
      .catch(() => {
        if (cancelled) return;
        setBrowseEvents([]);
      })
      .finally(() => {
        if (cancelled) return;
        setBrowseLoading(false);
      });

    return () => { cancelled = true; };
    // Re-run when participations change so already-registered events are excluded
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [participations]);

  const upcoming = participations.filter((p) => p.status !== "cancelled" && isUpcoming(p));
  const past = participations.filter((p) => p.status !== "cancelled" && !isUpcoming(p));
  const cancelled = participations.filter((p) => p.status === "cancelled");

  // Show all non-cancelled first, then cancelled at the bottom
  const displayTickets = [...upcoming, ...past, ...cancelled];

  return (
    <div className="max-w-5xl mx-auto w-full space-y-12">
      <header className="space-y-2">
        <h1 className="font-display text-3xl sm:text-4xl tracking-[-0.02em]">
          {firstName ? `Hi, ${firstName}` : "Your events"}
        </h1>
        <p className="text-muted-foreground text-sm sm:text-base">
          Tickets you've registered for and live events you can join.
        </p>
      </header>

      {/* My Registrations */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl sm:text-2xl tracking-[-0.02em]">My tickets</h2>
          {!ticketsLoading && participations.length > 0 && (
            <span className="text-xs text-muted-foreground">{participations.length} total</span>
          )}
        </div>

        {ticketsLoading ? (
          <div className="grid gap-3">
            {[0, 1].map((i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
          </div>
        ) : ticketsError ? (
          <div className="rounded-2xl bg-muted/40 p-6 text-center space-y-3">
            <p className="text-sm text-muted-foreground">{ticketsError}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
            >
              <RefreshCw className="w-3 h-3" /> Retry
            </button>
          </div>
        ) : displayTickets.length > 0 ? (
          <ul className="grid gap-3">
            {displayTickets.map((p) => {
              const badge = statusBadge(p);
              const coverPath = p.event?.banner_path;
              const coverUrl = p.event?.banner_url ?? (coverPath ? getMediaUrl(coverPath) : null);
              const isCancelled = p.status === "cancelled";
              return (
                <li key={p.id} className="min-w-0">
                  <Link
                    to={`/registrations/${p.id}`}
                    className={`group flex items-stretch gap-4 p-4 rounded-2xl bg-card hover:bg-muted/50 transition-colors min-w-0 overflow-hidden ${isCancelled ? "opacity-60" : ""}`}
                  >
                    <div
                      className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-muted shrink-0 flex items-center justify-center overflow-hidden"
                      style={coverUrl ? { backgroundImage: `url(${coverUrl})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
                    >
                      {!coverUrl && <Ticket className="w-6 h-6 text-muted-foreground" />}
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col justify-center gap-1">
                      <div className="font-display text-base sm:text-lg tracking-[-0.01em] truncate">
                        {p.event?.title ?? "Event"}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground min-w-0">
                        <span className="flex items-center gap-1.5 min-w-0">
                          <Calendar className="w-3 h-3 shrink-0" />
                          <span className="truncate">{formatDate(p.event?.starts_at)}</span>
                        </span>
                        {p.event?.address && (
                          <span className="flex items-center gap-1.5 min-w-0">
                            <MapPin className="w-3 h-3 shrink-0" />
                            <span className="truncate">{p.event.address}</span>
                          </span>
                        )}
                      </div>
                      <span className={`self-start text-[10px] font-semibold px-2 py-0.5 rounded-full ${badge.color}`}>
                        {badge.label}
                      </span>
                    </div>
                    <ArrowRight className="w-4 h-4 shrink-0 self-center text-muted-foreground group-hover:text-foreground transition-colors" />
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="rounded-2xl bg-muted/40 p-8 text-center">
            <Ticket className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">You haven't registered for any events yet.</p>
          </div>
        )}
      </section>

      {/* Browse */}
      <section className="space-y-4">
        <h2 className="font-display text-xl sm:text-2xl tracking-[-0.02em]">Browse events</h2>

        {browseLoading ? (
          <div className="grid sm:grid-cols-2 gap-3">
            {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-40 rounded-2xl" />)}
          </div>
        ) : browseEvents.length > 0 ? (
          <ul className="grid sm:grid-cols-2 gap-3">
            {browseEvents.map((e) => {
              const bg =
                e.banner_url ??
                (e.banner_path ? getMediaUrl(e.banner_path) : null) ??
                (e.images?.[0]?.path ? getMediaUrl(e.images[0].path) : null);
              return (
                <li key={e.id} className="min-w-0">
                  <Link
                    to={`/events/${e.id}`}
                    className="group block rounded-2xl bg-card hover:bg-muted/50 transition-colors overflow-hidden min-w-0"
                  >
                    <div
                      className="aspect-[16/9] bg-muted"
                      style={bg ? { backgroundImage: `url(${bg})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
                    />
                    <div className="p-4 space-y-1 min-w-0">
                      <div className="font-display text-base tracking-[-0.01em] truncate">{e.title}</div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground min-w-0">
                        <span className="flex items-center gap-1.5 min-w-0">
                          <Calendar className="w-3 h-3 shrink-0" />
                          <span className="truncate">{formatDate(e.starts_at)}</span>
                        </span>
                        {e.address && (
                          <span className="flex items-center gap-1.5 min-w-0">
                            <MapPin className="w-3 h-3 shrink-0" />
                            <span className="truncate">{e.address}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="rounded-2xl bg-muted/40 p-8 text-center">
            <p className="text-sm text-muted-foreground">No public events available right now. Check back soon.</p>
          </div>
        )}
      </section>
    </div>
  );
}
