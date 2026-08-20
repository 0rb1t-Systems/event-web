import CheckInScanner from "@/components/event-detail/CheckInScanner";
import { useEventStudio } from "@/contexts/EventStudioContext";

export default function EventStudioScanner() {
  const { eventId, event, handleDenied } = useEventStudio();

  return (
    <CheckInScanner
      eventId={eventId}
      eventTitle={event.title}
      onDenied={handleDenied}
    />
  );
}
