import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { IconMapPin, IconPencil, IconTrash } from "@/components/organizer-console/orgIcons";
import type { OrganizerSession } from "@/services/organizerEventContent";

type Props = {
  sessions: OrganizerSession[];
  onEdit: (session: OrganizerSession) => void;
  onDelete: (session: OrganizerSession) => void;
};

export default function SessionTimeline({ sessions, onEdit, onDelete }: Props) {
  if (sessions.length === 0) {
    return <p className="text-sm text-muted-foreground py-6 px-1 text-center text-pretty break-words">No sessions yet. Add agenda items for the public event page.</p>;
  }

  return (
    <ol className="relative border-l border-border ml-3 space-y-6">
      {sessions.map((session) => (
        <li key={session.id} className="ml-6">
          <span className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full bg-primary" />
          <div className="bg-muted/40 rounded-xl p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {format(new Date(session.starts_at), "EEE, MMM d · HH:mm")}
                  {session.ends_at ? ` – ${format(new Date(session.ends_at), "HH:mm")}` : ""}
                </p>
                <h4 className="font-display font-semibold mt-1">{session.title}</h4>
                {session.speaker?.name && <p className="text-sm text-muted-foreground">{session.speaker.name}</p>}
                {session.room && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                    <IconMapPin className="w-3 h-3" />{session.room}
                  </p>
                )}
                {session.description && <p className="text-sm text-muted-foreground mt-2">{session.description}</p>}
              </div>
              <div className="flex shrink-0">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(session)}><IconPencil className="w-3.5 h-3.5" /></Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onDelete(session)}><IconTrash className="w-3.5 h-3.5 text-destructive" /></Button>
              </div>
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}
