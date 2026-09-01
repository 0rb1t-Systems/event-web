import LuckyWheelPanel from "@/components/event-studio/LuckyWheelPanel";
import { StudioTabFrame } from "@/components/event-studio/StudioTabFrame";
import { useEventStudio } from "@/contexts/EventStudioContext";

export default function EventStudioLuckyWheel() {
  const { eventId, handleDenied } = useEventStudio();

  return (
    <StudioTabFrame title="Lucky wheel" description="Draw winners at random from confirmed attendees — results are saved automatically.">
      <LuckyWheelPanel eventId={eventId} onDenied={handleDenied} />
    </StudioTabFrame>
  );
}
