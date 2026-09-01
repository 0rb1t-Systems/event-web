import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { OrgButton } from "@/components/organizer-console/OrgButton";
import {
  IconArrowRight,
  IconCalendar,
  IconChevronDown,
  IconClose,
  IconGlobe,
  IconMapPin,
  IconWifi,
  type OrgIconType,
} from "@/components/organizer-console/orgIcons";
import { getApiErrorMessage, isEventQuotaError } from "@/lib/apiError";
import { asEventMode, eventModeRequiresUrl, type EventMode } from "@/lib/eventMode";
import { getOrganizerDashboard } from "@/services/organizerDashboard";
import { createOrganizerEvent, listEventCategories } from "@/services/organizerEvents";
import type { OrganizerQuota } from "@/types/organizer";
import { cn } from "@/lib/utils";

const MODES: Array<{ value: EventMode; label: string; icon: OrgIconType }> = [
  { value: "in_person", label: "In-person", icon: IconMapPin },
  { value: "online", label: "Online", icon: IconWifi },
  { value: "hybrid", label: "Hybrid", icon: IconGlobe },
];

const fieldLabel = "block text-xs font-semibold text-oc-ink mb-1.5";
const inputBox =
  "w-full flex items-center gap-2 rounded-[12px] bg-oc-bg px-3.5 py-3 text-sm text-oc-ink outline-none transition-shadow focus-within:ring-2 focus-within:ring-oc-brand/40";
const inputEl = "w-full bg-transparent text-sm text-oc-ink placeholder:text-oc-faint outline-none";

