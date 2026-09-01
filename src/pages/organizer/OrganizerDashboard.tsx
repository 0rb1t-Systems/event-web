import { Link } from "react-router-dom";
import { format } from "date-fns";
import {
  IconAlert,
  IconArrowRight,
  IconBanknotes,
  IconCalendar,
  IconPlus,
  IconRefresh,
  IconUsers,
  IconWallet,
} from "@/components/organizer-console/orgIcons";
import { OrgButton } from "@/components/organizer-console/OrgButton";
import { OrgChip } from "@/components/organizer-console/OrgChip";
import { OrgStatCard } from "@/components/organizer-console/OrgStatCard";
import {
  formatOrgMoney,
  orgEventStatusTone,
  orgGreeting,
} from "@/components/organizer-console/orgTheme";
import { Skeleton } from "@/components/ui/skeleton";
import { useOrganizer } from "@/contexts/OrganizerContext";
import { useOrganizerDashboardQuery } from "@/hooks/queries/useOrganizerQueries";
import { getApiErrorMessage } from "@/lib/apiError";
import { EVENT_STATUS_LABELS } from "@/lib/organizerEventAdapters";
import type { OrganizerDashboardEvent } from "@/types/organizer";

function eventTitle(event: OrganizerDashboardEvent) {
  return event.title || event.name || `Event #${event.id}`;
}

function eventMeta(event: OrganizerDashboardEvent) {
  const startsAt = event.starts_at ?? event.event_date;
  const date = startsAt ? format(new Date(startsAt), "EEE, MMM d · h:mm a") : "Date TBD";
  return date;
}

