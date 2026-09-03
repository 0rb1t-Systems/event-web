import { Star, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { formatMoneyString, formatTicketPrice } from "@/lib/ticketMoney";
import type { TicketTier } from "@/components/event-detail/TicketTiersManager";
import type { DiscountQuote } from "@/services/participantDiscounts";
import { PULSE } from "@/components/event-public/pulseTheme";

type Props = {
  tickets: TicketTier[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  discountCode: string;
  onDiscountCodeChange: (v: string) => void;
  discountQuote: DiscountQuote | null;
  discountApplying: boolean;
  discountError: string | null;
  onApplyDiscount: () => void;
  onClearDiscount: () => void;
  consent: boolean;
  onConsentChange: (v: boolean) => void;
  isSubmitting: boolean;
  onComplete: () => void;
};

export function TicketSelectStep({
  tickets,
  selectedId,
  onSelect,
  discountCode,
  onDiscountCodeChange,
  discountQuote,
  discountApplying,
  discountError,
  onApplyDiscount,
  onClearDiscount,
  consent,
  onConsentChange,
  isSubmitting,
  onComplete,
}: Props) {
  const selected = tickets.find((t) => t.id === selectedId);
  const unitPrice = selected?.price ?? 0;
  const isPaid = tickets.length > 0 && !!selected && unitPrice > 0;
  const quoteFinal = discountQuote ? Number(discountQuote.final_amount) : null;
  const displayTotal =
    quoteFinal != null && Number.isFinite(quoteFinal) ? quoteFinal : unitPrice;
  const currency = selected?.currency || "USD";
  const canSubmit = (tickets.length === 0 || !!selected) && consent && !isSubmitting;

  return (
    <div>
      <h2 className="font-display text-lg font-semibold tracking-tight text-foreground">
        {tickets.length > 0 ? "Select tickets" : "Confirm registration"}
      </h2>
      <div className="mt-2 h-px bg-muted" />

      {tickets.length > 0 ? (
        <div className="mt-5 space-y-3">
          {tickets.map((t) => {
            const selectedCard = selectedId === t.id;
            const soldOut = t.capacity !== null && t.capacity !== undefined && t.capacity <= 0;
            return (
              <button
                type="button"
                key={t.id}
                onClick={() => !soldOut && onSelect(t.id)}
                disabled={soldOut}
                className={cn(
                  "w-full rounded-2xl border bg-card p-5 text-left transition-colors sm:p-6",
                  soldOut && "cursor-not-allowed bg-muted opacity-50",
                  !soldOut && !selectedCard && "border-border hover:border-border",
                )}
                style={
                  selectedCard && !soldOut
                    ? { borderColor: PULSE.teal, boxShadow: `0 0 0 1px ${PULSE.teal}` }
                    : undefined
                }
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-display text-base font-semibold text-foreground">
                        {t.name || "Untitled"}
                      </p>
                      {t.is_vip ? (
                        <Star className="h-4 w-4 shrink-0" style={{ color: "#E8A33D" }} fill="#E8A33D" />
                      ) : null}
                      {soldOut ? (
                        <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          Sold out
                        </span>
                      ) : null}
                    </div>
                    {t.description ? (
                      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{t.description}</p>
                    ) : null}
                  </div>
                  <p className="shrink-0 font-display text-base font-bold tabular-nums text-foreground">
                    {formatTicketPrice(t.price, t.currency || "USD")}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <p className="mt-5 text-sm leading-relaxed text-muted-foreground">
          This event is free. Confirm below to complete your registration.
        </p>
      )}

      {isPaid && selectedId ? (
        <div className="mt-6 space-y-2">
          <Label htmlFor="promo" className="text-sm font-medium text-muted-foreground">
            Discount code
          </Label>
          <div className="flex gap-2">
            <Input
              id="promo"
              value={discountCode}
              onChange={(e) => onDiscountCodeChange(e.target.value.toUpperCase())}
              placeholder="Promo code"
              className="rounded-xl uppercase"
              autoComplete="off"
              disabled={!!discountQuote || discountApplying}
            />
            {discountQuote ? (
              <Button type="button" variant="outline" className="shrink-0 rounded-xl" onClick={onClearDiscount}>
                Remove
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                className="shrink-0 rounded-xl"
                onClick={onApplyDiscount}
                disabled={discountApplying || !discountCode.trim()}
              >
                {discountApplying ? <Loader2 className="h-4 w-4 animate-spin" /> : "Apply"}
              </Button>
            )}
          </div>
          {discountError ? (
            <p className="text-xs text-destructive" role="alert">{discountError}</p>
          ) : null}
          {discountQuote ? (
            <p className="text-xs text-muted-foreground">
              Code <span className="font-medium text-foreground">{discountQuote.code}</span> applied
              {": "}
              save {formatMoneyString(discountQuote.discount_amount, currency)}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="mt-6 flex items-start gap-2.5">
        <Checkbox
          id="checkout-consent"
          checked={consent}
          onCheckedChange={(c) => onConsentChange(!!c)}
          className="mt-0.5"
        />
        <Label htmlFor="checkout-consent" className="cursor-pointer text-xs leading-relaxed text-muted-foreground">
          Send tickets to my account email. I agree to receive communications about this event
          and consent to the processing of my data in accordance with the Privacy Policy.
        </Label>
      </div>

      <div className="mt-8 flex flex-col gap-4 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
        {tickets.length > 0 ? (
          <div className="flex items-center gap-6 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Selected</p>
              <p className="font-semibold text-foreground">
                {selected ? `1 × ${selected.name}` : "No ticket"}
              </p>
            </div>
            <span className="hidden h-8 w-px bg-muted sm:block" />
            <div>
              <p className="text-xs text-muted-foreground">Total</p>
              <p className="font-display text-base font-bold tabular-nums text-foreground">
                {selected ? formatTicketPrice(displayTotal, currency) : "—"}
              </p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Free admission</p>
        )}
        <Button
          type="button"
          className="h-12 rounded-full px-6 text-sm font-semibold text-white sm:ml-auto"
          style={{ background: PULSE.teal }}
          disabled={!canSubmit}
          onClick={onComplete}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing…
            </>
          ) : isPaid ? (
            "Complete purchase"
          ) : (
            "Confirm registration"
          )}
        </Button>
      </div>
    </div>
  );
}
