import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  Package,
  Plus,
  RefreshCw,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useOrganizer } from "@/contexts/OrganizerContext";
import { getOrganizerDashboard } from "@/services/organizerDashboard";
import { getApiErrorMessage } from "@/lib/apiError";
import { cn } from "@/lib/utils";
import type { OrganizerDashboardData, OrganizerDashboardEvent } from "@/types/organizer";

function formatMoney(amount: number) {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(amount);
  } catch {
    return `USD ${amount}`;
  }
}

function eventTitle(event: OrganizerDashboardEvent) {
  return event.title || event.name || `Event #${event.id}`;
}

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } },
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
};

export default function OrganizerDashboard() {
  const { organizer } = useOrganizer();
  const [data, setData] = useState<OrganizerDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    getOrganizerDashboard()
      .then(setData)
      .catch((err) => setError(getApiErrorMessage(err, "Couldn't load dashboard.")))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const greetingName = organizer?.contact_name || organizer?.business_name || "Organizer";

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto space-y-8">
        <Skeleton className="h-40 w-full rounded-[1.75rem]" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32 rounded-3xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <Skeleton className="h-48 rounded-3xl" />
          <Skeleton className="h-48 rounded-3xl" />
        </div>
        <Skeleton className="h-64 rounded-3xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto bg-card rounded-3xl p-10 text-center mt-10 border border-border/40">
        <AlertTriangle className="w-10 h-10 mx-auto mb-4 text-destructive" />
        <h1 className="text-2xl font-display font-bold mb-2">Couldn't load dashboard</h1>
        <p className="text-muted-foreground text-sm mb-6">{error}</p>
        <Button className="rounded-full" onClick={load}>
          <RefreshCw className="w-4 h-4 mr-2" /> Retry
        </Button>
      </div>
    );
  }

  if (!data) return null;

  const cards = [
    { label: "Total events", value: String(data.total_events), icon: CalendarDays, hint: "Across all statuses" },
    { label: "Registrations", value: String(data.total_registrations), icon: Users, hint: "All owned events" },
    { label: "Revenue", value: formatMoney(data.total_revenue), icon: TrendingUp, hint: "Collected ticket sales" },
    { label: "Available payout", value: formatMoney(data.available_payout), icon: Wallet, hint: "Ready to request" },
  ];

  const quota = data.quota;
  const recent = Array.isArray(data.recent_events) ? data.recent_events : [];
  const needsPlan = !quota || quota.can_create_event === false;

  return (
    <div className="max-w-6xl mx-auto pb-10 space-y-8">
      <motion.header
        initial="hidden"
        animate="show"
        variants={fadeUp}
        className="relative overflow-hidden rounded-[1.75rem] border border-border/50 bg-card"
      >
        <div
          className="absolute inset-0 opacity-90"
          style={{
            background:
              "radial-gradient(120% 80% at 0% 0%, hsl(var(--primary) / 0.14), transparent 55%), radial-gradient(80% 60% at 100% 10%, hsl(var(--foreground) / 0.04), transparent 45%)",
          }}
        />
        <div className="relative px-6 sm:px-10 py-9 sm:py-11 flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-3">
              Organizer portal
            </p>
            <h1 className="text-4xl sm:text-5xl font-display font-bold tracking-[-0.03em] leading-[1.05] mb-2">
              Welcome, {greetingName}
            </h1>
            <p className="text-muted-foreground max-w-xl text-sm sm:text-base">
              {organizer?.business_name
                ? `${organizer.business_name} — events, registrations, payouts, and plan status at a glance.`
                : "Events, registrations, payouts, and plan status at a glance."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" className="rounded-full">
              <Link to="/organizer/events">All events</Link>
            </Button>
            <Button asChild className="rounded-full">
              <Link to="/organizer/events/new">
                <Plus className="w-4 h-4 mr-1.5" />
                Create event
              </Link>
            </Button>
          </div>
        </div>
      </motion.header>

      {needsPlan && (
        <motion.div
          initial="hidden"
          animate="show"
          variants={fadeUp}
          className="rounded-3xl border border-amber-500/25 bg-amber-500/10 px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
        >
          <div>
            <p className="font-display font-semibold text-sm">Event creation is limited on your plan</p>
            <p className="text-sm text-muted-foreground mt-0.5">
              {quota
                ? "You've reached your package event quota. Upgrade to create more events."
                : "Subscribe to a package to unlock event creation."}
            </p>
          </div>
          <Button asChild size="sm" className="rounded-full shrink-0">
            <Link to="/organizer/subscription">
              View plans
              <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
            </Link>
          </Button>
        </motion.div>
      )}

      <motion.div
        initial="hidden"
        animate="show"
        variants={stagger}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {cards.map((stat) => (
          <motion.div
            key={stat.label}
            variants={fadeUp}
            className="rounded-3xl border border-border/50 bg-card p-5 sm:p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-muted-foreground">{stat.label}</span>
              <div className="w-10 h-10 rounded-2xl bg-muted flex items-center justify-center">
                <stat.icon className="w-4 h-4 text-muted-foreground" />
              </div>
            </div>
            <p className="text-3xl font-display font-bold tracking-[-0.02em] tabular-nums">{stat.value}</p>
            <p className="text-xs text-muted-foreground mt-2">{stat.hint}</p>
          </motion.div>
        ))}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <motion.section
          initial="hidden"
          animate="show"
          variants={fadeUp}
          className="rounded-3xl border border-border/50 bg-foreground text-background overflow-hidden"
        >
          <div className="px-6 sm:px-7 py-6 sm:py-7 space-y-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-background/55 mb-1">
                  Payouts
                </p>
                <h2 className="text-xl font-display font-bold">Cash out per event</h2>
              </div>
              <Wallet className="w-5 h-5 text-background/50" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-background/10 px-4 py-3">
                <p className="text-[11px] uppercase tracking-wide text-background/50 mb-1">Available</p>
                <p className="font-display font-bold text-lg tabular-nums">
                  {formatMoney(data.available_payout)}
                </p>
              </div>
              <div className="rounded-2xl bg-background/10 px-4 py-3">
                <p className="text-[11px] uppercase tracking-wide text-background/50 mb-1">Pending</p>
                <p className="font-display font-bold text-lg tabular-nums">
                  {formatMoney(data.pending_payout)}
                </p>
              </div>
            </div>
            <Button
              asChild
              variant="secondary"
              className="rounded-full w-full sm:w-auto bg-background text-foreground hover:bg-background/90"
            >
              <Link to="/organizer/payouts">
                Manage payouts
                <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
              </Link>
            </Button>
          </div>
        </motion.section>

        <motion.section
          initial="hidden"
          animate="show"
          variants={fadeUp}
          className="rounded-3xl border border-border/50 bg-card p-6 sm:p-7 flex flex-col"
        >
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground mb-1">
                Subscription
              </p>
              <h2 className="text-xl font-display font-bold">Your plan</h2>
            </div>
            <Package className="w-5 h-5 text-muted-foreground" />
          </div>

          {quota ? (
            <div className="space-y-3 flex-1">
              <p className="text-sm text-muted-foreground leading-relaxed">
                {quota.unlimited
                  ? `${quota.events_created} events created · unlimited quota`
                  : `${quota.events_created} of ${quota.quota ?? "—"} events used`}
              </p>
              <div className="flex flex-wrap gap-2">
                <Badge
                  className={cn(
                    "border-0 text-[10px] uppercase tracking-wider",
                    quota.can_create_event
                      ? "bg-success/15 text-success"
                      : "bg-amber-500/15 text-amber-700 dark:text-amber-400",
                  )}
                >
                  {quota.can_create_event ? "Can create events" : "Quota reached"}
                </Badge>
                {quota.remaining !== null && !quota.unlimited && (
                  <Badge className="border-0 bg-muted text-muted-foreground text-[10px]">
                    {quota.remaining} remaining
                  </Badge>
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground flex-1">
              No active package on this account. Choose a plan to start creating events.
            </p>
          )}

          <Button asChild variant="outline" className="rounded-full mt-5 w-full sm:w-auto">
            <Link to="/organizer/subscription">
              {needsPlan ? "Choose a plan" : "Manage plan"}
              <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
            </Link>
          </Button>
        </motion.section>
      </div>

      <motion.section
        initial="hidden"
        animate="show"
        variants={fadeUp}
        className="rounded-3xl border border-border/50 bg-card overflow-hidden"
      >
        <div className="px-6 sm:px-7 py-5 border-b border-border/50 flex items-center justify-between gap-3">
          <div>
            <h2 className="font-display font-semibold text-lg">Recent events</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Jump back into Event Studio</p>
          </div>
          <Button asChild variant="ghost" size="sm" className="rounded-full">
            <Link to="/organizer/events">View all</Link>
          </Button>
        </div>

        {recent.length === 0 ? (
          <div className="px-6 py-14 text-center space-y-4">
            <p className="text-sm text-muted-foreground">No events yet — create your first draft.</p>
            <Button asChild className="rounded-full">
              <Link to="/organizer/events/new">
                <Plus className="w-4 h-4 mr-1.5" />
                Create event
              </Link>
            </Button>
          </div>
        ) : (
          <ul className="divide-y divide-border/60">
            {recent.map((event) => (
              <li
                key={event.id}
                className="px-6 sm:px-7 py-4 flex items-center justify-between gap-3 hover:bg-muted/40 transition-colors"
              >
                <div className="min-w-0">
                  <p className="font-medium truncate">{eventTitle(event)}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 capitalize">
                    {event.status ? event.status.replace(/_/g, " ") : "Event"}
                    {typeof event.registrations_count === "number"
                      ? ` · ${event.registrations_count} registrations`
                      : ""}
                    {event.starts_at
                      ? ` · ${format(new Date(event.starts_at), "MMM d, yyyy")}`
                      : ""}
                  </p>
                </div>
                <Button asChild size="sm" variant="outline" className="rounded-full shrink-0">
                  <Link to={`/organizer/events/${event.id}`}>Open</Link>
                </Button>
              </li>
            ))}
          </ul>
        )}
      </motion.section>
    </div>
  );
}
