import FormFieldsPanel from "@/components/event-studio/FormFieldsPanel";
import { useEventStudio } from "@/contexts/EventStudioContext";

export default function EventStudioForm() {
  const { eventId, handleDenied } = useEventStudio();
  return <FormFieldsPanel eventId={eventId} onDenied={handleDenied} />;
}
