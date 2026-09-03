import LuckyWheelPanel from "@/components/event-studio/LuckyWheelPanel";
import { StudioTabFrame } from "@/components/event-studio/StudioTabFrame";
import { useEventStudio } from "@/contexts/EventStudioContext";

export default function EventStudioLuckyWheel() {
  const { eventId, handleDenied } = useEventStudio();

  return (
    <StudioTabFrame title="Lucky wheel">
      <LuckyWheelPanel eventId={eventId} onDenied={handleDenied} />
    </StudioTabFrame>
  );
}
