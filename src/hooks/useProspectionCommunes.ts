import { useQuery } from "@tanstack/react-query";
import type { ProspectionCommune } from "@/data/prospectionCommunes";

type ProspectionCommunesBundle = {
  communes: ProspectionCommune[];
  departements: string[];
};

async function loadProspectionCommunes(): Promise<ProspectionCommunesBundle> {
  const mod = await import("@/data/prospectionCommunes");
  return {
    communes: mod.PROSPECTION_COMMUNES,
    departements: mod.PROSPECTION_DEPARTEMENTS,
  };
}

export function useProspectionCommunes() {
  return useQuery({
    queryKey: ["prospection-communes"],
    queryFn: loadProspectionCommunes,
    staleTime: Infinity,
    gcTime: Infinity,
  });
}
