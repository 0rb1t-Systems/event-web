import { cn } from "@/lib/utils";
import type { OrgChipTone } from "./orgTheme";

const toneClasses: Record<OrgChipTone, { root: string; dot: string; label: string }> = {
  brand: { root: "bg-oc-brand-soft", dot: "bg-oc-brand", label: "text-oc-brand-strong" },
  plain: { root: "bg-oc-bg", dot: "bg-oc-muted", label: "text-oc-muted" },
  faint: { root: "bg-oc-bg", dot: "bg-oc-faint", label: "text-oc-faint" },
  amber: { root: "bg-oc-accent-soft", dot: "bg-oc-accent", label: "text-oc-accent" },
  bad: { root: "bg-oc-bad-soft", dot: "bg-oc-bad", label: "text-oc-bad" },
};

interface OrgChipProps {
  label: string;
  tone?: OrgChipTone;
  size?: "sm" | "md";
  className?: string;
}

/** Console status chip — dot + label pill from design-system.pen `Chip`. */
export function OrgChip({ label, tone = "brand", size = "md", className }: OrgChipProps) {
  const t = toneClasses[tone];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full font-semibold whitespace-nowrap",
        size === "md" ? "gap-1.5 px-3 py-[5px] text-xs" : "gap-1 px-2.5 py-[3px] text-[11px]",
        t.root,
        className,
      )}
    >
      <span
        aria-hidden
        className={cn("rounded-full shrink-0", size === "md" ? "w-1.5 h-1.5" : "w-[5px] h-[5px]", t.dot)}
      />
      <span className={t.label}>{label}</span>
    </span>
  );
}
