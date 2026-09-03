import { useCallback, useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import {
  IconChevronLeft,
  IconChevronRight,
  IconDownload,
  IconSearch,
} from "@/components/organizer-console/orgIcons";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { cn } from "@/lib/utils";
import { orgParticipationTone, orgPaymentTone } from "@/components/organizer-console/orgTheme";
import {
  cancelOrganizerParticipation,
  getOrganizerParticipation,
  listOrganizerEventParticipations,
  participationStatus,
  participationTicket,
  type CapacitySnapshot,
  type OrganizerParticipation,
} from "@/services/organizerParticipations";

const STATUS_FILTERS = [
  { value: "all", label: "All statuses" },
  { value: "joined", label: "Joined" },
  { value: "paid", label: "Paid" },
  { value: "checked_in", label: "Checked in" },
  { value: "cancelled", label: "Cancelled" },
];

type Props = {
  eventId: number;
  onDenied?: () => void;
  /** When true, hide the page-level title (studio tab already has context). */
  compact?: boolean;
};

function escapeCsv(val: string): string {
  const str = String(val ?? "");
  const safe = str.replace(/^([=+\-@])/, "'$1");
  if (safe.includes(",") || safe.includes('"') || safe.includes("\n")) {
    return `"${safe.replace(/"/g, '""')}"`;
  }
  return safe;
}

function labelStatus(s: string): string {
  return s.replace(/_/g, " ");
}

export default function EventRegistrationsPanel({ eventId, onDenied, compact }: Props) {
  const [items, setItems] = useState<OrganizerParticipation[]>([]);
  const [capacity, setCapacity] = useState<CapacitySnapshot | null>(null);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [perPage] = useState(15);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<OrganizerParticipation | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<OrganizerParticipation | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [actionBusy, setActionBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listOrganizerEventParticipations(eventId, {
        page,
        per_page: perPage,
        status: statusFilter === "all" ? undefined : statusFilter,
      });
      setItems(data.items);
      setCapacity(data.capacity);
      setLastPage(data.pagination.last_page);
      setTotal(data.pagination.total);
    } catch (err) {
      if (isOrganizerEventAccessError(err)) {
        onDenied?.();
        return;
      }
      toast.error(getApiErrorMessage(err, "Couldn't load registrations"));
    } finally {
      setLoading(false);
    }
  }, [eventId, page, perPage, statusFilter, onDenied]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter, eventId]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((row) => {
      const name = row.user?.name?.toLowerCase() ?? "";
      const email = row.user?.email?.toLowerCase() ?? "";
      const ticket = participationTicket(row)?.name?.toLowerCase() ?? "";
      return name.includes(q) || email.includes(q) || ticket.includes(q);
    });
  }, [items, search]);

  const openDetail = async (row: OrganizerParticipation) => {
    setDetail(row);
    setDetailLoading(true);
    try {
      const full = await getOrganizerParticipation(row.id);
      setDetail(full);
    } catch (err) {
      if (isOrganizerEventAccessError(err)) {
        onDenied?.();
        return;
      }
      toast.error(getApiErrorMessage(err, "Couldn't load registration"));
    } finally {
      setDetailLoading(false);
    }
  };

  const confirmCancel = async () => {
    if (!cancelTarget) return;
    setActionBusy(true);
    try {
      await cancelOrganizerParticipation(cancelTarget.id, cancelReason);
      toast.success("Registration cancelled");
      setCancelTarget(null);
      setCancelReason("");
      setDetail(null);
      await load();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Couldn't cancel"));
    } finally {
      setActionBusy(false);
    }
  };

  const exportCsv = () => {
    if (!visible.length) return;
    const headers = [
      "Name",
      "Email",
      "Ticket",
      "Status",
      "Payment status",
      "Registered at",
    ];
    const rows = visible.map((row) => [
      row.user?.name ?? "",
      row.user?.email ?? "",
      participationTicket(row)?.name ?? "",
      participationStatus(row.status),
      participationStatus(row.payment_status),
      row.created_at,
    ]);
    const csv = [headers, ...rows].map((r) => r.map(escapeCsv).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `registrations-event-${eventId}-page-${page}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const detailStatus = detail ? participationStatus(detail.status) : "";
  const detailPayment = detail ? participationStatus(detail.payment_status) : "";
  const detailTicket = detail ? participationTicket(detail) : null;

  return (
    <div className="space-y-4">
      {!compact && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-display font-semibold text-lg">Registrations</h3>
          </div>
        </div>
      )}

      {capacity && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Registered", value: capacity.registered_count },
            {
              label: "Capacity",
              value: capacity.capacity == null ? "Unlimited" : capacity.capacity,
            },
            {
              label: "Seats left",
              value: capacity.seats_remaining == null ? "—" : capacity.seats_remaining,
            },
          ].map((s) => (
            <div key={s.label} className="bg-card rounded-xl p-4 border border-border/40">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className="text-xl font-display font-bold mt-0.5">{s.value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
        <div className="relative flex-1 sm:max-w-xs">
          <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Search this page…"
            className="pl-9 h-9 text-sm rounded-full"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(v) => {
            setStatusFilter(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="h-9 w-full sm:w-44 rounded-full text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_FILTERS.map((f) => (
              <SelectItem key={f.value} value={f.value}>
                {f.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="sm"
          className="h-9 rounded-full text-xs"
          onClick={exportCsv}
          disabled={!visible.length}
        >
          <IconDownload className="w-3.5 h-3.5 mr-1.5" />
          Export this page
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Status filter uses the API. Search runs on the current page only. CSV exports the current
        page ({visible.length} row{visible.length === 1 ? "" : "s"}), not all {total} results.
      </p>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
        </div>
      ) : visible.length === 0 ? (
        <div className="bg-card rounded-xl p-10 text-center text-sm text-muted-foreground">
          {search || statusFilter !== "all"
            ? "No matching registrations on this page."
            : "No registrations yet."}
        </div>
      ) : (
        <>
          <ul className="sm:hidden flex flex-col gap-2">
            {visible.map((row) => {
              const status = participationStatus(row.status);
              const ticket = participationTicket(row);
              return (
                <li key={row.id}>
                  <button
                    type="button"
                    className="w-full min-w-0 rounded-xl bg-card p-4 text-left"
                    onClick={() => void openDetail(row)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium truncate">{row.user?.name ?? "—"}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          {row.user?.email ?? ticket?.name ?? "—"}
                        </p>
                      </div>
                      <StatusBadge
                        label={labelStatus(status)}
                        orgTone={orgParticipationTone(status)}
                        size="sm"
                        className="shrink-0"
                      />
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="hidden sm:block bg-card rounded-xl min-w-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">
                    Participant
                  </TableHead>
                  <TableHead className="text-xs uppercase tracking-wider text-muted-foreground hidden sm:table-cell">
                    Email
                  </TableHead>
                  <TableHead className="text-xs uppercase tracking-wider text-muted-foreground hidden md:table-cell">
                    Ticket
                  </TableHead>
                  <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">
                    Status
                  </TableHead>
                  <TableHead className="text-xs uppercase tracking-wider text-muted-foreground hidden lg:table-cell">
                    Payment
                  </TableHead>
                  <TableHead className="text-xs uppercase tracking-wider text-muted-foreground hidden lg:table-cell">
                    Registered
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.map((row) => {
                  const status = participationStatus(row.status);
                  const payment = participationStatus(row.payment_status);
                  const ticket = participationTicket(row);
                  return (
                    <TableRow
                      key={row.id}
                      className="cursor-pointer hover:bg-muted/50 border-0"
                      onClick={() => void openDetail(row)}
                    >
                      <TableCell className="font-medium">{row.user?.name ?? "—"}</TableCell>
                      <TableCell className="text-muted-foreground hidden sm:table-cell">
                        {row.user?.email ?? "—"}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">{ticket?.name ?? "—"}</TableCell>
                      <TableCell>
                        <StatusBadge
                          label={labelStatus(status)}
                          orgTone={orgParticipationTone(status)}
                          size="sm"
                        />
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <StatusBadge
                          label={labelStatus(payment)}
                          orgTone={orgPaymentTone(payment)}
                          size="sm"
                        />
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm hidden lg:table-cell">
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
                  <IconChevronLeft className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7 rounded-full"
                  disabled={page >= lastPage}
                  onClick={() => setPage((p) => p + 1)}
                >
                  <IconChevronRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="sm:max-w-lg rounded-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">Registration details</DialogTitle>
          </DialogHeader>
          {detailLoading && !detail ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
          ) : detail ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm font-medium">{detail.user?.name ?? "—"}</p>
                <p className="text-sm text-muted-foreground">{detail.user?.email ?? "—"}</p>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Ticket</p>
                  <p>{detailTicket?.name ?? "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Registered</p>
                  <p>{format(new Date(detail.created_at), "MMM d, yyyy h:mm a")}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  <StatusBadge
                    label={labelStatus(detailStatus)}
                    orgTone={orgParticipationTone(detailStatus)}
                    size="sm"
                    className="mt-0.5"
                  />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Payment</p>
                  <StatusBadge
                    label={labelStatus(detailPayment)}
                    orgTone={orgPaymentTone(detailPayment)}
                    size="sm"
                    className="mt-0.5"
                  />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Check-in</p>
                  <p>{detailStatus === "checked_in" ? "Checked in" : "Not checked in"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">QR token</p>
                  <p className="truncate text-xs font-mono">{detail.qr_token ? "Issued" : "None"}</p>
                </div>
              </div>

              {(detail.final_amount != null || detail.original_amount != null) && (
                <div className="rounded-xl bg-muted/40 p-3 space-y-1.5 text-sm">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Payment summary
                  </p>
                  {detail.original_amount != null && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Original</span>
                      <span>{detail.original_amount}</span>
                    </div>
                  )}
                  {detail.discount_amount != null && Number(detail.discount_amount) > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Discount</span>
                      <span>−{detail.discount_amount}</span>
                    </div>
                  )}
                  {detail.final_amount != null && (
                    <div className="flex justify-between font-medium">
                      <span>Final</span>
                      <span>{detail.final_amount}</span>
                    </div>
                  )}
                </div>
              )}

              <DialogFooter className="flex-col sm:flex-row gap-2 sm:justify-end">
                {detailStatus !== "cancelled" && (
                  <Button
                    size="sm"
                    variant="destructive"
                    className="rounded-full"
                    onClick={() => {
                      setCancelReason("");
                      setCancelTarget(detail);
                    }}
                  >
                    Cancel registration
                  </Button>
                )}
              </DialogFooter>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!cancelTarget}
        onOpenChange={(o) => {
          if (!o) {
            setCancelTarget(null);
            setCancelReason("");
          }
        }}
      >
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this registration?</AlertDialogTitle>
            <AlertDialogDescription>
              This cannot be undone from the organizer portal. Cancellation does not automatically
              issue a payment refund.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-1.5 py-1">
            <Label className="text-xs">Reason (optional)</Label>
            <Textarea
              rows={3}
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Internal note for why this registration was cancelled"
              className="rounded-2xl"
              maxLength={500}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full" disabled={actionBusy}>
              Keep registration
            </AlertDialogCancel>
            <AlertDialogAction
              className="rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={actionBusy}
              onClick={(e) => {
                e.preventDefault();
                void confirmCancel();
              }}
            >
              {actionBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Cancel registration"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
