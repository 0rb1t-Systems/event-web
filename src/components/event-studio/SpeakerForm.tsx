import { useEffect, useMemo, useRef, useState } from "react";
import { IconPhoto, IconTrash, IconUpload } from "@/components/organizer-console/orgIcons";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getMediaUrl } from "@/lib/mediaUrl";
import {
  GALLERY_ACCEPT,
  validateGalleryFile,
} from "@/services/organizerEvents";
import type { OrganizerSpeaker, SpeakerWriteBody } from "@/services/organizerEventContent";

export type SpeakerFormValue = {
  name: string;
  title: string;
  organization: string;
  bio: string;
  photo_path: string;
  photo_url?: string | null;
  photo_file: File | null;
  clear_photo: boolean;
};

export function emptySpeakerForm(): SpeakerFormValue {
  return {
    name: "",
    title: "",
    organization: "",
    bio: "",
    photo_path: "",
    photo_url: null,
    photo_file: null,
    clear_photo: false,
  };
}

export function speakerToForm(speaker: OrganizerSpeaker): SpeakerFormValue {
  return {
    name: speaker.name,
    title: speaker.title ?? "",
    organization: speaker.organization ?? "",
    bio: speaker.bio ?? "",
    photo_path: speaker.photo_path ?? "",
    photo_url: speaker.photo_url ?? null,
    photo_file: null,
    clear_photo: false,
  };
}

export function speakerFormToBody(value: SpeakerFormValue): SpeakerWriteBody {
  const body: SpeakerWriteBody = {
    name: value.name.trim(),
    title: value.title.trim() || null,
    organization: value.organization.trim() || null,
    bio: value.bio.trim() || null,
  };
  if (value.clear_photo && !value.photo_file) {
    body.photo_path = null;
  }
  return body;
}

type Props = {
  value: SpeakerFormValue;
  onChange: (value: SpeakerFormValue) => void;
};

export default function SpeakerForm({ value, onChange }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const blobUrl = useMemo(() => {
    if (!value.photo_file) return null;
    return URL.createObjectURL(value.photo_file);
  }, [value.photo_file]);

  useEffect(() => {
    return () => {
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [blobUrl]);

  const preview =
    blobUrl ??
    (value.clear_photo
      ? undefined
      : value.photo_url || getMediaUrl(value.photo_path || null));

  const handleFile = (file: File | undefined) => {
    if (!file) return;
    const invalid = validateGalleryFile(file);
    if (invalid) {
      toast.error(invalid);
      return;
    }
    onChange({ ...value, photo_file: file, clear_photo: false });
  };

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
        <Label className="text-xs">Photo</Label>
        <p className="text-[10px] text-muted-foreground">JPEG, PNG, GIF, or WebP · max 4 MB</p>
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            handleFile(e.dataTransfer.files?.[0]);
          }}
          className={`relative group aspect-square max-w-[11rem] rounded-xl overflow-hidden bg-muted border border-dashed transition-colors ${
            dragOver ? "border-primary bg-primary/5" : "border-border"
          }`}
        >
          {preview ? (
            <>
              <img src={preview} alt="" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 p-2">
                <Button type="button" size="sm" variant="secondary" className="h-8 rounded-full" onClick={() => fileRef.current?.click()}>
                  <IconUpload className="w-3.5 h-3.5 mr-1" /> Change
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="destructive"
                  className="h-8 w-8"
                  onClick={() => onChange({ ...value, photo_file: null, photo_path: "", photo_url: null, clear_photo: true })}
                >
                  <IconTrash className="w-3.5 h-3.5" />
                </Button>
              </div>
            </>
          ) : (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="w-full h-full flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-foreground transition-colors px-3"
            >
              <IconPhoto className="w-7 h-7 opacity-40" />
              <span className="text-xs text-center">Drop or click to upload</span>
            </button>
          )}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept={GALLERY_ACCEPT}
          className="hidden"
          onChange={(e) => {
            handleFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Bio</Label>
        <Textarea className="rounded-2xl min-h-[100px]" value={value.bio} onChange={(e) => onChange({ ...value, bio: e.target.value })} />
      </div>
    </div>
  );
}
