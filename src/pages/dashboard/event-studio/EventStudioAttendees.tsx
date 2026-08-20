import EventRegistrationsPanel from "@/components/event-studio/EventRegistrationsPanel";
import AnnouncementsPanel from "@/components/event-studio/AnnouncementsPanel";
import { useEventStudio } from "@/contexts/EventStudioContext";

export default function EventStudioAttendees() {
  const { eventId, handleDenied } = useEventStudio();

  return (
    <div className="space-y-6">
      <EventRegistrationsPanel eventId={eventId} onDenied={handleDenied} compact />
      <AnnouncementsPanel eventId={eventId} onDenied={handleDenied} />
    </div>
  );
}
