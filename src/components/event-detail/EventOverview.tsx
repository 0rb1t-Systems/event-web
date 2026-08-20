import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Users,
  Clock,
  CheckCircle2,
  Circle,
  Copy,
  ExternalLink,
} from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { getRegistrationUrl } from "@/lib/publicUrl";
import { copyToClipboard } from "@/lib/clipboard";
import { toast } from "sonner";
import { isPublicCatalogStatus } from "@/lib/organizerEventAdapters";

type Event = any;

interface Props {
  event: Event;
  onJumpTab: (tab: string) => void;
}

export default function EventOverview({ event, onJumpTab }: Props) {
  const registered = event.registrations_count ?? event.registered_count ?? 0;
  const waitlisted = event.waitlisted_count ?? 0;
  const daysToEvent = event.event_date ? differenceInDays(new Date(event.event_date), new Date()) : null;
  const capacity = event.capacity ?? null;
  const capacityPct = capacity ? Math.min(100, Math.round((registered / capacity) * 100)) : null;
  const published = isPublicCatalogStatus(event.status);

  const checklist = [
    { key: "name", label: "Set event name", done: !!event.name?.trim(), tab: null },
    { key: "date", label: "Set event date & time", done: !!event.event_date, tab: null },
    { key: "location", label: "Add city or address", done: !!(event.city || event.address || event.location_value), tab: null },
    { key: "description", label: "Write a description", done: !!event.description?.trim(), tab: null },
    { key: "image", label: "Add a cover or gallery image", done: !!event.background_image_url || (event.images?.length ?? 0) > 0, tab: null },
    { key: "live", label: "Move out of draft", done: event.status !== "draft", tab: null },
  ];
  const completed = checklist.filter((i) => i.done).length;
  const progress = Math.round((completed / checklist.length) * 100);

  const handleCopyLink = async () => {
    const ok = await copyToClipboard(getRegistrationUrl(event.id));
    toast[ok ? "success" : "error"](ok ? "Registration link copied" : "Couldn't copy — select and copy manually.");
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          icon={<Users className="w-4 h-4" />}
          label="Registered"
          value={String(registered)}
          sub={capacity ? `of ${capacity}` : "no cap"}
        />
        <KpiCard
          icon={<Users className="w-4 h-4" />}
          label="Waitlisted"
          value={String(waitlisted)}
          sub="from event summary"
        />
        <KpiCard
          icon={<CheckCircle2 className="w-4 h-4" />}
          label="Monetized"
          value={event.monetized ? "Yes" : "No"}
          sub="set by ticket types"
        />
        <KpiCard
          icon={<Clock className="w-4 h-4" />}
          label={daysToEvent !== null && daysToEvent < 0 ? "Days since" : "Days to go"}
          value={
            daysToEvent === null
              ? "—"
              : daysToEvent === 0
                ? "Today"
                : Math.abs(daysToEvent).toString()
          }
          sub={event.event_date ? format(new Date(event.event_date), "MMM d, yyyy") : "no date set"}
        />
      </div>

      {capacity && (
        <div className="bg-card rounded-xl p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Capacity</span>
            <span className="text-xs text-muted-foreground">
              {registered} / {capacity} ({capacityPct}%)
            </span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                capacityPct! >= 100 ? "bg-destructive" : capacityPct! >= 80 ? "bg-amber-500" : "bg-primary"
              }`}
              style={{ width: `${capacityPct}%` }}
            />
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 bg-card rounded-xl p-5">
          <h3 className="font-display font-semibold text-sm mb-2">Registrations</h3>
          <p className="text-sm text-muted-foreground">
            {registered} registration{registered === 1 ? "" : "s"} on this event.
            Daily trend and attendee names are not returned by the organizer event summary API.
          </p>
        </div>

        <div className="bg-card rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display font-semibold text-sm">Setup checklist</h3>
            <span className="text-xs font-medium text-muted-foreground">
              {completed}/{checklist.length}
            </span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden mb-4">
            <div
              className="h-full bg-primary rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <ul className="space-y-2">
            {checklist.map((item) => (
              <li key={item.key}>
                <button
                  type="button"
                  onClick={() => item.tab && onJumpTab(item.tab)}
                  disabled={!item.tab}
                  className="w-full flex items-center gap-2.5 text-left text-sm py-1.5 rounded-lg"
                >
                  {item.done ? (
                    <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
                  ) : (
                    <Circle className="w-4 h-4 text-muted-foreground/40 shrink-0" />
                  )}
                  <span className={item.done ? "line-through text-muted-foreground" : ""}>
                    {item.label}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 bg-card rounded-xl p-5">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-display font-semibold text-sm">Recent registrations</h3>
            <button
              type="button"
              className="text-xs text-muted-foreground hover:text-foreground"
              onClick={() => onJumpTab("attendees")}
            >
              Attendees
            </button>
          </div>
          <p className="text-sm text-muted-foreground py-6">
            {registered > 0
              ? `${registered} registration${registered === 1 ? "" : "s"} so far. Open Attendees to search, promote waitlist, cancel, or export.`
              : "Registrations will show up here once guests start signing up. Manage them from Attendees."}
          </p>
        </div>

        <div className="bg-card rounded-xl p-5">
          <h3 className="font-display font-semibold text-sm mb-3">Share your event</h3>
          <p className="text-xs text-muted-foreground mb-4">
            {published
              ? "This status can appear in the public catalog. Copy the link or preview as an attendee."
              : "Draft, completed, and cancelled events are not in the public catalog."}
          </p>
          <div className="space-y-2">
            <div className="w-full bg-muted/50 rounded-full px-3 py-2 text-xs text-muted-foreground truncate">
              {getRegistrationUrl(event.id)}
            </div>
            <Button onClick={handleCopyLink} variant="outline" size="sm" className="w-full rounded-full">
              <Copy className="w-3.5 h-3.5 mr-2" /> Copy link
            </Button>
            <Button asChild variant="outline" size="sm" className="w-full rounded-full">
              <Link to={`/events/${event.id}`} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-3.5 h-3.5 mr-2" /> Preview as attendee
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function KpiCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="bg-card rounded-xl p-4 sm:p-5">
      <div className="flex items-center gap-2 text-muted-foreground mb-2">
        {icon}
        <span className="text-xs font-medium uppercase tracking-wider">{label}</span>
      </div>
      <div className="text-3xl font-display font-bold leading-none">{value}</div>
      <div className="text-xs text-muted-foreground mt-1.5">{sub}</div>
    </div>
  );
}
