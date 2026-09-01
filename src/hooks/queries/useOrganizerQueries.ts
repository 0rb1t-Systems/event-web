import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { getOrganizerDashboard } from "@/services/organizerDashboard";
import { getOrganizerEventAnalytics } from "@/services/organizerAnalytics";
import {
  getOrganizerEvent,
  listEventCategories,
  listOrganizerEvents,
} from "@/services/organizerEvents";

export function useOrganizerDashboardQuery() {
  return useQuery({
    queryKey: queryKeys.organizer.dashboard,
    queryFn: getOrganizerDashboard,
  });
}

export function useOrganizerEventList(params?: {
  status?: string;
  search?: string;
  per_page?: number;
  page?: number;
}) {
  return useQuery({
    queryKey: queryKeys.organizer.events.list(params ?? {}),
    queryFn: () => listOrganizerEvents(params),
  });
}

export function useOrganizerEvent(id: number, enabled = true) {
  return useQuery({
    queryKey: queryKeys.organizer.events.detail(id),
    queryFn: () => getOrganizerEvent(id),
    enabled: enabled && Number.isFinite(id) && id > 0,
  });
}

export function useOrganizerCategories() {
  return useQuery({
    queryKey: queryKeys.organizer.categories,
    queryFn: listEventCategories,
    staleTime: 5 * 60 * 1000,
  });
}

export function useOrganizerEventAnalytics(id: number, enabled = true) {
  return useQuery({
    queryKey: queryKeys.organizer.studio.analytics(id),
    queryFn: () => getOrganizerEventAnalytics(id),
    enabled: enabled && Number.isFinite(id) && id > 0,
  });
}
