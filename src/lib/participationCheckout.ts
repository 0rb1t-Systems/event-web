import type { ApiParticipation } from "@/services/participationService";
import type { DiscountQuote } from "@/services/participantDiscounts";

/** Pricing for resume-checkout (WaafiPayStep) from a snapshotted participation. */
export function participationCheckoutPricing(p: ApiParticipation) {
  const currency = p.ticket_type?.currency || "USD";
  const unitPrice = Number(p.ticket_type?.price ?? 0);
  const displayTotal = Number(p.final_amount ?? p.ticket_type?.price ?? 0);

  let discountQuote: DiscountQuote | null = null;
  if (
    p.discount_amount &&
    Number(p.discount_amount) > 0 &&
    p.original_amount &&
    p.final_amount
  ) {
    discountQuote = {
      code: "Discount",
      type: "fixed",
      value: p.discount_amount,
      original_amount: p.original_amount,
      discount_amount: p.discount_amount,
      final_amount: p.final_amount,
    };
  }

  return {
    currency,
    unitPrice,
    displayTotal,
    discountQuote,
    ticketName: p.ticket_type?.name ?? "Admission",
    waafiAmount: p.final_amount ?? p.ticket_type?.price ?? "0",
  };
}
