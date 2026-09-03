import { useState } from "react";
import { Link } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import CheckInScanner from "@/components/event-detail/CheckInScanner";
import { OrgButton } from "@/components/organizer-console/OrgButton";
import { IconArrowRight, IconClose, IconKey } from "@/components/organizer-console/orgIcons";
import { getApiErrorMessage } from "@/lib/apiError";
import { unlockOrganizerScanner } from "@/services/organizerQr";

type Unlocked = {
  event_id: number;
  title: string;
};

/**
 * Main-nav scanner: enter the event scan_token to unlock check-in for that event only.
 * Unlock prompt is centered in the content column.
 */
export default function OrganizerScannerPage() {
  const [token, setToken] = useState("");
  const [unlocking, setUnlocking] = useState(false);
  const [unlocked, setUnlocked] = useState<Unlocked | null>(null);

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = token.trim();
    if (!value) {
      toast.error("Enter the event scan token");
      return;
    }
    setUnlocking(true);
    try {
      const data = await unlockOrganizerScanner(value);
      setUnlocked({ event_id: data.event_id, title: data.title });
      toast.success(`Unlocked: ${data.title}`);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Invalid scan token"));
    } finally {
      setUnlocking(false);
    }
  };

  if (unlocked) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-end justify-between gap-3 px-2 pt-1 lg:pt-0">
          <div className="min-w-0">
            <h1 className="font-head font-semibold text-[22px] lg:text-2xl leading-tight text-oc-ink">Check-in</h1>
            <p className="text-sm text-oc-muted mt-1 truncate">{unlocked.title}</p>
          </div>
          <OrgButton
            variant="ghost"
            size="sm"
            onClick={() => {
              setUnlocked(null);
              setToken("");
            }}
          >
            <IconClose /> Change event
          </OrgButton>
        </div>
        <CheckInScanner eventId={unlocked.event_id} eventTitle={unlocked.title} />
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100dvh-11rem)] lg:min-h-[calc(100dvh-8rem)] items-center justify-center px-2">
      <div className="w-full max-w-md flex flex-col items-center text-center">
        <h1 className="font-head font-semibold text-[22px] lg:text-2xl leading-tight text-oc-ink">Check-in</h1>
        <p className="text-sm text-oc-muted mt-1.5 mb-5 max-w-[42ch]">
          Paste the scan token from Event Studio → Settings. The token links this device to one event.
        </p>

        <form onSubmit={(e) => void handleUnlock(e)} className="org-card p-5 w-full flex flex-col gap-3 text-left">
          <div className="flex items-center gap-2.5 rounded-[12px] bg-oc-well px-3.5 py-2.5 focus-within:ring-2 focus-within:ring-oc-brand/40">
            <IconKey className="w-4 h-4 text-oc-faint shrink-0" />
            <input
              id="scan-token"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="MTS26-8KD3-XQ9P"
              aria-label="Event scan token"
              className="w-full bg-transparent font-data font-semibold text-sm tracking-[1.2px] text-oc-ink placeholder:text-oc-faint placeholder:font-normal placeholder:tracking-normal outline-none"
              autoComplete="off"
              autoFocus
            />
          </div>
          <OrgButton type="submit" disabled={unlocking} data-testid="scanner-unlock">
            {unlocking ? (
              <>
                <Loader2 className="animate-spin" /> Unlocking…
              </>
            ) : (
              <>
                Unlock scanner <IconArrowRight />
              </>
            )}
          </OrgButton>
          <p className="text-xs text-oc-faint text-center">
            Don't have a token?{" "}
            <Link to="/organizer/events" className="font-semibold text-oc-brand hover:text-oc-brand-strong">
              Open Event Studio
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
