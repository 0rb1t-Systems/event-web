import { createContext, useContext, type ReactNode } from "react";
import type { OrganizerEventStudio } from "@/lib/organizerEventAdapters";
import type { OrganizerEvent, OrganizerEventImage } from "@/services/organizerEvents";

export type EventStudioContextValue = {
  eventId: number;
  event: OrganizerEventStudio;
  raw: OrganizerEvent;
  categories: Array<{ id: number; name: string }>;
  handleDenied: () => void;
  handleUpdate: (fields: Record<string, unknown>) => Promise<void>;
  handleUploadCover: (file: File) => Promise<string | null>;
  handleImagesChange: (images: OrganizerEventImage[]) => void;
  setDeleteOpen: (open: boolean) => void;
};

const EventStudioContext = createContext<EventStudioContextValue | null>(null);

export function EventStudioProvider({
  value,
  children,
}: {
  value: EventStudioContextValue;
  children: ReactNode;
}) {
  return <EventStudioContext.Provider value={value}>{children}</EventStudioContext.Provider>;
}

export function useEventStudio() {
  const ctx = useContext(EventStudioContext);
  if (!ctx) throw new Error("useEventStudio must be used inside EventStudioProvider");
  return ctx;
}
