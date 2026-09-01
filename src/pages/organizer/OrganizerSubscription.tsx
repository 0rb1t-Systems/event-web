import { useCallback, useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  IconAlert,
  IconCheck,
  IconClose,
  IconRefresh,
} from "@/components/organizer-console/orgIcons";
import { Skeleton } from "@/components/ui/skeleton";
import PackageSubscribeDialog from "@/components/organizer/PackageSubscribeDialog";
import { OrgButton } from "@/components/organizer-console/OrgButton";
import { OrgChip } from "@/components/organizer-console/OrgChip";
import { getApiErrorMessage } from "@/lib/apiError";
import { env } from "@/lib/env";
import { cn } from "@/lib/utils";
import {
  getOrganizerQuota,
  getOrganizerSubscription,
  isFreePackage,
  listOrganizerPackages,
  listOrganizerSubscriptionOrders,
  packagePriceNumber,
  type OrganizerPackage,
  type OrganizerQuotaDetail,
  type OrganizerSubscriptionOrder,
  type OrganizerSubscriptionPayload,
} from "@/services/organizerPackages";

function formatMoney(amount: string | number, currency = env.waafiCurrency) {
  const n = packagePriceNumber(amount);
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(n);
  } catch {
    return `${currency} ${amount}`;
  }
}

function formatRemaining(seconds: number | null | undefined) {
  if (seconds == null) return null;
  if (seconds <= 0) return "Expired";
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  if (days > 0) return `${days}d ${hours}h left`;
  const mins = Math.floor((seconds % 3600) / 60);
  return hours > 0 ? `${hours}h ${mins}m left` : `${mins}m left`;
}

function quotaFeature(pkg: OrganizerPackage): string {
  if (pkg.event_quota == null) return "Unlimited event creations";
  if (pkg.event_quota === 0) return "No event creations included";
  return `Up to ${pkg.event_quota} event${pkg.event_quota === 1 ? "" : "s"}`;
}

function durationFeature(pkg: OrganizerPackage): string {
  return pkg.duration_label ? `${pkg.duration_label} billing period` : "Non-expiring access";
}

function ctaLabel(pkg: OrganizerPackage): string {
  if (pkg.is_current) return "Your current plan";
  if (pkg.upgrade_allowed) return "Upgrade to this plan";
  if (!pkg.selectable) return "Not available";
  if (isFreePackage(pkg)) return "Activate free plan";
  return "Subscribe now";
}

const th = "text-left text-[10px] font-bold uppercase tracking-[1px] text-oc-faint pb-2";
const td = "py-3 text-[13px] text-oc-ink align-middle";

