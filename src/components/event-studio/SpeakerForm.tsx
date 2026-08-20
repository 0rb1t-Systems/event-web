import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { OrganizerSpeaker, SpeakerWriteBody } from "@/services/organizerEventContent";

export type SpeakerFormValue = {
  name: string;
  title: string;
  organization: string;
  bio: string;
  photo_path: string;
};

export function emptySpeakerForm(): SpeakerFormValue {
  return { name: "", title: "", organization: "", bio: "", photo_path: "" };
}

export function speakerToForm(speaker: OrganizerSpeaker): SpeakerFormValue {
  return {
    name: speaker.name,
    title: speaker.title ?? "",
    organization: speaker.organization ?? "",
    bio: speaker.bio ?? "",
    photo_path: speaker.photo_path ?? "",
  };
}

export function speakerFormToBody(value: SpeakerFormValue): SpeakerWriteBody {
  return {
    name: value.name.trim(),
    title: value.title.trim() || null,
    organization: value.organization.trim() || null,
    bio: value.bio.trim() || null,
    photo_path: value.photo_path.trim() || null,
  };
}

type Props = {
  value: SpeakerFormValue;
  onChange: (value: SpeakerFormValue) => void;
};

export default function SpeakerForm({ value, onChange }: Props) {
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label className="text-xs">Name</Label>
        <Input className="rounded-full" value={value.name} onChange={(e) => onChange({ ...value, name: e.target.value })} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Title</Label>
          <Input className="rounded-full" value={value.title} onChange={(e) => onChange({ ...value, title: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Organization</Label>
          <Input className="rounded-full" value={value.organization} onChange={(e) => onChange({ ...value, organization: e.target.value })} />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Photo path or URL</Label>
        <Input className="rounded-full" value={value.photo_path} onChange={(e) => onChange({ ...value, photo_path: e.target.value })} placeholder="/assets/images/..." />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Bio</Label>
        <Textarea className="rounded-2xl min-h-[100px]" value={value.bio} onChange={(e) => onChange({ ...value, bio: e.target.value })} />
      </div>
    </div>
  );
}
