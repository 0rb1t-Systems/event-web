import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Trash2, Loader2 } from "lucide-react";
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
  const { event, handleUpdate, setDeleteOpen } = useEventStudio();

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