/** Create event — modal over a dark scrim, per design-system.pen "Organizer · Create Event". */
export default function OrganizerEventCreate() {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [eventMode, setEventMode] = useState<EventMode>("in_person");
  const [onlineUrl, setOnlineUrl] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [categoryId, setCategoryId] = useState<string>("none");
  const [categories, setCategories] = useState<Array<{ id: number; name: string }>>([]);
  const [saving, setSaving] = useState(false);
  const [quotaBlock, setQuotaBlock] = useState<{ message: string; quota?: OrganizerQuota } | null>(null);

  useEffect(() => {
    listEventCategories().then(setCategories).catch(() => setCategories([]));
  }, []);

  const close = () => navigate("/organizer/events");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) {
      toast.error("Title is required");
      return;
    }
    if (eventModeRequiresUrl(eventMode) && !onlineUrl.trim()) {
      toast.error("Online URL is required for online and hybrid events");
      return;
    }
    setSaving(true);
    setQuotaBlock(null);
    try {
      const created = await createOrganizerEvent({
        title: trimmed,
        event_mode: eventMode,
        online_url: eventModeRequiresUrl(eventMode) ? onlineUrl.trim() : null,
        starts_at: startsAt ? new Date(startsAt).toISOString() : null,
        ends_at: endsAt ? new Date(endsAt).toISOString() : null,
        event_category_id: categoryId === "none" ? null : Number(categoryId),
      });
      toast.success("Event created as draft");
      navigate(`/organizer/events/${created.id}`);
    } catch (err) {
      if (isEventQuotaError(err)) {
        const message = getApiErrorMessage(err, "You cannot create more events on this package.");
        try {
          const dash = await getOrganizerDashboard();
          setQuotaBlock({ message, quota: dash.quota });
        } catch {
          setQuotaBlock({ message });
        }
      } else {
        toast.error(getApiErrorMessage(err, "Couldn't create event"));
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-oc-dark/70 p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-event-title"
        className="w-full max-w-[560px] bg-oc-surface rounded-[20px] shadow-[0_16px_48px_rgba(0,0,0,0.25)] p-6 sm:p-7 my-auto"
      >
        <div className="flex items-start justify-between gap-4 mb-[18px]">
          <div>
            <h1 id="create-event-title" className="font-head font-semibold text-2xl text-oc-ink">
              Create event
            </h1>
            <p className="text-[13px] text-oc-muted mt-1">
              Start with the basics — add tickets, program and branding later.
            </p>
          </div>
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="text-oc-faint hover:text-oc-ink transition-colors p-1 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-oc-brand"
          >
            <IconClose className="w-[18px] h-[18px]" />
          </button>
        </div>

        {quotaBlock && (
          <div className="rounded-[12px] bg-oc-bad-soft p-4 mb-4 space-y-2">
            <h2 className="font-head font-semibold text-sm text-oc-bad">Event quota reached</h2>
            <p className="text-sm text-oc-ink">{quotaBlock.message}</p>
            <p className="text-[13px] text-oc-muted">
              {quotaBlock.quota
                ? quotaBlock.quota.unlimited
                  ? `${quotaBlock.quota.events_created} events created · unlimited quota`
                  : `${quotaBlock.quota.events_created} of ${quotaBlock.quota.quota ?? "—"} events used`
                : "No active package quota is available on this account."}
            </p>
            <OrgButton asChild variant="ghost" size="sm">
              <Link to="/organizer/finance?tab=plans">View plans</Link>
            </OrgButton>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-[18px]">
          <div>
            <label htmlFor="create-title" className={fieldLabel}>Event title</label>
            <div className={inputBox}>
              <input
                id="create-title"
                className={inputEl}
                placeholder="e.g. Mogadishu Tech Summit"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                autoFocus
              />
            </div>
          </div>

          <div>
            <label htmlFor="create-category" className={fieldLabel}>Category</label>
            <div className={cn(inputBox, "relative")}>
              <select
                id="create-category"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className={cn(inputEl, "appearance-none pr-6 cursor-pointer", categoryId === "none" && "text-oc-faint")}
              >
                <option value="none">No category</option>
                {categories.map((c) => (
                  <option key={c.id} value={String(c.id)}>{c.name}</option>
                ))}
              </select>
              <IconChevronDown className="w-4 h-4 text-oc-faint absolute right-3.5 pointer-events-none" />
            </div>
          </div>

          <fieldset>
            <legend className={cn(fieldLabel, "float-left w-full")}>Event mode</legend>
            <div className="flex gap-1 rounded-full bg-oc-bg p-1">
              {MODES.map((mode) => {
                const active = eventMode === mode.value;
                return (
                  <button
                    key={mode.value}
                    type="button"
                    onClick={() => setEventMode(mode.value)}
                    aria-pressed={active}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 rounded-full py-[9px] text-[13px] transition-colors",
                      active
                        ? "bg-oc-surface text-oc-ink font-semibold shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
                        : "text-oc-muted font-medium hover:text-oc-ink",
                    )}
                  >
                    <mode.icon className={cn("w-[15px] h-[15px]", active ? "text-oc-brand" : "text-oc-muted")} />
                    {mode.label}
                  </button>
                );
              })}
            </div>
          </fieldset>

          {eventModeRequiresUrl(eventMode) && (
            <div>
              <label htmlFor="create-url" className={fieldLabel}>Online URL</label>
              <div className={inputBox}>
                <input
                  id="create-url"
                  type="url"
                  placeholder="https://"
                  className={inputEl}
                  value={onlineUrl}
                  onChange={(e) => setOnlineUrl(e.target.value)}
                  required
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="create-starts" className={fieldLabel}>Starts</label>
              <div className={inputBox}>
                <IconCalendar className="w-[15px] h-[15px] text-oc-faint shrink-0" />
                <input
                  id="create-starts"
                  type="datetime-local"
                  className={cn(inputEl, "[&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:cursor-pointer relative")}
                  value={startsAt}
                  onChange={(e) => setStartsAt(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label htmlFor="create-ends" className={fieldLabel}>Ends</label>
              <div className={inputBox}>
                <IconCalendar className="w-[15px] h-[15px] text-oc-faint shrink-0" />
                <input
                  id="create-ends"
                  type="datetime-local"
                  className={cn(inputEl, "[&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:cursor-pointer relative")}
                  value={endsAt}
                  onChange={(e) => setEndsAt(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2.5 pt-1.5">
            <OrgButton type="button" variant="ghost" onClick={close}>
              Cancel
            </OrgButton>
            <OrgButton type="submit" disabled={saving} data-testid="create-event-submit">
              {saving ? <Loader2 className="animate-spin" /> : null}
              Create event {!saving && <IconArrowRight />}
            </OrgButton>
          </div>
        </form>
      </div>
    </div>
  );
}
