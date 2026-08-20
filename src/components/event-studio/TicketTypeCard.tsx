import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Pencil, Ticket, Trash2 } from "lucide-react";
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

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/40">
      <div className="shrink-0 w-9 h-9 rounded-xl inline-flex items-center justify-center bg-muted text-foreground">
        <Ticket className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium truncate">{ticket.name}</span>
          <Badge className="border-0 bg-card text-[10px] rounded-full">{paid ? "Paid" : "Free"}</Badge>
          {soldOut && <Badge className="border-0 bg-destructive/15 text-destructive text-[10px] rounded-full">Sold out</Badge>}
          {!ticket.sales_enabled && <Badge className="border-0 bg-muted text-[10px] rounded-full">Sales off</Badge>}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          {remaining == null ? "Unlimited" : `${remaining} remaining`}
          {` · ${ticket.quantity_sold} sold`}
        </p>
      </div>
      <div className="text-right shrink-0">
        <div className="text-sm font-display font-semibold">{formatPrice(price)}</div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <Switch
          checked={ticket.sales_enabled}
          onCheckedChange={onSalesToggle}
          aria-label="Toggle sales"
        />
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onEdit}>
          <Pencil className="w-3.5 h-3.5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onDelete}>
          <Trash2 className="w-3.5 h-3.5 text-destructive" />
        </Button>
      </div>
    </div>
  );
}