export default function OrganizerSubscription() {
  const [packages, setPackages] = useState<OrganizerPackage[]>([]);
  const [subscription, setSubscription] = useState<OrganizerSubscriptionPayload | null>(null);
  const [quota, setQuota] = useState<OrganizerQuotaDetail | null>(null);
  const [orders, setOrders] = useState<OrganizerSubscriptionOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<OrganizerPackage | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [pkgs, sub, q, ord] = await Promise.all([
        listOrganizerPackages(),
        getOrganizerSubscription(),
        getOrganizerQuota(),
        listOrganizerSubscriptionOrders({ per_page: 12, page: 1 }),
      ]);
      setPackages(pkgs);
      setSubscription(sub);
      setQuota(q);
      setOrders(ord);
    } catch (err) {
      setError(getApiErrorMessage(err, "Couldn't load plans"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const sortedPackages = useMemo(
    () =>
      [...packages].sort(
        (a, b) => (a.tier_rank ?? 0) - (b.tier_rank ?? 0) || a.name.localeCompare(b.name),
      ),
    [packages],
  );

  const highlightedId = useMemo(() => {
    const upgrade = sortedPackages.find((p) => p.upgrade_allowed);
    if (upgrade) return upgrade.id;
    if (sortedPackages.some((p) => p.is_current)) return null;
    if (sortedPackages.length >= 3) {
      return sortedPackages[Math.floor(sortedPackages.length / 2)]?.id ?? null;
    }
    return sortedPackages.find((p) => p.selectable)?.id ?? null;
  }, [sortedPackages]);

  const openCheckout = (pkg: OrganizerPackage) => {
    if (!pkg.selectable) {
      toast.error(pkg.blocked_reason || "This package is not available.");
      return;
    }
    setSelected(pkg);
    setDialogOpen(true);
  };

  const active = subscription?.active;
  const remainingLabel = formatRemaining(
    active?.seconds_remaining ?? quota?.subscription?.seconds_remaining,
  );
  const planName = active?.package?.name ?? quota?.package?.name;
  const history = subscription?.history ?? [];

  if (loading) {
    return (
      <div className="flex flex-col gap-4" aria-busy="true" aria-label="Loading plans">
        <Skeleton className="h-28 w-full rounded-[16px]" />
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-[380px] rounded-[16px]" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto org-card p-10 text-center mt-10">
        <IconAlert className="w-10 h-10 mx-auto mb-4 text-oc-bad" />
        <h1 className="font-head text-2xl font-semibold text-oc-ink mb-2">Couldn't load plans</h1>
        <p className="text-oc-muted text-sm mb-6">{error}</p>
        <OrgButton variant="ghost" onClick={() => void load()}>
          <IconRefresh /> Retry
        </OrgButton>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4" data-testid="page-plans">
      {/* Current plan */}
      <div className="org-card p-5 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[1.2px] text-oc-faint mb-1.5">
            Current plan
          </p>
          {planName ? (
            <>
              <h2 className="font-head text-xl font-semibold text-oc-ink">
                {planName}
                {active?.package && (
                  <span className="text-oc-muted font-medium">
                    {" "}· {formatMoney(active.package.price)}/{active.package.duration_label ?? "period"}
                  </span>
                )}
              </h2>
              <p className="text-[13px] text-oc-muted mt-1">
                {quota
                  ? quota.unlimited
                    ? `${quota.events_created} events created · unlimited quota`
                    : `${quota.events_created} of ${quota.quota ?? "—"} concurrent events used`
                  : null}
                {active?.expires_at
                  ? ` · Renews ${format(new Date(active.expires_at), "MMM d, yyyy")}`
                  : " · Non-expiring"}
                {remainingLabel ? ` · ${remainingLabel}` : ""}
              </p>
            </>
          ) : (
            <>
              <h2 className="font-head text-xl font-semibold text-oc-ink">No active plan</h2>
              <p className="text-[13px] text-oc-muted mt-1">
                Pick a package below to unlock event creation and organizer tools.
              </p>
            </>
          )}
        </div>
        <OrgButton variant="ghost" size="sm" className="shrink-0" onClick={() => void load()}>
          <IconRefresh /> Refresh
        </OrgButton>
      </div>

      {/* Pricing tiers */}
      {sortedPackages.length === 0 ? (
        <div className="org-card py-16 text-center">
          <p className="text-oc-muted text-sm">No active packages are available right now.</p>
        </div>
      ) : (
        <div
          className={cn(
            "grid gap-4",
            sortedPackages.length === 1 && "grid-cols-1 max-w-md",
            sortedPackages.length === 2 && "grid-cols-1 md:grid-cols-2",
            sortedPackages.length === 3 && "grid-cols-1 md:grid-cols-2 xl:grid-cols-3",
            sortedPackages.length >= 4 && "grid-cols-1 sm:grid-cols-2 xl:grid-cols-4",
          )}
        >
          {sortedPackages.map((pkg) => {
            const highlighted = highlightedId === pkg.id;
            const current = Boolean(pkg.is_current);
            const selectable = Boolean(pkg.selectable);
            const features = [
              { ok: true, label: quotaFeature(pkg) },
              { ok: true, label: durationFeature(pkg) },
              { ok: true, label: isFreePackage(pkg) ? "No payment required" : "Pay with Waafi / EVC Plus" },
              {
                ok: selectable || current,
                label: current
                  ? "Already active on your account"
                  : selectable
                    ? pkg.upgrade_allowed
                      ? "Instant upgrade after payment"
                      : "Available to activate"
                    : pkg.blocked_reason || "Not available on your current plan",
              },
            ];

            return (
              <div
                key={pkg.id}
                className={cn(
                  "org-card p-5 flex flex-col gap-4",
                  highlighted && !current && "ring-2 ring-oc-brand",
                )}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <h3 className="font-head text-lg font-semibold text-oc-ink">{pkg.name}</h3>
                    {current ? (
                      <OrgChip label="Your plan" tone="brand" size="sm" />
                    ) : highlighted ? (
                      <OrgChip label="Recommended" tone="brand" size="sm" />
                    ) : null}
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="font-head text-[24px] leading-none font-bold text-oc-ink tabular-nums">
                      {isFreePackage(pkg) ? "$0" : formatMoney(pkg.price)}
                    </span>
                  </div>
                  <p className="text-xs text-oc-faint mt-1">
                    {isFreePackage(pkg) ? "forever" : pkg.duration_label ?? "Non-expiring"}
                  </p>
                </div>

                <ul className="flex flex-col gap-2.5 flex-1">
                  {features.map((f) => (
                    <li key={f.label} className="flex gap-2.5 text-[13px]">
                      <span
                        className={cn(
                          "mt-px w-5 h-5 rounded-full flex items-center justify-center shrink-0",
                          f.ok ? "bg-oc-brand-soft text-oc-brand-strong" : "bg-oc-bg text-oc-faint",
                        )}
                      >
                        {f.ok ? <IconCheck className="w-3 h-3" /> : <IconClose className="w-3 h-3" />}
                      </span>
                      <span className={cn(f.ok ? "text-oc-muted" : "text-oc-faint")}>{f.label}</span>
                    </li>
                  ))}
                </ul>

                <OrgButton
                  type="button"
                  variant={current ? "ghost" : selectable ? "primary" : "ghost"}
                  className="w-full"
                  disabled={!selectable || current}
                  onClick={() => openCheckout(pkg)}
                >
                  {ctaLabel(pkg)}
                </OrgButton>
              </div>
            );
          })}
        </div>
      )}

      {/* Subscription history */}
      {(history.length > 0 || orders.length > 0) && (
        <div className="org-card p-5">
          <h3 className="font-head text-[17px] font-semibold text-oc-ink mb-1">Subscription history</h3>
          <p className="text-[13px] text-oc-muted mb-4">Subscription payments run through WaafiPay.</p>
          <ul className="md:hidden flex flex-col gap-2.5">
            {orders.length > 0
              ? orders.map((order) => (
                  <li key={order.id} className="rounded-[12px] bg-oc-bg p-4 flex flex-col gap-2 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-semibold text-sm text-oc-ink min-w-0">
                        {order.package?.name ?? order.package_snapshot?.package_name ?? `Package #${order.package_id}`}
                        <span className="text-oc-faint font-medium capitalize"> · {order.action}</span>
                      </p>
                      <OrgChip
                        label={order.status}
                        tone={
                          order.status === "completed"
                            ? "brand"
                            : order.status === "failed"
                              ? "bad"
                              : "amber"
                        }
                        size="sm"
                      />
                    </div>
                    <p className="font-data font-semibold text-sm tabular-nums">
                      {formatMoney(order.amount, order.currency)}
                    </p>
                    <p className="text-xs text-oc-faint">
                      {order.created_at ? format(new Date(order.created_at), "MMM d, yyyy") : "—"} · WaafiPay
                    </p>
                    {order.failure_reason && order.status === "failed" && (
                      <p className="text-xs text-oc-bad break-words">{order.failure_reason}</p>
                    )}
                  </li>
                ))
              : history.slice(0, 8).map((row) => (
                  <li key={row.id} className="rounded-[12px] bg-oc-bg p-4 flex flex-col gap-2 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-semibold text-sm text-oc-ink min-w-0">
                        {row.package_snapshot?.package_name ?? row.package?.name ?? `Package #${row.package_id}`}
                      </p>
                      <OrgChip label={row.status} tone={row.status === "active" ? "brand" : "plain"} size="sm" />
                    </div>
                    <p className="text-xs text-oc-faint">
                      {row.started_at ? format(new Date(row.started_at), "MMM d, yyyy") : "—"} · WaafiPay
                    </p>
                  </li>
                ))}
          </ul>
          <div className="hidden md:block h-scroll">
            <table className="w-full min-w-[560px]">
              <thead>
                <tr className="border-b border-oc-line">
                  <th className={th}>Date</th>
                  <th className={th}>Plan</th>
                  <th className={th}>Amount</th>
                  <th className={th}>Method</th>
                  <th className={th}>Status</th>
                </tr>
              </thead>
              <tbody>
                {orders.length > 0
                  ? orders.map((order) => (
                      <tr key={order.id} className="border-b border-oc-line/60 last:border-0">
                        <td className={`${td} text-oc-muted whitespace-nowrap`}>
                          {order.created_at ? format(new Date(order.created_at), "MMM d, yyyy") : "—"}
                        </td>
                        <td className={td}>
                          <span className="font-semibold">
                            {order.package?.name ?? order.package_snapshot?.package_name ?? `Package #${order.package_id}`}
                          </span>
                          <span className="text-oc-faint capitalize"> · {order.action}</span>
                          {order.failure_reason && order.status === "failed" && (
                            <p className="text-xs text-oc-bad mt-0.5 max-w-[240px]">{order.failure_reason}</p>
                          )}
                        </td>
                        <td className={`${td} font-data font-semibold tabular-nums`}>
                          {formatMoney(order.amount, order.currency)}
                        </td>
                        <td className={`${td} text-oc-muted`}>WaafiPay · EVC Plus</td>
                        <td className={td}>
                          <OrgChip
                            label={order.status}
                            tone={
                              order.status === "completed"
                                ? "brand"
                                : order.status === "failed"
                                  ? "bad"
                                  : "amber"
                            }
                            size="sm"
                          />
                        </td>
                      </tr>
                    ))
                  : history.slice(0, 8).map((row) => (
                      <tr key={row.id} className="border-b border-oc-line/60 last:border-0">
                        <td className={`${td} text-oc-muted whitespace-nowrap`}>
                          {row.started_at ? format(new Date(row.started_at), "MMM d, yyyy") : "—"}
                        </td>
                        <td className={td}>
                          <span className="font-semibold">
                            {row.package_snapshot?.package_name ?? row.package?.name ?? `Package #${row.package_id}`}
                          </span>
                        </td>
                        <td className={`${td} text-oc-muted`}>—</td>
                        <td className={`${td} text-oc-muted`}>WaafiPay · EVC Plus</td>
                        <td className={td}>
                          <OrgChip label={row.status} tone={row.status === "active" ? "brand" : "plain"} size="sm" />
                        </td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <PackageSubscribeDialog
        package={selected}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onActivated={() => void load()}
      />
    </div>
  );
}
