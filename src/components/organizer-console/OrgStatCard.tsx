import type { OrgIconType } from "./orgIcons";
import { cn } from "@/lib/utils";

interface OrgStatCardProps {
  label: string;
  value: string;
  sub?: string;
  icon: OrgIconType;
  tone?: "brand" | "amber";
  className?: string;
}

/** Console stat card — StatCard from design-system.pen. */
export function OrgStatCard({ label, value, sub, icon: Icon, tone = "brand", className }: OrgStatCardProps) {
  return (
    <div className={cn("org-card p-4 lg:p-5 flex flex-col gap-2 lg:gap-3.5 min-w-0", className)}>
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-medium text-oc-muted truncate">{label}</span>
        <span
          className={cn(
            "w-7 h-7 lg:w-[30px] lg:h-[30px] rounded-full flex items-center justify-center shrink-0",
            tone === "brand" ? "bg-oc-brand-soft text-oc-brand-strong" : "bg-oc-accent-soft text-oc-accent",
          )}
        >
          <Icon className="w-3.5 h-3.5 lg:w-[15px] lg:h-[15px]" />
        </span>
      </div>
      <p className="font-head text-[22px] lg:text-[26px] leading-none font-semibold text-oc-ink tabular-nums">{value}</p>
      {sub ? <p className="hidden lg:block text-xs text-oc-faint -mt-1.5">{sub}</p> : null}
    </div>
  );
}
