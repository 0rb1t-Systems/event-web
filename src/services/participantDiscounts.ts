/**
 * Participant discount-code validation.
 * Uses participantApi (X-API-Key + Bearer participant_token).
 */

import { participantApi } from "@/lib/api";
import type { WrappedSuccess } from "@/lib/publicEventsAdapters";

export type DiscountQuote = {
  code: string;
  type: "percent" | "fixed" | string;
  value: string;
  original_amount: string;
  discount_amount: string;
  final_amount: string;
};

type QuoteResponse = WrappedSuccess<DiscountQuote>;

/** POST /participant/events/{event}/discount-codes/validate */
export async function validateParticipantDiscountCode(
  eventId: number,
  body: { code: string; ticket_type_id: number },
): Promise<DiscountQuote> {
  const { data } = await participantApi.post<QuoteResponse>(
    `/participant/events/${eventId}/discount-codes/validate`,
    {
      code: body.code.trim(),
      ticket_type_id: body.ticket_type_id,
    },
  );
  return data.data;
}
