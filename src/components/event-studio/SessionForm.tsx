import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { OrganizerSession, OrganizerSpeaker, SessionWriteBody } from "@/services/organizerEventContent";

export type SessionFormValue = {
  title: string;
  starts_at: string;
  ends_at: string;
  room: string;
  description: string;
  speaker_id: string;
};

export function emptySessionForm(): SessionFormValue {
  return { title: "", starts_at: "", ends_at: "", room: "", description: "", speaker_id: "none" };
}

function toLocal(iso: string | null | undefined): string {
  if (!iso) return "";
  return new Date(iso).toISOString().slice(0, 16);
}

export function sessionToForm(session: OrganizerSession): SessionFormValue {
  return {
    title: session.title,
    starts_at: toLocal(session.starts_at),
    ends_at: toLocal(session.ends_at),
    room: session.room ?? "",
    description: session.description ?? "",
    speaker_id: session.speaker_id ? String(session.speaker_id) : "none",
  };
}

export function sessionFormToBody(value: SessionFormValue): SessionWriteBody {
  return {
    title: value.title.trim(),
    starts_at: value.starts_at ? new Date(value.starts_at).toISOString() : undefined,
    ends_at: value.ends_at ? new Date(value.ends_at).toISOString() : null,
    room: value.room.trim() || null,
    description: value.description.trim() || null,
    speaker_id: value.speaker_id === "none" ? null : Number(value.speaker_id),
  };
}

type Props = {
  value: SessionFormValue;
  onChange: (value: SessionFormValue) => void;
  speakers: OrganizerSpeaker[];
};

export default function SessionForm({ value, onChange, speakers }: Props) {
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label className="text-xs">Title</Label>
        <Input className="rounded-full" value={value.title} onChange={(e) => onChange({ ...value, title: e.target.value })} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Starts</Label>
          <Input type="datetime-local" className="rounded-full" value={value.starts_at} onChange={(e) => onChange({ ...value, starts_at: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Ends</Label>
          <Input type="datetime-local" className="rounded-full" value={value.ends_at} onChange={(e) => onChange({ ...value, ends_at: e.target.value })} />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Room</Label>
        <Input className="rounded-full" value={value.room} onChange={(e) => onChange({ ...value, room: e.target.value })} />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Speaker</Label>
        <Select value={value.speaker_id} onValueChange={(v) => onChange({ ...value, speaker_id: v })}>
          <SelectTrigger className="rounded-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">None</SelectItem>
            {speakers.map((s) => (
              <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Description</Label>
        <Textarea className="rounded-2xl" value={value.description} onChange={(e) => onChange({ ...value, description: e.target.value })} />
      </div>
    </div>
  );
}
