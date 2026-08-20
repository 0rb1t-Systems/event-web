import EventFinancePanel from "@/components/event-studio/EventFinancePanel";
import { useEventStudio } from "@/contexts/EventStudioContext";

export default function EventStudioFinance() {
  const { eventId, event, handleDenied } = useEventStudio();

  return (
    <EventFinancePanel
      eventId={eventId}
      eventTitle={event.title}
      onDenied={handleDenied}
      compact
    />
  );
}
