import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { IconPencil, IconTrash } from "@/components/organizer-console/orgIcons";
import { getMediaUrl } from "@/lib/mediaUrl";
import type { OrganizerSponsor } from "@/services/organizerEventContent";

const TIER_CLASS: Record<string, string> = {
  platinum: "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-500/10 dark:text-slate-300 dark:border-slate-500/35",
  gold: "bg-amber-50 text-amber-800 border-amber-200/80 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/35",
  silver: "bg-zinc-50 text-zinc-700 border-zinc-200 dark:bg-zinc-500/10 dark:text-zinc-300 dark:border-zinc-500/35",
  partner: "bg-oc-brand-soft text-oc-brand-strong border-oc-brand/40",
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
        <Badge variant="outline" className={`text-xs rounded-full capitalize ${TIER_CLASS[tier] || ""}`}>{tier}</Badge>
      </div>
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onEdit}><IconPencil className="w-3.5 h-3.5" /></Button>
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onDelete}><IconTrash className="w-3.5 h-3.5 text-destructive" /></Button>
    </div>
  );
}