function renewalFrom(subscription: unknown): string | null {
  if (!subscription || typeof subscription !== "object") return null;
  const sub = subscription as Record<string, unknown>;
  const raw = sub.ends_at ?? sub.expires_at ?? sub.renews_at;
  if (typeof raw !== "string" || !raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : format(date, "MMM d, yyyy");
}

function planNameFrom(subscription: unknown): string | null {
  if (!subscription || typeof subscription !== "object") return null;
  const sub = subscription as Record<string, unknown>;
  const snapshot = sub.package_snapshot as Record<string, unknown> | undefined;
  const name = sub.package_name ?? snapshot?.package_name ?? sub.name;
  return typeof name === "string" && name.trim() ? name : null;
}

export default function OrganizerDashboard() {
  const { organizer } = useOrganizer();
  const dash = useOrganizerDashboardQuery();
  const data = dash.data ?? null;
  const loading = dash.isLoading;
  const error = dash.error ? getApiErrorMessage(dash.error, "Couldn't load dashboard.") : null;
  const load = () => void dash.refetch();

  const greetingName = organizer?.contact_name || organizer?.business_name || "Organizer";
  const businessName = organizer?.business_name || "your workspace";

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-16 w-2/3 rounded-2xl" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-[120px] rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Skeleton className="h-48 rounded-2xl" />
          <Skeleton className="h-48 rounded-2xl" />
        </div>
        <Skeleton className="h-72 rounded-2xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto org-card p-10 text-center mt-10">
        <IconAlert className="w-10 h-10 mx-auto mb-4 text-oc-bad" />
        <h1 className="text-2xl font-head font-semibold mb-2 text-oc-ink">Couldn't load dashboard</h1>
        <p className="text-oc-muted text-sm mb-6">{error}</p>
        <OrgButton onClick={load}>
          <IconRefresh /> Retry
        </OrgButton>
      </div>
    );
  }

  if (!data) return null;

  const liveCount = data.recent_events?.filter((e) =>
    ["published", "registration_open", "ongoing", "sold_out"].includes(e.status ?? ""),
  ).length ?? 0;

  const cards = [
    { label: "Total events", value: String(data.total_events), icon: IconCalendar, sub: liveCount > 0 ? `${liveCount} currently live` : "Across all statuses", tone: "brand" as const },
    { label: "Registrations", value: data.total_registrations.toLocaleString(), icon: IconUsers, sub: "Across all events", tone: "brand" as const },
    { label: "Revenue", value: formatOrgMoney(data.total_revenue), icon: IconBanknotes, sub: "Collected ticket sales", tone: "brand" as const },
    { label: "Available payout", value: formatOrgMoney(data.available_payout), icon: IconWallet, sub: "Ready to request", tone: "amber" as const },
  ];

  const quota = data.quota;
  const recent = Array.isArray(data.recent_events) ? data.recent_events : [];
  const needsPlan = !quota || quota.can_create_event === false;
  const planName = planNameFrom(data.active_subscription);
  const renewal = renewalFrom(data.active_subscription);
  const quotaTotal = quota?.unlimited ? null : quota?.quota ?? null;
  const quotaPct = quota && quotaTotal ? Math.min(100, Math.round((quota.events_created / Math.max(1, quotaTotal)) * 100)) : quota?.unlimited ? 100 : 0;

  return (
    <div className="space-y-4">
      <header className="px-2 pt-1 lg:pt-0">
        <h1 className="font-head font-semibold text-[22px] lg:text-2xl leading-tight text-oc-ink">
          {orgGreeting()}, {greetingName}
        </h1>
        <p className="text-[13px] lg:text-sm text-oc-muted mt-1">
          Here's what's happening across {businessName} today.
        </p>
      </header>

      {needsPlan && (
        <div className="rounded-2xl bg-oc-accent-soft px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <p className="font-head font-semibold text-sm text-oc-ink">Event creation is limited on your plan</p>
            <p className="text-sm text-oc-muted mt-0.5">
              {quota
                ? "You've reached your package event quota. Upgrade to create more events."
                : "Subscribe to a package to unlock event creation."}
            </p>
          </div>
          <OrgButton asChild size="sm" className="shrink-0">
            <Link to="/organizer/finance?tab=plans">
              View plans <IconArrowRight />
            </Link>
          </OrgButton>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        {cards.map((stat) => (
          <OrgStatCard key={stat.label} {...stat} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <section className="org-card p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="font-head font-semibold text-lg text-oc-ink">Payouts</h2>
            <Link to="/organizer/finance" className="text-xs font-semibold text-oc-brand hover:underline">
              Open finance
            </Link>
          </div>
          <p className="font-head font-semibold text-[24px] leading-none text-oc-ink tabular-nums">
            {formatOrgMoney(data.available_payout)}
          </p>
          <p className="text-xs text-oc-faint -mt-1">available to request</p>
          <div className="flex items-center justify-between pt-1">
            <span className="text-[13px] text-oc-muted">Awaiting review</span>
            {data.pending_payout > 0 ? (
              <OrgChip tone="amber" label={formatOrgMoney(data.pending_payout)} />
            ) : (
              <span className="text-[13px] text-oc-faint">None</span>
            )}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[13px] text-oc-muted">Collected all time</span>
            <span className="font-data text-[13px] font-semibold text-oc-ink tabular-nums">
              {formatOrgMoney(data.total_revenue)}
            </span>
          </div>
        </section>

        <section className="org-card p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="font-head font-semibold text-lg text-oc-ink">Subscription</h2>
            {planName ? (
              <OrgChip label={planName} />
            ) : (
              <OrgChip tone="plain" label="No plan" />
            )}
          </div>
          <p className="text-[13px] text-oc-muted">
            {quota
              ? quota.unlimited
                ? `${quota.events_created} events created · unlimited quota`
                : `${quota.events_created} of ${quotaTotal ?? "—"} events used`
              : "No active package on this account. Choose a plan to start creating events."}
          </p>
          <div className="h-2 rounded-full bg-oc-bg overflow-hidden" role="progressbar" aria-label="Event quota used" aria-valuenow={quotaPct} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full rounded-full bg-oc-brand transition-[width]" style={{ width: `${quotaPct}%` }} />
          </div>
          <div className="flex items-center justify-between pt-1 mt-auto">
            <span className="text-xs text-oc-faint">{renewal ? `Renews ${renewal}` : ""}</span>
            <Link to="/organizer/finance?tab=plans" className="text-xs font-semibold text-oc-brand hover:underline">
              {needsPlan ? "Choose a plan" : "Compare plans"}
            </Link>
          </div>
        </section>
      </div>

      <section>
        <div className="flex items-baseline justify-between gap-3 px-1 pb-3">
          <h2 className="font-head font-semibold text-[15px] text-oc-ink">Recent events</h2>
          <Link to="/organizer/events" className="text-[12px] font-semibold text-oc-brand hover:text-oc-brand-strong">
            All events
          </Link>
        </div>

        {recent.length === 0 ? (
          <div className="border border-dashed border-oc-line rounded-[12px] px-5 py-10 text-center">
            <p className="text-[13px] text-oc-muted mb-4">No events yet.</p>
            <OrgButton asChild size="sm">
              <Link to="/organizer/events/new">
                New event <IconPlus />
              </Link>
            </OrgButton>
          </div>
        ) : (
          <>
            <ul className="sm:hidden divide-y divide-oc-line border-t border-oc-line">
              {recent.map((event) => (
                <li key={event.id}>
                  <Link
                    to={`/organizer/events/${event.id}`}
                    className="flex items-start justify-between gap-3 py-3"
                  >
                    <span className="min-w-0">
                      <span className="block text-[13px] font-semibold text-oc-ink truncate">{eventTitle(event)}</span>
                      <span className="block font-data text-[11px] text-oc-faint mt-0.5">{eventMeta(event)}</span>
                    </span>
                    <OrgChip
                      size="sm"
                      tone={orgEventStatusTone(event.status)}
                      label={EVENT_STATUS_LABELS[event.status ?? ""] ?? "Draft"}
                    />
                  </Link>
                </li>
              ))}
            </ul>

            <div className="hidden sm:block min-w-0 overflow-x-auto">
              <table className="w-full min-w-[520px]">
                <thead>
                  <tr className="border-b border-oc-line text-left">
                    <th className="pb-2.5 pr-4 text-[11px] font-semibold text-oc-faint">Event</th>
                    <th className="pb-2.5 pr-4 text-[11px] font-semibold text-oc-faint">When</th>
                    <th className="pb-2.5 pr-4 text-[11px] font-semibold text-oc-faint text-right">Registered</th>
                    <th className="pb-2.5 text-[11px] font-semibold text-oc-faint text-right">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((event) => (
                    <tr key={event.id} className="border-b border-oc-line/70 last:border-0 group">
                      <td className="py-3.5 pr-4">
                        <Link
                          to={`/organizer/events/${event.id}`}
                          className="text-[13px] font-medium text-oc-ink group-hover:text-oc-brand"
                        >
                          {eventTitle(event)}
                        </Link>
                      </td>
                      <td className="py-3.5 pr-4 font-data text-[12px] text-oc-muted whitespace-nowrap">
                        {eventMeta(event)}
                      </td>
                      <td className="py-3.5 pr-4 font-data text-[12px] font-semibold text-oc-ink tabular-nums text-right">
                        {typeof event.registrations_count === "number" ? event.registrations_count.toLocaleString() : "—"}
                      </td>
                      <td className="py-3.5 text-right">
                        <OrgChip
                          size="sm"
                          tone={orgEventStatusTone(event.status)}
                          label={EVENT_STATUS_LABELS[event.status ?? ""] ?? "Draft"}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
