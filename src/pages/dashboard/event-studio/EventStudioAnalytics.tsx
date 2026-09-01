import { useMemo } from "react";
import { Loader2 } from "lucide-react";
import { IconDollar, IconEye, IconStar, IconTrending, IconUserPlus, IconUsers } from "@/components/organizer-console/orgIcons";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useEventStudio } from "@/contexts/EventStudioContext";
import { useOrganizerEventAnalytics } from "@/hooks/queries/useOrganizerQueries";
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

export default function EventStudioAnalytics() {
  const { eventId } = useEventStudio();
  const { data: analytics, isLoading, isError } = useOrganizerEventAnalytics(eventId);
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
    if (analytics.conversion_rate != null) rows.push({ name: "Conversion %", value: analytics.conversion_rate });
    if (analytics.attendance_rate != null) rows.push({ name: "Attendance %", value: analytics.attendance_rate });
    return rows;
  }, [analytics]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (isError || !analytics) {
    return (
      <div className="rounded-xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">
        No analytics available for this event.
      </div>
    );
  }

  const statCards = [
    { label: "Views", value: analytics.views, icon: IconEye },
    { label: "Registrations", value: analytics.registrations, icon: IconUsers },
    { label: "Revenue", value: formatMoney(analytics.revenue, currency), icon: IconDollar },
    { label: "Check-ins", value: analytics.check_ins, icon: IconUserPlus },
    {
      label: "Conversion",
      value: analytics.conversion_rate == null ? "-" : `${analytics.conversion_rate}%`,
      icon: IconTrending,
    },
    {
      label: "Attendance rate",
      value: analytics.attendance_rate == null ? "-" : `${analytics.attendance_rate}%`,
      icon: IconUserPlus,
    },
    {
      label: "Avg rating",
      value:
        analytics.average_rating == null
          ? "-"
          : `${analytics.average_rating} (${analytics.feedback_count})`,
      icon: IconStar,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-semibold tracking-tight">Analytics</h2>
        <p className="text-sm text-muted-foreground">Laravel scalars for this event. No invented series.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <div key={stat.label} className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-muted-foreground">{stat.label}</span>
              <stat.icon className="w-4 h-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-display font-semibold tabular-nums font-mono">{stat.value}</p>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="font-display font-semibold mb-4">Volume</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={comparisonData} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} />
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
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="font-display font-semibold mb-4">Rates</h3>
          {rateData.length > 0 ? (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={rateData} layout="vertical" margin={{ left: 8, right: 16, top: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={false} />
                  <XAxis type="number" domain={[0, 100]} />
                  <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11 }} />
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
    </div>
  );
}
