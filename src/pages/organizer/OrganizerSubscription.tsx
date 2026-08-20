import { useCallback, useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  AlertTriangle,
  CalendarDays,
  Check,
  Clock,
  CreditCard,
  RefreshCw,
  Sparkles,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import PackageSubscribeDialog from "@/components/organizer/PackageSubscribeDialog";
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
  type OrganizerSubscriptionRow,
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

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } },
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

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

  /** Highlight the best upgrade option, else the middle tier for empty state. */
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
      <div className="max-w-6xl mx-auto space-y-8" aria-busy="true" aria-label="Loading plans">
        <div className="space-y-3 text-center max-w-xl mx-auto">
          <Skeleton className="h-4 w-28 mx-auto" />
          <Skeleton className="h-12 w-72 mx-auto" />
          <Skeleton className="h-4 w-full max-w-md mx-auto" />
        </div>
        <Skeleton className="h-28 w-full rounded-3xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-[420px] rounded-3xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto bg-card rounded-3xl p-10 text-center mt-10 border border-border/40">
        <AlertTriangle className="w-10 h-10 mx-auto mb-4 text-destructive" />
        <h1 className="text-2xl font-display font-bold mb-2">Couldn't load plans</h1>
        <p className="text-muted-foreground text-sm mb-6">{error}</p>
        <Button className="rounded-full" onClick={() => void load()}>
          <RefreshCw className="w-4 h-4 mr-2" /> Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto pb-10">
      {/* Hero */}
      <motion.header
        initial="hidden"
        animate="show"
        variants={fadeUp}
        className="relative overflow-hidden rounded-[1.75rem] border border-border/50 bg-card mb-8"
      >
        <div
          className="absolute inset-0 opacity-90"
          style={{
            background:
              "radial-gradient(120% 80% at 10% 0%, hsl(var(--primary) / 0.14), transparent 55%), radial-gradient(90% 70% at 100% 20%, hsl(var(--foreground) / 0.04), transparent 50%)",
          }}
        />
        <div className="relative px-6 sm:px-10 py-10 sm:py-12 text-center sm:text-left">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-3">
            Organizer plans
          </p>
          <h1 className="text-4xl sm:text-5xl font-display font-bold tracking-[-0.03em] leading-[1.05] mb-3">
            Choose the plan that fits your events
          </h1>
          <p className="text-muted-foreground max-w-xl sm:text-base text-sm">
            Free plans activate instantly. Paid plans charge via Waafi / EVC Plus. Upgrades take
            effect immediately — no proration. Downgrades stay locked while a plan is active.
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center sm:justify-start gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-full"
              onClick={() => void load()}
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
              Refresh
            </Button>
          </div>
        </div>
      </motion.header>

      {/* Current plan strip */}
      <motion.section
        initial="hidden"
        animate="show"
        variants={fadeUp}
        className="mb-10 rounded-3xl border border-border/50 bg-foreground text-background overflow-hidden"
      >
        <div className="px-6 sm:px-8 py-6 sm:py-7 flex flex-col lg:flex-row lg:items-center gap-6">
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-background/55 mb-2">
              Your current plan
            </p>
            {planName ? (
              <>
                <h2 className="text-2xl sm:text-3xl font-display font-bold tracking-[-0.02em]">
                  {planName}
                </h2>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-background/70">
                  {active?.started_at && (
                    <span>
                      Since {format(new Date(active.started_at), "MMM d, yyyy")}
                    </span>
                  )}
                  {active?.expires_at ? (
                    <span>Renews / ends {format(new Date(active.expires_at), "MMM d, yyyy")}</span>
                  ) : (
                    <span>Non-expiring</span>
                  )}
                  {remainingLabel && <span>{remainingLabel}</span>}
                </div>
              </>
            ) : (
              <>
                <h2 className="text-2xl sm:text-3xl font-display font-bold tracking-[-0.02em]">
                  No active plan
                </h2>
                <p className="mt-2 text-sm text-background/70 max-w-lg">
                  Pick a package below to unlock event creation and organizer tools.
                </p>
              </>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full lg:w-auto lg:min-w-[320px]">
            <div className="rounded-2xl bg-background/10 px-4 py-3">
              <p className="text-[11px] uppercase tracking-wide text-background/50 mb-1">Quota</p>
              <p className="font-display font-bold text-lg tabular-nums">
                {quota?.unlimited
                  ? "Unlimited"
                  : quota
                    ? `${quota.events_created}/${quota.quota ?? "—"}`
                    : "—"}
              </p>
            </div>
            <div className="rounded-2xl bg-background/10 px-4 py-3">
              <p className="text-[11px] uppercase tracking-wide text-background/50 mb-1">Status</p>
              <p className="font-display font-bold text-lg capitalize">
                {quota?.can_create_event ? "Can create" : "Blocked"}
              </p>
            </div>
            <div className="rounded-2xl bg-background/10 px-4 py-3 col-span-2 sm:col-span-1">
              <p className="text-[11px] uppercase tracking-wide text-background/50 mb-1">Remaining</p>
              <p className="font-display font-bold text-lg tabular-nums">
                {quota?.unlimited
                  ? "∞"
                  : quota?.remaining != null
                    ? quota.remaining
                    : "—"}
              </p>
            </div>
          </div>
        </div>
      </motion.section>

      {/* Pricing tiers */}
      <section className="mb-12">
        <div className="mb-6 text-center sm:text-left">
          <h2 className="text-2xl font-display font-bold tracking-[-0.02em]">Compare plans</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Prices are set by the platform. You never enter an amount — only confirm and pay.
          </p>
        </div>

        {sortedPackages.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border/60 bg-card/50 py-16 text-center">
            <p className="text-muted-foreground text-sm">No active packages are available right now.</p>
          </div>
        ) : (
          <motion.ul
            initial="hidden"
            animate="show"
            variants={stagger}
            className={cn(
              "grid gap-5",
              sortedPackages.length === 1 && "grid-cols-1 max-w-md mx-auto",
              sortedPackages.length === 2 && "grid-cols-1 md:grid-cols-2 max-w-3xl mx-auto",
              sortedPackages.length >= 3 && "grid-cols-1 md:grid-cols-2 xl:grid-cols-3",
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
                <motion.li
                  key={pkg.id}
                  variants={fadeUp}
                  className={cn(
                    "relative flex flex-col rounded-3xl border bg-card p-6 sm:p-7 transition-shadow",
                    highlighted && !current && "border-primary/40 shadow-[0_20px_50px_-28px_hsl(var(--primary)/0.45)]",
                    current && "border-foreground/20 ring-1 ring-foreground/10",
                    !highlighted && !current && "border-border/50",
                  )}
                >
                  {(highlighted || current) && (
                    <div className="absolute -top-3 left-6">
                      <Badge
                        className={cn(
                          "border-0 text-[10px] uppercase tracking-wider px-2.5 py-1",
                          current
                            ? "bg-foreground text-background"
                            : "bg-primary text-primary-foreground",
                        )}
                      >
                        {current ? "Current" : pkg.upgrade_allowed ? "Recommended upgrade" : "Popular"}
                      </Badge>
                    </div>
                  )}

                  <div className="mb-5">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <h3 className="text-xl font-display font-bold tracking-[-0.02em]">{pkg.name}</h3>
                      {pkg.upgrade_allowed && (
                        <Sparkles className="w-4 h-4 text-primary shrink-0 mt-1" aria-hidden />
                      )}
                    </div>
                    {pkg.description && (
                      <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">
                        {pkg.description}
                      </p>
                    )}
                  </div>

                  <div className="mb-6">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-4xl font-display font-bold tracking-[-0.03em] tabular-nums">
                        {isFreePackage(pkg) ? "Free" : formatMoney(pkg.price)}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      {pkg.duration_label ?? "Non-expiring"}
                    </p>
                  </div>

                  <ul className="space-y-3 mb-8 flex-1">
                    {features.map((f) => (
                      <li key={f.label} className="flex gap-2.5 text-sm">
                        <span
                          className={cn(
                            "mt-0.5 w-5 h-5 rounded-full flex items-center justify-center shrink-0",
                            f.ok ? "bg-success/15 text-success" : "bg-muted text-muted-foreground",
                          )}
                        >
                          {f.ok ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                        </span>
                        <span className={cn(!f.ok && "text-muted-foreground")}>{f.label}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    type="button"
                    className={cn(
                      "rounded-full w-full h-11 text-sm font-semibold",
                      current && "opacity-70",
                    )}
                    variant={selectable && !current ? (highlighted ? "default" : "outline") : "secondary"}
                    disabled={!selectable || current}
                    onClick={() => openCheckout(pkg)}
                  >
                    {ctaLabel(pkg)}
                  </Button>
                </motion.li>
              );
            })}
          </motion.ul>
        )}
      </section>

      {/* Billing activity */}
      {(history.length > 0 || orders.length > 0) && (
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {history.length > 0 && (
            <div className="rounded-3xl border border-border/50 bg-card p-6">
              <div className="flex items-center gap-2 mb-4">
                <CalendarDays className="w-4 h-4 text-muted-foreground" />
                <h3 className="font-display font-semibold">Subscription history</h3>
              </div>
              <ul className="divide-y divide-border/60">
                {history.slice(0, 8).map((row: OrganizerSubscriptionRow) => (
                  <li key={row.id} className="py-3.5 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">
                        {row.package_snapshot?.package_name ??
                          row.package?.name ??
                          `Package #${row.package_id}`}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {row.started_at ? format(new Date(row.started_at), "MMM d, yyyy") : "—"}
                        {row.expires_at
                          ? ` → ${format(new Date(row.expires_at), "MMM d, yyyy")}`
                          : " → open"}
                      </p>
                    </div>
                    <Badge className="capitalize border-0 bg-muted text-muted-foreground text-[10px] shrink-0">
                      {row.status}
                    </Badge>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {orders.length > 0 && (
            <div className="rounded-3xl border border-border/50 bg-card p-6">
              <div className="flex items-center gap-2 mb-4">
                <CreditCard className="w-4 h-4 text-muted-foreground" />
                <h3 className="font-display font-semibold">Recent purchases</h3>
              </div>
              <ul className="divide-y divide-border/60">
                {orders.map((order) => (
                  <li key={order.id} className="py-3.5 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">
                        {order.package?.name ??
                          order.package_snapshot?.package_name ??
                          `Package #${order.package_id}`}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5 capitalize">
                        {order.action}
                        {order.created_at
                          ? ` · ${format(new Date(order.created_at), "MMM d, yyyy")}`
                          : ""}
                      </p>
                      {order.failure_reason && order.status === "failed" && (
                        <p className="text-xs text-destructive mt-1 line-clamp-2">
                          {order.failure_reason}
                        </p>
                      )}
                    </div>
                    <div className="text-right shrink-0 space-y-1">
                      <p className="text-sm tabular-nums font-medium">
                        {formatMoney(order.amount, order.currency)}
                      </p>
                      <Badge
                        className={cn(
                          "capitalize border-0 text-[10px]",
                          order.status === "completed" && "bg-success/10 text-success",
                          order.status === "failed" && "bg-destructive/10 text-destructive",
                          order.status === "pending" && "bg-amber-500/10 text-amber-700",
                        )}
                      >
                        {order.status}
                      </Badge>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
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
