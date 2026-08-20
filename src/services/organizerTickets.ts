import { organizerApi } from "@/lib/api";
import type { WrappedSuccess } from "@/lib/publicEventsAdapters";

export type OrganizerTicketType = {
  id: number;
  event_id: number;
  name: string;
  price: string | number;
  quantity_limit: number | null;
  quantity_sold: number;
  sort_order: number;
  sales_enabled: boolean;
};

export type TicketTypeWriteBody = {
  name?: string;
  price?: number;
  quantity_limit?: number | null;
  sort_order?: number;
  sales_enabled?: boolean;
};

type IndexResponse = WrappedSuccess<{
  event_id: number;
  monetized: boolean;
  derived_monetized: boolean;
  ticket_types: OrganizerTicketType[];
}>;

export async function listOrganizerTicketTypes(eventId: number): Promise<{
  monetized: boolean;
  derived_monetized: boolean;
  ticket_types: OrganizerTicketType[];
}> {
  const { data } = await organizerApi.get<IndexResponse>(`/organizer/events/${eventId}/ticket-types`);
  return data.data;
}

export async function createOrganizerTicketType(
  eventId: number,
  body: TicketTypeWriteBody,
): Promise<OrganizerTicketType> {
  const { data } = await organizerApi.post<WrappedSuccess<OrganizerTicketType>>(
    `/organizer/events/${eventId}/ticket-types`,
    body,
  );
  return data.data;
}

export async function updateOrganizerTicketType(
  ticketTypeId: number,
  body: TicketTypeWriteBody,
): Promise<OrganizerTicketType> {
  const { data } = await organizerApi.patch<WrappedSuccess<OrganizerTicketType>>(
    `/organizer/ticket-types/${ticketTypeId}`,
    body,
  );
  return data.data;
}

export async function updateOrganizerTicketSales(
  ticketTypeId: number,
  sales_enabled: boolean,
): Promise<OrganizerTicketType> {
  const { data } = await organizerApi.patch<WrappedSuccess<OrganizerTicketType>>(
    `/organizer/ticket-types/${ticketTypeId}/sales`,
    { sales_enabled },
  );
  return data.data;
}

export async function deleteOrganizerTicketType(ticketTypeId: number): Promise<void> {
  await organizerApi.delete(`/organizer/ticket-types/${ticketTypeId}`);
}

export function ticketPriceNumber(ticket: OrganizerTicketType): number {
  const n = typeof ticket.price === "number" ? ticket.price : Number(ticket.price);
  return Number.isFinite(n) ? n : 0;
}

export function ticketIsPaid(ticket: OrganizerTicketType): boolean {
  return ticketPriceNumber(ticket) > 0;
}

export function ticketIsSoldOut(ticket: OrganizerTicketType): boolean {
  if (ticket.quantity_limit == null) return false;
  if (ticket.quantity_limit === 0) return true;
  return ticket.quantity_sold >= ticket.quantity_limit;
}

export function ticketRemaining(ticket: OrganizerTicketType): number | null {
  if (ticket.quantity_limit == null) return null;
  return Math.max(0, ticket.quantity_limit - ticket.quantity_sold);
}
