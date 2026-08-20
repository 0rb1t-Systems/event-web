import { useEffect, useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Loader2, Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getApiErrorMessage } from "@/lib/apiError";
import { env } from "@/lib/env";
import {
  getOrganizerQuota,
  getOrganizerSubscription,
  listOrganizerPackages,
  type OrganizerPackage,
  type OrganizerQuotaDetail,
  type OrganizerSubscriptionPayload,
} from "@/services/organizerPackages";

function formatMoney(amount: string | number, currency = env.waafiCurrency) {
  const n = typeof amount === "number" ? amount : Number(amount);
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(Number.isFinite(n) ? n : 0);
  } catch {
    return `${currency} ${amount}`;
  }
}

function quotaLabel(q: {
  unlimited: boolean;
  zero_quota: boolean;
  events_created: number;
  quota: number | null;
  remaining: number | null;
}) {
  if (q.unlimited) return `${q.events_created} events created · unlimited quota`;
  if (q.zero_quota) return `${q.events_created} events · zero quota (cannot create)`;
  return `${q.events_created} of ${q.quota ?? "—"} events used${
    q.remaining != null ? ` · ${q.remaining} remaining` : ""
  }`;
}

export default function SubscriptionQuotaPanel() {
  const [packages, setPackages] = useState<OrganizerPackage[]>([]);
  const [subscription, setSubscription] = useState<OrganizerSubscriptionPayload | null>(null);
  const [quota, setQuota] = useState<OrganizerQuotaDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([listOrganizerPackages(), getOrganizerSubscription(), getOrganizerQuota()])
      .then(([pkgs, sub, q]) => {
        if (cancelled) return;
        setPackages(pkgs);
        setSubscription(sub);
        setQuota(q);
      })
      .catch((err) => {
        if (!cancelled) toast.error(getApiErrorMessage(err, "Couldn't load subscription"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
      </div>
    );
  }

  const active = subscription?.active;
  const activePkgId = active?.package_id ?? quota?.package?.id;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-display font-semibold text-lg flex items-center gap-2">
          <Package className="w-4 h-4 text-muted-foreground" />
          Package &amp; quota
        </h3>
        <p className="text-sm text-muted-foreground">
          Plans are assigned by EventHub admin. Online purchase or self-serve plan changes are not
          available here — contact support to change your package.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-card rounded-xl p-5 border border-border/40 space-y-2">
          <p className="text-sm text-muted-foreground">Active package</p>
          {active?.package || quota?.package ? (
            <>
              <p className="text-xl font-display font-bold">
                {active?.package?.name ?? quota?.package?.name}
              </p>
              <Badge className="capitalize border-0 bg-muted text-muted-foreground">
                {typeof active?.status === "string" ? active.status : "active"}
              </Badge>
              {active?.started_at && (
                <p className="text-xs text-muted-foreground">
                  Started {format(new Date(active.started_at), "MMM d, yyyy")}
                  {active.expires_at
                    ? ` · Expires ${format(new Date(active.expires_at), "MMM d, yyyy")}`
                    : ""}
                </p>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              No active subscription. Contact support to get a package assigned.
            </p>
          )}
        </div>

        <div className="bg-card rounded-xl p-5 border border-border/40 space-y-2">
          <p className="text-sm text-muted-foreground">Event quota</p>
          {quota ? (
            <>
              <p className="text-xl font-display font-bold tabular-nums">
                {quota.unlimited
                  ? "Unlimited"
                  : quota.zero_quota
                    ? "0"
                    : `${quota.events_created} / ${quota.quota ?? "—"}`}
              </p>
              <p className="text-sm text-muted-foreground">{quotaLabel(quota)}</p>
              <p className="text-xs text-muted-foreground">
                {quota.can_create_event
                  ? "You can create new events on this plan."
                  : "You cannot create more events until your plan is updated."}
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Quota unavailable.</p>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <h4 className="font-display font-semibold text-sm">Available packages</h4>
        {packages.length === 0 ? (
          <p className="text-sm text-muted-foreground">No active packages listed.</p>
        ) : (
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {packages.map((pkg) => {
              const isCurrent = activePkgId === pkg.id;
              return (
                <li
                  key={pkg.id}
                  className="bg-card rounded-xl p-4 border border-border/40 space-y-1.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium">{pkg.name}</p>
                    {isCurrent && (
                      <Badge className="border-0 bg-primary/10 text-primary text-[10px]">
                        Current
                      </Badge>
                    )}
                  </div>
                  {pkg.description && (
                    <p className="text-xs text-muted-foreground line-clamp-3">{pkg.description}</p>
                  )}
                  <p className="text-sm tabular-nums">{formatMoney(pkg.price)}</p>
                  <p className="text-xs text-muted-foreground">
                    {pkg.event_quota == null
                      ? "Unlimited events"
                      : pkg.event_quota === 0
                        ? "Zero event quota"
                        : `${pkg.event_quota} event${pkg.event_quota === 1 ? "" : "s"}`}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
        <p className="text-xs text-muted-foreground">
          Viewing packages does not start a purchase. Ask support to assign or change your plan.
        </p>
      </div>
    </div>
  );
}
