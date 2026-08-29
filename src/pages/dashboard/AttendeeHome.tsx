import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, MapPin, Ticket, RefreshCw } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { listParticipations, type ApiParticipation } from "@/services/participationService";
import { publicApi } from "@/lib/api";
import { getApiErrorMessage } from "@/lib/apiError";
import { getMediaUrl } from "@/lib/mediaUrl";
import { EVENT_STATUS_LABELS } from "@/lib/organizerEventAdapters";
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

function participationBadge(p: ApiParticipation) {
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

function eventStatusBadge(status: string | null | undefined) {
  const key = status ?? "";
  const label = EVENT_STATUS_LABELS[key] ?? key.replace(/_/g, " ") ?? "Event";
  switch (key) {
    case "registration_open":
      return { label, color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300" };
    case "ongoing":
      return { label, color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300" };
    case "sold_out":
      return { label, color: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300" };
    case "registration_closed":
    case "completed":
      return { label, color: "bg-muted text-muted-foreground" };
    case "published":
      return { label, color: "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300" };
    default:
      return { label, color: "bg-muted text-muted-foreground" };
  }
}

function isUpcoming(p: ApiParticipation) {
  const starts = p.event?.starts_at;
  if (!starts) return true;
  return new Date(starts) > new Date();
}

function canEnterEventRoom(p: ApiParticipation) {
  if (p.status === "cancelled") return false;
  return p.payment_status === "paid" || p.payment_status === "not_required" || p.status === "waitlisted";
}

function registrationPrimaryHref(p: ApiParticipation) {
  if (canEnterEventRoom(p)) return `/registrations/${p.id}/room`;
  return `/registrations/${p.id}`;
}

function browseEventHref(eventId: number, participation: ApiParticipation | undefined) {
  if (!participation || participation.status === "cancelled") {
    return `/events/${eventId}`;
  }
  if (canEnterEventRoom(participation)) {
    return `/registrations/${participation.id}/room`;
  }
  return `/registrations/${participation.id}`;
}

export default function AttendeeHome() {
  const { user } = useAuth();
  const firstName = user?.name?.split(" ")[0] || "";

  const [participations, setParticipations] = useState<ApiParticipation[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState(true);
  const [ticketsError, setTicketsError] = useState<string | null>(null);

  const [browseEvents, setBrowseEvents] = useState<PublicEventCatalogItem[]>([]);
  const [browseLoading, setBrowseLoading] = useState(true);

  const participationByEventId = useMemo(() => {
    const map = new Map<number, ApiParticipation>();
    for (const p of participations) {
      if (!map.has(p.event_id) || p.status !== "cancelled") {
        map.set(p.event_id, p);
      }
    }
    return map;
  }, [participations]);

  useEffect(() => {
    let cancelled = false;
    setTicketsLoading(true);
    setTicketsError(null);

    listParticipations({ per_page: 50 })
      .then(({ items }) => {
        if (cancelled) return;
        setParticipations(items);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setTicketsError(getApiErrorMessage(err) || "Couldn't load your registrations.");
      })
      .finally(() => {
        if (cancelled) return;
        setTicketsLoading(false);
      });

    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setBrowseLoading(true);

    publicApi
      .get<PublicEventCatalogResponse>("/events", { params: { per_page: 24 } })
      .then((resp) => {
        if (cancelled) return;
        setBrowseEvents(resp.data.data ?? []);
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
  }, []);

  const upcoming = participations.filter((p) => p.status !== "cancelled" && isUpcoming(p));
  const past = participations.filter((p) => p.status !== "cancelled" && !isUpcoming(p));
  const cancelled = participations.filter((p) => p.status === "cancelled");
  const displayTickets = [...upcoming, ...past, ...cancelled];

  return (
    <div className="max-w-5xl mx-auto w-full space-y-12">
      <header className="space-y-2">
        <h1 className="font-display text-3xl sm:text-4xl tracking-[-0.02em]">
          {firstName ? `Hi, ${firstName}` : "Your events"}
        </h1>
        <p className="text-muted-foreground text-sm sm:text-base">
          Your tickets live here. Browse shows every public event — yours are flagged with your registration status.
        </p>
      </header>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl sm:text-2xl tracking-[-0.02em]">My registrations</h2>
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
              const regBadge = participationBadge(p);
              const evtBadge = eventStatusBadge(p.event?.status);
              const coverPath = p.event?.banner_path;
              const coverUrl = p.event?.banner_url ?? (coverPath ? getMediaUrl(coverPath) : null);
              const isCancelled = p.status === "cancelled";
              const cardHref = registrationPrimaryHref(p);
              return (
                <li key={p.id} className="min-w-0">
                  <div
                    className={`flex flex-col sm:flex-row sm:items-stretch gap-3 p-4 rounded-2xl bg-card min-w-0 overflow-hidden ${
                      isCancelled ? "opacity-60" : ""
                    }`}
                  >
                    <Link
                      to={cardHref}
                      className="group flex items-stretch gap-4 flex-1 min-w-0"
                    >
                      <div
                        className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-muted shrink-0 flex items-center justify-center overflow-hidden"
                        style={coverUrl ? { backgroundImage: `url(${coverUrl})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
                      >
                        {!coverUrl && <Ticket className="w-6 h-6 text-muted-foreground" />}
                      </div>
                      <div className="flex-1 min-w-0 flex flex-col justify-center gap-1.5">
                        <div className="font-display text-base sm:text-lg tracking-[-0.01em] truncate group-hover:underline underline-offset-2">
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
                        <div className="flex flex-wrap gap-1.5">
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${regBadge.color}`}>
                            {regBadge.label}
                          </span>
                          {p.event?.status && (
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${evtBadge.color}`}>
                              {evtBadge.label}
                            </span>
                          )}
                        </div>
                      </div>
                    </Link>

                    <div className="flex sm:flex-col gap-2 sm:justify-center shrink-0">
                      <Link
                        to={`/registrations/${p.id}`}
                        className="inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-full text-xs font-semibold bg-muted hover:bg-muted/80 text-foreground transition-colors"
                      >
                        <Ticket className="w-3.5 h-3.5" />
                        View ticket
                      </Link>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="rounded-2xl bg-muted/40 p-8 text-center">
            <Ticket className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">You haven&apos;t registered for any events yet.</p>
          </div>
        )}
      </section>

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
              const participation = participationByEventId.get(e.id);
              const registered = participation && participation.status !== "cancelled";
              const evtBadge = eventStatusBadge(e.status);
              const regBadge = registered ? participationBadge(participation) : null;
              const href = browseEventHref(e.id, participation);

              return (
                <li key={e.id} className="min-w-0">
                  <Link
                    to={href}
                    className="group block rounded-2xl bg-card hover:bg-muted/50 transition-colors overflow-hidden min-w-0"
                  >
                    <div className="relative aspect-[16/9] bg-muted">
                      {bg && (
                        <div
                          className="absolute inset-0"
                          style={{ backgroundImage: `url(${bg})`, backgroundSize: "cover", backgroundPosition: "center" }}
                        />
                      )}
                      <div className="absolute inset-x-0 top-0 p-2.5 flex flex-wrap gap-1.5">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full backdrop-blur-sm ${evtBadge.color}`}>
                          {evtBadge.label}
                        </span>
                        {registered && regBadge && (
                          <>
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary text-primary-foreground">
                              You&apos;re registered
                            </span>
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full backdrop-blur-sm ${regBadge.color}`}>
                              {regBadge.label}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="p-4 space-y-1 min-w-0">
                      <div className="font-display text-base tracking-[-0.01em] truncate group-hover:underline underline-offset-2">
                        {e.title}
                      </div>
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
