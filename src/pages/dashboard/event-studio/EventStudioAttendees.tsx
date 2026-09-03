import EventRegistrationsPanel from "@/components/event-studio/EventRegistrationsPanel";
import AnnouncementsPanel from "@/components/event-studio/AnnouncementsPanel";
import EventDiscussionsPanel from "@/components/event-studio/EventDiscussionsPanel";
import EventFeedbackPanel from "@/components/event-studio/EventFeedbackPanel";
import { StudioTabFrame } from "@/components/event-studio/StudioTabFrame";
import { useEventStudio } from "@/contexts/EventStudioContext";

export default function EventStudioAttendees() {
  const { eventId, event, handleDenied } = useEventStudio();
  const registered = event.registrations_count ?? 0;
  const summary = [
    `${registered} registered`,
    event.capacity ? `${event.capacity} capacity` : "open capacity",
  ].join(" · ");

  return (
    <StudioTabFrame title="Attendees" description={summary}>
      <div className="space-y-6">
        <EventRegistrationsPanel eventId={eventId} onDenied={handleDenied} compact />
        <EventDiscussionsPanel eventId={eventId} onDenied={handleDenied} />
        <EventFeedbackPanel eventId={eventId} onDenied={handleDenied} />
        <AnnouncementsPanel eventId={eventId} onDenied={handleDenied} />
      </div>
    </StudioTabFrame>
  );
}
