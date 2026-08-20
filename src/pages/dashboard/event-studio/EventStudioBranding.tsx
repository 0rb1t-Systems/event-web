import InvitationDesigner from "@/components/event-studio/InvitationDesigner";
import { useEventStudio } from "@/contexts/EventStudioContext";

export default function EventStudioBranding() {
  const { event, eventId, handleDenied } = useEventStudio();
  return (
    <InvitationDesigner
      eventId={eventId}
      eventTitle={event.title}
      startsAt={event.starts_at}
      venue={event.address || event.city}
      onDenied={handleDenied}
    />
  );
}
