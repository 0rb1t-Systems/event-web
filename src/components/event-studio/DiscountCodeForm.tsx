import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { DiscountCodeType, DiscountCodeWriteBody, OrganizerDiscountCode } from "@/services/organizerDiscounts";

export type DiscountCodeFormValue = {
  code: string;
  type: DiscountCodeType;
  value: string;
  usage_limit: string;
  expires_at: string;
  active: boolean;
};

export function emptyDiscountForm(): DiscountCodeFormValue {
  return { code: "", type: "percent", value: "", usage_limit: "", expires_at: "", active: true };
}

export function discountFromRecord(code: OrganizerDiscountCode): DiscountCodeFormValue {
  const type = code.type === "fixed" ? "fixed" : "percent";
  return {
    code: code.code,
    type,
    value: String(code.value),
    usage_limit: code.usage_limit == null ? "" : String(code.usage_limit),
    expires_at: code.expires_at ? new Date(code.expires_at).toISOString().slice(0, 16) : "",
    active: code.active,
  };
}

export function discountFormToBody(value: DiscountCodeFormValue): DiscountCodeWriteBody {
  return {
    code: value.code.trim().toUpperCase(),
    type: value.type,
    value: Number(value.value) || 0,
    usage_limit: value.usage_limit === "" ? null : Number(value.usage_limit),
    expires_at: value.expires_at ? new Date(value.expires_at).toISOString() : null,
    active: value.active,
  };
}

type Props = {
  value: DiscountCodeFormValue;
  onChange: (value: DiscountCodeFormValue) => void;
};

export default function DiscountCodeForm({ value, onChange }: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div className="sm:col-span-2 space-y-1.5">
        <Label className="text-xs">Code</Label>
        <Input
          value={value.code}
          placeholder="EARLYBIRD"
          onChange={(e) => onChange({ ...value, code: e.target.value.toUpperCase() })}
          className="rounded-full uppercase tracking-wider"
        />
        <p className="text-xs text-muted-foreground">Stored uppercase, matching the backend.</p>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Type</Label>
        <Select value={value.type} onValueChange={(v) => onChange({ ...value, type: v as DiscountCodeType })}>
          <SelectTrigger className="rounded-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="percent">Percent</SelectItem>
            <SelectItem value="fixed">Fixed amount</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">{value.type === "percent" ? "Percent (max 100)" : "Amount"}</Label>
        <Input
          type="number"
          min={0}
          max={value.type === "percent" ? 100 : undefined}
          step="0.01"
          value={value.value}
          onChange={(e) => onChange({ ...value, value: e.target.value })}
          className="rounded-full"
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Usage limit (blank = unlimited)</Label>
        <Input
          type="number"
          min={1}
          value={value.usage_limit}
          onChange={(e) => onChange({ ...value, usage_limit: e.target.value })}
          className="rounded-full"
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Expires</Label>
        <Input
          type="datetime-local"
          value={value.expires_at}
          onChange={(e) => onChange({ ...value, expires_at: e.target.value })}
          className="rounded-full"
        />
      </div>
      <div className="sm:col-span-2 flex items-center justify-between rounded-xl bg-muted/50 px-4 h-11">
        <span className="text-sm">Active</span>
        <Switch checked={value.active} onCheckedChange={(v) => onChange({ ...value, active: v })} />
      </div>
    </div>
  );
}
