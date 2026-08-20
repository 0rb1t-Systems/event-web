import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import EventRegistrationsPanel from "@/components/event-studio/EventRegistrationsPanel";
import { getApiErrorMessage } from "@/lib/apiError";
import { listOrganizerEvents, type OrganizerEvent } from "@/services/organizerEvents";

export default function Attendees() {
  const [events, setEvents] = useState<OrganizerEvent[]>([]);
  const [eventId, setEventId] = useState<string>("");
  const [loadingEvents, setLoadingEvents] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoadingEvents(true);
    listOrganizerEvents({ per_page: 100, page: 1 })
      .then((data) => {
        if (cancelled) return;
        setEvents(data.items);
        if (data.items.length > 0) setEventId(String(data.items[0].id));
      })
      .catch((err) => {
        if (!cancelled) toast.error(getApiErrorMessage(err, "Couldn't load events"));
      })
      .finally(() => {
        if (!cancelled) setLoadingEvents(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const selected = events.find((e) => String(e.id) === eventId);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold">Attendees</h1>
          <p className="text-muted-foreground">
            Registrations are managed per event.
            {selected && (
              <>
                {" "}
                Open in{" "}
                <Link
                  to={`/organizer/events/${selected.id}/attendees`}
                  className="text-foreground underline underline-offset-2"
                >
                  Event Studio
                </Link>
                .
              </>
            )}
          </p>
        </div>
        <Select value={eventId || undefined} onValueChange={setEventId} disabled={loadingEvents || events.length === 0}>
          <SelectTrigger className="w-full sm:w-72 rounded-full bg-card">
            <SelectValue placeholder={loadingEvents ? "Loading events…" : "Select an event"} />
          </SelectTrigger>
          <SelectContent>
            {events.map((e) => (
              <SelectItem key={e.id} value={String(e.id)}>
                {e.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loadingEvents ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : events.length === 0 ? (
        <div className="bg-card rounded-xl p-10 text-center text-sm text-muted-foreground">
          Create an event to manage registrations.
        </div>
      ) : eventId ? (
        <EventRegistrationsPanel eventId={Number(eventId)} />
      ) : null}
    </div>
  );
}
