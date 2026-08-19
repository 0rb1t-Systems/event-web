/**
 * Shared EVC Plus / WaafiPay payment UI.
 *
 * Used by both:
 *   - Register.tsx  — inline in the cinematic event form slot (after participation creation)
 *   - RegistrationDetail.tsx — resume payment for stranded pending/failed participations
 *
 * Props:
 *   participationId  — numeric ID of the ALREADY CREATED participation
 *   eventName        — shown in the header
 *   ticketName       — shown in the header (optional)
 *   amount           — ticket price string (e.g. "25.00")
 *   currency         — ISO currency code (e.g. "USD")
 *   brandColor       — hex/hsl brand color (for styling)
 *   isDark           — dark glass card (optional)
 *   onSuccess        — called with refreshed ApiParticipation after confirmed payment
 *   onFailure        — called with human-readable reason string on definitive failure (optional;
 *                      the component already shows the error inline — caller can also toast)
 *   onCancel         — called when user explicitly cancels (no payment attempt in flight)
 *   onCheckStatus    — called when user clicks "Check status" (optional; parent can re-fetch)
 *
 * Internal states:
 *   idle     → phone input + Pay button
 *   charging → spinner + elapsed time + "do not close"
 *   failed   → error message visible on page + Try again + Check status
 *
 * The failure message is ALWAYS shown inline on the page, never only in a toast.
 * Callers may additionally surface a toast via onFailure if they wish.
 *
 * This component does NOT create participations or hold backend business rules.
 */

import { useEffect, useRef, useState } from "react";
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
  onSuccess: (participation: ApiParticipation) => void;
  /** Optional — component already shows the error inline. Caller may also toast. */
  onFailure?: (reason: string) => void;
  /** Called only when user clicks Cancel and NO charge is in flight. */
  onCancel?: () => void;
  /** Called when user clicks "Check status" — parent should re-fetch participation. */
  onCheckStatus?: () => void;
};

type PanelState = "idle" | "charging" | "failed";

const DEFAULT_BRAND = "#7C3AED";

