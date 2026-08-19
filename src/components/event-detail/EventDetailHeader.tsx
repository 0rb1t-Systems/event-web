import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ArrowLeft, ExternalLink, Copy, MoreVertical, Trash2, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { getRegistrationUrl } from "@/lib/publicUrl";
import { copyToClipboard } from "@/lib/clipboard";
import { formatDistanceToNow, differenceInDays } from "date-fns";
import { EVENT_STATUS_LABELS } from "@/lib/organizerEventAdapters";
import { allowedEventTransitions } from "@/services/organizerEvents";

type Event = any;

interface Props {
  event: Event;
  onTransition: (status: string) => void;
  onDelete: () => void;
  transitioning?: boolean;
}

export default function EventDetailHeader({ event, onTransition, onDelete, transitioning }: Props) {
  const navigate = useNavigate();
  const transitions = allowedEventTransitions(event.status);

  const handleCopyLink = async () => {
    const ok = await copyToClipboard(getRegistrationUrl(event.id));
    if (!ok) return toast.error("Couldn't copy — select the link and copy manually.");
    toast.success("Registration link copied");
  };

  const daysToEvent = event.event_date ? differenceInDays(new Date(event.event_date), new Date()) : null;
  const countdown =
    daysToEvent === null
      ? null
      : daysToEvent === 0
        ? "Today"
        : daysToEvent > 0
          ? `${daysToEvent}d to go`
          : `${Math.abs(daysToEvent)}d ago`;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <Button variant="ghost" size="icon" className="shrink-0 mt-0.5" onClick={() => navigate("/organizer/events")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-display font-bold truncate">{event.name}</h1>
              <Badge variant="outline" className="rounded-full text-[10px] font-medium capitalize">
                {EVENT_STATUS_LABELS[event.status] || event.status}
              </Badge>
              {countdown && (
                <Badge variant="outline" className="rounded-full text-[10px] font-medium border-0 bg-muted">
                  {countdown}
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {event.event_date ? new Date(event.event_date).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" }) : "No date set"}
              {event.city ? ` · ${event.city}` : ""}
              {event.updated_at ? ` · edited ${formatDistanceToNow(new Date(event.updated_at), { addSuffix: true })}` : ""}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {transitions.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="hidden sm:inline-flex h-8 text-xs rounded-full" disabled={transitioning}>
                  {transitioning ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : null}
                  Change status
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {transitions.map((status) => (
                  <DropdownMenuItem
                    key={status}
                    className={status === "cancelled" ? "text-destructive focus:text-destructive" : ""}
                    onClick={() => onTransition(status)}
                  >
                    {EVENT_STATUS_LABELS[status] || status}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <Button variant="outline" size="sm" className="hidden sm:inline-flex h-8 text-xs rounded-full" onClick={handleCopyLink}>
            <Copy className="w-3 h-3 mr-1" /> Copy link
          </Button>
          <Button variant="outline" size="sm" className="hidden sm:inline-flex h-8 text-xs rounded-full" asChild>
            <a href={`/events/${event.id}`} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="w-3 h-3 mr-1" /> Preview
            </a>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <div className="sm:hidden">
                {transitions.map((status) => (
                  <DropdownMenuItem
                    key={status}
                    className={status === "cancelled" ? "text-destructive focus:text-destructive" : ""}
                    onClick={() => onTransition(status)}
                  >
                    {EVENT_STATUS_LABELS[status] || status}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuItem onClick={handleCopyLink}><Copy className="w-3.5 h-3.5 mr-2" /> Copy link</DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <a href={`/events/${event.id}`} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-3.5 h-3.5 mr-2" /> Preview
                  </a>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </div>
              <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
                <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete event
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
