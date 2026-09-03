import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { IconBanknotes, IconClock, IconWallet } from "@/components/organizer-console/orgIcons";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import EventFinancePanel from "@/components/event-studio/EventFinancePanel";
import { OrgChip } from "@/components/organizer-console/OrgChip";
import { OrgStatCard } from "@/components/organizer-console/OrgStatCard";
import { OrgButton } from "@/components/organizer-console/OrgButton";
import { orgPayoutTone } from "@/components/organizer-console/orgTheme";
import { getApiErrorMessage } from "@/lib/apiError";
import { env } from "@/lib/env";
import { listOrganizerEvents, type OrganizerEvent } from "@/services/organizerEvents";
import {
  asMoneyNumber,
  listOrganizerPayoutRequests,
  payoutStatus,
  type OrganizerPayoutRequest,
} from "@/services/organizerPayouts";

function formatMoney(amount: number, currency = env.waafiCurrency) {
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

const th = "text-left text-xs font-bold uppercase tracking-[1px] text-oc-faint pb-2";
const td = "py-3 text-sm text-oc-ink align-middle";

export default function OrganizerPayouts() {
  const [events, setEvents] = useState<OrganizerEvent[]>([]);
  const [eventId, setEventId] = useState<string>("");
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [allRequests, setAllRequests] = useState<OrganizerPayoutRequest[]>([]);
  const [loadingAll, setLoadingAll] = useState(true);

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
    let cancelled = false;
    setLoadingAll(true);
    listOrganizerPayoutRequests({ per_page: 50, page: 1 })
      .then((data) => {
        if (!cancelled) setAllRequests(data.items);
      })
      .catch((err) => {
        if (!cancelled) toast.error(getApiErrorMessage(err, "Couldn't load payout requests"));
      })
      .finally(() => {
        if (!cancelled) setLoadingAll(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const selected = events.find((e) => String(e.id) === eventId);

  const requestStats = useMemo(() => {
    const counts = { requested: 0, approved: 0, paid: 0, rejected: 0, total: allRequests.length };
    for (const row of allRequests) {
      const s = payoutStatus(row.status);
      if (s in counts) counts[s as keyof typeof counts]++;
    }
    const requestedSum = allRequests
      .filter((r) => payoutStatus(r.status) === "requested")
      .reduce((sum, r) => sum + asMoneyNumber(r.requested_amount), 0);
    return { ...counts, requestedSum };
  }, [allRequests]);

  return (
    <div className="flex flex-col gap-4">
      {/* Counters */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <OrgStatCard label="Total" value={loadingAll ? "—" : String(requestStats.total)} icon={IconBanknotes} />
        <OrgStatCard label="Pending" value={loadingAll ? "—" : String(requestStats.requested)} icon={IconClock} tone="amber" />
        <OrgStatCard label="Paid" value={loadingAll ? "—" : String(requestStats.paid)} icon={IconWallet} />
        <OrgStatCard
          label="Pending amount"
          value={loadingAll ? "—" : formatMoney(requestStats.requestedSum)}
          icon={IconBanknotes}
          tone="amber"
        />
      </div>

      <div className="org-card p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <h2 className="font-head font-semibold text-[17px] text-oc-ink shrink-0">Event</h2>
          {selected && (
            <Link
              to={`/organizer/events/${selected.id}/finance`}
              className="text-sm text-oc-brand font-semibold hover:text-oc-brand-strong truncate"
            >
              Studio →
            </Link>
          )}
        </div>
        <Select
          value={eventId || undefined}
          onValueChange={setEventId}
          disabled={loadingEvents || events.length === 0}
        >
          <SelectTrigger className="w-full lg:w-80 rounded-[12px] bg-oc-well border-0">
            <SelectValue
              placeholder={loadingEvents ? "Loading events…" : "Select an event"}
            />
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

      {loadingEvents ? (
        <div className="org-card flex justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-oc-brand" />
        </div>
      ) : events.length === 0 ? (
        <div className="org-card px-6 py-16 text-center flex flex-col items-center gap-4">
          <IconWallet className="w-8 h-8 text-oc-faint" />
          <p className="font-head font-semibold text-oc-ink">No events</p>
          <OrgButton asChild>
            <Link to="/organizer/events/new">Create event</Link>
          </OrgButton>
        </div>
      ) : eventId ? (
        <div className="org-card p-4 sm:p-5">
          <EventFinancePanel
            eventId={Number(eventId)}
            eventTitle={selected?.title}
            compact
            hideRequestList
          />
        </div>
      ) : null}

      <div className="org-card p-5">
        <h2 className="font-head font-semibold text-[17px] text-oc-ink mb-4">Requests</h2>

        {loadingAll ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-oc-brand" />
          </div>
        ) : allRequests.length === 0 ? (
          <div className="rounded-[12px] bg-oc-well py-14 text-center">
            <p className="text-sm text-oc-muted">None yet.</p>
          </div>
        ) : (
          <>
            <ul className="flex flex-col gap-2.5 md:hidden">
              {allRequests.map((row) => {
                const status = payoutStatus(row.status);
                return (
                  <li key={row.id} className="rounded-[12px] bg-oc-well p-4 flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-3">
                      <Link
                        to={`/organizer/events/${row.event_id}/finance`}
                        className="font-semibold text-sm text-oc-ink hover:text-oc-brand"
                      >
                        {row.event?.title ?? `Event #${row.event_id}`}
                      </Link>
                      <OrgChip label={status.replace(/_/g, " ")} tone={orgPayoutTone(status)} size="sm" />
                    </div>
                    <div className="flex items-end justify-between">
                      <div>
                        <p className="font-data font-semibold text-base text-oc-ink tabular-nums">
                          {formatMoney(asMoneyNumber(row.requested_amount))}
                        </p>
                        <p className="text-xs text-oc-faint mt-0.5">
                          {asMoneyNumber(row.commission_rate)}% commission ·{" "}
                          {format(new Date(row.created_at), "MMM d, yyyy")}
                        </p>
                      </div>
                      <Link
                        to={`/organizer/events/${row.event_id}/finance`}
                        className="text-xs font-semibold text-oc-brand"
                      >
                        Open
                      </Link>
                    </div>
                  </li>
                );
              })}
            </ul>

            <div className="hidden md:block min-w-0 overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-oc-line">
                    <th className={th}>Event</th>
                    <th className={th}>Amount</th>
                    <th className={th}>Status</th>
                    <th className={th}>Commission</th>
                    <th className={th}>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {allRequests.map((row) => {
                    const status = payoutStatus(row.status);
                    return (
                      <tr key={row.id} className="border-b border-oc-line/60 last:border-0">
                        <td className={td}>
                          <Link
                            to={`/organizer/events/${row.event_id}/finance`}
                            className="font-semibold hover:text-oc-brand"
                          >
                            {row.event?.title ?? `Event #${row.event_id}`}
                          </Link>
                        </td>
                        <td className={`${td} font-data font-semibold tabular-nums`}>
                          {formatMoney(asMoneyNumber(row.requested_amount))}
                        </td>
                        <td className={td}>
                          <OrgChip label={status.replace(/_/g, " ")} tone={orgPayoutTone(status)} size="sm" />
                        </td>
                        <td className={`${td} text-oc-muted`}>
                          {asMoneyNumber(row.commission_rate)}%
                        </td>
                        <td className={`${td} text-oc-muted`}>
                          {format(new Date(row.created_at), "MMM d, yyyy")}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
