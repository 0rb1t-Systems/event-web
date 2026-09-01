import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { format } from "date-fns";
import {
  IconCalendar,
  IconGlobe,
  IconMapPin,
  IconPlus,
  IconRefresh,
  IconSearch,
  IconUsers,
  IconWifi,
  type OrgIconType,
} from "@/components/organizer-console/orgIcons";
import { OrgButton } from "@/components/organizer-console/OrgButton";
import { OrgChip } from "@/components/organizer-console/OrgChip";
import { orgEventStatusTone, orgThumbClass } from "@/components/organizer-console/orgTheme";
import { Skeleton } from "@/components/ui/skeleton";
import { getApiErrorMessage } from "@/lib/apiError";
import { EVENT_STATUS_LABELS, isPublicCatalogStatus } from "@/lib/organizerEventAdapters";
import { useOrganizerEventList } from "@/hooks/queries/useOrganizerQueries";
import type { OrganizerEvent } from "@/services/organizerEvents";
import { cn } from "@/lib/utils";

const FILTER_PILLS = [
  { key: "all", label: "All" },
  { key: "published", label: "Published" },
  { key: "draft", label: "Draft" },
  { key: "ended", label: "Ended" },
] as const;

type FilterKey = (typeof FILTER_PILLS)[number]["key"];

function parseFilter(raw: string | null): FilterKey {
  if (raw === "published" || raw === "draft" || raw === "ended") return raw;
  return "all";
}

function eventMatchesFilter(status: string, filter: FilterKey): boolean {
  if (filter === "all") return true;
  if (filter === "draft") return status === "draft";
  if (filter === "published") return isPublicCatalogStatus(status);
  return status === "completed" || status === "cancelled";
}

function modeIcon(mode: string | null | undefined): OrgIconType {
  if (mode === "online") return IconWifi;
  if (mode === "hybrid") return IconGlobe;
  return IconMapPin;
}

function OrgEventCard({ event }: { event: OrganizerEvent }) {
  const status = typeof event.status === "string" ? event.status : "draft";
  const title = event.title || `Event #${event.id}`;
  const cover = event.banner_url ?? null;
  const ModeIcon = modeIcon(event.event_mode);
  const startsAt = event.starts_at;
  const tone = orgEventStatusTone(status);
  const chipOnCover = tone === "brand" ? "brand" : "plain";
  const categoryName = event.category?.name;

  return (
    <Link
      to={`/organizer/events/${event.id}`}
      className="org-card overflow-hidden block group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-oc-brand"
    >
      <div
        className={cn("relative h-[148px] flex flex-col justify-between p-3", !cover && orgThumbClass(event.id))}
      >
        {cover && (
          <img
            src={cover}
            alt=""
            loading="lazy"
            decoding="async"
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        )}
        <div className="relative flex items-start justify-between">
          {tone === "brand" ? (
            <OrgChip label={EVENT_STATUS_LABELS[status] ?? status} tone={chipOnCover} size="sm" />
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-[3px]">
              <span className={cn("w-[5px] h-[5px] rounded-full", tone === "faint" ? "bg-oc-faint" : tone === "bad" ? "bg-oc-bad" : "bg-oc-muted")} />
              <span className={cn("text-[11px] font-semibold", tone === "faint" ? "text-oc-faint" : tone === "bad" ? "text-oc-bad" : "text-oc-muted")}>
                {EVENT_STATUS_LABELS[status] ?? status}
              </span>
            </span>
          )}
          <span className="w-7 h-7 rounded-full bg-white/15 backdrop-blur-sm flex items-center justify-center">
            <ModeIcon className="w-3.5 h-3.5 text-white" />
          </span>
        </div>
        <p className="relative text-[11px] font-bold tracking-[1.2px] text-white/70 uppercase">
          {categoryName ?? "Event"}
        </p>
      </div>

      <div className="p-4 flex flex-col gap-2">
        <p className="flex items-center gap-1.5 text-xs text-oc-muted">
          <IconCalendar className="w-[13px] h-[13px] text-oc-faint" />
          {startsAt ? format(new Date(startsAt), "EEE, MMM d · h:mm a") : "Date TBD"}
        </p>
        <h3 className="font-head font-semibold text-base leading-snug text-oc-ink line-clamp-2 group-hover:text-oc-brand transition-colors">
          {title}
        </h3>
        <div className="flex items-center justify-between pt-0.5">
          <span className="flex items-center gap-1.5 text-xs font-semibold text-oc-ink">
            <IconUsers className="w-3.5 h-3.5 text-oc-brand" />
            {(event.registrations_count ?? 0).toLocaleString()} registered
          </span>
          <span className="text-xs text-oc-faint truncate max-w-[40%]">
            {event.event_mode === "online" ? "Online" : event.city ?? event.address ?? ""}
          </span>
        </div>
      </div>
    </Link>
  );
}

