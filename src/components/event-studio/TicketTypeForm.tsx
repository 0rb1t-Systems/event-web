import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { IconSparkles } from "@/components/organizer-console/orgIcons";
import type { TicketTypeWriteBody } from "@/services/organizerTickets";

export type TicketTypeFormValue = {
  name: string;
  price: string;
  quantity_limit: string;
  sales_enabled: boolean;
  is_vip: boolean;
};

export function emptyTicketTypeForm(): TicketTypeFormValue {
  return { name: "", price: "0", quantity_limit: "", sales_enabled: true, is_vip: false };
}

export function ticketTypeFormToBody(value: TicketTypeFormValue): TicketTypeWriteBody {
  return {
    name: value.name.trim(),
    price: Number(value.price) || 0,
    quantity_limit: value.quantity_limit === "" ? null : Number(value.quantity_limit),
    sales_enabled: value.sales_enabled,
    is_vip: value.is_vip,
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
      <div className="sm:col-span-2 flex items-center justify-between gap-4 rounded-xl bg-muted/50 px-4 py-3">
        <div className="flex items-center gap-2 min-w-0">
          <IconSparkles className="w-4 h-4 text-primary shrink-0" />
          <div className="min-w-0 space-y-0.5">
            <p className="text-sm font-medium">VIP tier</p>
            <p className="text-xs text-muted-foreground leading-snug">
              Marks this ticket as VIP. The name alone does not make it VIP.
            </p>
          </div>
        </div>
        <Switch
          checked={value.is_vip}
          onCheckedChange={(v) => onChange({ ...value, is_vip: v })}
          aria-label="VIP tier"
        />
      </div>
      <div className="sm:col-span-2 flex items-center justify-between gap-4 rounded-xl bg-muted/50 px-4 py-3">
        <div className="min-w-0 space-y-0.5">
          <p className="text-sm font-medium">{value.sales_enabled ? "Sales enabled" : "Sales paused"}</p>
          <p className="text-xs text-muted-foreground leading-snug">
            {value.sales_enabled
              ? "Participants can currently select this ticket."
              : "This ticket still exists, but participants cannot use it for new registrations."}
          </p>
        </div>
        <Switch
          checked={value.sales_enabled}
          onCheckedChange={(v) => onChange({ ...value, sales_enabled: v })}
          aria-label={value.sales_enabled ? "Pause sales" : "Enable sales"}
        />
      </div>
    </div>
  );
}
