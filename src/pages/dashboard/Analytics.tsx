import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Users,
  TrendingUp,
  Eye,
  DollarSign,
  UserCheck,
  Star,
  Loader2,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { getApiErrorMessage } from "@/lib/apiError";
import { listOrganizerEvents, type OrganizerEvent } from "@/services/organizerEvents";
import {
  getOrganizerEventAnalytics,
  type OrganizerEventAnalytics,
} from "@/services/organizerAnalytics";
import { env } from "@/lib/env";

function formatMoney(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

export default function Analytics() {
  const [events, setEvents] = useState<OrganizerEvent[]>([]);
  const [eventId, setEventId] = useState<string>("");
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [analytics, setAnalytics] = useState<OrganizerEventAnalytics | null>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoadingEvents(true);
    listOrganizerEvents({ per_page: 100, page: 1 })
      .then((data) => {
        if (cancelled) return;
        setEvents(data.items);
        if (data.items.length > 0) setEventId(String(data.items[0].id));
      })
      .catch((err) => {
        if (!cancelled) toast.error(getApiErrorMessage(err, "Couldn't load events"));
      })
      .finally(() => {
        if (!cancelled) setLoadingEvents(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!eventId) {
      setAnalytics(null);
      return;
    }
    let cancelled = false;
    setLoadingAnalytics(true);
    getOrganizerEventAnalytics(Number(eventId))
      .then((data) => {
        if (!cancelled) setAnalytics(data);
      })
      .catch((err) => {
        if (!cancelled) {
          setAnalytics(null);
          toast.error(getApiErrorMessage(err, "Couldn't load analytics"));
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingAnalytics(false);
      });
    return () => {
      cancelled = true;
    };
  }, [eventId]);

  const selected = events.find((e) => String(e.id) === eventId);
  const currency = analytics?.currency || env.waafiCurrency;

  const comparisonData = useMemo(() => {
    if (!analytics) return [];
    return [
      { name: "Views", value: analytics.views },
      { name: "Registrations", value: analytics.registrations },
      { name: "Check-ins", value: analytics.check_ins },
      { name: "Feedback", value: analytics.feedback_count },
    ];
  }, [analytics]);

  const rateData = useMemo(() => {
    if (!analytics) return [];
    const rows: Array<{ name: string; value: number }> = [];
    if (analytics.conversion_rate != null) {
      rows.push({ name: "Conversion %", value: analytics.conversion_rate });
    }
    if (analytics.attendance_rate != null) {
      rows.push({ name: "Attendance %", value: analytics.attendance_rate });
    }
    return rows;
  }, [analytics]);

  const statCards = analytics
    ? [
        { label: "Views", value: analytics.views, icon: Eye },
        { label: "Registrations", value: analytics.registrations, icon: Users },
        {
          label: "Revenue",
          value: formatMoney(analytics.revenue, currency),
          icon: DollarSign,
        },
        { label: "Check-ins", value: analytics.check_ins, icon: UserCheck },
        {
          label: "Conversion",
          value:
            analytics.conversion_rate == null ? "—" : `${analytics.conversion_rate}%`,
          icon: TrendingUp,
        },
        {
          label: "Attendance rate",
          value:
            analytics.attendance_rate == null ? "—" : `${analytics.attendance_rate}%`,
          icon: UserCheck,
        },
        {
          label: "Avg rating",
          value:
            analytics.average_rating == null
              ? "—"
              : `${analytics.average_rating} (${analytics.feedback_count})`,
          icon: Star,
        },
      ]
    : [];

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold">Analytics</h1>
          <p className="text-muted-foreground">
            Real metrics for one event from the Laravel analytics API.
            {selected && (
              <>
                {" "}
                <Link
                  to={`/organizer/events/${selected.id}`}
                  className="text-foreground underline underline-offset-2"
                >
                  Open event
                </Link>
              </>
            )}
          </p>
        </div>
        <Select
          value={eventId || undefined}
          onValueChange={setEventId}
          disabled={loadingEvents || events.length === 0}
        >
          <SelectTrigger className="w-full sm:w-72 rounded-full bg-card">
            <SelectValue placeholder={loadingEvents ? "Loading events…" : "Select an event"} />
          </SelectTrigger>
          <SelectContent>
            {events.map((e) => (
              <SelectItem key={e.id} value={String(e.id)}>
                {e.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loadingEvents || loadingAnalytics ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : !analytics ? (
        <div className="bg-card rounded-xl p-10 text-center text-sm text-muted-foreground">
          {events.length === 0
            ? "Create an event to see analytics."
            : "No analytics available for this event."}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {statCards.map((stat) => (
              <div key={stat.label} className="bg-card rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-muted-foreground">{stat.label}</span>
                  <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">
                    <stat.icon className="w-4 h-4 text-muted-foreground" />
                  </div>
                </div>
                <p className="text-2xl font-display font-bold tabular-nums">{stat.value}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="bg-card rounded-xl p-5 sm:p-6">
              <h3 className="font-display font-semibold mb-4">Volume</h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={comparisonData} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                    <XAxis dataKey="name" className="text-xs" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} className="text-xs" />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 12,
                        fontSize: 13,
                      }}
                    />
                    <Bar dataKey="value" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} barSize={36} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-card rounded-xl p-5 sm:p-6">
              <h3 className="font-display font-semibold mb-4">Rates</h3>
              {rateData.length > 0 ? (
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={rateData} layout="vertical" margin={{ left: 8, right: 16, top: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={false} />
                      <XAxis type="number" domain={[0, 100]} className="text-xs" />
                      <YAxis type="category" dataKey="name" width={110} className="text-xs" tick={{ fontSize: 11 }} />
                      <Tooltip
                        contentStyle={{
                          background: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: 12,
                          fontSize: 13,
                        }}
                      />
                      <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 6, 6, 0]} barSize={28} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-12 text-sm">
                  Conversion and attendance rates appear when views or registrations exist.
                </p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
