import EventQuickInfo from "@/components/event-detail/EventQuickInfo";
import EventGalleryPanel from "@/components/event-detail/EventGalleryPanel";
import { useEventStudio } from "@/contexts/EventStudioContext";

/** Overview is the event edit form. Public-page preview is the studio Preview action. */
export default function EventStudioOverview() {
  const { event, categories, handleUpdate, handleUploadCover, handleImagesChange, handleDenied } = useEventStudio();

  return (
    <div className="flex flex-col gap-4" data-testid="studio-overview">
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
    </div>
  );
}
