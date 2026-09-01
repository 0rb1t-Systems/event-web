import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { IconPencil, IconTrash } from "@/components/organizer-console/orgIcons";
import { getMediaUrl } from "@/lib/mediaUrl";
import type { OrganizerSponsor } from "@/services/organizerEventContent";

const TIER_CLASS: Record<string, string> = {
  platinum: "bg-slate-200 text-slate-800",
  gold: "bg-amber-100 text-amber-800",
  silver: "bg-zinc-200 text-zinc-700",
  partner: "bg-primary/10 text-primary",
};

type Props = {
  sponsor: OrganizerSponsor;
  onEdit: () => void;
  onDelete: () => void;
};

export default function SponsorCard({ sponsor, onEdit, onDelete }: Props) {
  const logo = getMediaUrl(sponsor.logo_path);
  const tier = String(sponsor.tier);

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/40">
      <div className="w-12 h-12 rounded-xl bg-card overflow-hidden flex items-center justify-center shrink-0">
        {logo ? <img src={logo} alt={sponsor.name} className="w-full h-full object-contain p-1" /> : (
          <span className="font-display font-bold text-lg">{sponsor.name.charAt(0)}</span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{sponsor.name}</p>
        <Badge className={`border-0 text-[10px] rounded-full capitalize ${TIER_CLASS[tier] || "bg-muted"}`}>{tier}</Badge>
      </div>
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onEdit}><IconPencil className="w-3.5 h-3.5" /></Button>
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onDelete}><IconTrash className="w-3.5 h-3.5 text-destructive" /></Button>
    </div>
  );
}
