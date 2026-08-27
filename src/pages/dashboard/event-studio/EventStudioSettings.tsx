import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Trash2, Loader2, Copy, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { getApiErrorMessage, getLaravelFieldErrors } from "@/lib/apiError";
import { useEventStudio } from "@/contexts/EventStudioContext";

function toDatetimeLocal(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 16);
}

export default function EventStudioSettings() {
  const { event, raw, handleUpdate, reloadEvent, setDeleteOpen } = useEventStudio();
  const scanToken = event.scan_token || raw.scan_token || null;
  const [loadingToken, setLoadingToken] = useState(false);

  const baseline = useMemo(
    () => ({
      capacity: event.capacity == null ? "" : String(event.capacity),
      registration_deadline: toDatetimeLocal(event.registration_deadline),
    }),
    [event],
  );

  const [capacity, setCapacity] = useState(baseline.capacity);
  const [registrationDeadline, setRegistrationDeadline] = useState(baseline.registration_deadline);
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setCapacity(baseline.capacity);
    setRegistrationDeadline(baseline.registration_deadline);
    setFieldErrors({});
  }, [baseline]);

  const dirty =
    capacity !== baseline.capacity || registrationDeadline !== baseline.registration_deadline;

  const handleSave = async () => {
    setSaving(true);
    setFieldErrors({});
    try {
      await handleUpdate({
        capacity: capacity === "" ? null : Number(capacity),
        registration_deadline: registrationDeadline
          ? new Date(registrationDeadline).toISOString()
          : null,
      });
      toast.success("Changes saved");
    } catch (err) {
      setFieldErrors(getLaravelFieldErrors(err));
      toast.error(getApiErrorMessage(err, "Couldn't save event"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-card rounded-xl p-5 sm:p-6 space-y-4">
      <h3 className="font-display font-semibold">Event settings</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Capacity</Label>
          <Input
            type="number"
            min={0}
            placeholder="Unlimited"
            value={capacity}
            onChange={(e) => {
              setCapacity(e.target.value);
              setFieldErrors((prev) => {
                const next = { ...prev };
                delete next.capacity;
                return next;
              });
            }}
            className="rounded-full"
          />
          {fieldErrors.capacity && (
            <p className="text-[11px] text-destructive">{fieldErrors.capacity}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label>Registration deadline</Label>
          <Input
            type="datetime-local"
            value={registrationDeadline}
            onChange={(e) => {
              setRegistrationDeadline(e.target.value);
              setFieldErrors((prev) => {
                const next = { ...prev };
                delete next.registration_deadline;
                return next;
              });
            }}
            className="rounded-full"
          />
          {fieldErrors.registration_deadline && (
            <p className="text-[11px] text-destructive">{fieldErrors.registration_deadline}</p>
          )}
        </div>
      </div>
      <div className="rounded-2xl border border-border/60 p-4 space-y-2">
        <div className="flex items-center gap-2">
          <KeyRound className="w-4 h-4 text-muted-foreground" />
          <h4 className="text-sm font-semibold">Check-in scan token</h4>
        </div>
        <p className="text-xs text-muted-foreground">
          Enter this token on <span className="font-medium">Organizer → Scanner</span> to unlock door check-in for this event.
        </p>
        {scanToken ? (
          <div className="flex flex-col sm:flex-row gap-2">
            <Input readOnly value={scanToken} className="rounded-full font-mono text-xs" />
            <Button
              type="button"
              variant="outline"
              className="rounded-full shrink-0"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(scanToken);
                  toast.success("Scan token copied");
                } catch {
                  toast.error("Could not copy");
                }
              }}
            >
              <Copy className="w-4 h-4 mr-1.5" />
              Copy
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              No token on this event yet. Generate one to unlock door check-in.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-full"
              disabled={loadingToken}
              onClick={async () => {
                setLoadingToken(true);
                try {
                  await reloadEvent();
                  toast.success("Scan token ready");
                } catch (err) {
                  toast.error(getApiErrorMessage(err, "Couldn't generate token"));
                } finally {
                  setLoadingToken(false);
                }
              }}
            >
              {loadingToken ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <KeyRound className="w-4 h-4 mr-1.5" />}
              Generate token
            </Button>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          className="rounded-full"
          disabled={saving || !dirty}
          onClick={() => void handleSave()}
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving…
            </>
          ) : (
            "Save changes"
          )}
        </Button>
        <Button variant="destructive" size="sm" className="rounded-full" onClick={() => setDeleteOpen(true)}>
          <Trash2 className="w-4 h-4 mr-2" /> Delete event
        </Button>
      </div>
    </div>
  );
}
