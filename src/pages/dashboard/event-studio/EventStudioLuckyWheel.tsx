import LuckyWheelPanel from "@/components/event-studio/LuckyWheelPanel";
import { useEventStudio } from "@/contexts/EventStudioContext";

export default function EventStudioLuckyWheel() {
  const { eventId, handleDenied } = useEventStudio();

  return <LuckyWheelPanel eventId={eventId} onDenied={handleDenied} />;
}
