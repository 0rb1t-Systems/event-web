import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { ArrowRight, Loader2, Package, Wallet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } },
};

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
              "radial-gradient(110% 80% at 100% 0%, hsl(var(--primary) / 0.12), transparent 50%), radial-gradient(90% 70% at 0% 30%, hsl(var(--foreground) / 0.04), transparent 50%)",
          }}
        />
        <div className="relative px-6 sm:px-10 py-9 sm:py-11">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-3">
            Finance
          </p>
          <h1 className="text-4xl sm:text-5xl font-display font-bold tracking-[-0.03em] leading-[1.05] mb-3">
            Payouts
          </h1>
          <p className="text-muted-foreground max-w-2xl text-sm sm:text-base">
            Request payouts per event, track request status, and check your plan quota. Approve,
            reject, and record-payment stay admin-only.
          </p>
        </div>
      </motion.header>

      <motion.section
        initial="hidden"
        animate="show"
        variants={fadeUp}
        className="rounded-3xl border border-border/50 bg-foreground text-background overflow-hidden"
      >
        <div className="px-6 sm:px-8 py-6 sm:py-7 grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="rounded-2xl bg-background/10 px-4 py-3">
            <p className="text-[11px] uppercase tracking-wide text-background/50 mb-1">Requests</p>
            <p className="font-display font-bold text-2xl tabular-nums">
              {loadingAll ? "—" : requestStats.total}
            </p>
          </div>
          <div className="rounded-2xl bg-background/10 px-4 py-3">
            <p className="text-[11px] uppercase tracking-wide text-background/50 mb-1">Awaiting review</p>
            <p className="font-display font-bold text-2xl tabular-nums">
              {loadingAll ? "—" : requestStats.requested}
            </p>
          </div>
          <div className="rounded-2xl bg-background/10 px-4 py-3">
            <p className="text-[11px] uppercase tracking-wide text-background/50 mb-1">Paid</p>
            <p className="font-display font-bold text-2xl tabular-nums">
              {loadingAll ? "—" : requestStats.paid}
            </p>
          </div>
          <div className="rounded-2xl bg-background/10 px-4 py-3 col-span-2 lg:col-span-1">
            <p className="text-[11px] uppercase tracking-wide text-background/50 mb-1">
              Open requested
            </p>
            <p className="font-display font-bold text-xl sm:text-2xl tabular-nums">
              {loadingAll ? "—" : formatMoney(requestStats.requestedSum)}
            </p>
          </div>
        </div>
      </motion.section>

      <Tabs defaultValue="finance" className="space-y-6">
        <TabsList className="rounded-full bg-muted/80 p-1 h-auto flex flex-wrap w-full sm:w-auto justify-start border border-border/40">
          <TabsTrigger value="finance" className="rounded-full px-4 data-[state=active]:shadow-sm">
            Event finance
          </TabsTrigger>
          <TabsTrigger value="requests" className="rounded-full px-4 data-[state=active]:shadow-sm">
            All requests
          </TabsTrigger>
          <TabsTrigger value="package" className="rounded-full px-4 data-[state=active]:shadow-sm">
            Package
          </TabsTrigger>
        </TabsList>

        <TabsContent value="finance" className="space-y-5 mt-0">
          <div className="rounded-3xl border border-border/50 bg-card p-5 sm:p-6 flex flex-col lg:flex-row lg:items-end justify-between gap-4">
            <div className="min-w-0">
              <h2 className="font-display font-semibold text-lg mb-1">Per-event finance</h2>
              <p className="text-sm text-muted-foreground">
                Select an event to view collected balance and request a payout.
                {selected && (
                  <>
                    {" "}
                    <Link
                      to={`/organizer/events/${selected.id}/finance`}
                      className="text-foreground font-medium underline underline-offset-2"
                    >
                      Open in Event Studio
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
              <SelectTrigger className="w-full lg:w-80 rounded-full bg-background border-border/60">
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
            <div className="flex justify-center py-20 rounded-3xl border border-border/40 bg-card">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : events.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-border/60 bg-card/60 px-6 py-16 text-center space-y-4">
              <Wallet className="w-8 h-8 mx-auto text-muted-foreground" />
              <div>
                <p className="font-display font-semibold">No events yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Create an event to manage finance and payouts.
                </p>
              </div>
              <Button asChild className="rounded-full">
                <Link to="/organizer/events/new">Create event</Link>
              </Button>
            </div>
          ) : eventId ? (
            <div className="rounded-3xl border border-border/50 bg-card p-4 sm:p-6">
              <EventFinancePanel
                eventId={Number(eventId)}
                eventTitle={selected?.title}
                compact
              />
            </div>
          ) : null}
        </TabsContent>

        <TabsContent value="requests" className="mt-0 space-y-4">
          <div className="rounded-3xl border border-border/50 bg-card p-5 sm:p-6">
            <h2 className="font-display font-semibold text-lg mb-1">All payout requests</h2>
            <p className="text-sm text-muted-foreground mb-5">
              Across every event. Each request is tied to a single event — there is no batch payout.
            </p>

            {loadingAll ? (
              <div className="flex justify-center py-16">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : allRequests.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border/60 py-14 text-center space-y-3">
                <p className="text-sm text-muted-foreground">
                  No payout requests yet. Choose an event under Event finance to request one.
                </p>
              </div>
            ) : (
              <>
                {/* Mobile cards */}
                <ul className="space-y-3 md:hidden">
                  {allRequests.map((row) => {
                    const status = payoutStatus(row.status);
                    return (
                      <li
                        key={row.id}
                        className="rounded-2xl border border-border/50 bg-background/50 p-4 space-y-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <Link
                            to={`/organizer/events/${row.event_id}/finance`}
                            className="font-medium hover:underline underline-offset-2"
                          >
                            {row.event?.title ?? `Event #${row.event_id}`}
                          </Link>
                          <Badge className={cn("capitalize text-[10px] shrink-0", STATUS_STYLE[status])}>
                            {status.replace(/_/g, " ")}
                          </Badge>
                        </div>
                        <div className="flex items-end justify-between text-sm">
                          <div>
                            <p className="tabular-nums font-display font-bold text-base">
                              {formatMoney(asMoneyNumber(row.requested_amount))}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {asMoneyNumber(row.commission_rate)}% commission ·{" "}
                              {format(new Date(row.created_at), "MMM d, yyyy")}
                            </p>
                          </div>
                          <Link
                            to={`/organizer/events/${row.event_id}/finance`}
                            className="text-xs font-medium text-muted-foreground hover:text-foreground"
                          >
                            Open
                          </Link>
                        </div>
                      </li>
                    );
                  })}
                </ul>

                {/* Desktop table */}
                <div className="hidden md:block overflow-x-auto rounded-2xl border border-border/40">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent bg-muted/30">
                        <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">
                          Event
                        </TableHead>
                        <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">
                          Amount
                        </TableHead>
                        <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">
                          Status
                        </TableHead>
                        <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">
                          Commission
                        </TableHead>
                        <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">
                          Date
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allRequests.map((row) => {
                        const status = payoutStatus(row.status);
                        return (
                          <TableRow key={row.id} className="border-border/40">
                            <TableCell>
                              <Link
                                to={`/organizer/events/${row.event_id}/finance`}
                                className="font-medium hover:underline underline-offset-2"
                              >
                                {row.event?.title ?? `Event #${row.event_id}`}
                              </Link>
                            </TableCell>
                            <TableCell className="tabular-nums font-medium">
                              {formatMoney(asMoneyNumber(row.requested_amount))}
                            </TableCell>
                            <TableCell>
                              <Badge className={cn("capitalize text-xs", STATUS_STYLE[status])}>
                                {status.replace(/_/g, " ")}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                              {asMoneyNumber(row.commission_rate)}%
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                              {format(new Date(row.created_at), "MMM d, yyyy")}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </div>
        </TabsContent>

        <TabsContent value="package" className="mt-0 space-y-4">
          <div className="rounded-3xl border border-border/50 bg-card p-5 sm:p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-2xl bg-muted flex items-center justify-center shrink-0">
                  <Package className="w-4 h-4 text-muted-foreground" />
                </div>
                <div>
                  <h2 className="font-display font-semibold text-lg">Package snapshot</h2>
                  <p className="text-sm text-muted-foreground">
                    Quick view of quota. Full pricing and checkout live on Plans.
                  </p>
                </div>
              </div>
              <Button asChild variant="outline" size="sm" className="rounded-full shrink-0">
                <Link to="/organizer/subscription">
                  Open plans
                  <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                </Link>
              </Button>
            </div>
            <SubscriptionQuotaPanel />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
