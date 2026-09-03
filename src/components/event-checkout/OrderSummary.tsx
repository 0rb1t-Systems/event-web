import { formatMoneyString, formatTicketPrice } from "@/lib/ticketMoney";
import type { DiscountQuote } from "@/services/participantDiscounts";
import { PULSE } from "@/components/event-public/pulseTheme";

type Props = {
  eventName: string;
  eventImage?: string | null;
  ticketName: string;
  currency: string;
  unitPrice: number;
  discountQuote: DiscountQuote | null;
  displayTotal: number;
};

export function OrderSummary({
  eventName,
  eventImage,
  ticketName,
  currency,
  unitPrice,
  discountQuote,
  displayTotal,
}: Props) {
  return (
    <aside className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="relative h-28 bg-muted sm:h-32">
        {eventImage ? (
          <img src={eventImage} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <div
            className="absolute inset-0"
            style={{ background: `linear-gradient(135deg, ${PULSE.navy}, ${PULSE.sky})` }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
        <p className="absolute inset-x-0 bottom-0 p-3 font-display text-sm font-semibold text-white">
          {eventName}
        </p>
      </div>
      <div className="space-y-3 p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Order summary
        </p>
        <div className="flex items-start justify-between gap-3 text-sm">
          <span className="text-muted-foreground">1× {ticketName}</span>
          <span className="tabular-nums text-foreground">{formatTicketPrice(unitPrice, currency)}</span>
        </div>
        {discountQuote ? (
          <div className="flex items-start justify-between gap-3 text-sm">
            <span className="text-muted-foreground">Discount ({discountQuote.code})</span>
            <span className="tabular-nums text-foreground">
              −{formatMoneyString(discountQuote.discount_amount, currency)}
            </span>
          </div>
        ) : null}
        <div className="border-t border-border pt-3">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-foreground">Total</span>
            <span className="font-display text-lg font-bold tabular-nums text-foreground">
              {formatTicketPrice(displayTotal, currency)}
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}
