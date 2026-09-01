import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { OrgButton } from "@/components/organizer-console/OrgButton";
import {
  IconCalendar,
  IconCopy,
  IconKey,
  IconQr,
  IconRefresh,
  IconTrash,
} from "@/components/organizer-console/orgIcons";
import { StudioTabFrame } from "@/components/event-studio/StudioTabFrame";
import { getApiErrorMessage, getLaravelFieldErrors } from "@/lib/apiError";
import { copyToClipboard } from "@/lib/clipboard";
import { useEventStudio } from "@/contexts/EventStudioContext";
import { cn } from "@/lib/utils";

const cardTitle = "font-head text-[17px] font-semibold text-oc-ink";
const cardNote = "text-xs text-oc-faint";
const inputBox =
  "flex items-center gap-2 rounded-[12px] bg-oc-bg px-3.5 py-[11px] transition-shadow focus-within:ring-2 focus-within:ring-oc-brand/40";
const inputEl = "w-full bg-transparent text-sm text-oc-ink placeholder:text-oc-faint outline-none";

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
  const [savingCapacity, setSavingCapacity] = useState(false);
  const [savingDeadline, setSavingDeadline] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setCapacity(baseline.capacity);
    setRegistrationDeadline(baseline.registration_deadline);
    setFieldErrors({});
  }, [baseline]);

  const capacityDirty = capacity !== baseline.capacity;
  const deadlineDirty = registrationDeadline !== baseline.registration_deadline;

  const saveCapacity = async () => {
    setSavingCapacity(true);
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next.capacity;
      return next;
    });
    try {
      await handleUpdate({ capacity: capacity === "" ? null : Number(capacity) });
      toast.success("Capacity saved");
    } catch (err) {
      setFieldErrors(getLaravelFieldErrors(err));
      toast.error(getApiErrorMessage(err, "Couldn't save capacity"));
    } finally {
      setSavingCapacity(false);
    }
  };

  const saveDeadline = async () => {
    setSavingDeadline(true);
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next.registration_deadline;
      return next;
    });
    try {
      await handleUpdate({
        registration_deadline: registrationDeadline
          ? new Date(registrationDeadline).toISOString()
          : null,
      });
      toast.success("Deadline saved");
    } catch (err) {
      setFieldErrors(getLaravelFieldErrors(err));
      toast.error(getApiErrorMessage(err, "Couldn't save deadline"));
    } finally {
      setSavingDeadline(false);
    }
  };

  const regenerateToken = async () => {
    setLoadingToken(true);
    try {
      await reloadEvent();
      toast.success(scanToken ? "Token refreshed" : "Scan token ready");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Couldn't generate token"));
    } finally {
      setLoadingToken(false);
    }
  };

  return (
    <StudioTabFrame
      title="Event settings"
      description="Capacity, deadlines and the door scan token for this event."
    >
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 items-start">
        <div className="flex flex-col gap-4">
          {/* Capacity */}
          <div className="org-card p-5 flex flex-col gap-2.5">
            <h3 className={cardTitle}>Capacity</h3>
            <div className="flex items-center gap-2.5">
              <div className={cn(inputBox, "w-40")}>
                <input
                  type="number"
                  min={0}
                  placeholder="Unlimited"
                  aria-label="Capacity"
                  className={cn(inputEl, "font-data font-semibold")}
                  value={capacity}
                  onChange={(e) => {
                    setCapacity(e.target.value);
                    setFieldErrors((prev) => {
                      const next = { ...prev };
                      delete next.capacity;
                      return next;
                    });
                  }}
                />
              </div>
              <OrgButton
                variant="ghost"
                size="sm"
                disabled={!capacityDirty || savingCapacity}
                onClick={() => void saveCapacity()}
              >
                {savingCapacity ? <Loader2 className="animate-spin" /> : null}
                Save
              </OrgButton>
            </div>
            {fieldErrors.capacity ? (
              <p className="text-xs text-oc-bad">{fieldErrors.capacity}</p>
            ) : (
              <p className={cardNote}>
                {event.registrations_count > 0
                  ? `${event.registrations_count} people are registered — capacity can't go below that.`
                  : "Leave empty for open capacity."}
              </p>
            )}
          </div>

          {/* Registration deadline */}
          <div className="org-card p-5 flex flex-col gap-2.5">
            <h3 className={cardTitle}>Registration deadline</h3>
            <div className="flex flex-wrap items-center gap-2.5">
              <div className={cn(inputBox, "w-full sm:w-[260px] relative")}>
                <IconCalendar className="w-[15px] h-[15px] text-oc-faint shrink-0" />
                <input
                  type="datetime-local"
                  aria-label="Registration deadline"
                  className={cn(
                    inputEl,
                    "text-[13px] [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:cursor-pointer",
                  )}
                  value={registrationDeadline}
                  onChange={(e) => {
                    setRegistrationDeadline(e.target.value);
                    setFieldErrors((prev) => {
                      const next = { ...prev };
                      delete next.registration_deadline;
                      return next;
                    });
                  }}
                />
              </div>
              <OrgButton
                variant="ghost"
                size="sm"
                disabled={!deadlineDirty || savingDeadline}
                onClick={() => void saveDeadline()}
              >
                {savingDeadline ? <Loader2 className="animate-spin" /> : null}
                Save
              </OrgButton>
            </div>
            {fieldErrors.registration_deadline ? (
              <p className="text-xs text-oc-bad">{fieldErrors.registration_deadline}</p>
            ) : (
              <p className={cardNote}>Registration closes automatically at this time.</p>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-4">
          {/* Scan token */}
          <div className="org-card p-5 flex flex-col gap-2.5">
            <div className="flex items-center gap-2.5">
              <span className="w-[34px] h-[34px] rounded-full bg-oc-brand-soft text-oc-brand-strong flex items-center justify-center shrink-0">
                <IconQr className="w-4 h-4" />
              </span>
              <div>
                <h3 className={cardTitle}>Check-in scan token</h3>
                <p className="text-xs text-oc-muted">Unlocks the door scanner for this event only.</p>
              </div>
            </div>
            {scanToken ? (
              <>
                <div className="flex items-center justify-between gap-3 rounded-[12px] bg-oc-dark px-4 py-3.5">
                  <span className="font-data font-semibold text-base tracking-[2px] text-white truncate">
                    {scanToken}
                  </span>
                  <OrgButton
                    size="sm"
                    className="shrink-0"
                    onClick={async () => {
                      const ok = await copyToClipboard(scanToken);
                      toast[ok ? "success" : "error"](ok ? "Scan token copied" : "Could not copy");
                    }}
                  >
                    <IconCopy /> Copy
                  </OrgButton>
                </div>
                <button
                  type="button"
                  onClick={() => void regenerateToken()}
                  disabled={loadingToken}
                  className="flex items-center gap-1.5 text-left group w-fit"
                >
                  {loadingToken ? (
                    <Loader2 className="w-[13px] h-[13px] text-oc-muted animate-spin" />
                  ) : (
                    <IconRefresh className="w-[13px] h-[13px] text-oc-muted group-hover:text-oc-ink transition-colors" />
                  )}
                  <span className="text-xs font-semibold text-oc-muted group-hover:text-oc-ink transition-colors">
                    Regenerate token
                  </span>
                  <span className="text-xs text-oc-faint">· invalidates the old one immediately</span>
                </button>
              </>
            ) : (
              <div className="flex flex-col gap-2.5">
                <p className="text-[13px] text-oc-muted">
                  No token on this event yet. Generate one to unlock door check-in.
                </p>
                <OrgButton
                  variant="ghost"
                  size="sm"
                  className="w-fit"
                  disabled={loadingToken}
                  onClick={() => void regenerateToken()}
                >
                  {loadingToken ? <Loader2 className="animate-spin" /> : <IconKey />}
                  Generate token
                </OrgButton>
              </div>
            )}
          </div>

          {/* Danger zone */}
          <div className="rounded-[16px] bg-oc-bad-soft p-5 flex flex-col gap-2.5">
            <h3 className="font-head text-[17px] font-semibold text-oc-bad">Danger zone</h3>
            <p className="text-[13px] text-oc-ink leading-relaxed">
              Deleting this event removes it from your list. Registrations, tickets and finance history stay on the server.
            </p>
            <div>
              <button
                type="button"
                onClick={() => setDeleteOpen(true)}
                data-testid="studio-delete-event"
                className="inline-flex items-center gap-2 rounded-[12px] bg-oc-surface border border-oc-bad px-4 py-2.5 text-[13px] font-semibold text-oc-bad hover:bg-oc-bad hover:text-white transition-colors"
              >
                <IconTrash className="w-[15px] h-[15px]" />
                Delete this event
              </button>
            </div>
          </div>
        </div>
      </div>
    </StudioTabFrame>
  );
}
