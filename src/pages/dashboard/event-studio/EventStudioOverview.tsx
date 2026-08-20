import EventQuickInfo from "@/components/event-detail/EventQuickInfo";
import EventGalleryPanel from "@/components/event-detail/EventGalleryPanel";
import EventOverview from "@/components/event-detail/EventOverview";
import { useNavigate } from "react-router-dom";
import { useEventStudio } from "@/contexts/EventStudioContext";
import { studioSectionPath } from "@/lib/organizerStudioRoutes";
import type { EventSection } from "@/components/event-detail/EventSideNav";

export default function EventStudioOverview() {
  const { event, eventId, categories, handleUpdate, handleUploadCover, handleImagesChange, handleDenied } = useEventStudio();
  const navigate = useNavigate();

  return (
    <>
      <EventQuickInfo
        event={event}
        onUpdate={handleUpdate}
        categories={categories}
        onUploadCover={handleUploadCover}
      />
      <EventGalleryPanel
        eventId={event.id}
        images={event.images}
        onImagesChange={handleImagesChange}
        onDenied={handleDenied}
      />
      <EventOverview
        event={event}
        onJumpTab={(t) => navigate(studioSectionPath(eventId, t as EventSection))}
      />
    </>
  );
}
