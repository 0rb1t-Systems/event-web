import { useEffect, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

type Props = {
  targetIso?: string | null;
  className?: string;
  tone?: "dark" | "light";
  size?: "md" | "compact";
};

function partsFromDiff(diffMs: number) {
  return {
    days: Math.floor(diffMs / 86_400_000),
    hours: Math.floor((diffMs % 86_400_000) / 3_600_000),
    mins: Math.floor((diffMs % 3_600_000) / 60_000),
    secs: Math.floor((diffMs % 60_000) / 1000),
  };
}

export function EventCountdown({ targetIso, className, tone = "dark", size = "md" }: Props) {
  const reduce = useReducedMotion();
  const target = targetIso ? new Date(targetIso).getTime() : NaN;
  const valid = Number.isFinite(target);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (reduce || !valid || target <= Date.now()) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [valid, target, reduce]);

  if (!valid) return null;
  const diff = Math.max(0, target - now);
  if (diff <= 0) return null;

  const units = partsFromDiff(diff);
  const cells = [
    { label: "Days", value: String(units.days) },
    { label: "H", value: String(units.hours).padStart(2, "0") },
    { label: "M", value: String(units.mins).padStart(2, "0") },
    { label: "S", value: String(units.secs).padStart(2, "0") },
  ];
  const dark = tone === "dark";
  const compact = size === "compact";

  return (
    <div
      className={cn("flex flex-wrap items-baseline justify-center gap-y-1 tabular-nums", className)}
      aria-live="polite"
      aria-atomic="true"
    >
      {cells.map((unit, i) => (
        <span key={unit.label} className="inline-flex items-baseline">
          {i > 0 ? (
            <span
              className={cn(
                "font-light",
                compact ? "mx-1 text-base sm:mx-1.5 sm:text-lg" : "mx-1.5 text-lg sm:mx-2 sm:text-xl",
                dark ? "text-white/35" : "text-slate-300",
              )}
              aria-hidden
            >
              :
            </span>
          ) : null}
          <span
            className={cn(
              "font-semibold tracking-tight",
              compact ? "text-base sm:text-lg" : "text-xl sm:text-2xl",
              dark ? "text-white" : "text-slate-900",
            )}
          >
            {unit.value}
          </span>
          <span
            className={cn(
              "ml-0.5 font-medium",
              compact ? "text-xs sm:text-xs" : "text-xs sm:text-sm",
              dark ? "text-white/75" : "text-slate-500",
            )}
          >
            {unit.label}
          </span>
        </span>
      ))}
    </div>
  );
}
