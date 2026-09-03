import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import CheckInScanner from "@/components/event-detail/CheckInScanner";
import { OrgButton } from "@/components/organizer-console/OrgButton";
import { IconArrowRight, IconClose, IconKey } from "@/components/organizer-console/orgIcons";
import { Logo } from "@/components/Logo";
import { getApiErrorMessage } from "@/lib/apiError";
import { unlockPublicScanner } from "@/services/publicQr";

type Unlocked = {
  event_id: number;
  title: string;
  scan_token: string;
};

/**
 * Public door scanner at `/qrscan` — no login. Unlock with the event scan_token from Event Studio → Settings.
 * Not linked from the marketing home page; share the URL manually with door staff.
 */
export default function PublicQrScanPage() {
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
      const data = await unlockPublicScanner(value);
      setUnlocked({ event_id: data.event_id, title: data.title, scan_token: value });
      toast.success(`Unlocked: ${data.title}`);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Invalid scan token"));
    } finally {
      setUnlocking(false);
    }
  };

  return (
    <div className="org-console min-h-dvh bg-oc-bg text-oc-ink">
      <div className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col px-4 py-6 sm:px-6">
        <div className="mb-6 flex items-center justify-center">
          <Logo size="sm" />
        </div>

        {unlocked ? (
          <div className="flex flex-1 flex-col gap-4">
            <div className="flex items-end justify-between gap-3 px-1">
              <div className="min-w-0">
                <h1 className="font-head text-[22px] font-semibold leading-tight sm:text-2xl">Check-in</h1>
                <p className="mt-1 truncate text-sm text-oc-muted">{unlocked.title}</p>
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
            <CheckInScanner
              eventId={unlocked.event_id}
              eventTitle={unlocked.title}
              scanToken={unlocked.scan_token}
            />
          </div>
        ) : (
          <div className="flex flex-1 items-center justify-center">
            <div className="flex w-full max-w-md flex-col items-center text-center">
              <h1 className="font-head text-[22px] font-semibold leading-tight sm:text-2xl">Event check-in</h1>
              <p className="mb-5 mt-1.5 max-w-[42ch] text-sm text-oc-muted">
                Enter the scan token from the event organizer. This page is not listed on the public site — only
                people with this link and token can scan tickets.
              </p>

              <form
                onSubmit={(e) => void handleUnlock(e)}
                className="org-card flex w-full flex-col gap-3 p-5 text-left"
              >
                <div className="flex items-center gap-2.5 rounded-[12px] bg-oc-bg px-3.5 py-2.5 focus-within:ring-2 focus-within:ring-oc-brand/40">
                  <IconKey className="h-4 w-4 shrink-0 text-oc-faint" />
                  <input
                    id="public-scan-token"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    placeholder="MTS26-8KD3-XQ9P"
                    aria-label="Event scan token"
                    className="w-full bg-transparent font-data text-sm font-semibold tracking-[1.2px] text-oc-ink outline-none placeholder:font-normal placeholder:tracking-normal placeholder:text-oc-faint"
                    autoComplete="off"
                    autoFocus
                  />
                </div>
                <OrgButton type="submit" disabled={unlocking} data-testid="public-scanner-unlock">
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
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
