import { useEffect, useState } from "react";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { getApiErrorMessage, isOrganizerEventAccessError } from "@/lib/apiError";
import {
  createOrganizerTicketType,
  deleteOrganizerTicketType,
  listOrganizerTicketTypes,
  updateOrganizerTicketSales,
  updateOrganizerTicketType,
  type OrganizerTicketType,
} from "@/services/organizerTickets";
import TicketTypeCard from "./TicketTypeCard";
import TicketTypeForm, { emptyTicketTypeForm, ticketTypeFormToBody, type TicketTypeFormValue } from "./TicketTypeForm";

type Props = {
  eventId: number;
  onDenied: () => void;
};

export default function TicketTypesPanel({ eventId, onDenied }: Props) {
  const [tickets, setTickets] = useState<OrganizerTicketType[]>([]);
  const [monetized, setMonetized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<TicketTypeFormValue | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<OrganizerTicketType | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await listOrganizerTicketTypes(eventId);
      setTickets(data.ticket_types);
      setMonetized(data.monetized);
    } catch (err) {
      if (isOrganizerEventAccessError(err)) {
        onDenied();
        return;
      }
      toast.error(getApiErrorMessage(err, "Couldn't load tickets"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [eventId]);

  const openNew = () => {
    setEditingId(null);
    setForm(emptyTicketTypeForm());
  };

  const openEdit = (ticket: OrganizerTicketType) => {
    setEditingId(ticket.id);
    setForm({
      name: ticket.name,
      price: String(ticket.price),
      quantity_limit: ticket.quantity_limit == null ? "" : String(ticket.quantity_limit),
      sales_enabled: ticket.sales_enabled,
    });
  };

  const save = async () => {
    if (!form) return;
    if (!form.name.trim()) {
      toast.error("Ticket name is required");
      return;
    }
    setSaving(true);
    try {
      const body = ticketTypeFormToBody(form);
      if (editingId) {
        await updateOrganizerTicketType(editingId, body);
        toast.success("Ticket updated");
      } else {
        await createOrganizerTicketType(eventId, body);
        toast.success("Ticket added");
      }
      setForm(null);
      await load();
    } catch (err) {
      if (isOrganizerEventAccessError(err)) {
        onDenied();
        return;
      }
      toast.error(getApiErrorMessage(err, "Couldn't save ticket"));
    } finally {
      setSaving(false);
    }
  };

  const toggleSales = async (ticket: OrganizerTicketType, enabled: boolean) => {
    try {
      const updated = await updateOrganizerTicketSales(ticket.id, enabled);
      setTickets((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    } catch (err) {
      if (isOrganizerEventAccessError(err)) {
        onDenied();
        return;
      }
      toast.error(getApiErrorMessage(err, "Couldn't update sales"));
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    try {
      await deleteOrganizerTicketType(deleting.id);
      toast.success("Ticket moved to trash");
      setDeleting(null);
      await load();
    } catch (err) {
      if (isOrganizerEventAccessError(err)) {
        onDenied();
        return;
      }
      toast.error(getApiErrorMessage(err, "Couldn't delete ticket"));
    }
  };

  return (
    <div className="bg-card rounded-xl p-5 sm:p-6 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="font-display font-semibold">Tickets</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Event monetization: {monetized ? "paid" : "free"} (derived from paid ticket types).
          </p>
        </div>
        <Button size="sm" onClick={openNew} className="rounded-full gap-1.5">
          <Plus className="w-3.5 h-3.5" /> Add ticket
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
      ) : tickets.length === 0 ? (
        <div className="text-center py-10 rounded-xl bg-muted/30 text-sm text-muted-foreground">
          No tickets yet — add one to start selling or offer a free RSVP.
        </div>
      ) : (
        <div className="space-y-2">
          {tickets.map((ticket) => (
            <TicketTypeCard
              key={ticket.id}
              ticket={ticket}
              onEdit={() => openEdit(ticket)}
              onDelete={() => setDeleting(ticket)}
              onSalesToggle={(v) => void toggleSales(ticket, v)}
            />
          ))}
        </div>
      )}

      <Dialog open={!!form} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit ticket" : "New ticket"}</DialogTitle>
          </DialogHeader>
          {form && <TicketTypeForm value={form} onChange={setForm} />}
          <DialogFooter>
            <Button variant="outline" className="rounded-full" onClick={() => setForm(null)}>Cancel</Button>
            <Button className="rounded-full" onClick={() => void save()} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Move this ticket type to trash?</AlertDialogTitle>
            <AlertDialogDescription>
              Soft delete only. {deleting && deleting.quantity_sold > 0
                ? `${deleting.quantity_sold} ticket(s) already sold — the type is trashed, not hard-deleted.`
                : "This ticket type will be removed from sale."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep</AlertDialogCancel>
            <AlertDialogAction onClick={() => void confirmDelete()} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Move to trash
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
