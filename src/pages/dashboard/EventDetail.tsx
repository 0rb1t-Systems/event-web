import { Outlet, useLocation, useNavigate, useParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { IconAlert } from "@/components/organizer-console/orgIcons";
import { toast } from "sonner";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { OrgButton } from "@/components/organizer-console/OrgButton";
import { OrgStudioNav, OrgStudioMobileNav } from "@/components/organizer-console/OrgStudioNav";
import { OrgStudioHeader } from "@/components/organizer-console/OrgStudioTopbar";
import {
  getApiErrorMessage,
  isOrganizerEventAccessError,
} from "@/lib/apiError";
import { getMediaUrl } from "@/lib/mediaUrl";
import { rememberStudioEventId } from "@/lib/lastStudioEvent";
import { queryKeys } from "@/lib/queryKeys";
import { EVENT_STATUS_LABELS, studioPatchToWriteBody, toStudioEvent } from "@/lib/organizerEventAdapters";
import { sectionFromPathname } from "@/lib/organizerStudioRoutes";
import { EventStudioProvider } from "@/contexts/EventStudioContext";
import { useOrganizerCategories, useOrganizerEvent } from "@/hooks/queries/useOrganizerQueries";
import {
  deleteOrganizerEvent,
  transitionOrganizerEvent,
  updateOrganizerEvent,
  uploadOrganizerEventBanner,
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
  const queryClient = useQueryClient();
  const eventQuery = useOrganizerEvent(eventId);
  const categoriesQuery = useOrganizerCategories();
  const raw = eventQuery.data ?? null;
  const categories = categoriesQuery.data ?? [];
  const denied = !!eventQuery.error && isOrganizerEventAccessError(eventQuery.error);
  const loadError = eventQuery.error && !denied
    ? getApiErrorMessage(eventQuery.error, "Couldn't load event")
    : null;
  const isLoading = eventQuery.isLoading;
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);
  const [transitioning, setTransitioning] = useState(false);

  const event = raw ? toStudioEvent(raw) : null;

  useEffect(() => {
    if (raw?.id) rememberStudioEventId(raw.id);
  }, [raw?.id]);

  const setRaw = useCallback((next: OrganizerEvent | null | ((prev: OrganizerEvent | null) => OrganizerEvent | null)) => {
    const resolved = typeof next === "function" ? next(raw) : next;
    if (resolved) {
      queryClient.setQueryData(queryKeys.organizer.events.detail(eventId), resolved);
    }
  }, [eventId, queryClient, raw]);

  const invalidateStudio = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.organizer.events.detail(eventId) });
    await queryClient.invalidateQueries({ queryKey: queryKeys.organizer.events.all });
    await queryClient.invalidateQueries({ queryKey: queryKeys.organizer.dashboard });
  }, [eventId, queryClient]);

  const load = useCallback(async () => {
    await eventQuery.refetch();
  }, [eventQuery]);

  const handleDenied = useCallback(() => {
    navigate("/organizer/events");
  }, [navigate]);

  const reloadEvent = useCallback(async () => {
    await invalidateStudio();
  }, [invalidateStudio]);

  const handleUpdate = useCallback(async (fields: Record<string, unknown>) => {
    if (!raw) return;
    const body = studioPatchToWriteBody(fields);
    if (Object.keys(body).length === 0) return;
    try {
      const updated = await updateOrganizerEvent(raw.id, body);
      setRaw(updated);
      await invalidateStudio();
    } catch (err) {
      if (isOrganizerEventAccessError(err)) {
        handleDenied();
      }
      throw err;
    }
  }, [raw, handleDenied, invalidateStudio]);

  const handleUploadCover = useCallback(async (file: File): Promise<string | null> => {
    if (!raw) return null;
    const invalid = validateGalleryFile(file);
    if (invalid) {
      toast.error(invalid);
      return null;
    }
    try {
      const updated = await uploadOrganizerEventBanner(raw.id, file);
      setRaw(updated);
      toast.success("Cover uploaded");
      return updated.banner_url ?? getMediaUrl(updated.banner_path) ?? null;
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
      await invalidateStudio();
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
      reloadEvent,
      setDeleteOpen,
    };
  }, [event, raw, eventId, categories, handleDenied, handleUpdate, handleUploadCover, handleImagesChange, reloadEvent]);

  if (isLoading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-oc-brand" /></div>;
  }

  if (denied) {
    return (
      <div className="max-w-md mx-auto org-card p-10 text-center mt-10">
        <IconAlert className="w-10 h-10 mx-auto mb-4 text-oc-bad" />
        <h1 className="font-head text-2xl font-semibold text-oc-ink mb-2">{ACCESS_DENIED}</h1>
        <p className="text-oc-muted text-sm mb-6">This event is not available in your organizer account.</p>
        <OrgButton onClick={() => navigate("/organizer/events")}>Back to events</OrgButton>
      </div>
    );
  }

  if (loadError || !event || !studioValue) {
    return (
      <div className="max-w-md mx-auto org-card p-10 text-center mt-10">
        <IconAlert className="w-10 h-10 mx-auto mb-4 text-oc-bad" />
        <h1 className="font-head text-2xl font-semibold text-oc-ink mb-2">Couldn't load event</h1>
        <p className="text-oc-muted text-sm mb-6">{loadError || "Something went wrong."}</p>
        <OrgButton onClick={() => void load()}>Retry</OrgButton>
      </div>
    );
  }

  const irreversible = pendingStatus === "cancelled" || pendingStatus === "completed";

  return (
    <EventStudioProvider value={studioValue}>
      <div className="flex flex-col lg:flex-row gap-4 lg:gap-0 items-start min-w-0 w-full">
        <OrgStudioNav
          eventId={eventId}
          active={activeTab}
          eventName={event.name}
          status={event.status}
          bannerUrl={event.background_image_url ?? getMediaUrl(event.banner_path)}
        />
        <div className="flex-1 min-w-0 w-full flex flex-col gap-3 lg:py-6 lg:pl-8 pb-8">
          <OrgStudioHeader
            eventId={eventId}
            event={event}
            status={event.status}
            onTransition={setPendingStatus}
            onDelete={() => setDeleteOpen(true)}
            transitioning={transitioning}
          />
          <OrgStudioMobileNav eventId={eventId} active={activeTab} />

          <div className="min-w-0 w-full">
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
