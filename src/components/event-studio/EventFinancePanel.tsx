import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  Loader2,
  Wallet,
  Banknote,
  CircleDollarSign,
  Lock,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getApiErrorMessage, isOrganizerEventAccessError } from "@/lib/apiError";
import { cn } from "@/lib/utils";
import { env } from "@/lib/env";
import type { OrganizerEventFinance } from "@/services/organizerFinance";
import {
  asMoneyNumber,
  computeCommissionFromSnapshot,
  createOrganizerEventPayoutRequest,
  getOrganizerPayoutRequest,
  listOrganizerEventPayoutRequests,
  payoutStatus,
  type OrganizerPayoutRequest,
  type OrganizerPayoutSnapshotAmounts,
} from "@/services/organizerPayouts";

const STATUS_STYLE: Record<string, string> = {
  requested: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-0",
  approved: "bg-primary/10 text-primary border-0",
  paid: "bg-success/10 text-success border-0",
  rejected: "bg-destructive/10 text-destructive border-0",
};

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

type Props = {
  eventId: number;
  eventTitle?: string;
  /** Hide outer title when studio tab already provides context. */
  compact?: boolean;
  onDenied?: () => void;
};

export default function EventFinancePanel({
  eventId,
  eventTitle,
  compact,
  onDenied,
}: Props) {
  const [finance, setFinance] = useState<OrganizerEventFinance | null>(null);
  const [available, setAvailable] = useState(0);
  const [items, setItems] = useState<OrganizerPayoutRequest[]>([]);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [detail, setDetail] = useState<{
    payout: OrganizerPayoutRequest;
    snapshot: OrganizerPayoutSnapshotAmounts;
  } | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listOrganizerEventPayoutRequests(eventId, {
        page,
        per_page: 15,
      });
      setFinance(data.event_finance);
      setAvailable(data.available_amount);
      setItems(data.items);
      setLastPage(data.pagination.last_page);
      setTotal(data.pagination.total);
    } catch (err) {
      if (isOrganizerEventAccessError(err)) {
        onDenied?.();
        return;
      }
      toast.error(getApiErrorMessage(err, "Couldn't load finance"));
    } finally {
      setLoading(false);
    }
  }, [eventId, page, onDenied]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [eventId]);

  const currency = finance?.currency || env.waafiCurrency;

  const openDetail = async (row: OrganizerPayoutRequest) => {
    setDetailLoading(true);
    const preview = computeCommissionFromSnapshot(
      asMoneyNumber(row.requested_amount),
      asMoneyNumber(row.commission_rate),
    );
    setDetail({
      payout: row,
      snapshot: {
        commission_amount: preview.commission_amount.toFixed(2),
        net_amount: preview.net_amount.toFixed(2),
      },
    });
    try {
      const full = await getOrganizerPayoutRequest(row.id);
      setDetail({
        payout: full.payout,
        snapshot: full.snapshot_amounts,
      });
    } catch (err) {
      if (isOrganizerEventAccessError(err)) {
        onDenied?.();
        return;
      }
      toast.error(getApiErrorMessage(err, "Couldn't load payout request"));
    } finally {
      setDetailLoading(false);
    }
  };

  const requestedNum = Number(amount);
  const canRequest =
    Number.isFinite(requestedNum) && requestedNum >= 0.01 && requestedNum <= available + 0.001;

  const handleConfirmRequest = async () => {
    if (!canRequest) return;
    setSubmitting(true);
    try {
      const created = await createOrganizerEventPayoutRequest(eventId, requestedNum);
      toast.success(
        `Payout requested · ${asMoneyNumber(created.commission_rate)}% commission snapshotted`,
      );
      setConfirmOpen(false);
      setAmount("");
      await load();
      void openDetail(created);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Couldn't create payout request"));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && !finance) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
      </div>
    );
  }

  const cards = finance
    ? [
        {
          label: "Collected",
          value: formatMoney(finance.total_collected, currency),
          icon: CircleDollarSign,
          hint: "Completed payments (refunded payments are excluded from this total)",
        },
        {
          label: "Reserved / paid out",
          value: formatMoney(finance.total_reserved, currency),
          icon: Lock,
          hint: `Includes requested, approved, and paid. Settled paid-out: ${formatMoney(finance.total_paid_out, currency)}`,
        },
        {
          label: "Available payout",
          value: formatMoney(finance.outstanding_balance, currency),
          icon: Wallet,
          hint: "Collected minus reserved/paid payout amounts",
        },
      ]
    : [];

  return (
    <div className="space-y-6">
      {!compact && (
        <div>
          <h3 className="font-display font-semibold text-lg">
            {eventTitle ? `Finance · ${eventTitle}` : "Event finance"}
          </h3>
          <p className="text-sm text-muted-foreground">
            Per-event balances from Laravel. Commission is set by the platform and snapshotted when
            you request a payout.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {cards.map((c) => (
          <div key={c.label} className="bg-card rounded-xl p-5 border border-border/40">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">{c.label}</span>
              <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">
                <c.icon className="w-4 h-4 text-muted-foreground" />
              </div>
            </div>
            <p className="text-2xl font-display font-bold tabular-nums">{c.value}</p>
            <p className="text-[11px] text-muted-foreground mt-2 leading-snug">{c.hint}</p>
          </div>
        ))}
      </div>

      <p className="text-xs text-muted-foreground">
        After a payout is recorded as paid, related refunds may be blocked by the platform
        (<code className="mx-1 text-[10px]">refund_blocked_payout_recorded</code>
        ). Automatic clawback is not promised.
      </p>

      <div className="bg-card rounded-xl p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <h4 className="font-display font-semibold flex items-center gap-2">
              <Banknote className="w-4 h-4 text-muted-foreground" />
              Request payout
            </h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              Available now:{" "}
              <span className="font-medium text-foreground">
                {formatMoney(available, currency)}
              </span>
              . Payouts are per event — there is no organizer-wide batch request.
            </p>
          </div>
        </div>

        {available <= 0 ? (
          <p className="text-sm text-muted-foreground py-2">
            No available balance for this event. New requests open when collected funds exceed
            reserved and paid payouts.
          </p>
        ) : (
          <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
            <div className="space-y-1.5 flex-1 sm:max-w-xs">
              <Label className="text-xs">Amount ({currency})</Label>
              <Input
                type="number"
                min={0.01}
                step="0.01"
                max={available}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="rounded-full"
                placeholder={String(available)}
              />
            </div>
            <Button
              className="rounded-full"
              disabled={!canRequest}
              onClick={() => setConfirmOpen(true)}
            >
              Continue
            </Button>
            <Button
              variant="outline"
              className="rounded-full"
              onClick={() => setAmount(String(available))}
            >
              Use full available
            </Button>
          </div>
        )}
      </div>

      <div className="space-y-3">
        <h4 className="font-display font-semibold text-sm">Payout requests</h4>
        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
          </div>
        ) : items.length === 0 ? (
          <div className="bg-card rounded-xl p-8 text-center text-sm text-muted-foreground">
            No payout requests for this event yet.
          </div>
        ) : (
          <>
            <div className="bg-card rounded-xl overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
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
                      Requested
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((row) => {
                    const status = payoutStatus(row.status);
                    return (
                      <TableRow
                        key={row.id}
                        className="cursor-pointer hover:bg-muted/50 border-0"
                        onClick={() => void openDetail(row)}
                      >
                        <TableCell className="font-medium tabular-nums">
                          {formatMoney(asMoneyNumber(row.requested_amount), currency)}
                        </TableCell>
                        <TableCell>
                          <Badge className={cn("capitalize text-xs", STATUS_STYLE[status])}>
                            {status.replace(/_/g, " ")}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground hidden sm:table-cell">
                          {asMoneyNumber(row.commission_rate)}% snapshot
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground hidden md:table-cell">
                          {format(new Date(row.created_at), "MMM d, yyyy")}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            {lastPage > 1 && (
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  Page {page} of {lastPage} · {total} total
                </p>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7 rounded-full"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7 rounded-full"
                    disabled={page >= lastPage}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm payout request?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>
                  Request{" "}
                  <span className="font-medium text-foreground">
                    {formatMoney(requestedNum || 0, currency)}
                  </span>{" "}
                  from this event. Available: {formatMoney(available, currency)}.
                </p>
                <p>
                  Platform commission is applied at the current rate and stored on this request. Net
                  to you uses that snapshot — not a later rate change. Admins approve and pay
                  outside this app.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full" disabled={submitting}>
              Back
            </AlertDialogCancel>
            <AlertDialogAction
              className="rounded-full"
              disabled={submitting}
              onClick={(e) => {
                e.preventDefault();
                void handleConfirmRequest();
              }}
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Submit request"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={!!detail || detailLoading}
        onOpenChange={(o) => {
          if (!o) setDetail(null);
        }}
      >
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-display">Payout request</DialogTitle>
          </DialogHeader>
          {detailLoading && !detail ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
          ) : detail ? (
            <PayoutDetailBody
              payout={detail.payout}
              snapshot={detail.snapshot}
              currency={currency}
            />
          ) : null}
          <DialogFooter>
            <Button variant="outline" className="rounded-full" onClick={() => setDetail(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PayoutDetailBody({
  payout,
  snapshot,
  currency,
}: {
  payout: OrganizerPayoutRequest;
  snapshot: OrganizerPayoutSnapshotAmounts;
  currency: string;
}) {
  const status = payoutStatus(payout.status);
  const storedCommission = payout.commission_amount != null;
  const commission = storedCommission
    ? asMoneyNumber(payout.commission_amount)
    : asMoneyNumber(snapshot.commission_amount);
  const net = storedCommission
    ? asMoneyNumber(payout.net_amount)
    : asMoneyNumber(snapshot.net_amount);

  return (
    <div className="space-y-4 text-sm">
      <div className="flex items-center justify-between gap-2">
        <span className="text-muted-foreground">Status</span>
        <Badge className={cn("capitalize text-xs", STATUS_STYLE[status])}>
          {status.replace(/_/g, " ")}
        </Badge>
      </div>
      <div className="flex justify-between gap-2">
        <span className="text-muted-foreground">Requested</span>
        <span className="font-medium tabular-nums">
          {formatMoney(asMoneyNumber(payout.requested_amount), currency)}
        </span>
      </div>
      <div className="rounded-xl bg-muted/40 p-3 space-y-1.5">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Commission (snapshot)
        </p>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Rate</span>
          <span>{asMoneyNumber(payout.commission_rate)}%</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Commission</span>
          <span className="tabular-nums">{formatMoney(commission, currency)}</span>
        </div>
        <div className="flex justify-between font-medium">
          <span>Net</span>
          <span className="tabular-nums">{formatMoney(net, currency)}</span>
        </div>
        {!storedCommission && (
          <p className="text-[11px] text-muted-foreground pt-1">
            Amounts computed from the snapshotted rate. Stored commission/net appear after admin
            approval.
          </p>
        )}
      </div>
      {payout.admin_notes ? (
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Admin notes
          </p>
          <p className="text-sm whitespace-pre-wrap rounded-xl bg-muted/40 p-3">{payout.admin_notes}</p>
        </div>
      ) : null}
      <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
        <div>
          <p>Requested</p>
          <p className="text-foreground">
            {format(new Date(payout.created_at), "MMM d, yyyy h:mm a")}
          </p>
        </div>
        {payout.paid_at && (
          <div>
            <p>Paid</p>
            <p className="text-foreground">
              {format(new Date(payout.paid_at), "MMM d, yyyy h:mm a")}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
