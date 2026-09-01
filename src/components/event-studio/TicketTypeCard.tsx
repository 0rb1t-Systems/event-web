import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { IconPencil, IconSparkles, IconTicket, IconTrash } from "@/components/organizer-console/orgIcons";
import { env } from "@/lib/env";
import {
  ticketIsPaid,
  ticketIsSoldOut,
  ticketPriceNumber,
  ticketRemaining,
  type OrganizerTicketType,
} from "@/services/organizerTickets";

function formatPrice(price: number, currency = env.waafiCurrency) {
  if (!price) return "Free";
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 2 }).format(price);
  } catch {
    return `${currency} ${price}`;
  }
}

type Props = {
  ticket: OrganizerTicketType;
  onEdit: () => void;
  onDelete: () => void;
  onSalesToggle: (enabled: boolean) => void;
};

export default function TicketTypeCard({ ticket, onEdit, onDelete, onSalesToggle }: Props) {
  const price = ticketPriceNumber(ticket);
  const paid = ticketIsPaid(ticket);
  const soldOut = ticketIsSoldOut(ticket);
  const remaining = ticketRemaining(ticket);
  const salesOn = ticket.sales_enabled;
  const isVip = ticket.is_vip === true;

  return (
    <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/40">
      <div
        className={`shrink-0 w-9 h-9 rounded-xl inline-flex items-center justify-center mt-0.5 ${
          isVip ? "bg-primary/15 text-primary" : "bg-muted text-foreground"
        }`}
      >
        {isVip ? <IconSparkles className="w-4 h-4" /> : <IconTicket className="w-4 h-4" />}
      </div>
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium truncate">{ticket.name}</span>
          <Badge className="border-0 bg-card text-[10px] rounded-full">{paid ? "Paid" : "Free"}</Badge>
          {isVip && (
            <Badge className="border-0 bg-primary/15 text-primary text-[10px] rounded-full">VIP</Badge>
          )}
          {soldOut && (
            <Badge className="border-0 bg-destructive/15 text-destructive text-[10px] rounded-full">Sold out</Badge>
          )}
          {!salesOn && (
            <Badge className="border-0 bg-amber-500/15 text-amber-800 dark:text-amber-300 text-[10px] rounded-full">
              Sales paused
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          {remaining == null ? "Unlimited" : `${remaining} remaining`}
          {` · ${ticket.quantity_sold} sold`}
          {soldOut ? " · capacity reached" : ""}
        </p>
        <p className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground/80">{salesOn ? "Sales enabled" : "Sales paused"}.</span>{" "}
          {salesOn
            ? "Participants can currently select this ticket."
            : "This ticket still exists, but participants cannot use it for new registrations."}
        </p>
      </div>
      <div className="text-right shrink-0 pt-0.5">
        <div className="text-sm font-display font-semibold">{formatPrice(price)}</div>
      </div>
      <div className="flex items-center gap-1 shrink-0 pt-0.5">
        <Switch
          checked={salesOn}
          onCheckedChange={onSalesToggle}
          aria-label={salesOn ? "Pause sales" : "Enable sales"}
        />
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onEdit}>
          <IconPencil className="w-3.5 h-3.5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onDelete}>
          <IconTrash className="w-3.5 h-3.5 text-destructive" />
        </Button>
      </div>
    </div>
  );
}
