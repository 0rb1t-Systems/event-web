import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formFieldOptionsList, type OrganizerFormField } from "@/services/organizerFormFields";

type Props = {
  fields: OrganizerFormField[];
};

export default function FormLivePreview({ fields }: Props) {
  const visible = fields.filter((f) => f.active);

  return (
    <div className="bg-muted/30 rounded-xl p-5 sm:p-6">
      <h3 className="font-display font-semibold mb-4">Live participant preview</h3>
      <div className="bg-card rounded-xl p-4 sm:p-6 space-y-4">
        {visible.length === 0 ? (
          <p className="text-sm text-muted-foreground">Active fields appear here as attendees will see them.</p>
        ) : (
          visible.map((field) => {
            const type = String(field.type);
            const options = formFieldOptionsList(field.options);
            return (
              <div key={field.id} className="space-y-1.5">
                {type !== "checkbox" && (
                  <Label className="text-xs">
                    {field.label}{field.required ? " *" : ""}
                  </Label>
                )}
                {type === "select" ? (
                  <Select disabled>
                    <SelectTrigger className="rounded-full"><SelectValue placeholder="Choose…" /></SelectTrigger>
                    <SelectContent>
                      {options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                    </SelectContent>
                  </Select>
                ) : type === "checkbox" ? (
                  <div className="flex items-center gap-2">
                    <Checkbox disabled id={`preview-${field.id}`} />
                    <Label htmlFor={`preview-${field.id}`} className="text-sm">{field.label}{field.required ? " *" : ""}</Label>
                  </div>
                ) : (
                  <Input
                    disabled
                    type={type === "number" ? "number" : type === "date" ? "date" : "text"}
                    className="rounded-full bg-muted/50"
                    placeholder={field.label}
                  />
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
