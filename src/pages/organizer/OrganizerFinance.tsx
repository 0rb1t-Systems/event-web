import { useSearchParams } from "react-router-dom";
import OrganizerPayouts from "@/pages/organizer/OrganizerPayouts";
import OrganizerSubscription from "@/pages/organizer/OrganizerSubscription";
import { cn } from "@/lib/utils";

const TABS = [
  { key: "payouts", label: "Payouts" },
  { key: "plans", label: "Plans" },
] as const;

export default function OrganizerFinance() {
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") === "plans" ? "plans" : "payouts";

  return (
    <div className="flex flex-col gap-4 pb-6" data-testid="page-finance">
      <div className="px-2 pt-1 lg:pt-0">
        <h1 className="font-head text-[22px] lg:text-2xl font-semibold text-oc-ink tracking-tight">Finance</h1>
        <p className="mt-1 text-[13px] text-oc-muted">
          Payouts across all events, and your platform subscription.
        </p>
      </div>

      <div className="flex items-center gap-2" role="tablist" aria-label="Finance sections">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => (t.key === "plans" ? setParams({ tab: "plans" }) : setParams({}))}
            className={cn(
              "rounded-full px-4 py-2 text-[13px] font-medium transition-colors",
              tab === t.key
                ? "bg-oc-ink text-white"
                : "bg-oc-surface border border-oc-line text-oc-muted hover:text-oc-ink",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "plans" ? <OrganizerSubscription /> : <OrganizerPayouts />}
    </div>
  );
}
