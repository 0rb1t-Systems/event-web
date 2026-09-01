import InvitationDesigner from "@/components/event-studio/InvitationDesigner";
import { StudioTabFrame } from "@/components/event-studio/StudioTabFrame";
import { useEventStudio } from "@/contexts/EventStudioContext";

export default function EventStudioBranding() {
  const { event, eventId, handleDenied } = useEventStudio();
  return (
    <StudioTabFrame title="Invitation designer" description="The downloadable ticket image each attendee receives — drag zones to rearrange.">
      <InvitationDesigner
        eventId={eventId}
        eventTitle={event.title}
        startsAt={event.starts_at}
        venue={event.address || event.city}
        onDenied={handleDenied}
      />
    </StudioTabFrame>
  );
}
