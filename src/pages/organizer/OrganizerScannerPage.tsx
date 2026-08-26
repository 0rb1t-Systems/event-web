import { useState } from "react";
import { ScanLine, Loader2, KeyRound, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import CheckInScanner from "@/components/event-detail/CheckInScanner";
import { getApiErrorMessage } from "@/lib/apiError";
import { unlockOrganizerScanner } from "@/services/organizerQr";

type Unlocked = {
  event_id: number;
  title: string;
};

/**
 * Main-nav scanner: enter the event scan_token to unlock check-in for that event only.
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
      <div className="container max-w-3xl mx-auto px-4 py-6 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Check-in scanner</p>
            <h1 className="font-display text-xl font-semibold">{unlocked.title}</h1>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-full"
            onClick={() => {
              setUnlocked(null);
              setToken("");
            }}
          >
            <X className="w-4 h-4 mr-1.5" />
            Change event
          </Button>
        </div>
        <CheckInScanner eventId={unlocked.event_id} eventTitle={unlocked.title} />
      </div>
    );
  }

  return (
    <div className="container max-w-md mx-auto px-4 py-12">
      <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center">
            <ScanLine className="w-6 h-6 text-muted-foreground" />
          </div>
          <h1 className="font-display text-2xl font-semibold">Check-in scanner</h1>
          <p className="text-sm text-muted-foreground">
            Enter the event scan token to unlock ticket scanning for that event only.
          </p>
        </div>

        <form onSubmit={(e) => void handleUnlock(e)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="scan-token">Event scan token</Label>
            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="scan-token"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Paste token from event studio"
                className="pl-9 font-mono text-sm"
                autoComplete="off"
                autoFocus
              />
            </div>
          </div>
          <Button type="submit" className="w-full rounded-full" disabled={unlocking}>
            {unlocking ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Unlocking…
              </>
            ) : (
              "Unlock scanner"
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
