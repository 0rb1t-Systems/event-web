import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarDays, MapPin, Type, FileText, Globe, CalendarX, Users } from "lucide-react";
import SmartImageField from "./SmartImageField";

type Event = any;

interface Props {
  event: Event;
  onUpdate: (fields: Partial<Event>) => void;
  categories?: Array<{ id: number; name: string }>;
  onUploadCover?: (file: File) => Promise<string | null>;
}

export default function EventQuickInfo({ event, onUpdate, categories = [], onUploadCover }: Props) {
  return (
    <div className="bg-card rounded-xl p-4 sm:p-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="space-y-2">
          <SmartImageField
            value={event.background_image_url ?? null}
            onChange={(url) => {
              if (!url) onUpdate({ banner_path: null, background_image_url: null });
            }}
            eventId={String(event.id)}
            tag="cover"
            template="minimal"
            aspectClass="aspect-[16/10]"
            emptyLabel="Drop or click to upload the event cover"
            onUploadFile={onUploadCover}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 content-start">
          <div className="space-y-1.5 sm:col-span-2">
            <Label className="text-xs flex items-center gap-1">
              <Type className="w-3 h-3" /> Event name
            </Label>
            <Input
              className="h-9 text-sm font-medium rounded-full"
              defaultValue={event.name}
              key={`name-${event.id}-${event.name}`}
              onBlur={(e) => {
                if (e.target.value.trim() && e.target.value !== event.name) {
                  onUpdate({ name: e.target.value.trim() });
                }
              }}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label className="text-xs flex items-center gap-1">
              <FileText className="w-3 h-3" /> Description
            </Label>
            <Textarea
              className="text-sm min-h-[120px] resize-y rounded-2xl"
              defaultValue={event.description || ""}
              key={`desc-${event.id}`}
              rows={5}
              onBlur={(e) => onUpdate({ description: e.target.value || null })}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1">
              <CalendarDays className="w-3 h-3" /> Event date
            </Label>
            <Input
              type="datetime-local"
              className="h-9 text-sm rounded-full"
              defaultValue={event.event_date ? new Date(event.event_date).toISOString().slice(0, 16) : ""}
              onBlur={(e) => onUpdate({ event_date: e.target.value ? new Date(e.target.value).toISOString() : null })}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1">
              <CalendarDays className="w-3 h-3" /> End date
            </Label>
            <Input
              type="datetime-local"
              className="h-9 text-sm rounded-full"
              defaultValue={event.event_end_date ? new Date(event.event_end_date).toISOString().slice(0, 16) : ""}
              onBlur={(e) => onUpdate({ event_end_date: e.target.value ? new Date(e.target.value).toISOString() : null })}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1">
              <Globe className="w-3 h-3" /> Category
            </Label>
            <Select
              value={event.event_category_id ? String(event.event_category_id) : "none"}
              onValueChange={(v) => onUpdate({ event_category_id: v === "none" ? null : Number(v) })}
            >
              <SelectTrigger className="h-9 text-sm rounded-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1">
              <MapPin className="w-3 h-3" /> City
            </Label>
            <Input
              className="h-9 text-sm rounded-full"
              defaultValue={event.city || ""}
              onBlur={(e) => onUpdate({ city: e.target.value || null })}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label className="text-xs flex items-center gap-1">
              <MapPin className="w-3 h-3" /> Address
            </Label>
            <Input
              className="h-9 text-sm rounded-full"
              placeholder="Venue address"
              defaultValue={event.address || event.location_value || ""}
              onBlur={(e) => onUpdate({ address: e.target.value || null, location_value: e.target.value || null })}
            />
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
              defaultValue={event.capacity ?? ""}
              onBlur={(e) => onUpdate({ capacity: e.target.value ? parseInt(e.target.value, 10) : null })}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1">
              <CalendarX className="w-3 h-3" /> Sales end
            </Label>
            <Input
              type="datetime-local"
              className="h-9 text-sm rounded-full"
              defaultValue={event.registration_deadline ? new Date(event.registration_deadline).toISOString().slice(0, 16) : ""}
              onBlur={(e) => onUpdate({ registration_deadline: e.target.value ? new Date(e.target.value).toISOString() : null })}
            />
            <p className="text-[10px] text-muted-foreground">Blank = no deadline</p>
          </div>
        </div>
      </div>
    </div>
  );
}
