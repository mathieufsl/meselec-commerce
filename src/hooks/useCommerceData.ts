import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type {
  AppelOffre,
  AoLot,
  AoDocument,
  AoReponse,
  AoReponseLigne,
  AoSecteur,
  AoSecteurCode,
  BpuCatalogue,
  BpuLigne,
  Client,
  FournisseurCommercial,
  MemoireTechnique,
  ProspectionSuivi,
  SocieteExploitation,
} from "@/lib/commerceTypes";

export function useCommerceSettings() {
  return useQuery({
    queryKey: ["commerce-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("commerce_settings")
        .select("*")
        .eq("id", 1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useSocietes() {
  return useQuery({
    queryKey: ["societes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("societes_exploitation")
        .select("*")
        .eq("actif", true)
        .order("nom");
      if (error) throw error;
      return (data ?? []) as SocieteExploitation[];
    },
  });
}

export function useClients() {
  return useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .order("nom_entreprise");
      if (error) throw error;
      return (data ?? []) as Client[];
    },
  });
}

const AO_SELECT =
  "*, clients(nom_entreprise, secteur), societes_exploitation(code, nom), ao_secteurs(*)";

export function useAppelsOffres() {
  return useQuery({
    queryKey: ["appels-offres"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appels_offres")
        .select(AO_SELECT)
        .order("date_limite_depot", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return (data ?? []) as AppelOffre[];
    },
  });
}

export function useAppelOffre(aoId: string) {
  return useQuery({
    queryKey: ["appel-offre", aoId],
    enabled: Boolean(aoId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appels_offres")
        .select("*, clients(*), societes_exploitation(*), ao_secteurs(*)")
        .eq("id", aoId)
        .single();
      if (error) throw error;
      return data as AppelOffre;
    },
  });
}

export function useAoLots(aoId: string) {
  return useQuery({
    queryKey: ["ao-lots", aoId],
    enabled: Boolean(aoId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ao_lots")
        .select("*")
        .eq("ao_id", aoId)
        .order("ordre");
      if (error) throw error;
      return (data ?? []) as AoLot[];
    },
  });
}

export function useAoDocuments(aoId: string) {
  return useQuery({
    queryKey: ["ao-documents", aoId],
    enabled: Boolean(aoId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ao_documents")
        .select("*")
        .eq("ao_id", aoId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as AoDocument[];
    },
  });
}

export function useAoDocumentCounts() {
  return useQuery({
    queryKey: ["ao-document-counts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("ao_documents").select("ao_id");
      if (error) throw error;
      const counts: Record<string, number> = {};
      for (const row of data ?? []) {
        counts[row.ao_id] = (counts[row.ao_id] ?? 0) + 1;
      }
      return counts;
    },
  });
}

export function useBpuCatalogues() {
  return useQuery({
    queryKey: ["bpu-catalogues"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bpu_catalogues")
        .select("*")
        .order("nom");
      if (error) throw error;
      return (data ?? []) as BpuCatalogue[];
    },
  });
}

export function useBpuLignes(catalogueId: string) {
  return useQuery({
    queryKey: ["bpu-lignes", catalogueId],
    enabled: Boolean(catalogueId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bpu_lignes")
        .select("*")
        .eq("catalogue_id", catalogueId)
        .order("ordre");
      if (error) throw error;
      return (data ?? []) as BpuLigne[];
    },
  });
}

export function useAoReponses(aoId: string) {
  return useQuery({
    queryKey: ["ao-reponses", aoId],
    enabled: Boolean(aoId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ao_reponses")
        .select("*")
        .eq("ao_id", aoId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as AoReponse[];
    },
  });
}

export function useAoReponseLignes(reponseId: string) {
  return useQuery({
    queryKey: ["ao-reponse-lignes", reponseId],
    enabled: Boolean(reponseId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ao_reponse_lignes")
        .select("*")
        .eq("reponse_id", reponseId)
        .order("ordre");
      if (error) throw error;
      return (data ?? []) as AoReponseLigne[];
    },
  });
}

export function useMemoiresTechniques(aoId: string) {
  return useQuery({
    queryKey: ["memoires", aoId],
    enabled: Boolean(aoId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("memoires_techniques")
        .select("*")
        .eq("ao_id", aoId)
        .order("version", { ascending: false });
      if (error) throw error;
      return (data ?? []) as MemoireTechnique[];
    },
  });
}

export function useFournisseurs() {
  return useQuery({
    queryKey: ["fournisseurs-commerciaux"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fournisseurs_commerciaux")
        .select("*")
        .order("nom");
      if (error) throw error;
      return (data ?? []) as FournisseurCommercial[];
    },
  });
}

export function useProspection() {
  return useQuery({
    queryKey: ["prospection"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("prospection_suivi")
        .select("*")
        .order("commune_key");
      if (error) throw error;
      return (data ?? []) as ProspectionSuivi[];
    },
  });
}

export function useInvalidateCommerce() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries();
  };
}

export function useUpsertAppelOffre() {
  const invalidate = useInvalidateCommerce();
  return useMutation({
    mutationFn: async (payload: Partial<AppelOffre> & { id?: string }) => {
      if (payload.id) {
        const { id, clients, societes_exploitation, ao_secteurs, ...rest } = payload;
        const { data, error } = await supabase
          .from("appels_offres")
          .update(rest)
          .eq("id", id)
          .select()
          .single();
        if (error) throw error;
        return data;
      }
      const { clients, societes_exploitation, ao_secteurs, ...insert } = payload;
      const { data, error } = await supabase
        .from("appels_offres")
        .insert(insert as never)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: invalidate,
  });
}

type AoSecteurInput = {
  secteur: AoSecteurCode;
  nature_marche: string;
  prestations?: string[];
  bail_duree_mois?: number | null;
  bail_date_debut?: string | null;
  bail_date_fin?: string | null;
};

export function useCreateAppelOffreWithSecteurs() {
  const invalidate = useInvalidateCommerce();
  return useMutation({
    mutationFn: async ({
      ao,
      secteurs,
    }: {
      ao: Partial<AppelOffre>;
      secteurs: AoSecteurInput[];
    }) => {
      const { data: created, error } = await supabase
        .from("appels_offres")
        .insert(ao as never)
        .select()
        .single();
      if (error) throw error;

      if (secteurs.length > 0) {
        const rows = secteurs.map((s) => ({ ...s, ao_id: created.id }));
        const { error: sectErr } = await supabase.from("ao_secteurs").insert(rows as never);
        if (sectErr) throw sectErr;
      }

      return created as AppelOffre;
    },
    onSuccess: invalidate,
  });
}

export function useSyncAoSecteurs() {
  const invalidate = useInvalidateCommerce();
  return useMutation({
    mutationFn: async ({
      aoId,
      secteurs,
    }: {
      aoId: string;
      secteurs: AoSecteurInput[];
    }) => {
      const { error: delErr } = await supabase.from("ao_secteurs").delete().eq("ao_id", aoId);
      if (delErr) throw delErr;

      if (secteurs.length > 0) {
        const rows = secteurs.map((s) => ({ ...s, ao_id: aoId }));
        const { error: insErr } = await supabase.from("ao_secteurs").insert(rows as never);
        if (insErr) throw insErr;
      }

      const { data, error } = await supabase
        .from("ao_secteurs")
        .select("*")
        .eq("ao_id", aoId)
        .order("secteur");
      if (error) throw error;
      return (data ?? []) as AoSecteur[];
    },
    onSuccess: invalidate,
  });
}

export function useImportBpuLignes() {
  const invalidate = useInvalidateCommerce();
  return useMutation({
    mutationFn: async ({
      catalogueId,
      lignes,
    }: {
      catalogueId: string;
      lignes: unknown[];
    }) => {
      const { data, error } = await supabase.rpc("import_bpu_lignes", {
        p_catalogue_id: catalogueId,
        p_lignes: lignes as never,
      });
      if (error) throw error;
      return data as number;
    },
    onSuccess: invalidate,
  });
}

export function useImportAoReponseLignes() {
  const invalidate = useInvalidateCommerce();
  return useMutation({
    mutationFn: async ({
      reponseId,
      lignes,
      replace = true,
    }: {
      reponseId: string;
      lignes: unknown[];
      replace?: boolean;
    }) => {
      const { data, error } = await supabase.rpc("import_ao_reponse_lignes", {
        p_reponse_id: reponseId,
        p_lignes: lignes as never,
        p_replace: replace,
      });
      if (error) throw error;
      return data as number;
    },
    onSuccess: invalidate,
  });
}
