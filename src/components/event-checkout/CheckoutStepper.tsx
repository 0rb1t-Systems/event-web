import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { PULSE } from "@/components/event-public/pulseTheme";

export type CheckoutStepId = "selection" | "payment" | "confirmation";

const STEPS: { id: CheckoutStepId; n: number; label: string }[] = [
  { id: "selection", n: 1, label: "Selection" },
  { id: "payment", n: 2, label: "Payment" },
  { id: "confirmation", n: 3, label: "Confirmation" },
];

type Props = {
  current: CheckoutStepId;
  className?: string;
};

export function CheckoutStepper({ current, className }: Props) {
  const currentIndex = STEPS.findIndex((s) => s.id === current);

  return (
    <ol className={cn("flex flex-wrap items-center gap-2 sm:gap-3", className)}>
      {STEPS.map((step, i) => {
        const done = i < currentIndex;
        const active = i === currentIndex;
        return (
          <li key={step.id} className="flex items-center gap-2 sm:gap-3">
            {i > 0 ? <span className="hidden h-px w-8 bg-muted sm:block" aria-hidden /> : null}
            <span className="flex items-center gap-2">
              <span
                className={cn(
                  "inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold",
                  done || active ? "text-white" : "bg-muted text-muted-foreground",
                )}
                style={
                  done
                    ? { background: "hsl(160 60% 32%)" }
                    : active
                      ? { background: PULSE.teal }
                      : undefined
                }
              >
                {done ? <Check className="h-3.5 w-3.5" strokeWidth={2.5} /> : step.n}
              </span>
              <span
                className={cn(
                  "text-xs font-medium sm:text-sm",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                {step.label}
              </span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
