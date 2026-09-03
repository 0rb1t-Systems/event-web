import { ParticipantWaafiPayment } from "@/components/participant/ParticipantWaafiPayment";
import { PULSE } from "@/components/event-public/pulseTheme";
import type { ApiParticipation } from "@/services/participationService";
import type { DiscountQuote } from "@/services/participantDiscounts";
import { OrderSummary } from "./OrderSummary";

type Props = {
  participation: ApiParticipation;
  eventName: string;
  eventImage?: string | null;
  ticketName: string;
  currency: string;
  unitPrice: number;
  discountQuote: DiscountQuote | null;
  displayTotal: number;
  waafiAmount?: string;
  onSuccess: (participation: ApiParticipation) => void;
  onFailure: (reason: string) => void;
  onCancel: () => void;
};

export function WaafiPayStep({
  participation,
  eventName,
  eventImage,
  ticketName,
  currency,
  unitPrice,
  discountQuote,
  displayTotal,
  waafiAmount,
  onSuccess,
  onFailure,
  onCancel,
}: Props) {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
      <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
        <h2 className="font-display text-lg font-semibold tracking-tight text-foreground">
          Pay with WaafiPay
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Your ticket is reserved. Complete payment to confirm your registration.
        </p>
        <div className="mt-6">
          <ParticipantWaafiPayment
            participationId={participation.id}
            eventName={eventName}
            ticketName={ticketName}
            amount={waafiAmount ?? String(displayTotal)}
            currency={currency}
            brandColor={PULSE.teal}
            embedded
            onSuccess={onSuccess}
            onFailure={onFailure}
            onCancel={onCancel}
          />
        </div>
      </div>

      <OrderSummary
        eventName={eventName}
        eventImage={eventImage}
        ticketName={ticketName}
        currency={currency}
        unitPrice={unitPrice}
        discountQuote={discountQuote}
        displayTotal={displayTotal}
      />
    </div>
  );
}
