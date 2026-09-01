import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import {
  getPublicEvent,
  listPublicCategories,
  listPublicEvents,
  type PublicEventListParams,
} from "@/services/publicEvents";

export function usePublicEventList(params: PublicEventListParams) {
  return useQuery({
    queryKey: queryKeys.public.events.list(params),
    queryFn: () => listPublicEvents(params),
  });
}

export function usePublicCategories() {
  return useQuery({
    queryKey: queryKeys.public.categories,
    queryFn: listPublicCategories,
    staleTime: 5 * 60 * 1000,
  });
}

export function usePublicEvent(id: number, enabled = true) {
  return useQuery({
    queryKey: queryKeys.public.events.detail(id),
    queryFn: () => getPublicEvent(id),
    enabled: enabled && Number.isFinite(id) && id > 0,
  });
}