export function ParticipantWaafiPayment({
  participationId,
  eventName,
  ticketName,
  amount,
  currency,
  brandColor = DEFAULT_BRAND,
  isDark,
  onSuccess,
  onFailure,
  onCancel,
  onCheckStatus,
}: ParticipantWaafiPaymentProps) {
  const [phone, setPhone] = useState("");
  const [panelState, setPanelState] = useState<PanelState>("idle");
  const [failureMessage, setFailureMessage] = useState<string>("");
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
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

  const fail = (reason: string) => {
    setFailureMessage(reason);
    setPanelState("failed");
    onFailure?.(reason);
  };

  const handleCharge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim() || panelState === "charging") return;

    setPanelState("charging");
    setElapsed(0);
    timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);

    try {
      const payment = await chargeParticipation({
        participation_id: participationId,
        payer_phone: phone.trim(),
      });
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }

      if (payment.status === "completed") {
        // Re-fetch so caller has fresh state (payment_status=paid, qr_token set)
        try {
          const updated = await getParticipation(participationId);
          onSuccess(updated);
        } catch {
          onSuccess(payment.participation ?? ({ id: participationId } as ApiParticipation));
        }
        return;
      }

      // HTTP 200 but payment.status = "failed" — extract the real provider message
      fail(getChargeFailureMessage(payment));

    } catch (err: any) {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }

      const httpStatus = err?.response?.status as number | undefined;
      const errCode: string | undefined = err?.code;

      // "already paid" race — treat as success
      if (httpStatus === 400) {
        const msg = getApiErrorMessage(err, "");
        if (msg.toLowerCase().includes("already paid")) {
          try {
            const updated = await getParticipation(participationId);
            onSuccess(updated);
          } catch {
            onSuccess({ id: participationId } as ApiParticipation);
          }
          return;
        }

        if (msg.toLowerCase().includes("already pending")) {
          fail(
            "A payment request is already in progress for this registration. " +
            "Please wait for Waafi to respond (up to 3 minutes), then use \u201CCheck status\u201D."
          );
          return;
        }

        // Other 400 — surface the backend message directly
        fail(msg || "Payment failed. Please try again.");
        return;
      }

      // Network timeout or connection lost — uncertain, don't say "failed"
      if (
        errCode === "ECONNABORTED" ||
        errCode === "ERR_NETWORK" ||
        errCode === "ERR_CANCELED" ||
        err?.message?.toLowerCase().includes("timeout")
      ) {
        fail(
          "The payment request timed out or the network was lost. " +
          "The result is uncertain \u2014 please use \u201CCheck status\u201D before retrying."
        );
        return;
      }

      // All other errors — use the central extractor which now prioritises data.message
      fail(getApiErrorMessage(err, "Payment was not completed. Please try again."));

    } finally {
      setElapsed(0);
    }
  };

  const handleRetry = () => {
    setFailureMessage("");
    setPanelState("idle");
  };

  return (
    <motion.div
      key="waafi"
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="w-full max-w-lg mx-auto relative z-10"
    >
      <GlassCard isDark={isDark} brandColor={brandColor}>
        <div className="p-8">
          {/* Header */}
          <div className="flex items-center gap-3 mb-5">
            <div
              className="w-11 h-11 rounded-full flex items-center justify-center shrink-0"
              style={{ background: `linear-gradient(135deg, ${brandColor}, hsl(265 90% 62%))` }}
            >
              <Phone className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <h2 className="font-display font-bold text-lg tracking-[-0.02em] leading-tight">
                Pay with EVC Plus
              </h2>
              <p className="text-muted-foreground text-xs truncate">{eventName}</p>
              {ticketName && (
                <p className="text-muted-foreground text-xs truncate">{ticketName}</p>
              )}
            </div>
          </div>

          {/* Context banner */}
          <div className="rounded-2xl px-4 py-2.5 mb-5 text-sm text-muted-foreground/80 border border-border/50 bg-muted/30 leading-relaxed">
            Your registration is reserved but payment is not complete.
          </div>

          {/* Amount */}
          <div
            className="rounded-2xl px-4 py-3 mb-6"
            style={{ background: `${brandColor}12` }}
          >
            <p className="text-[10px] uppercase tracking-[0.18em] font-bold text-muted-foreground mb-0.5">
              Total
            </p>
            <p
              className="text-2xl font-display font-bold tabular-nums tracking-[-0.02em]"
              style={{ color: brandColor }}
            >
              {formattedAmount}
            </p>
          </div>

          <AnimatePresence mode="wait">

            {/* ── Charging ── */}
            {panelState === "charging" && (
              <motion.div
                key="charging"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center py-5 space-y-3"
              >
                <Loader2
                  className="w-8 h-8 animate-spin mx-auto"
                  style={{ color: brandColor }}
                />
                <div className="space-y-1">
                  <p className="font-semibold text-sm">Waiting for approval on your phone.</p>
                  <p className="text-muted-foreground text-xs">
                    Check your EVC prompt and enter your PIN.
                  </p>
                  <p className="text-muted-foreground text-xs">This can take up to 3 minutes.</p>
                  {elapsed > 0 && (
                    <p className="text-muted-foreground text-xs tabular-nums mt-2">
                      {elapsed}s elapsed…
                    </p>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground">Do not close this page.</p>
              </motion.div>
            )}

            {/* ── Failed ── */}
            {panelState === "failed" && (
              <motion.div
                key="failed"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                {/* Visible failure block — stays on page until user retries */}
                <div className="rounded-2xl bg-destructive/8 border border-destructive/20 p-4 space-y-2">
                  <div className="flex items-center gap-2 text-destructive font-semibold text-sm">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    Payment was not completed
                  </div>
                  <p className="text-sm text-destructive/90 leading-relaxed pl-6">
                    {failureMessage}
                  </p>
                </div>

                <div className="flex flex-col gap-2">
                  <Button
                    type="button"
                    onClick={handleRetry}
                    className="w-full h-12 text-sm border-0 text-white rounded-full font-semibold"
                    style={{
                      background: `linear-gradient(135deg, ${brandColor}, hsl(265 90% 62%))`,
                      boxShadow: `0 12px 30px -8px ${brandColor}88`,
                    }}
                  >
                    Try again
                  </Button>
                  {onCheckStatus && (
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full h-11 rounded-full text-sm gap-1.5"
                      onClick={onCheckStatus}
                    >
                      <RefreshCw className="w-4 h-4" /> Check status
                    </Button>
                  )}
                </div>
              </motion.div>
            )}

            {/* ── Idle / phone form ── */}
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
                    className="h-12 rounded-2xl bg-muted/40 border-0 px-4 text-sm placeholder:text-muted-foreground/60 focus-visible:ring-2 focus-visible:ring-offset-0"
                    style={{ ["--tw-ring-color" as any]: brandColor }}
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Enter the phone number linked to your Hormuud EVC wallet.
                    You'll receive a PIN prompt on your phone.
                  </p>
                </div>

                <Button
                  type="submit"
                  disabled={!phone.trim()}
                  className="w-full h-14 text-base border-0 text-white rounded-full font-display font-semibold tracking-[-0.01em] transition-transform hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:scale-100"
                  style={{
                    background: `linear-gradient(135deg, ${brandColor}, hsl(265 90% 62%))`,
                    boxShadow: `0 18px 40px -12px ${brandColor}99, 0 0 0 1px rgba(255,255,255,0.08) inset`,
                  }}
                >
                  Complete payment · {formattedAmount}
                </Button>

                {onCancel && (
                  <button
                    type="button"
                    onClick={onCancel}
                    className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
                  >
                    Cancel
                  </button>
                )}
              </motion.form>
            )}

          </AnimatePresence>
        </div>
      </GlassCard>
    </motion.div>
  );
}
