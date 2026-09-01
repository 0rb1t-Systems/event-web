import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { IconGrip, IconPencil, IconTrash } from "@/components/organizer-console/orgIcons";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { OrganizerFormField } from "@/services/organizerFormFields";

type Props = {
  field: OrganizerFormField;
  onEdit: () => void;
  onDelete: () => void;
  onActiveToggle: (active: boolean) => void;
};

export default function FormFieldCard({ field, onEdit, onDelete, onActiveToggle }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: field.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 p-3 rounded-xl bg-muted/40 ${field.active ? "" : "opacity-60"}`}
    >
      <button
        type="button"
        className="shrink-0 text-muted-foreground hover:text-foreground cursor-grab"
        aria-label="Reorder"
        {...attributes}
        {...listeners}
      >
        <IconGrip className="w-4 h-4" />
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium truncate">{field.label}</span>
          <Badge className="border-0 bg-card text-[10px] rounded-full">{String(field.type)}</Badge>
          {field.required && <Badge className="border-0 bg-primary/10 text-primary text-[10px] rounded-full">Required</Badge>}
          {!field.active && <Badge className="border-0 bg-muted text-[10px] rounded-full">Inactive</Badge>}
        </div>
        <p className="text-xs text-muted-foreground font-mono truncate">{field.key}</p>
      </div>
      <Switch checked={field.active} onCheckedChange={onActiveToggle} aria-label="Toggle active" />
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onEdit}>
        <IconPencil className="w-3.5 h-3.5" />
      </Button>
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onDelete}>
        <IconTrash className="w-3.5 h-3.5 text-destructive" />
      </Button>
    </div>
  );
}
