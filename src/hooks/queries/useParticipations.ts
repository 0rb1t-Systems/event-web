import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { useAuth } from "@/contexts/AuthContext";
import { getParticipation, listParticipations } from "@/services/participationService";

export function useMyParticipations(enabled = true) {
  const { user, isLoading } = useAuth();
  return useQuery({
    queryKey: queryKeys.participant.participations.list(),
    queryFn: () => listParticipations({ per_page: 100, page: 1 }),
    enabled: enabled && !isLoading && !!user,
  });
}

export function useParticipation(id: number, enabled = true) {
  return useQuery({
    queryKey: queryKeys.participant.participations.detail(id),
    queryFn: () => getParticipation(id),
    enabled: enabled && Number.isFinite(id) && id > 0,
  });
}
