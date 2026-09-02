import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { refreshVeille } from "@/lib/veille.functions";
import type { VeilleAnnonceRow, VeilleStatut } from "@/lib/veille";
import type { AoNatureMarche, AoSecteurCode } from "@/lib/commerceTypes";

export function useVeilleAnnonces() {
  return useQuery({
    queryKey: ["veille-annonces"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("veille_annonces")
        .select("*")
        .order("date_parution", { ascending: false, nullsFirst: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as unknown as VeilleAnnonceRow[];
    },
  });
}

export function useRefreshVeille() {
  const qc = useQueryClient();
  const run = useServerFn(refreshVeille);
  return useMutation({
    mutationFn: async (input?: { fenetreJours?: number; idfSeulement?: boolean }) =>
      run({ data: input ?? {} }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["veille-annonces"] });
    },
  });
}

export function useSetVeilleStatut() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, statut }: { id: string; statut: VeilleStatut }) => {
      const { error } = await supabase
        .from("veille_annonces")
        .update({ statut } as never)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["veille-annonces"] });
    },
  });
}

export function useImportVeilleToAo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (annonce: VeilleAnnonceRow) => {
      const { data: ao, error } = await supabase
        .from("appels_offres")
        .insert({
          reference: `${annonce.source}-${annonce.source_id}`,
          titre: annonce.intitule.slice(0, 500),
          donneur_ordre_libre: annonce.acheteur,
          lieu: annonce.departement,
          date_publication: annonce.date_parution,
          date_limite_depot: annonce.date_limite,
          statut: "non_traite",
          notes: [
            annonce.lien ? `Annonce : ${annonce.lien}` : null,
            annonce.cpv ? `CPV : ${annonce.cpv}` : null,
            annonce.domaines.length ? `Domaines : ${annonce.domaines.join(", ")}` : null,
          ]
            .filter(Boolean)
            .join("\n"),
        } as never)
        .select("id")
        .single();
      if (error) throw error;

      const secteurs = (annonce.secteurs ?? []) as AoSecteurCode[];
      if (secteurs.length > 0) {
        const nature: AoNatureMarche = "autre";
        const { error: sErr } = await supabase.from("ao_secteurs").insert(
          secteurs.map((secteur) => ({
            ao_id: ao.id,
            secteur,
            nature_marche: nature,
            prestations: [],
          })) as never,
        );
        if (sErr) throw sErr;
      }

      const { error: upErr } = await supabase
        .from("veille_annonces")
        .update({ statut: "importe", ao_id: ao.id } as never)
        .eq("id", annonce.id);
      if (upErr) throw upErr;

      return ao.id as string;
    },
    onSuccess: () => {
      void qc.invalidateQueries();
    },
  });
}
