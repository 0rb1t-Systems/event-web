import { useEffect, useRef, useState } from "react";
import { Loader2, Phone } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getApiErrorMessage } from "@/lib/apiError";
import { env } from "@/lib/env";
import {
  isFreePackage,
  packagePriceNumber,
  subscribeOrganizerPackage,
  type OrganizerPackage,
} from "@/services/organizerPackages";
import axios from "axios";

function formatMoney(amount: string | number, currency = env.waafiCurrency) {
  const n = packagePriceNumber(amount);
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(n);
  } catch {
    return `${currency} ${amount}`;
  }
}

type Props = {
  package: OrganizerPackage | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onActivated: () => void;
};

export default function PackageSubscribeDialog({
  package: pkg,
  open,
  onOpenChange,
  onActivated,
}: Props) {
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [inlineError, setInlineError] = useState<string | null>(null);
  const timerRef = useRef<number | null>(null);

  const free = pkg ? isFreePackage(pkg) : true;
  const action = pkg?.action === "upgrade" ? "upgrade" : "subscribe";

  useEffect(() => {
    if (!open) {
      setPhone("");
      setSubmitting(false);
      setElapsed(0);
      setInlineError(null);
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }, [open]);

  useEffect(() => {
    if (!submitting) {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }
    setElapsed(0);
    timerRef.current = window.setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [submitting]);

  const handleConfirm = async () => {
    if (!pkg || submitting) return;
    if (!free && !phone.trim()) {
      setInlineError("Enter the EVC Plus phone number linked to your wallet.");
      return;
    }

    setInlineError(null);
    setSubmitting(true);
    try {
      const result = await subscribeOrganizerPackage({
        package_id: pkg.id,
        payer_phone: free ? undefined : phone.trim(),
      });

      if (result.outcome === "activated") {
        toast.success(result.message || "Subscription activated.");
        onOpenChange(false);
        onActivated();
        return;
      }

      setInlineError(result.message || "Payment failed.");
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 422) {
        const data = err.response.data as {
          message?: string;
          data?: { outcome?: string; message?: string };
        };
        setInlineError(
          data.data?.message || data.message || getApiErrorMessage(err, "Payment failed."),
        );
      } else {
        setInlineError(getApiErrorMessage(err, "Couldn't complete subscription."));
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (submitting) return;
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="font-display">
            {action === "upgrade" ? "Upgrade plan" : "Activate plan"}
          </DialogTitle>
          <DialogDescription>
            {pkg
              ? `${pkg.name} · ${formatMoney(pkg.price)}${
                  pkg.duration_label ? ` · ${pkg.duration_label}` : " · Non-expiring"
                }`
              : "Choose a package"}
          </DialogDescription>
        </DialogHeader>

        {pkg && (
          <div className="space-y-4 text-sm">
            {pkg.description && (
              <p className="text-muted-foreground">{pkg.description}</p>
            )}
            <ul className="space-y-1 text-muted-foreground">
              <li>
                Event quota:{" "}
                {pkg.event_quota == null
                  ? "Unlimited"
                  : pkg.event_quota === 0
                    ? "0 (cannot create events)"
                    : `${pkg.event_quota}`}
              </li>
              {action === "upgrade" && (
                <li>
                  Upgrade starts immediately after payment. No proration or credit for unused time
                  on your current plan — you pay the full new package price.
                </li>
              )}
              {!free && (
                <li>You will approve the charge on your phone. Keep this dialog open.</li>
              )}
            </ul>

            {!free && (
              <div className="space-y-1.5">
                <Label htmlFor="pkg-payer-phone">EVC Plus phone number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="pkg-payer-phone"
                    className="rounded-full pl-9"
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder="0612345678 or 252…"
                    value={phone}
                    disabled={submitting}
                    onChange={(e) => setPhone(e.target.value)}
                    aria-invalid={Boolean(inlineError)}
                    aria-describedby={inlineError ? "pkg-subscribe-error" : undefined}
                  />
                </div>
              </div>
            )}

            {submitting && (
              <div className="flex items-start gap-3 rounded-xl bg-muted/60 p-3">
                <Loader2 className="w-4 h-4 mt-0.5 animate-spin shrink-0" />
                <div>
                  <p className="font-medium text-sm">
                    {free ? "Activating plan…" : "Waiting for phone approval…"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {free
                      ? "This usually finishes instantly."
                      : `Do not close this window (${elapsed}s). Approval can take up to a few minutes.`}
                  </p>
                </div>
              </div>
            )}

            {inlineError && (
              <p id="pkg-subscribe-error" className="text-sm text-destructive" role="alert">
                {inlineError}
              </p>
            )}
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            className="rounded-full"
            disabled={submitting}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="rounded-full"
            disabled={submitting || !pkg}
            onClick={handleConfirm}
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Working…
              </>
            ) : free ? (
              action === "upgrade" ? "Upgrade now" : "Activate free plan"
            ) : (
              `Pay ${pkg ? formatMoney(pkg.price) : ""}`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
