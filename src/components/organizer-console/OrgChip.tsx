import { cn } from "@/lib/utils";
import { orgChipToneClass, type OrgChipTone } from "./orgTheme";

interface OrgChipProps {
  label: string;
  tone?: OrgChipTone;
  size?: "sm" | "md";
  className?: string;
}

/** Console status chip — soft-outline pill (pale tint, colored stroke, matching label). */
export function OrgChip({ label, tone = "brand", size = "md", className }: OrgChipProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border font-semibold whitespace-nowrap",
        size === "md" ? "px-3 py-[5px] text-xs" : "px-2.5 py-[3px] text-xs",
        orgChipToneClass[tone],
        className,
      )}
    >
      {label}
    </span>
  );
}
