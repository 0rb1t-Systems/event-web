import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";

type OrgButtonVariant = "primary" | "ghost" | "dark" | "danger";
type OrgButtonSize = "md" | "sm";

export interface OrgButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: OrgButtonVariant;
  size?: OrgButtonSize;
  asChild?: boolean;
}

const variantClasses: Record<OrgButtonVariant, string> = {
  primary: "bg-oc-brand text-white hover:bg-oc-brand-strong",
  ghost: "bg-oc-surface text-oc-ink border border-oc-line hover:bg-oc-well",
  dark: "bg-oc-ink text-oc-surface hover:opacity-90",
  danger: "bg-oc-bad text-white hover:bg-oc-bad/90",
};

const sizeClasses: Record<OrgButtonSize, string> = {
  md: "px-4 py-2.5 text-sm gap-2",
  sm: "px-3.5 py-[9px] text-sm gap-1.5",
};

/** Console button — Btn/Primary and Btn/Ghost from design-system.pen. */
export const OrgButton = React.forwardRef<HTMLButtonElement, OrgButtonProps>(
  ({ className, variant = "primary", size = "md", asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center rounded-[12px] font-semibold transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-oc-brand focus-visible:ring-offset-2 focus-visible:ring-offset-oc-bg",
          "disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0",
          variantClasses[variant],
          sizeClasses[size],
          className,
        )}
        {...props}
      />
    );
  },
);
OrgButton.displayName = "OrgButton";
