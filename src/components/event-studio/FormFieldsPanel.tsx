import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { IconPlus } from "@/components/organizer-console/orgIcons";
import { toast } from "sonner";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getApiErrorMessage, isOrganizerEventAccessError } from "@/lib/apiError";
import {
  createOrganizerFormField,
  deleteOrganizerFormField,
  listOrganizerFormFields,
  reorderOrganizerFormFields,
  updateOrganizerFormField,
  type OrganizerFormField,
} from "@/services/organizerFormFields";
import FormFieldCard from "./FormFieldCard";
import FormFieldEditor, {
  editorToWriteBody,
  emptyFormFieldEditor,
  formFieldToEditor,
  type FormFieldEditorValue,
} from "./FormFieldEditor";
import FormLivePreview from "./FormLivePreview";

type Props = {
  eventId: number;
  onDenied: () => void;
};

export default function FormFieldsPanel({ eventId, onDenied }: Props) {
  const [fields, setFields] = useState<OrganizerFormField[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FormFieldEditorValue | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const load = async () => {
    setLoading(true);
    try {
      setFields(await listOrganizerFormFields(eventId));
    } catch (err) {
      if (isOrganizerEventAccessError(err)) {
        onDenied();
        return;
      }
      toast.error(getApiErrorMessage(err, "Couldn't load form fields"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [eventId]);

  const save = async () => {
    if (!form) return;
    if (!form.label.trim()) {
      toast.error("Label is required");
      return;
    }
    if (form.type === "select" && !form.optionsText.trim()) {
      toast.error("Select fields need at least one option");
      return;
    }
    setSaving(true);
    try {
      const body = editorToWriteBody(form, editingId == null);
      if (editingId) await updateOrganizerFormField(editingId, body);
      else await createOrganizerFormField(eventId, body);
      toast.success(editingId ? "Field updated" : "Field added");
      setForm(null);
      await load();
    } catch (err) {
      if (isOrganizerEventAccessError(err)) {
        onDenied();
        return;
      }
      toast.error(getApiErrorMessage(err, "Couldn't save field"));
    } finally {
      setSaving(false);
    }
  };

  const onDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = fields.findIndex((f) => f.id === active.id);
    const newIndex = fields.findIndex((f) => f.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const next = arrayMove(fields, oldIndex, newIndex);
    setFields(next);
    try {
      setFields(await reorderOrganizerFormFields(eventId, next.map((f) => f.id)));
    } catch (err) {
      if (isOrganizerEventAccessError(err)) onDenied();
      else toast.error(getApiErrorMessage(err, "Couldn't reorder fields"));
      await load();
    }
  };

  return (
    <div className="space-y-5">
      <div className="bg-card rounded-xl p-4 sm:p-6 space-y-4 min-w-0">
        <div className="flex items-start justify-between gap-2 min-w-0">
          <div className="min-w-0">
            <h3 className="font-display font-semibold">Form fields</h3>
            <p className="text-xs text-muted-foreground mt-0.5 text-pretty">Name, email, and phone are collected by default. Drag to reorder extras.</p>
          </div>
          <Button size="sm" className="rounded-full gap-1.5 shrink-0" onClick={() => { setEditingId(null); setForm(emptyFormFieldEditor()); }}>
            <IconPlus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Add field</span>
            <span className="sm:hidden">Add</span>
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
        ) : fields.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">No custom fields yet.</p>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={fields.map((f) => f.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {fields.map((field) => (
                  <FormFieldCard
                    key={field.id}
                    field={field}
                    onEdit={() => { setEditingId(field.id); setForm(formFieldToEditor(field)); }}
                    onDelete={async () => {
                      if (!confirm(`Remove “${field.label}”? If answers exist, it will be deactivated instead.`)) return;
                      try {
                        const result = await deleteOrganizerFormField(field.id);
                        if (result.action === "deactivated") {
                          toast.success("Field deactivated (historical answers retained)");
                        } else {
                          toast.success("Field deleted");
                        }
                        await load();
                      } catch (err) {
                        if (isOrganizerEventAccessError(err)) onDenied();
                        else toast.error(getApiErrorMessage(err, "Couldn't remove field"));
                      }
                    }}
                    onActiveToggle={async (active) => {
                      try {
                        const updated = await updateOrganizerFormField(field.id, { active });
                        setFields((prev) => prev.map((f) => (f.id === updated.id ? updated : f)));
                      } catch (err) {
                        if (isOrganizerEventAccessError(err)) onDenied();
                        else toast.error(getApiErrorMessage(err, "Couldn't update field"));
                      }
                    }}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

      <FormLivePreview fields={fields} />

      <Dialog open={!!form} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit field" : "New field"}</DialogTitle>
          </DialogHeader>
          {form && <FormFieldEditor value={form} onChange={setForm} keyLocked={editingId != null} />}
          <DialogFooter>
            <Button variant="outline" className="rounded-full" onClick={() => setForm(null)}>Cancel</Button>
            <Button className="rounded-full" disabled={saving} onClick={() => void save()}>
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
