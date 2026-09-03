import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import {
  IconArrowLeft,
  IconCalendar,
  IconExternal,
  IconLink,
  IconMore,
  IconTrash,
} from "./orgIcons";
import { toast } from "sonner";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { copyToClipboard } from "@/lib/clipboard";
import { getRegistrationUrl } from "@/lib/publicUrl";
import { getMediaUrl } from "@/lib/mediaUrl";
import { EVENT_STATUS_LABELS } from "@/lib/organizerEventAdapters";
import type { OrganizerEventStudio } from "@/lib/organizerEventAdapters";
import { allowedEventTransitions } from "@/services/organizerEvents";
import { OrgButton } from "./OrgButton";
import { OrgChip } from "./OrgChip";
import { orgEventStatusTone } from "./orgTheme";

interface OrgStudioHeaderProps {
  eventId: number;
  event: OrganizerEventStudio;
  status: string;
  transitioning: boolean;
  onTransition: (status: string) => void;
  onDelete: () => void;
}

function useCopyLink(eventId: number) {
  return async () => {
    const ok = await copyToClipboard(getRegistrationUrl(String(eventId)));
    if (!ok) {
      toast.error("Couldn't copy. Select the link and copy it manually.");
      return;
    }
    toast.success("Registration link copied");
  };
}

/**
 * Studio event header — identity + actions. Desktop back-link lives on the
 * section sidebar. Mobile keeps a compact back control.
 */
export function OrgStudioHeader({ eventId, event, status, transitioning, onTransition, onDelete }: OrgStudioHeaderProps) {
  const navigate = useNavigate();
  const copyLink = useCopyLink(eventId);
  const transitions = allowedEventTransitions(status);
  const statusLabel = EVENT_STATUS_LABELS[status] || status;
  const banner = event.background_image_url ?? getMediaUrl(event.banner_path);

  return (
    <div className="flex items-center gap-2 sm:gap-3 min-w-0 w-full">
      <button
        type="button"
        onClick={() => navigate("/organizer/events")}
        aria-label="Back to events"
        className="lg:hidden flex items-center gap-1.5 rounded-lg px-1.5 py-1.5 text-sm font-medium text-oc-muted hover:text-oc-ink hover:bg-oc-surface transition-colors shrink-0"
      >
        <IconArrowLeft className="w-[17px] h-[17px]" />
      </button>

      {banner ? (
        <img src={banner} alt="" className="w-9 h-9 rounded-[10px] object-cover shrink-0" />
      ) : (
        <span className="w-9 h-9 rounded-[10px] shrink-0 bg-[linear-gradient(215deg,#12876A,#0A5140)] flex items-center justify-center">
          <IconCalendar className="w-4 h-4 text-white/85" />
        </span>
      )}

      <div className="min-w-0 flex items-center gap-2.5">
        <h1 className="font-head font-semibold text-[15px] lg:text-[17px] text-oc-ink truncate leading-tight">
          {event.name}
        </h1>
        <OrgChip label={statusLabel} tone={orgEventStatusTone(status)} size="sm" className="hidden sm:inline-flex shrink-0" />
      </div>

      <div className="flex-1" />

      {/* Desktop action cluster */}
      <div className="hidden lg:flex items-center gap-2">
        {transitions.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <OrgButton variant="ghost" size="sm" disabled={transitioning}>
                {transitioning ? <Loader2 className="animate-spin" /> : null}
                Change status
              </OrgButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {transitions.map((s) => (
                <DropdownMenuItem
                  key={s}
                  className={s === "cancelled" ? "text-destructive focus:text-destructive" : ""}
                  onClick={() => onTransition(s)}
                >
                  {EVENT_STATUS_LABELS[s] || s}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        <OrgButton variant="ghost" size="sm" asChild>
          <a href={`/events/${eventId}`} target="_blank" rel="noopener noreferrer">
            <IconExternal /> Preview
          </a>
        </OrgButton>
        <OrgButton size="sm" onClick={copyLink} data-testid="studio-copy-link">
          <IconLink /> Copy link
        </OrgButton>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="More actions"
              className="w-9 h-9 rounded-full flex items-center justify-center text-oc-muted hover:text-oc-ink hover:bg-oc-surface transition-colors"
            >
              <IconMore className="w-[18px] h-[18px]" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={onDelete}>
              <IconTrash className="w-3.5 h-3.5 mr-2" /> Delete event
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Mobile condensed menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="Event actions"
            className="lg:hidden w-9 h-9 rounded-full flex items-center justify-center text-oc-muted hover:text-oc-ink transition-colors shrink-0"
          >
            <IconMore className="w-[19px] h-[19px]" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <a href={`/events/${eventId}`} target="_blank" rel="noopener noreferrer">
              <IconExternal className="w-3.5 h-3.5 mr-2" /> Preview public page
            </a>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={copyLink}>
            <IconLink className="w-3.5 h-3.5 mr-2" /> Copy registration link
          </DropdownMenuItem>
          {transitions.length > 0 && <DropdownMenuSeparator />}
          {transitions.map((s) => (
            <DropdownMenuItem
              key={s}
              disabled={transitioning}
              className={s === "cancelled" ? "text-destructive focus:text-destructive" : ""}
              onClick={() => onTransition(s)}
            >
              {EVENT_STATUS_LABELS[s] || s}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={onDelete}>
            <IconTrash className="w-3.5 h-3.5 mr-2" /> Delete event
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
