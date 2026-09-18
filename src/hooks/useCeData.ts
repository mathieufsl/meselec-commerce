import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { CeDossier } from "@/lib/commerceTypes";

const CE_SELECT = "*, societes_exploitation:societe_acheteuse_id(code, nom)";

function useInvalidateCe() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: ["ce-dossiers"] });
    void qc.invalidateQueries({ queryKey: ["ce-dossier"] });
  };
}

export function useCeDossiers() {
  return useQuery({
    queryKey: ["ce-dossiers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ce_dossiers")
        .select(CE_SELECT)
        .order("date_closing_cible", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return (data ?? []) as CeDossier[];
    },
  });
}

export function useCeDossier(dossierId: string) {
  return useQuery({
    queryKey: ["ce-dossier", dossierId],
    enabled: Boolean(dossierId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ce_dossiers")
        .select(CE_SELECT)
        .eq("id", dossierId)
        .single();
      if (error) throw error;
      return data as CeDossier;
    },
  });
}

export function useCreateCeDossier() {
  const invalidate = useInvalidateCe();
  return useMutation({
    mutationFn: async (payload: Partial<CeDossier>) => {
      const { societes_exploitation: _s, ...insert } = payload;
      const { data, error } = await supabase
        .from("ce_dossiers")
        .insert(insert as never)
        .select(CE_SELECT)
        .single();
      if (error) throw error;
      return data as CeDossier;
    },
    onSuccess: invalidate,
  });
}

export function useUpsertCeDossier() {
  const invalidate = useInvalidateCe();
  return useMutation({
    mutationFn: async (payload: Partial<CeDossier> & { id?: string }) => {
      if (payload.id) {
        const { id, societes_exploitation: _s, ...rest } = payload;
        const { data, error } = await supabase
          .from("ce_dossiers")
          .update(rest as never)
          .eq("id", id)
          .select(CE_SELECT)
          .single();
        if (error) throw error;
        return data as CeDossier;
      }
      const { societes_exploitation: _s2, ...insert } = payload;
      const { data, error } = await supabase
        .from("ce_dossiers")
        .insert(insert as never)
        .select(CE_SELECT)
        .single();
      if (error) throw error;
      return data as CeDossier;
    },
    onSuccess: invalidate,
  });
}
