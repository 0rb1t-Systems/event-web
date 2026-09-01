import FormFieldsPanel from "@/components/event-studio/FormFieldsPanel";
import { StudioTabFrame } from "@/components/event-studio/StudioTabFrame";
import { useEventStudio } from "@/contexts/EventStudioContext";

export default function EventStudioForm() {
  const { eventId, handleDenied } = useEventStudio();
  return (
    <StudioTabFrame title="Registration form" description="What attendees fill in. Default fields are locked; add your own below.">
      <FormFieldsPanel eventId={eventId} onDenied={handleDenied} />
    </StudioTabFrame>
  );
}
