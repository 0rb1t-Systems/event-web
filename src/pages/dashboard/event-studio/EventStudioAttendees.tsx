import EventRegistrationsPanel from "@/components/event-studio/EventRegistrationsPanel";
import AnnouncementsPanel from "@/components/event-studio/AnnouncementsPanel";
import EventDiscussionsPanel from "@/components/event-studio/EventDiscussionsPanel";
import EventFeedbackPanel from "@/components/event-studio/EventFeedbackPanel";
import { useEventStudio } from "@/contexts/EventStudioContext";

export default function EventStudioAttendees() {
  const { eventId, handleDenied } = useEventStudio();

  return (
    <div className="space-y-6">
      <EventRegistrationsPanel eventId={eventId} onDenied={handleDenied} compact />
      <EventDiscussionsPanel eventId={eventId} onDenied={handleDenied} />
      <EventFeedbackPanel eventId={eventId} onDenied={handleDenied} />
      <AnnouncementsPanel eventId={eventId} onDenied={handleDenied} />
    </div>
  );
}