const Events = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const filter = parseFilter(searchParams.get("status"));
  const [search, setSearch] = useState(searchParams.get("q") ?? "");
  const [debouncedSearch, setDebouncedSearch] = useState(searchParams.get("q") ?? "");
  const [page, setPage] = useState(1);

  const grouped = filter === "published" || filter === "ended";

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
    const params = new URLSearchParams();
    if (debouncedSearch) params.set("q", debouncedSearch);
    if (filter !== "all") params.set("status", filter);
    setSearchParams(params, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, filter]);

  const listQuery = useOrganizerEventList({
    page: grouped ? 1 : page,
    per_page: grouped ? 100 : 24,
    search: debouncedSearch || undefined,
    status: filter === "draft" ? "draft" : undefined,
  });
  const rawItems = listQuery.data?.items ?? [];
  const events = grouped
    ? rawItems.filter((event) => eventMatchesFilter(String(event.status ?? "draft"), filter))
    : rawItems;
  const total = grouped ? events.length : (listQuery.data?.pagination.total ?? 0);
  const lastPage = grouped ? 1 : (listQuery.data?.pagination.last_page ?? 1);
  const isLoading = listQuery.isLoading;
  const error = listQuery.error ? getApiErrorMessage(listQuery.error, "Couldn't load events.") : null;

  const setFilter = (key: FilterKey) => {
    const params = new URLSearchParams(searchParams);
    if (key === "all") params.delete("status");
    else params.set("status", key);
    setSearchParams(params, { replace: true });
  };

  return (
    <div className="space-y-4" data-testid="page-events">
      <div className="flex items-end justify-between gap-4 px-2 pt-1 lg:pt-0">
        <div>
          <h1 className="font-head font-semibold text-[22px] lg:text-2xl leading-tight text-oc-ink">Events</h1>
          <p className="text-[13px] lg:text-sm text-oc-muted mt-1">
            {isLoading ? "Loading…" : `${total.toLocaleString()} event${total === 1 ? "" : "s"}`}
          </p>
        </div>
        <OrgButton asChild className="shrink-0">
          <Link to="/organizer/events/new" data-testid="create-event-button">
            <span className="hidden sm:inline">New event</span>
            <span className="sm:hidden">New</span>
            <IconPlus />
          </Link>
        </OrgButton>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="w-full sm:w-[280px] flex items-center gap-2 rounded-full bg-oc-surface px-3.5 py-[9px]">
          <IconSearch className="w-[15px] h-[15px] text-oc-faint shrink-0" />
          <label htmlFor="org-events-search" className="sr-only">Search events</label>
          <input
            id="org-events-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search events…"
            className="w-full bg-transparent text-[13px] text-oc-ink placeholder:text-oc-faint outline-none"
          />
        </div>
        <div className="flex-1 hidden sm:block" />
        <div className="flex items-center gap-2 flex-wrap" role="group" aria-label="Filter by status">
          {FILTER_PILLS.map((pill) => (
            <button
              key={pill.key}
              type="button"
              onClick={() => setFilter(pill.key)}
              aria-pressed={filter === pill.key}
              className={cn(
                "rounded-full px-4 py-2 text-[13px] font-medium transition-colors",
                filter === pill.key
                  ? "bg-oc-ink text-white"
                  : "bg-oc-surface border border-oc-line text-oc-muted hover:text-oc-ink",
              )}
            >
              {pill.label}
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <div className="org-card p-10 text-center max-w-md mx-auto">
          <p className="text-oc-muted mb-4 text-sm">{error}</p>
          <OrgButton variant="ghost" size="sm" onClick={() => void listQuery.refetch()}>
            <IconRefresh /> Retry
          </OrgButton>
        </div>
      ) : isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-[251px] rounded-2xl" />
          ))}
        </div>
      ) : events.length > 0 ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {events.map((event) => (
              <OrgEventCard key={event.id} event={event} />
            ))}
          </div>
          {lastPage > 1 && (
            <div className="flex justify-center items-center gap-3 pt-2">
              <OrgButton variant="ghost" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Previous
              </OrgButton>
              <span className="text-[13px] text-oc-muted tabular-nums">Page {page} of {lastPage}</span>
              <OrgButton variant="ghost" size="sm" disabled={page >= lastPage} onClick={() => setPage((p) => p + 1)}>
                Next
              </OrgButton>
            </div>
          )}
        </>
      ) : (
        <div className="org-card py-16 px-6 text-center" data-testid="empty-state">
          <IconCalendar className="w-10 h-10 text-oc-faint mx-auto mb-4" />
          <h3 className="font-head text-lg font-semibold text-oc-ink mb-1.5">
            {debouncedSearch || filter !== "all" ? "No matching events" : "No events yet"}
          </h3>
          <p className="text-sm text-oc-muted mb-5">
            {debouncedSearch || filter !== "all"
              ? "Try a different search or filter."
              : "Create your first event to get started."}
          </p>
          {!(debouncedSearch || filter !== "all") && (
            <OrgButton onClick={() => navigate("/organizer/events/new")} data-testid="create-event-empty-button">
              New event <IconPlus />
            </OrgButton>
          )}
        </div>
      )}
    </div>
  );
};

export default Events;
