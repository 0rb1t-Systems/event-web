import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link, useNavigate } from "react-router-dom";
import { Plus, Search, CalendarDays, Users, Loader2, MapPin, ExternalLink, LayoutGrid, List, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { getApiErrorMessage } from "@/lib/apiError";
import { EVENT_STATUS_LABELS, toStudioEvent } from "@/lib/organizerEventAdapters";
import { listOrganizerEvents, type OrganizerEvent } from "@/services/organizerEvents";

const statusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  published: "bg-secondary/20 text-secondary",
  registration_open: "bg-success text-success-foreground",
  sold_out: "bg-amber-500/20 text-amber-700 dark:text-amber-400",
  registration_closed: "bg-muted text-muted-foreground",
  ongoing: "bg-primary text-primary-foreground",
  completed: "bg-secondary/20 text-secondary",
  cancelled: "bg-destructive/15 text-destructive",
};

const STATUS_FILTERS = [
  "all",
  "draft",
  "published",
  "registration_open",
  "sold_out",
  "registration_closed",
  "ongoing",
  "completed",
  "cancelled",
] as const;

const Events = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"list" | "grid">("grid");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<OrganizerEvent[]>([]);
  const [lastPage, setLastPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadTick, setReloadTick] = useState(0);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter]);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    listOrganizerEvents({
      page,
      per_page: 24,
      search: debouncedSearch || undefined,
      status: statusFilter === "all" ? undefined : statusFilter,
    })
      .then((res) => {
        if (cancelled) return;
        setItems(res.items);
        setLastPage(res.pagination.last_page);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(getApiErrorMessage(err, "Couldn't load events."));
        setItems([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => { cancelled = true; };
  }, [debouncedSearch, statusFilter, page, reloadTick]);

  const events = items.map(toStudioEvent);

  const upcoming = events
    .filter((e) => e.event_date && new Date(e.event_date) >= new Date() && e.status !== "cancelled")
    .sort((a, b) => new Date(a.event_date!).getTime() - new Date(b.event_date!).getTime())
    .slice(0, 4);

  const EventCard = ({ event, variant = "default" }: { event: (typeof events)[number]; variant?: "default" | "upcoming" }) => {
    const count = event.registrations_count;
    const isUpcoming = variant === "upcoming";
    const monetization = event.monetized ? "Paid" : "Free";

    return (
      <div
        className="group cursor-pointer"
        onClick={() => navigate(`/organizer/events/${event.id}`)}
      >
        <div className="relative aspect-[16/10] rounded-xl overflow-hidden bg-muted mb-3">
          {event.background_image_url ? (
            <img
              src={event.background_image_url}
              alt={event.name}
              loading="lazy"
              decoding="async"
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <CalendarDays className="w-8 h-8 text-muted-foreground/30" />
            </div>
          )}
          <div className="absolute top-3 left-3">
            <span className="bg-card text-foreground text-xs font-semibold px-3 py-1 rounded-full shadow-sm">
              {monetization}
            </span>
          </div>
        </div>
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {event.event_date ? format(new Date(event.event_date), "EEE, MMM d") : "No date set"}
            </p>
            {!isUpcoming && (
              <Badge className={`${statusColors[event.status] || "bg-muted text-muted-foreground"} border-0 capitalize text-[10px]`}>
                {EVENT_STATUS_LABELS[event.status] || event.status}
              </Badge>
            )}
          </div>
          <h3 className="font-display font-bold text-base leading-snug group-hover:text-primary transition-colors">
            {event.name}
          </h3>
          {!isUpcoming && (
            <div className="flex flex-col gap-0.5 text-xs text-muted-foreground pt-1">
              <span className="flex items-center gap-1"><Users className="w-3 h-3" />{count} registrations</span>
              {(event.city || event.location_value) && (
                <span className="flex items-center gap-1 truncate">
                  <MapPin className="w-3 h-3" />
                  {event.city || event.location_value}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8" data-testid="page-events">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold">Events</h1>
          <p className="text-muted-foreground">Create and manage your event registration pages.</p>
        </div>
        <Button className="w-full sm:w-auto" onClick={() => navigate("/organizer/events/new")} data-testid="create-event-button">
          <Plus className="w-4 h-4 mr-2" />
          Create event
        </Button>
      </div>

      {upcoming.length > 0 && !debouncedSearch && statusFilter === "all" && page === 1 && (
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Upcoming</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {upcoming.map((event) => (
              <EventCard key={`up-${event.id}`} event={event} variant="upcoming" />
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search events…" className="pl-10 rounded-full" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48 rounded-full">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_FILTERS.map((value) => (
              <SelectItem key={value} value={value}>
                {value === "all" ? "All statuses" : EVENT_STATUS_LABELS[value]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex bg-muted rounded-full p-1 sm:ml-auto">
          <button
            onClick={() => setViewMode("list")}
            className={`p-2 rounded-full transition-colors ${viewMode === "list" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            <List className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode("grid")}
            className={`p-2 rounded-full transition-colors ${viewMode === "grid" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
        </div>
      </div>

      {error ? (
        <div className="text-center py-20">
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button variant="outline" className="rounded-full" onClick={() => setReloadTick((n) => n + 1)}>
            <RefreshCw className="w-4 h-4 mr-2" /> Retry
          </Button>
        </div>
      ) : isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : events.length > 0 ? (
        <>
          {viewMode === "list" ? (
            <div className="space-y-6">
              {events.map((event) => {
                const count = event.registrations_count;
                const shortDesc = event.description
                  ? event.description.replace(/[*#_~`>]/g, "").split(/(?<=\.)\s+/).filter(Boolean).slice(0, 2).join(" ").slice(0, 250)
                  : "";

                return (
                  <div
                    key={event.id}
                    className="group flex flex-col sm:flex-row gap-4 cursor-pointer"
                    onClick={() => navigate(`/organizer/events/${event.id}`)}
                  >
                    <div className="sm:w-56 flex-shrink-0 aspect-video sm:aspect-[16/10] rounded-xl overflow-hidden bg-muted">
                      {event.background_image_url ? (
                        <img src={event.background_image_url} alt={event.name} loading="lazy" decoding="async" className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <CalendarDays className="w-10 h-10 text-muted-foreground/30" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 flex flex-col justify-center gap-1.5 py-1">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          {event.event_date ? format(new Date(event.event_date), "EEE, MMM d") : "No date set"}
                        </p>
                        <Badge className={`${statusColors[event.status] || "bg-muted text-muted-foreground"} border-0 capitalize text-[10px]`}>
                          {EVENT_STATUS_LABELS[event.status] || event.status}
                        </Badge>
                        <Badge variant="outline" className="border-0 bg-muted text-[10px] rounded-full">
                          {event.monetized ? "Paid" : "Free"}
                        </Badge>
                      </div>
                      <h3 className="font-display font-bold text-xl leading-tight group-hover:text-primary transition-colors">{event.name}</h3>
                      {shortDesc && <p className="text-sm text-muted-foreground line-clamp-2">{shortDesc}</p>}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1">
                        <span className="flex items-center gap-1"><Users className="w-3 h-3" />{count} registrations</span>
                        {(event.city || event.location_value) && (
                          <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{event.city || event.location_value}</span>
                        )}
                      </div>
                      <div className="flex gap-2 pt-2">
                        <Button variant="outline" size="sm" className="text-xs rounded-full" asChild onClick={(e) => e.stopPropagation()}>
                          <Link to={`/events/${event.id}`}><ExternalLink className="w-3 h-3 mr-1" />View page</Link>
                        </Button>
                        <Button variant="outline" size="sm" className="text-xs rounded-full" asChild onClick={(e) => e.stopPropagation()}>
                          <Link to={`/organizer/events/${event.id}`}>Manage</Link>
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {events.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          )}
          {lastPage > 1 && (
            <div className="flex justify-center gap-2 pt-2">
              <Button variant="outline" size="sm" className="rounded-full" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
              <span className="text-sm text-muted-foreground self-center">Page {page} of {lastPage}</span>
              <Button variant="outline" size="sm" className="rounded-full" disabled={page >= lastPage} onClick={() => setPage((p) => p + 1)}>Next</Button>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-20" data-testid="empty-state">
          <CalendarDays className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">{debouncedSearch || statusFilter !== "all" ? "No matching events" : "No events yet"}</h3>
          <p className="text-muted-foreground mb-4">
            {debouncedSearch || statusFilter !== "all"
              ? "Try a different search or status filter."
              : "Create your first event to get started."}
          </p>
          {!(debouncedSearch || statusFilter !== "all") && (
            <Button onClick={() => navigate("/organizer/events/new")} data-testid="create-event-empty-button">
              <Plus className="w-4 h-4 mr-2" />
              Create event
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default Events;
