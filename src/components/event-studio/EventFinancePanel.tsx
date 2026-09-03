import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import {
  IconBanknotes,
  IconChevronLeft,
  IconChevronRight,
  IconDollar,
  IconLock,
  IconWallet,
} from "@/components/organizer-console/orgIcons";
import { OrgButton } from "@/components/organizer-console/OrgButton";
import { OrgChip } from "@/components/organizer-console/OrgChip";
import { orgPayoutTone } from "@/components/organizer-console/orgTheme";
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
import { getApiErrorMessage, isOrganizerEventAccessError } from "@/lib/apiError";
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

const th = "text-left text-xs font-bold uppercase tracking-[1px] text-oc-faint pb-2";
const td = "py-3 text-sm text-oc-ink align-middle";

type Props = {
  eventId: number;
  eventTitle?: string;
  /** Hide outer title when studio tab already provides context. */
  compact?: boolean;
  /** Hide per-event request list when a parent page already shows history. */
  hideRequestList?: boolean;
  onDenied?: () => void;
};

export default function EventFinancePanel({
  eventId,
  eventTitle,
  compact,
  hideRequestList,
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
      toast.success(`Payout requested`);
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
        <Loader2 className="w-5 h-5 animate-spin text-oc-brand" />
      </div>
    );
  }

  const cards = finance
    ? [
        { label: "Collected", value: formatMoney(finance.total_collected, currency), icon: IconDollar },
        { label: "Reserved", value: formatMoney(finance.total_reserved, currency), icon: IconLock },
        { label: "Available", value: formatMoney(finance.outstanding_balance, currency), icon: IconWallet },
      ]
    : [];

  return (
    <div className="space-y-5">
      {!compact && eventTitle && (
        <h3 className="font-head font-semibold text-[17px] text-oc-ink">{eventTitle}</h3>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {cards.map((c) => (
          <div key={c.label} className="rounded-[12px] bg-oc-well p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-oc-muted">{c.label}</span>
              <div className="w-8 h-8 rounded-[10px] bg-oc-surface flex items-center justify-center">
                <c.icon className="w-4 h-4 text-oc-faint" />
              </div>
            </div>
            <p className="text-[22px] lg:text-[24px] font-head font-semibold tabular-nums text-oc-ink">{c.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-[12px] bg-oc-well p-4 sm:p-5 space-y-4">
        <h4 className="font-head font-semibold text-[15px] text-oc-ink flex items-center gap-2">
          <IconBanknotes className="w-4 h-4 text-oc-faint" />
          Request payout
          <span className="text-sm font-normal text-oc-muted">
            · {formatMoney(available, currency)} available
          </span>
        </h4>

        {available <= 0 ? (
          <p className="text-sm text-oc-muted py-2">No balance available.</p>
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
                className="rounded-[12px]"
                placeholder={String(available)}
              />
            </div>
            <OrgButton disabled={!canRequest} onClick={() => setConfirmOpen(true)}>
              Continue
            </OrgButton>
            <OrgButton variant="ghost" onClick={() => setAmount(String(available))}>
              Max
            </OrgButton>
          </div>
        )}
      </div>

      {!hideRequestList && (
        <div className="space-y-3">
          <h4 className="font-head font-semibold text-[15px] text-oc-ink">Requests</h4>
        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="w-5 h-5 animate-spin text-oc-brand" />
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-[12px] bg-oc-well p-8 text-center text-sm text-oc-muted">
            None yet.
          </div>
        ) : (
          <>
            <div className="h-scroll">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-oc-line">
                    <th className={th}>Amount</th>
                    <th className={th}>Status</th>
                    <th className={`${th} hidden sm:table-cell`}>Commission</th>
                    <th className={`${th} hidden md:table-cell`}>Requested</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((row) => {
                    const status = payoutStatus(row.status);
                    return (
                      <tr
                        key={row.id}
                        className="border-b border-oc-line/60 last:border-0 cursor-pointer hover:bg-oc-well"
                        onClick={() => void openDetail(row)}
                      >
                        <td className={`${td} font-data font-semibold tabular-nums`}>
                          {formatMoney(asMoneyNumber(row.requested_amount), currency)}
                        </td>
                        <td className={td}>
                          <OrgChip label={status.replace(/_/g, " ")} tone={orgPayoutTone(status)} size="sm" />
                        </td>
                        <td className={`${td} text-oc-muted hidden sm:table-cell`}>
                          {asMoneyNumber(row.commission_rate)}%
                        </td>
                        <td className={`${td} text-oc-muted hidden md:table-cell`}>
                          {format(new Date(row.created_at), "MMM d, yyyy")}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {lastPage > 1 && (
              <div className="flex items-center justify-between">
                <p className="text-xs text-oc-faint">
                  Page {page} of {lastPage} · {total} total
                </p>
                <div className="flex items-center gap-1">
                  <OrgButton
                    variant="ghost"
                    size="sm"
                    aria-label="Previous page"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    <IconChevronLeft />
                  </OrgButton>
                  <OrgButton
                    variant="ghost"
                    size="sm"
                    aria-label="Next page"
                    disabled={page >= lastPage}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    <IconChevronRight />
                  </OrgButton>
                </div>
              </div>
            )}
          </>
        )}
        </div>
      )}

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm payout request?</AlertDialogTitle>
            <AlertDialogDescription>
              Request {formatMoney(requestedNum || 0, currency)} from{" "}
              {formatMoney(available, currency)} available. Commission is snapshotted at submit.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-[12px]" disabled={submitting}>
              Back
            </AlertDialogCancel>
            <AlertDialogAction
              className="rounded-[12px]"
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
            <DialogTitle className="font-head">Payout request</DialogTitle>
          </DialogHeader>
          {detailLoading && !detail ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-oc-brand" />
            </div>
          ) : detail ? (
            <PayoutDetailBody
              payout={detail.payout}
              snapshot={detail.snapshot}
              currency={currency}
            />
          ) : null}
          <DialogFooter>
            <OrgButton variant="ghost" onClick={() => setDetail(null)}>
              Close
            </OrgButton>
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
        <span className="text-oc-muted">Status</span>
        <OrgChip label={status.replace(/_/g, " ")} tone={orgPayoutTone(status)} size="sm" />
      </div>
      <div className="flex justify-between gap-2">
        <span className="text-oc-muted">Requested</span>
        <span className="font-medium tabular-nums">
          {formatMoney(asMoneyNumber(payout.requested_amount), currency)}
        </span>
      </div>
      <div className="rounded-[12px] bg-oc-well p-3 space-y-1.5">
        <p className="text-xs font-bold tracking-[1px] text-oc-faint">Commission</p>
        <div className="flex justify-between">
          <span className="text-oc-muted">Rate</span>
          <span>{asMoneyNumber(payout.commission_rate)}%</span>
        </div>
        <div className="flex justify-between">
          <span className="text-oc-muted">Commission</span>
          <span className="tabular-nums">{formatMoney(commission, currency)}</span>
        </div>
        <div className="flex justify-between font-medium">
          <span>Net</span>
          <span className="tabular-nums">{formatMoney(net, currency)}</span>
        </div>
      </div>
      {payout.admin_notes ? (
        <div className="space-y-1">
          <p className="text-xs font-bold tracking-[1px] text-oc-faint">Admin notes</p>
          <p className="text-sm whitespace-pre-wrap rounded-[12px] bg-oc-well p-3">{payout.admin_notes}</p>
        </div>
      ) : null}
      <div className="grid grid-cols-2 gap-2 text-xs text-oc-faint">
        <div>
          <p>Requested</p>
          <p className="text-oc-ink">
            {format(new Date(payout.created_at), "MMM d, yyyy h:mm a")}
          </p>
        </div>
        {payout.paid_at && (
          <div>
            <p>Paid</p>
            <p className="text-oc-ink">
              {format(new Date(payout.paid_at), "MMM d, yyyy h:mm a")}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
