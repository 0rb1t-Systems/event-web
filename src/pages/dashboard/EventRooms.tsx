import { Link } from "react-router-dom";
import { CalendarDays, MapPin, RefreshCw, DoorOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useMyParticipations } from "@/hooks/queries/useParticipations";
import { roomSwitcherList } from "@/lib/nextEvent";
import { getMediaUrl } from "@/lib/mediaUrl";

function formatWhen(iso: string | null | undefined) {
  if (!iso) return "Date TBA";
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function EventRooms() {
  const { data, isLoading, isError, refetch, error } = useMyParticipations();
  const rooms = roomSwitcherList(data?.items ?? []);

  return (
    <div className="mx-auto w-full max-w-3xl space-y-8">
      <header>
        <p className="text-sm text-muted-foreground">Home / Next event</p>
        <h1 className="mt-1.5 font-display text-2xl font-semibold tracking-tight">
          Choose an event room
        </h1>
        <p className="mt-2 max-w-[50ch] text-sm text-muted-foreground">
          Open the room for the event you want. Tickets stay on My Tickets.
        </p>
      </header>

      {isLoading ? (
        <div className="space-y-3">
          {[0, 1].map((i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      ) : isError ? (
        <div className="house-card rounded-2xl border border-border bg-card p-6 text-center space-y-3">
          <p className="text-sm text-muted-foreground">
            {error instanceof Error ? error.message : "Could not load your events."}
          </p>
          <Button variant="outline" size="sm" onClick={() => void refetch()}>
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Retry
          </Button>
        </div>
      ) : rooms.length === 0 ? (
        <div className="house-card rounded-2xl border border-border bg-card p-10 text-center space-y-4">
          <DoorOpen className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No event rooms are open for you yet.</p>
          <Button className="rounded-full" asChild>
            <Link to="/events">Browse events</Link>
          </Button>
        </div>
      ) : (
        <ul className="space-y-3">
          {rooms.map((p) => {
            const cover = p.event?.banner_url ?? (p.event?.banner_path ? getMediaUrl(p.event.banner_path) : null);
            const place = [p.event?.address, p.event?.city].filter(Boolean).join(", ");
            return (
              <li key={p.id}>
                <Link
                  to={`/registrations/${p.id}/room`}
                  className="house-card flex gap-4 rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary/30"
                >
                  <div
                    className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-muted"
                    style={cover ? { backgroundImage: `url(${cover})`, backgroundSize: "cover" } : undefined}
                  />
                  <div className="min-w-0 flex-1">
                    <h2 className="font-display text-lg font-semibold leading-snug">{p.event?.title ?? "Event"}</h2>
                    <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                      <span className="inline-flex items-center gap-1.5">
                        <CalendarDays className="h-3.5 w-3.5" />
                        {formatWhen(p.event?.starts_at)}
                      </span>
                      {place ? (
                        <span className="inline-flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5" />
                          {place}
                        </span>
                      ) : null}
                    </p>
                  </div>
                  <span className="hidden shrink-0 self-center text-sm font-medium text-primary sm:inline">
                    Enter room
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
