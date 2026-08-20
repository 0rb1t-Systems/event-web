import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { TicketTypeWriteBody } from "@/services/organizerTickets";

export type TicketTypeFormValue = {
  name: string;
  price: string;
  quantity_limit: string;
  sales_enabled: boolean;
};

export function emptyTicketTypeForm(): TicketTypeFormValue {
  return { name: "", price: "0", quantity_limit: "", sales_enabled: true };
}

export function ticketTypeFormToBody(value: TicketTypeFormValue): TicketTypeWriteBody {
  return {
    name: value.name.trim(),
    price: Number(value.price) || 0,
    quantity_limit: value.quantity_limit === "" ? null : Number(value.quantity_limit),
    sales_enabled: value.sales_enabled,
  };
}

type Props = {
  value: TicketTypeFormValue;
  onChange: (value: TicketTypeFormValue) => void;
};

export default function TicketTypeForm({ value, onChange }: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div className="sm:col-span-2 space-y-1.5">
        <Label className="text-xs">Name</Label>
        <Input
          value={value.name}
          placeholder="General admission"
          onChange={(e) => onChange({ ...value, name: e.target.value })}
          className="rounded-full"
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Price (0 = free)</Label>
        <Input
          type="number"
          min={0}
          step="0.01"
          value={value.price}
          onChange={(e) => onChange({ ...value, price: e.target.value })}
          className="rounded-full"
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Quantity limit (blank = unlimited)</Label>
        <Input
          type="number"
          min={0}
          value={value.quantity_limit}
          onChange={(e) => onChange({ ...value, quantity_limit: e.target.value })}
          className="rounded-full"
        />
      </div>
      <div className="sm:col-span-2 flex items-center justify-between rounded-xl bg-muted/50 px-4 h-11">
        <span className="text-sm">Sales enabled</span>
        <Switch
          checked={value.sales_enabled}
          onCheckedChange={(v) => onChange({ ...value, sales_enabled: v })}
        />
      </div>
    </div>
  );
}
