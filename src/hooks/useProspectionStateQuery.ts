import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchProspectionState,
  type ProspectionCommuneState,
  type ProspectionStateMap,
} from "@/lib/prospection/api";

export const PROSPECTION_STATE_QUERY_KEY = ["prospection-state"] as const;

export function useProspectionStateQuery() {
  return useQuery({
    queryKey: PROSPECTION_STATE_QUERY_KEY,
    queryFn: fetchProspectionState,
    staleTime: 30_000,
    placeholderData: () => ({} satisfies ProspectionStateMap),
  });
}

export function useProspectionStateMutations() {
  const queryClient = useQueryClient();

  const patchLocalState = (communeKey: string, patch: Partial<ProspectionCommuneState>) => {
    queryClient.setQueryData<ProspectionStateMap>(PROSPECTION_STATE_QUERY_KEY, (prev = {}) => {
      const current = prev[communeKey];
      const next: ProspectionCommuneState = {
        status: "todo",
        gestion: "",
        prestataire: "",
        contact: "",
        contacts: [],
        notes: "",
        ...current,
        ...patch,
      };
      return { ...prev, [communeKey]: next };
    });
  };

  const replaceState = (next: ProspectionStateMap) => {
    queryClient.setQueryData(PROSPECTION_STATE_QUERY_KEY, next);
  };

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: PROSPECTION_STATE_QUERY_KEY });
  };

  return { patchLocalState, replaceState, invalidate };
}
