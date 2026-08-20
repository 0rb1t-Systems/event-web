import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { OrganizerSponsor, SponsorTier, SponsorWriteBody } from "@/services/organizerEventContent";

export type SponsorFormValue = {
  name: string;
  logo_path: string;
  tier: SponsorTier;
};

export function emptySponsorForm(): SponsorFormValue {
  return { name: "", logo_path: "", tier: "partner" };
}

export function sponsorToForm(sponsor: OrganizerSponsor): SponsorFormValue {
  const tier = (["platinum", "gold", "silver", "partner"].includes(String(sponsor.tier))
    ? sponsor.tier
    : "partner") as SponsorTier;
  return { name: sponsor.name, logo_path: sponsor.logo_path ?? "", tier };
}

export function sponsorFormToBody(value: SponsorFormValue): SponsorWriteBody {
  return {
    name: value.name.trim(),
    logo_path: value.logo_path.trim() || null,
    tier: value.tier,
  };
}

type Props = {
  value: SponsorFormValue;
  onChange: (value: SponsorFormValue) => void;
};

export default function SponsorForm({ value, onChange }: Props) {
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label className="text-xs">Name</Label>
        <Input className="rounded-full" value={value.name} onChange={(e) => onChange({ ...value, name: e.target.value })} />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Tier</Label>
        <Select value={value.tier} onValueChange={(v) => onChange({ ...value, tier: v as SponsorTier })}>
          <SelectTrigger className="rounded-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="platinum">Platinum</SelectItem>
            <SelectItem value="gold">Gold</SelectItem>
            <SelectItem value="silver">Silver</SelectItem>
            <SelectItem value="partner">Partner</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Logo path or URL</Label>
        <Input className="rounded-full" value={value.logo_path} onChange={(e) => onChange({ ...value, logo_path: e.target.value })} />
      </div>
    </div>
  );
}
