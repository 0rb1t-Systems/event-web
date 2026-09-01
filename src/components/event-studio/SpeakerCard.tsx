import { IconPencil, IconTrash } from "@/components/organizer-console/orgIcons";
import { Button } from "@/components/ui/button";
import { getMediaUrl } from "@/lib/mediaUrl";
import type { OrganizerSpeaker } from "@/services/organizerEventContent";

type Props = {
  speaker: OrganizerSpeaker;
  onEdit: () => void;
  onDelete: () => void;
};

export default function SpeakerCard({ speaker, onEdit, onDelete }: Props) {
  const photo = speaker.photo_url ?? getMediaUrl(speaker.photo_path);
  const role = [speaker.title, speaker.organization].filter(Boolean).join(" · ");

  return (
    <div className="group">
      <div className="relative aspect-square rounded-2xl overflow-hidden bg-muted">
        {photo ? (
          <img src={photo} alt={speaker.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
        ) : (
          <div className="w-full h-full flex items-center justify-center font-display font-bold text-5xl text-white bg-gradient-to-br from-primary to-violet-600">
            {(speaker.name || "?").charAt(0)}
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/80 via-black/30 to-transparent">
          <p className="font-display font-semibold text-white leading-tight">{speaker.name}</p>
          {role && <p className="text-xs text-white/75 mt-0.5">{role}</p>}
        </div>
        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button size="icon" variant="secondary" className="h-8 w-8" onClick={onEdit}><IconPencil className="w-3.5 h-3.5" /></Button>
          <Button size="icon" variant="destructive" className="h-8 w-8" onClick={onDelete}><IconTrash className="w-3.5 h-3.5" /></Button>
        </div>
      </div>
    </div>
  );
}
