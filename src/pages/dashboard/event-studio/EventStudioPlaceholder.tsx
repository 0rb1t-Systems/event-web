import { useEventStudio } from "@/contexts/EventStudioContext";

export default function EventStudioPlaceholder({ title, body }: { title: string; body: string }) {
  return (
    <div className="bg-card rounded-xl p-5 sm:p-6 text-sm text-muted-foreground">
      <h3 className="font-display font-semibold text-foreground mb-2">{title}</h3>
      <p>{body}</p>
    </div>
  );
}

export function EventStudioAttendeesPlaceholder() {
  const { event } = useEventStudio();
  return (
    <EventStudioPlaceholder
      title="Attendees"
      body={`Attendee management is not wired yet. Summary: ${event.registrations_count} registration${event.registrations_count === 1 ? "" : "s"}.`}
    />
  );
}
