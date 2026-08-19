import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  CalendarDays, Users, Wallet, TrendingUp, AlertTriangle, RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useOrganizer } from "@/contexts/OrganizerContext";
import { getOrganizerDashboard } from "@/services/organizerDashboard";
import { getApiErrorMessage } from "@/lib/apiError";
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

  useEffect(() => { load(); }, []);

  const greetingName = organizer?.contact_name || organizer?.business_name || "Organizer";

  if (loading) {
    return (
      <div className="space-y-8 max-w-5xl mx-auto">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto bg-card rounded-3xl p-10 text-center mt-10">
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
    { label: "Total events", value: String(data.total_events), icon: CalendarDays },
    { label: "Registrations", value: String(data.total_registrations), icon: Users },
    { label: "Revenue", value: formatMoney(data.total_revenue), icon: TrendingUp },
    { label: "Available payout", value: formatMoney(data.available_payout), icon: Wallet },
  ];

  const quota = data.quota;
  const recent = Array.isArray(data.recent_events) ? data.recent_events : [];

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground mb-1">Organizer Portal</p>
        <h1 className="text-3xl font-display font-bold">Welcome, {greetingName}</h1>
        <p className="text-muted-foreground">
          {organizer?.business_name ? `${organizer.business_name} overview` : "Your event overview"}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((stat) => (
          <div key={stat.label} className="bg-card rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-muted-foreground">{stat.label}</span>
              <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">
                <stat.icon className="w-4 h-4 text-muted-foreground" />
              </div>
            </div>
            <p className="text-2xl font-display font-bold">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-card rounded-xl p-5 sm:p-6 space-y-3">
          <h3 className="font-display font-semibold">Payouts</h3>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Available</span>
            <span className="font-semibold">{formatMoney(data.available_payout)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Pending</span>
            <span className="font-semibold">{formatMoney(data.pending_payout)}</span>
          </div>
          <Link to="/organizer/payouts" className="inline-block text-sm font-medium hover:underline pt-1">
            View payouts
          </Link>
        </div>

        <div className="bg-card rounded-xl p-5 sm:p-6 space-y-3">
          <h3 className="font-display font-semibold">Subscription</h3>
          {quota ? (
            <>
              <p className="text-sm text-muted-foreground">
                {quota.unlimited
                  ? `${quota.events_created} events created · unlimited quota`
                  : `${quota.events_created} of ${quota.quota ?? "—"} events used`}
              </p>
              {quota.remaining !== null && !quota.unlimited && (
                <p className="text-sm font-medium">{quota.remaining} remaining</p>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">No active package quota on this account.</p>
          )}
        </div>
      </div>

      <div className="bg-card rounded-xl p-5 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-semibold">Recent events</h3>
          <Link to="/organizer/events" className="text-sm font-medium hover:underline">All events</Link>
        </div>
        {recent.length === 0 ? (
          <p className="text-muted-foreground text-sm py-8 text-center">No events yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {recent.map((event) => (
              <li key={event.id} className="py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium truncate">{eventTitle(event)}</p>
                  <p className="text-xs text-muted-foreground">
                    {event.status ? event.status.replace(/_/g, " ") : "Event"}
                    {typeof event.registrations_count === "number" ? ` · ${event.registrations_count} registrations` : ""}
                  </p>
                </div>
                <Link
                  to={`/organizer/events/${event.id}`}
                  className="text-sm font-medium shrink-0 hover:underline"
                >
                  Open
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
