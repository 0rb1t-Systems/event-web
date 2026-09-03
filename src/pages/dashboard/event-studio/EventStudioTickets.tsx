import TicketTypesPanel from "@/components/event-studio/TicketTypesPanel";
import DiscountCodesPanel from "@/components/event-studio/DiscountCodesPanel";
import { StudioTabFrame } from "@/components/event-studio/StudioTabFrame";
import { useEventStudio } from "@/contexts/EventStudioContext";

export default function EventStudioTickets() {
  const { eventId, handleDenied } = useEventStudio();
  return (
    <StudioTabFrame title="Tickets">
      <TicketTypesPanel eventId={eventId} onDenied={handleDenied} />
      <DiscountCodesPanel eventId={eventId} onDenied={handleDenied} />
    </StudioTabFrame>
  );
}
