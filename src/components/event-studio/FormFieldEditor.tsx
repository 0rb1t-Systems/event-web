import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  formFieldOptionsList,
  slugifyFormKey,
  type FormFieldWriteBody,
  type OrganizerFormField,
  type OrganizerFormFieldType,
} from "@/services/organizerFormFields";

export type FormFieldEditorValue = {
  key: string;
  label: string;
  type: OrganizerFormFieldType;
  optionsText: string;
  required: boolean;
  active: boolean;
};

export function emptyFormFieldEditor(): FormFieldEditorValue {
  return { key: "", label: "", type: "text", optionsText: "", required: false, active: true };
}

export function formFieldToEditor(field: OrganizerFormField): FormFieldEditorValue {
  return {
    key: field.key,
    label: field.label,
    type: (["text", "number", "select", "checkbox", "date"].includes(String(field.type))
      ? field.type
      : "text") as OrganizerFormFieldType,
    optionsText: formFieldOptionsList(field.options).join("\n"),
    required: field.required,
    active: field.active,
  };
}

export function editorToWriteBody(value: FormFieldEditorValue, isCreate: boolean): FormFieldWriteBody {
  const options = value.type === "select"
    ? value.optionsText.split("\n").map((s) => s.trim()).filter(Boolean)
    : null;
  const body: FormFieldWriteBody = {
    label: value.label.trim(),
    type: value.type,
    options,
    required: value.required,
    active: value.active,
  };
  if (isCreate) body.key = slugifyFormKey(value.key || value.label);
  return body;
}

type Props = {
  value: FormFieldEditorValue;
  onChange: (value: FormFieldEditorValue) => void;
  keyLocked: boolean;
};

export default function FormFieldEditor({ value, onChange, keyLocked }: Props) {
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label className="text-xs">Label</Label>
        <Input
          className="rounded-full"
          value={value.label}
          onChange={(e) => {
            const label = e.target.value;
            onChange({
              ...value,
              label,
              key: keyLocked ? value.key : slugifyFormKey(label),
            });
          }}
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Key</Label>
        <Input className="rounded-full font-mono text-sm" value={value.key} disabled={keyLocked} onChange={(e) => onChange({ ...value, key: slugifyFormKey(e.target.value) })} />
        <p className="text-[10px] text-muted-foreground">
          {keyLocked
            ? "Key cannot be changed after create (answers are stored by key)."
            : "Lowercase letters, numbers, and underscores. Locked after save."}
        </p>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Type</Label>
        <Select value={value.type} onValueChange={(v) => onChange({ ...value, type: v as OrganizerFormFieldType })}>
          <SelectTrigger className="rounded-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="text">Text</SelectItem>
            <SelectItem value="number">Number</SelectItem>
            <SelectItem value="select">Select</SelectItem>
            <SelectItem value="checkbox">Checkbox</SelectItem>
            <SelectItem value="date">Date</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {value.type === "select" && (
        <div className="space-y-1.5">
          <Label className="text-xs">Options (one per line)</Label>
          <Textarea
            className="rounded-2xl min-h-[100px]"
            value={value.optionsText}
            onChange={(e) => onChange({ ...value, optionsText: e.target.value })}
          />
        </div>
      )}
      <div className="flex items-center justify-between rounded-xl bg-muted/50 px-4 h-11">
        <span className="text-sm">Required</span>
        <Switch checked={value.required} onCheckedChange={(v) => onChange({ ...value, required: v })} />
      </div>
      <div className="flex items-center justify-between rounded-xl bg-muted/50 px-4 h-11">
        <span className="text-sm">Active</span>
        <Switch checked={value.active} onCheckedChange={(v) => onChange({ ...value, active: v })} />
      </div>
    </div>
  );
}
