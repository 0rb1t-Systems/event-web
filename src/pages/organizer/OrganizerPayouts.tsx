import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { toast } from "sonner";
import { Loader2, Wallet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import EventFinancePanel from "@/components/event-studio/EventFinancePanel";
import SubscriptionQuotaPanel from "@/components/event-studio/SubscriptionQuotaPanel";
import { getApiErrorMessage } from "@/lib/apiError";
import { cn } from "@/lib/utils";
import { env } from "@/lib/env";
import { listOrganizerEvents, type OrganizerEvent } from "@/services/organizerEvents";
import {
  asMoneyNumber,
  listOrganizerPayoutRequests,
  payoutStatus,
  type OrganizerPayoutRequest,
} from "@/services/organizerPayouts";

const STATUS_STYLE: Record<string, string> = {
  requested: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-0",
  approved: "bg-primary/10 text-primary border-0",
  paid: "bg-success/10 text-success border-0",
  rejected: "bg-destructive/10 text-destructive border-0",
};

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

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl font-display font-bold flex items-center gap-2">
          <Wallet className="w-7 h-7 text-muted-foreground" />
          Payouts
        </h1>
        <p className="text-muted-foreground">
          Request payouts per event, review request status, and view your subscription quota.
          Approve, reject, and record-payment are admin-only.
        </p>
      </div>

      <Tabs defaultValue="finance" className="space-y-6">
        <TabsList className="rounded-full bg-muted p-1 h-auto flex flex-wrap">
          <TabsTrigger value="finance" className="rounded-full px-4">
            Event finance
          </TabsTrigger>
          <TabsTrigger value="requests" className="rounded-full px-4">
            All requests
          </TabsTrigger>
          <TabsTrigger value="package" className="rounded-full px-4">
            Package &amp; quota
          </TabsTrigger>
        </TabsList>

        <TabsContent value="finance" className="space-y-4 mt-0">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              Select an event to view finance and create a payout request.
              {selected && (
                <>
                  {" "}
                  <Link
                    to={`/organizer/events/${selected.id}/finance`}
                    className="text-foreground underline underline-offset-2"
                  >
                    Open in Event Studio
                  </Link>
                </>
              )}
            </p>
            <Select
              value={eventId || undefined}
              onValueChange={setEventId}
              disabled={loadingEvents || events.length === 0}
            >
              <SelectTrigger className="w-full sm:w-72 rounded-full bg-card">
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
            <div className="flex justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : events.length === 0 ? (
            <div className="bg-card rounded-xl p-10 text-center text-sm text-muted-foreground">
              Create an event to manage finance and payouts.
            </div>
          ) : eventId ? (
            <EventFinancePanel
              eventId={Number(eventId)}
              eventTitle={selected?.title}
              compact
            />
          ) : null}
        </TabsContent>

        <TabsContent value="requests" className="mt-0 space-y-3">
          <p className="text-sm text-muted-foreground">
            All of your payout requests across events. Requests are always tied to a single event —
            there is no batch payout.
          </p>
          {loadingAll ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : allRequests.length === 0 ? (
            <div className="bg-card rounded-xl p-10 text-center text-sm text-muted-foreground">
              No payout requests yet. Choose an event under Event finance to request one.
            </div>
          ) : (
            <div className="bg-card rounded-xl overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">
                      Event
                    </TableHead>
                    <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">
                      Amount
                    </TableHead>
                    <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">
                      Status
                    </TableHead>
                    <TableHead className="text-xs uppercase tracking-wider text-muted-foreground hidden sm:table-cell">
                      Commission
                    </TableHead>
                    <TableHead className="text-xs uppercase tracking-wider text-muted-foreground hidden md:table-cell">
                      Date
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allRequests.map((row) => {
                    const status = payoutStatus(row.status);
                    return (
                      <TableRow key={row.id} className="border-0">
                        <TableCell>
                          <Link
                            to={`/organizer/events/${row.event_id}/finance`}
                            className="font-medium hover:underline underline-offset-2"
                          >
                            {row.event?.title ?? `Event #${row.event_id}`}
                          </Link>
                        </TableCell>
                        <TableCell className="tabular-nums">
                          {formatMoney(asMoneyNumber(row.requested_amount))}
                        </TableCell>
                        <TableCell>
                          <Badge className={cn("capitalize text-xs", STATUS_STYLE[status])}>
                            {status.replace(/_/g, " ")}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm hidden sm:table-cell">
                          {asMoneyNumber(row.commission_rate)}%
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm hidden md:table-cell">
                          {format(new Date(row.created_at), "MMM d, yyyy")}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="package" className="mt-0">
          <SubscriptionQuotaPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
