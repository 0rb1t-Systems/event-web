import { useCallback, useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarDays, MapPin, Type, FileText, Globe, CalendarX, Users, Video, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { getApiErrorMessage, getLaravelFieldErrors } from "@/lib/apiError";
import { asEventMode, eventModeRequiresUrl, formatWhyAttend, parseWhyAttendInput, type EventMode } from "@/lib/eventMode";
import SmartImageField from "./SmartImageField";

type Event = any;

type OverviewDraft = {
  name: string;
  description: string;
  why_attend_text: string;
  event_date: string;
  event_end_date: string;
  event_category_id: number | null;
  event_mode: EventMode;
  online_url: string;
  city: string;
  address: string;
  capacity: string;
  registration_deadline: string;
  /** When true, Save will send banner_path: null */
  clear_banner: boolean;
  cover_preview: string | null;
};

function toDatetimeLocal(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 16);
}

function fromDatetimeLocal(value: string): string | null {
  if (!value.trim()) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function eventToDraft(event: Event): OverviewDraft {
  return {
    name: event.name ?? "",
    description: event.description ?? "",
    why_attend_text: formatWhyAttend(event.why_attend),
    event_date: toDatetimeLocal(event.event_date),
    event_end_date: toDatetimeLocal(event.event_end_date),
    event_category_id: event.event_category_id ?? null,
    event_mode: asEventMode(event.event_mode),
    online_url: event.online_url ?? "",
    city: event.city ?? "",
    address: event.address || event.location_value || "",
    capacity: event.capacity == null ? "" : String(event.capacity),
    registration_deadline: toDatetimeLocal(event.registration_deadline),
    clear_banner: false,
    cover_preview: event.background_image_url ?? null,
  };
}

function draftsEqual(a: OverviewDraft, b: OverviewDraft): boolean {
  return (
    a.name === b.name &&
    a.description === b.description &&
    a.why_attend_text === b.why_attend_text &&
    a.event_date === b.event_date &&
    a.event_end_date === b.event_end_date &&
    a.event_category_id === b.event_category_id &&
    a.event_mode === b.event_mode &&
    a.online_url === b.online_url &&
    a.city === b.city &&
    a.address === b.address &&
    a.capacity === b.capacity &&
    a.registration_deadline === b.registration_deadline &&
    a.clear_banner === b.clear_banner
  );
}

/** Map Laravel validation keys onto overview form keys. */
function mapFieldErrors(raw: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = { ...raw };
  if (raw.title && !out.name) out.name = raw.title;
  if (raw.starts_at && !out.event_date) out.event_date = raw.starts_at;
  if (raw.ends_at && !out.event_end_date) out.event_end_date = raw.ends_at;
  return out;
}

interface Props {
  event: Event;
  onUpdate: (fields: Record<string, unknown>) => Promise<void>;
  categories?: Array<{ id: number; name: string }>;
  onUploadCover?: (file: File) => Promise<string | null>;
}

export default function EventQuickInfo({ event, onUpdate, categories = [], onUploadCover }: Props) {
  const baseline = useMemo(() => eventToDraft(event), [event]);
  const [draft, setDraft] = useState<OverviewDraft>(baseline);
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setDraft(eventToDraft(event));
    setFieldErrors({});
  }, [event]);

  const dirty = !draftsEqual(draft, baseline) || draft.clear_banner;
  const needsUrl = eventModeRequiresUrl(draft.event_mode);

  const patchDraft = useCallback((partial: Partial<OverviewDraft>) => {
    setDraft((prev) => ({ ...prev, ...partial }));
    setFieldErrors((prev) => {
      const next = { ...prev };
      for (const key of Object.keys(partial)) {
        delete next[key];
        if (key === "online_url") delete next.online_url;
        if (key === "event_mode") delete next.event_mode;
        if (key === "name") delete next.title;
      }
      return next;
    });
  }, []);

  const handleSave = async () => {
    const name = draft.name.trim();
    if (!name) {
      setFieldErrors({ name: "Event name is required." });
      toast.error("Event name is required.");
      return;
    }
    if (needsUrl && !draft.online_url.trim()) {
      setFieldErrors({ online_url: "Online URL is required for online and hybrid events." });
      toast.error("Online URL is required for online and hybrid events.");
      return;
    }

    const fields: Record<string, unknown> = {
      name,
      description: draft.description.trim() || null,
      why_attend: parseWhyAttendInput(draft.why_attend_text),
      event_date: fromDatetimeLocal(draft.event_date),
      event_end_date: fromDatetimeLocal(draft.event_end_date),
      event_category_id: draft.event_category_id,
      event_mode: draft.event_mode,
      online_url: needsUrl ? draft.online_url.trim() : null,
      city: draft.city.trim() || null,
      address: draft.address.trim() || null,
      location_value: draft.address.trim() || null,
      capacity: draft.capacity === "" ? null : Number(draft.capacity),
      registration_deadline: fromDatetimeLocal(draft.registration_deadline),
    };
    if (draft.clear_banner) {
      fields.banner_path = null;
      fields.background_image_url = null;
    }

    setSaving(true);
    setFieldErrors({});
    try {
      await onUpdate(fields);
      toast.success("Changes saved");
    } catch (err) {
      setFieldErrors(mapFieldErrors(getLaravelFieldErrors(err)));
      toast.error(getApiErrorMessage(err, "Couldn't save event"));
    } finally {
      setSaving(false);
    }
  };

  const fieldError = (key: string) =>
    fieldErrors[key] ? <p className="text-[11px] text-destructive mt-1">{fieldErrors[key]}</p> : null;

  return (
    <div className="bg-card rounded-xl p-4 sm:p-6 space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="space-y-2">
          <SmartImageField
            value={draft.cover_preview}
            onChange={(url) => {
              if (!url) {
                patchDraft({ clear_banner: true, cover_preview: null });
              }
            }}
            eventId={String(event.id)}
            tag="cover"
            template="minimal"
            aspectClass="aspect-[16/10]"
            emptyLabel="Drop or click to upload the event cover"
            onUploadFile={onUploadCover}
          />
          <p className="text-[10px] text-muted-foreground">
            Cover upload saves immediately. Other fields save only when you click Save changes.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 content-start">
          <div className="space-y-1.5 sm:col-span-2">
            <Label className="text-xs flex items-center gap-1">
              <Type className="w-3 h-3" /> Event name
            </Label>
            <Input
              className="h-9 text-sm font-medium rounded-full"
              value={draft.name}
              onChange={(e) => patchDraft({ name: e.target.value })}
            />
            {fieldError("name")}
            {fieldError("title")}
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label className="text-xs flex items-center gap-1">
              <FileText className="w-3 h-3" /> Description
            </Label>
            <Textarea
              className="text-sm min-h-[120px] resize-y rounded-2xl"
              value={draft.description}
              rows={5}
              onChange={(e) => patchDraft({ description: e.target.value })}
            />
            {fieldError("description")}
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label className="text-xs flex items-center gap-1">
              <FileText className="w-3 h-3" /> Why attend
            </Label>
            <Textarea
              className="text-sm min-h-[96px] resize-y rounded-2xl"
              placeholder="One reason per line (max 6)"
              value={draft.why_attend_text}
              rows={4}
              onChange={(e) => patchDraft({ why_attend_text: e.target.value })}
            />
            {fieldError("why_attend")}
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1">
              <CalendarDays className="w-3 h-3" /> Event date
            </Label>
            <Input
              type="datetime-local"
              className="h-9 text-sm rounded-full"
              value={draft.event_date}
              onChange={(e) => patchDraft({ event_date: e.target.value })}
            />
            {fieldError("event_date")}
            {fieldError("starts_at")}
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1">
              <CalendarDays className="w-3 h-3" /> End date
            </Label>
            <Input
              type="datetime-local"
              className="h-9 text-sm rounded-full"
              value={draft.event_end_date}
              onChange={(e) => patchDraft({ event_end_date: e.target.value })}
            />
            {fieldError("event_end_date")}
            {fieldError("ends_at")}
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1">
              <Globe className="w-3 h-3" /> Category
            </Label>
            <Select
              value={draft.event_category_id ? String(draft.event_category_id) : "none"}
              onValueChange={(v) => patchDraft({ event_category_id: v === "none" ? null : Number(v) })}
            >
              <SelectTrigger className="h-9 text-sm rounded-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {fieldError("event_category_id")}
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1">
              <Video className="w-3 h-3" /> Event mode
            </Label>
            <Select
              value={draft.event_mode}
              onValueChange={(v) => {
                const mode = asEventMode(v);
                patchDraft({
                  event_mode: mode,
                  online_url: eventModeRequiresUrl(mode) ? draft.online_url : "",
                });
              }}
            >
              <SelectTrigger className="h-9 text-sm rounded-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="in_person">In person</SelectItem>
                <SelectItem value="online">Online</SelectItem>
              </SelectContent>
            </Select>
            {fieldError("event_mode")}
          </div>
          {needsUrl && (
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs flex items-center gap-1">
                <Globe className="w-3 h-3" /> Online URL
              </Label>
              <Input
                type="url"
                className="h-9 text-sm rounded-full"
                placeholder="https://"
                value={draft.online_url}
                onChange={(e) => patchDraft({ online_url: e.target.value })}
              />
              {fieldError("online_url")}
            </div>
          )}
          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1">
              <MapPin className="w-3 h-3" /> City
            </Label>
            <Input
              className="h-9 text-sm rounded-full"
              value={draft.city}
              onChange={(e) => patchDraft({ city: e.target.value })}
            />
            {fieldError("city")}
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label className="text-xs flex items-center gap-1">
              <MapPin className="w-3 h-3" /> Address
            </Label>
            <Input
              className="h-9 text-sm rounded-full"
              placeholder="Venue address"
              value={draft.address}
              onChange={(e) => patchDraft({ address: e.target.value })}
            />
            {fieldError("address")}
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1">
              <Users className="w-3 h-3" /> Capacity
            </Label>
            <Input
              type="number"
              min={0}
              className="h-9 text-sm rounded-full"
              placeholder="Unlimited"
              value={draft.capacity}
              onChange={(e) => patchDraft({ capacity: e.target.value })}
            />
            {fieldError("capacity")}
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1">
              <CalendarX className="w-3 h-3" /> Sales end
            </Label>
            <Input
              type="datetime-local"
              className="h-9 text-sm rounded-full"
              value={draft.registration_deadline}
              onChange={(e) => patchDraft({ registration_deadline: e.target.value })}
            />
            <p className="text-[10px] text-muted-foreground">Blank = no deadline</p>
            {fieldError("registration_deadline")}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2 pt-1 border-t border-border/60">
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
      </div>
    </div>
  );
}
