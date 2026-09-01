import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { IconPencil, IconPlus, IconTrash } from "@/components/organizer-console/orgIcons";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getApiErrorMessage, isOrganizerEventAccessError } from "@/lib/apiError";
import {
  createOrganizerDiscountCode,
  deleteOrganizerDiscountCode,
  discountValueNumber,
  listOrganizerDiscountCodes,
  updateOrganizerDiscountActive,
  updateOrganizerDiscountCode,
  type OrganizerDiscountCode,
} from "@/services/organizerDiscounts";
import DiscountCodeForm, {
  discountFormToBody,
  discountFromRecord,
  emptyDiscountForm,
  type DiscountCodeFormValue,
} from "./DiscountCodeForm";

type Props = {
  eventId: number;
  onDenied: () => void;
};

export default function DiscountCodesPanel({ eventId, onDenied }: Props) {
  const [codes, setCodes] = useState<OrganizerDiscountCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<DiscountCodeFormValue | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      setCodes(await listOrganizerDiscountCodes(eventId));
    } catch (err) {
      if (isOrganizerEventAccessError(err)) {
        onDenied();
        return;
      }
      toast.error(getApiErrorMessage(err, "Couldn't load discount codes"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [eventId]);

  const save = async () => {
    if (!form) return;
    if (!form.code.trim()) {
      toast.error("Code is required");
      return;
    }
    setSaving(true);
    try {
      const body = discountFormToBody(form);
      if (editingId) await updateOrganizerDiscountCode(editingId, body);
      else await createOrganizerDiscountCode(eventId, body);
      toast.success(editingId ? "Discount updated" : "Discount created");
      setForm(null);
      await load();
    } catch (err) {
      if (isOrganizerEventAccessError(err)) {
        onDenied();
        return;
      }
      toast.error(getApiErrorMessage(err, "Couldn't save discount"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-card rounded-xl p-4 sm:p-6 space-y-4 min-w-0">
      <div className="flex items-start justify-between gap-2 min-w-0">
        <div className="min-w-0">
          <h3 className="font-display font-semibold">Discount codes</h3>
          <p className="text-xs text-muted-foreground mt-0.5 text-pretty">Event-scoped codes plus any organizer-wide codes.</p>
        </div>
        <Button size="sm" className="rounded-full gap-1.5 shrink-0" onClick={() => { setEditingId(null); setForm(emptyDiscountForm()); }}>
          <IconPlus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Add code</span>
          <span className="sm:hidden">Add</span>
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
      ) : codes.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">No discount codes yet.</p>
      ) : (
        <div className="space-y-2">
          {codes.map((code) => {
            const type = String(code.type);
            const value = discountValueNumber(code);
            const label = type === "percent" ? `${value}%` : value.toFixed(2);
            return (
              <div key={code.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/40">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold tracking-wider">{code.code}</span>
                    <Badge className="border-0 bg-card text-[10px] rounded-full capitalize">{type}</Badge>
                    {code.event_id == null && (
                      <Badge className="border-0 bg-secondary/20 text-[10px] rounded-full">Organizer-wide</Badge>
                    )}
                    {!code.active && <Badge className="border-0 bg-muted text-[10px] rounded-full">Inactive</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {label} · {code.usage_count}{code.usage_limit != null ? ` / ${code.usage_limit}` : ""} uses
                    {code.expires_at ? ` · expires ${new Date(code.expires_at).toLocaleDateString()}` : ""}
                  </p>
                </div>
                <Switch
                  checked={code.active}
                  onCheckedChange={async (v) => {
                    try {
                      const updated = await updateOrganizerDiscountActive(code.id, v);
                      setCodes((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
                    } catch (err) {
                      if (isOrganizerEventAccessError(err)) onDenied();
                      else toast.error(getApiErrorMessage(err, "Couldn't update code"));
                    }
                  }}
                />
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingId(code.id); setForm(discountFromRecord(code)); }}>
                  <IconPencil className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={async () => {
                    if (!confirm(`Delete ${code.code}?`)) return;
                    try {
                      await deleteOrganizerDiscountCode(code.id);
                      setCodes((prev) => prev.filter((c) => c.id !== code.id));
                      toast.success("Discount deleted");
                    } catch (err) {
                      if (isOrganizerEventAccessError(err)) onDenied();
                      else toast.error(getApiErrorMessage(err, "Couldn't delete code"));
                    }
                  }}
                >
                  <IconTrash className="w-3.5 h-3.5 text-destructive" />
                </Button>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={!!form} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit discount" : "New discount"}</DialogTitle>
          </DialogHeader>
          {form && <DiscountCodeForm value={form} onChange={setForm} />}
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
