import { cn } from "@/lib/utils";
import {
  orgStatusBadgeClass,
  statusBadgeClass,
  type StatusBadgeTone,
} from "@/lib/statusBadges";
import type { OrgChipTone } from "@/components/organizer-console/orgTheme";

type Props = {
  label: string;
  tone?: StatusBadgeTone;
  /** Use organizer console oc-* tokens (inside `.org-console`). */
  orgTone?: OrgChipTone;
  className?: string;
  size?: "sm" | "md";
};

/** Theme-safe status pill — use instead of ad-hoc `bg-*-50` badge classes. */
export function StatusBadge({ label, tone = "plain", orgTone, className, size = "md" }: Props) {
  const base = orgTone != null ? orgStatusBadgeClass(orgTone) : statusBadgeClass(tone);

  return (
    <span
      className={cn(
        base,
        size === "sm" && "px-2 py-0.5 text-[10px]",
        className,
      )}
    >
      {label}
    </span>
  );
}
