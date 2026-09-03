/**
 * Shared EVC Plus / WaafiPay payment UI.
 *
 * Used by Register checkout and RegistrationDetail resume payment.
 * Polls participation while charging so approval on the phone still completes
 * checkout even if the long-running charge HTTP response is delayed or lost.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Loader2, Phone, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GlassCard } from "@/components/register/AuroraBackdrop";
import {
  chargeParticipation,
  getParticipation,
  type ApiParticipation,
} from "@/services/participationService";
import { getApiErrorMessage, getChargeFailureMessage } from "@/lib/apiError";

export type ParticipantWaafiPaymentProps = {
  participationId: number;
  eventName: string;
  ticketName?: string | null;
  amount: string;
  currency: string;
  brandColor?: string;
  isDark?: boolean;
  embedded?: boolean;
  onSuccess: (participation: ApiParticipation) => void;
  onFailure?: (reason: string) => void;
  onCancel?: () => void;
  onCheckStatus?: () => void;
};

type PanelState = "idle" | "charging" | "failed";

const DEFAULT_BRAND = "#7C3AED";
const POLL_MS = 4000;

function isParticipationConfirmed(p: ApiParticipation): boolean {
  return p.payment_status === "paid" || p.payment_status === "not_required";
}

export function ParticipantWaafiPayment({
  participationId,
  eventName,
  ticketName,
  amount,
  currency,
  brandColor = DEFAULT_BRAND,
  isDark,
  embedded,
  onSuccess,
  onFailure,
  onCancel,
  onCheckStatus,
}: ParticipantWaafiPaymentProps) {
  const [phone, setPhone] = useState("");
  const [panelState, setPanelState] = useState<PanelState>("idle");
  const [failureMessage, setFailureMessage] = useState("");
  const [statusHint, setStatusHint] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const succeededRef = useRef(false);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const formattedAmount = (() => {
    try {
      return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency,
        maximumFractionDigits: 0,
      }).format(Number(amount));
    } catch {
      return `${currency} ${amount}`;
    }
  })();

  const completeSuccess = useCallback(
    async (participation?: ApiParticipation) => {
      if (succeededRef.current) return;
      succeededRef.current = true;
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (participation && isParticipationConfirmed(participation)) {
        onSuccess(participation);
        return;
      }
      try {
        const updated = await getParticipation(participationId);
        onSuccess(updated);
      } catch {
        onSuccess({ id: participationId } as ApiParticipation);
      }
    },
    [onSuccess, participationId],
  );

  const pollParticipation = useCallback(async (): Promise<boolean> => {
    if (succeededRef.current) return true;
    try {
      const updated = await getParticipation(participationId);
      if (isParticipationConfirmed(updated)) {
        await completeSuccess(updated);
        return true;
      }
    } catch {
      /* ignore transient poll errors */
    }
    return false;
  }, [completeSuccess, participationId]);

  useEffect(() => {
    if (panelState !== "charging") return;

    const pollId = window.setInterval(() => {
      void pollParticipation();
    }, POLL_MS);

    return () => window.clearInterval(pollId);
  }, [panelState, pollParticipation]);

  const fail = (reason: string) => {
    if (succeededRef.current) return;
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setElapsed(0);
    setFailureMessage(reason);
    setPanelState("failed");
    onFailure?.(reason);
  };

  const handleCheckStatus = async () => {
    setStatusHint("");
    onCheckStatus?.();
    const ok = await pollParticipation();
    if (!ok && !succeededRef.current) {
      setStatusHint(
        "Payment is still pending. If you already approved on your phone, wait a few seconds and check again.",
      );
    }
  };

  const handleCharge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim() || panelState === "charging") return;

    succeededRef.current = false;
    setStatusHint("");
    setPanelState("charging");
    setElapsed(0);
    timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);

    try {
      const payment = await chargeParticipation({
        participation_id: participationId,
        payer_phone: phone.trim(),
      });
      if (succeededRef.current) return;

      if (payment.status === "completed") {
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        const nested = payment.participation;
        if (nested && isParticipationConfirmed(nested)) {
          await completeSuccess(nested);
        } else {
          await completeSuccess();
        }
        return;
      }

      if (payment.status === "pending") {
        const ok = await pollParticipation();
        if (!ok && !succeededRef.current) {
          setStatusHint(
            "Waafi is still processing. If you approved on your phone, we'll detect it shortly — or tap Check status.",
          );
        }
        return;
      }

      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      fail(getChargeFailureMessage(payment));
    } catch (err: unknown) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (succeededRef.current) return;

      const axiosErr = err as {
        response?: { status?: number; data?: unknown };
        code?: string;
        message?: string;
      };
      const httpStatus = axiosErr?.response?.status;
      const errCode = axiosErr?.code;

      if (httpStatus === 400) {
        const msg = getApiErrorMessage(err, "");
        if (msg.toLowerCase().includes("already paid")) {
          await completeSuccess();
          return;
        }

        if (msg.toLowerCase().includes("already pending")) {
          const ok = await pollParticipation();
          if (ok) return;
          fail(
            "A payment request is already in progress for this registration. " +
              "Please wait for Waafi to respond (up to 3 minutes), then use Check status.",
          );
          return;
        }

        fail(msg || "Payment failed. Please try again.");
        return;
      }

      const timedOut =
        errCode === "ECONNABORTED" ||
        errCode === "ERR_NETWORK" ||
        errCode === "ERR_CANCELED" ||
        axiosErr?.message?.toLowerCase().includes("timeout");

      if (timedOut) {
        const ok = await pollParticipation();
        if (ok) return;
        fail(
          "The payment request timed out or the network was lost. " +
            "If you already paid on your phone, tap Check status — do not pay again until you confirm.",
        );
        return;
      }

      const ok = await pollParticipation();
      if (ok) return;
      fail(getApiErrorMessage(err, "Payment was not completed. Please try again."));
    }
  };

  const handleRetry = () => {
    setFailureMessage("");
    setStatusHint("");
    setElapsed(0);
    setPanelState("idle");
  };

  const body = (
    <div className={embedded ? "" : "p-8"}>
      <div className="mb-5 flex items-center gap-3">
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
          style={{ background: brandColor }}
        >
          <Phone className="h-5 w-5 text-white" />
        </div>
        <div className="min-w-0">
          <h2 className="font-display text-lg font-bold leading-tight tracking-[-0.02em]">
            Pay with EVC Plus
          </h2>
          <p className="truncate text-xs text-muted-foreground">{eventName}</p>
          {ticketName ? (
            <p className="truncate text-xs text-muted-foreground">{ticketName}</p>
          ) : null}
        </div>
      </div>

      <div className="mb-5 rounded-2xl border border-border/50 bg-muted/30 px-4 py-2.5 text-sm leading-relaxed text-muted-foreground/80">
        Your registration is reserved but payment is not complete.
      </div>

      <div
        className="mb-6 rounded-2xl px-4 py-3"
        style={{ background: `${brandColor}12` }}
      >
        <p className="mb-0.5 text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
          Total
        </p>
        <p
          className="font-display text-2xl font-bold tabular-nums tracking-[-0.02em]"
          style={{ color: brandColor }}
        >
          {formattedAmount}
        </p>
      </div>

      <AnimatePresence mode="wait">
        {panelState === "charging" && (
          <motion.div
            key="charging"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-3 py-5 text-center"
          >
            <Loader2 className="mx-auto h-8 w-8 animate-spin" style={{ color: brandColor }} />
            <div className="space-y-1">
              <p className="text-sm font-semibold">Waiting for approval on your phone.</p>
              <p className="text-xs text-muted-foreground">
                Check your EVC prompt and enter your PIN.
              </p>
              <p className="text-xs text-muted-foreground">This can take up to 3 minutes.</p>
              {elapsed > 0 ? (
                <p className="mt-2 text-xs tabular-nums text-muted-foreground">{elapsed}s elapsed…</p>
              ) : null}
            </div>
            {statusHint ? (
              <p className="text-xs leading-relaxed text-muted-foreground">{statusHint}</p>
            ) : null}
            <p className="text-xs text-muted-foreground">Do not close this page.</p>
            <Button
              type="button"
              variant="outline"
              className="mt-2 h-11 w-full gap-1.5 rounded-full text-sm"
              onClick={() => void handleCheckStatus()}
            >
              <RefreshCw className="h-4 w-4" /> Check status
            </Button>
          </motion.div>
        )}

        {panelState === "failed" && (
          <motion.div
            key="failed"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            <div className="space-y-2 rounded-2xl border border-destructive/20 bg-destructive/8 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-destructive">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                Payment was not completed
              </div>
              <p className="pl-6 text-sm leading-relaxed text-destructive/90">{failureMessage}</p>
            </div>

            <div className="flex flex-col gap-2">
              <Button
                type="button"
                onClick={handleRetry}
                className="h-12 w-full rounded-full border-0 text-sm font-semibold text-white"
                style={{ background: brandColor }}
              >
                Try again
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-11 w-full gap-1.5 rounded-full text-sm"
                onClick={() => void handleCheckStatus()}
              >
                <RefreshCw className="h-4 w-4" /> Check status
              </Button>
            </div>
          </motion.div>
        )}

        {panelState === "idle" && (
          <motion.form
            key="form"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onSubmit={handleCharge}
            className="space-y-4"
          >
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-foreground/80">
                EVC Plus phone number
              </Label>
              <Input
                type="tel"
                placeholder="e.g. 0612345678 or +252612345678"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                className="h-12 rounded-2xl border-0 bg-muted/40 px-4 text-sm placeholder:text-muted-foreground/60 focus-visible:ring-2 focus-visible:ring-offset-0"
                style={{ ["--tw-ring-color" as string]: brandColor }}
              />
              <p className="text-xs text-muted-foreground">
                Enter the phone number linked to your Hormuud EVC wallet.
                You&apos;ll receive a PIN prompt on your phone.
              </p>
            </div>

            <Button
              type="submit"
              disabled={!phone.trim()}
              className="h-14 w-full rounded-full border-0 font-display text-base font-semibold tracking-[-0.01em] text-white transition-transform hover:scale-[1.01] active:scale-[0.99] disabled:scale-100 disabled:opacity-50"
              style={{ background: brandColor }}
            >
              Complete payment · {formattedAmount}
            </Button>

            {onCancel ? (
              <button
                type="button"
                onClick={onCancel}
                className="w-full py-1 text-center text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                Cancel
              </button>
            ) : null}
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );

  return (
    <motion.div
      key="waafi"
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className={embedded ? "relative z-10 w-full" : "relative z-10 mx-auto w-full max-w-lg"}
    >
      {embedded ? body : <GlassCard isDark={isDark} brandColor={brandColor}>{body}</GlassCard>}
    </motion.div>
  );
}
