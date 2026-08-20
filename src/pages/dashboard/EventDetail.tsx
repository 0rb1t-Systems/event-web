import { Button } from "@/components/ui/button";
import { Outlet, useLocation, useNavigate, useParams } from "react-router-dom";
import { Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useCallback, useEffect, useMemo, useState } from "react";
import EventDetailHeader from "@/components/event-detail/EventDetailHeader";
import EventSideNav, { type EventSection } from "@/components/event-detail/EventSideNav";
import {
  getApiErrorMessage,
  isOrganizerEventAccessError,
} from "@/lib/apiError";
import { getMediaUrl } from "@/lib/mediaUrl";
import { EVENT_STATUS_LABELS, studioPatchToWriteBody, toStudioEvent } from "@/lib/organizerEventAdapters";
import { sectionFromPathname, studioSectionPath } from "@/lib/organizerStudioRoutes";
import { EventStudioProvider } from "@/contexts/EventStudioContext";
import {
  deleteOrganizerEvent,
  getOrganizerEvent,
  listEventCategories,
  transitionOrganizerEvent,
  updateOrganizerEvent,
  uploadOrganizerEventImage,
  validateGalleryFile,
  type OrganizerEvent,
  type OrganizerEventImage,
} from "@/services/organizerEvents";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const ACCESS_DENIED = "You don't have access to this event.";

const EventDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const eventId = Number(id);
  const activeTab = sectionFromPathname(location.pathname);
  const [raw, setRaw] = useState<OrganizerEvent | null>(null);
  const [categories, setCategories] = useState<Array<{ id: number; name: string }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [denied, setDenied] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);
  const [transitioning, setTransitioning] = useState(false);

  const event = raw ? toStudioEvent(raw) : null;

  const load = useCallback(async () => {
    if (!Number.isFinite(eventId) || eventId <= 0) {
      setDenied(true);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setLoadError(null);
    try {
      const data = await getOrganizerEvent(eventId);
      setRaw(data);
      setDenied(false);
    } catch (err) {
      if (isOrganizerEventAccessError(err)) {
        setDenied(true);
        setRaw(null);
      } else {
        setLoadError(getApiErrorMessage(err, "Couldn't load event"));
        toast.error(getApiErrorMessage(err, "Couldn't load event"));
      }
    } finally {
      setIsLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    listEventCategories().then(setCategories).catch(() => setCategories([]));
  }, []);

  const handleDenied = useCallback(() => {
    setDenied(true);
    setRaw(null);
  }, []);

  const handleUpdate = useCallback(async (fields: Record<string, unknown>) => {
    if (!raw) return;
    const body = studioPatchToWriteBody(fields);
    if (Object.keys(body).length === 0) return;
    try {
      const updated = await updateOrganizerEvent(raw.id, body);
      setRaw(updated);
    } catch (err) {
      if (isOrganizerEventAccessError(err)) {
        handleDenied();
        return;
      }
      toast.error(getApiErrorMessage(err, "Couldn't save event"));
    }
  }, [raw, handleDenied]);

  const handleUploadCover = useCallback(async (file: File): Promise<string | null> => {
    if (!raw) return null;
    const invalid = validateGalleryFile(file);
    if (invalid) {
      toast.error(invalid);
      return null;
    }
    try {
      const image = await uploadOrganizerEventImage(raw.id, file);
      const updated = await updateOrganizerEvent(raw.id, { banner_path: image.path });
      setRaw({ ...updated, images: [...(updated.images ?? raw.images ?? []), image] });
      toast.success("Cover uploaded");
      return getMediaUrl(image.path) ?? image.path;
    } catch (err) {
      if (isOrganizerEventAccessError(err)) {
        handleDenied();
        return null;
      }
      toast.error(getApiErrorMessage(err, "Upload failed"));
      return null;
    }
  }, [raw, handleDenied]);

  const handleImagesChange = useCallback((images: OrganizerEventImage[]) => {
    setRaw((prev) => (prev ? { ...prev, images } : prev));
  }, []);

  const confirmTransition = async () => {
    if (!raw || !pendingStatus) return;
    setTransitioning(true);
    try {
      const result = await transitionOrganizerEvent(raw.id, pendingStatus);
      setRaw(result.event);
      toast.success(`Status is now ${EVENT_STATUS_LABELS[result.event.status as string] || result.event.status}`);
      setPendingStatus(null);
    } catch (err) {
      if (isOrganizerEventAccessError(err)) {
        handleDenied();
        return;
      }
      toast.error(getApiErrorMessage(err, "Couldn't change status"));
    } finally {
      setTransitioning(false);
    }
  };

  const confirmDelete = async () => {
    if (!raw) return;
    try {
      await deleteOrganizerEvent(raw.id);
      setDeleteOpen(false);
      toast.success("Event moved to trash");
      navigate("/organizer/events");
    } catch (err) {
      if (isOrganizerEventAccessError(err)) {
        handleDenied();
        return;
      }
      toast.error(getApiErrorMessage(err, "Couldn't delete event"));
    }
  };

  const studioValue = useMemo(() => {
    if (!event || !raw) return null;
    return {
      eventId,
      event,
      raw,
      categories,
      handleDenied,
      handleUpdate,
      handleUploadCover,
      handleImagesChange,
      setDeleteOpen,
    };
  }, [event, raw, eventId, categories, handleDenied, handleUpdate, handleUploadCover, handleImagesChange]);

  if (isLoading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }

  if (denied) {
    return (
      <div className="max-w-md mx-auto bg-card rounded-3xl p-10 text-center mt-10">
        <AlertTriangle className="w-10 h-10 mx-auto mb-4 text-destructive" />
        <h1 className="text-2xl font-display font-bold mb-2">{ACCESS_DENIED}</h1>
        <p className="text-muted-foreground text-sm mb-6">This event is not available in your organizer account.</p>
        <Button className="rounded-full" onClick={() => navigate("/organizer/events")}>Back to events</Button>
      </div>
    );
  }

  if (loadError || !event || !studioValue) {
    return (
      <div className="max-w-md mx-auto bg-card rounded-3xl p-10 text-center mt-10">
        <AlertTriangle className="w-10 h-10 mx-auto mb-4 text-destructive" />
        <h1 className="text-2xl font-display font-bold mb-2">Couldn't load event</h1>
        <p className="text-muted-foreground text-sm mb-6">{loadError || "Something went wrong."}</p>
        <Button className="rounded-full" onClick={() => void load()}>Retry</Button>
      </div>
    );
  }

  const irreversible = pendingStatus === "cancelled" || pendingStatus === "completed";

  return (
    <EventStudioProvider value={studioValue}>
      <div className="space-y-5">
        <EventDetailHeader
          event={event}
          onTransition={setPendingStatus}
          onDelete={() => setDeleteOpen(true)}
          transitioning={transitioning}
        />

        <div className="flex flex-col md:flex-row md:gap-5 md:items-start">
          <EventSideNav
            active={activeTab}
            onChange={(s: EventSection) => navigate(studioSectionPath(eventId, s))}
            attendeesCount={event.registrations_count}
          />

          <div className="flex-1 min-w-0 space-y-5 mt-4 md:mt-0">
            <Outlet />
          </div>
        </div>

        <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Move this event to trash?</AlertDialogTitle>
              <AlertDialogDescription>
                The event is soft-deleted and removed from your list. This does not hard-delete records on the server.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction data-testid="confirm-delete-event" onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Move to trash
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={!!pendingStatus} onOpenChange={(open) => { if (!open) setPendingStatus(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {pendingStatus === "cancelled" ? "Cancel this event?" : `Change status to ${EVENT_STATUS_LABELS[pendingStatus || ""] || pendingStatus}?`}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {pendingStatus === "cancelled" ? (
                  <span className="block text-destructive font-medium">
                    Cancellation cannot be undone from this app. Cancelled events leave the public catalog and stay terminal.
                  </span>
                ) : pendingStatus === "completed" ? (
                  "Completed is a terminal status. You will not be able to transition this event again."
                ) : (
                  `This uses POST /organizer/events/${event.id}/transition. Status cannot be changed with a normal save.`
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={transitioning}>Keep current status</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmTransition}
                disabled={transitioning}
                className={irreversible ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}
              >
                {transitioning ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                {pendingStatus === "cancelled" ? "Cancel event" : "Confirm transition"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </EventStudioProvider>
  );
};

export default EventDetail;
