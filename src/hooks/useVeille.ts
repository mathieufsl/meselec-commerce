import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import {
  demanderAnalyseDce,
  qualifierVeille,
  rattraperVeilleFn,
  refreshVeille,
  resumerAvisFn,
} from "@/lib/veille.functions";
import type { AvisResume } from "@/lib/veilleResume";
import type { QualificationProfil } from "@/lib/veilleQualif";
import { VEILLE_ANNONCE_COLONNES, type VeilleAnnonceRow, type VeilleStatut } from "@/lib/veille";
import { resumeAnalyseLignes } from "@/lib/veilleAnalyse";
import type { AoNatureMarche, AoSecteurCode } from "@/lib/commerceTypes";

export function useVeilleAnnonces() {
  return useQuery({
    queryKey: ["veille-annonces"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("veille_annonces")
        // Pas de `raw` (avis complet, volumineux) dans la liste.
        .select(VEILLE_ANNONCE_COLONNES)
        .order("date_parution", { ascending: false, nullsFirst: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as unknown as VeilleAnnonceRow[];
    },
    // Tant qu'une analyse est en cours, on rafraîchit pour suivre le robot étape par étape.
    refetchInterval: (query) =>
      query.state.data?.some((a) => a.analyse_statut === "a_faire") ? 5_000 : false,
  });
}

export function useDemanderAnalyseDce() {
  const qc = useQueryClient();
  const run = useServerFn(demanderAnalyseDce);
  return useMutation({
    mutationFn: async (id: string) => run({ data: { id } }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["veille-annonces"] });
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
          annonce_url: annonce.lien,
          date_publication: annonce.date_parution,
          date_limite_depot: annonce.date_limite,
          statut: "non_traite",
          notes: [
            annonce.lien ? `Annonce : ${annonce.lien}` : null,
            annonce.cpv ? `CPV : ${annonce.cpv}` : null,
            annonce.domaines.length ? `Domaines : ${annonce.domaines.join(", ")}` : null,
            annonce.url_dce ? `DCE : ${annonce.url_dce}` : null,
            ...(annonce.analyse_dce
              ? [
                  "",
                  "Analyse DCE :",
                  ...resumeAnalyseLignes(annonce.analyse_dce),
                  annonce.analyse_dce.resume,
                ]
              : []),
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

export type VeilleRecipient = {
  id: string;
  email: string;
  nom: string | null;
  actif: boolean;
};

export function useVeilleRecipients() {
  return useQuery({
    queryKey: ["veille-recipients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("veille_email_recipients")
        .select("id, email, nom, actif")
        .order("email");
      if (error) throw error;
      return (data ?? []) as VeilleRecipient[];
    },
  });
}

export function useAddVeilleRecipient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ email, nom }: { email: string; nom?: string }) => {
      const { error } = await supabase
        .from("veille_email_recipients")
        .insert({ email: email.trim().toLowerCase(), nom: nom?.trim() || null } as never);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["veille-recipients"] });
    },
  });
}

export function useUpdateVeilleRecipient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, actif }: { id: string; actif: boolean }) => {
      const { error } = await supabase
        .from("veille_email_recipients")
        .update({ actif } as never)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["veille-recipients"] });
    },
  });
}

export function useDeleteVeilleRecipient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("veille_email_recipients").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["veille-recipients"] });
    },
  });
}

export function useQualifierVeille() {
  const qc = useQueryClient();
  const run = useServerFn(qualifierVeille);
  return useMutation({
    mutationFn: async (input?: { ids?: string[]; limit?: number }) => run({ data: input ?? {} }),
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: ["veille-annonces"] });
    },
  });
}

export function useRattraperVeille() {
  const qc = useQueryClient();
  const run = useServerFn(rattraperVeilleFn);
  return useMutation({
    mutationFn: async (input?: { jours?: number; idwebs?: string[] }) => run({ data: input ?? {} }),
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: ["veille-annonces"] });
    },
  });
}

export function useQualificationProfils() {
  return useQuery({
    queryKey: ["qualification-profils"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("qualification_profil" as never)
        .select("*")
        .order("entite");
      if (error) throw error;
      return (data ?? []) as unknown as QualificationProfil[];
    },
  });
}

export function useUpdateQualificationProfil() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (profil: QualificationProfil) => {
      if (!profil.id) throw new Error("Profil sans identifiant");
      const { id, updated_at: _u, ...rest } = profil;
      const { error } = await supabase
        .from("qualification_profil" as never)
        .update({ ...rest, updated_at: new Date().toISOString() } as never)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["qualification-profils"] });
    },
  });
}

export type VeilleAvisComplet = {
  raw: Record<string, unknown> | null;
  avis_resume: AvisResume | null;
};

/** Avis BOAMP complet (`raw`) et son résumé IA, chargés à la demande pour le panneau détail. */
export function useVeilleAvisComplet(id: string | null) {
  return useQuery({
    queryKey: ["veille-avis", id],
    enabled: Boolean(id),
    staleTime: Infinity,
    queryFn: async (): Promise<VeilleAvisComplet> => {
      const { data, error } = await supabase
        .from("veille_annonces")
        .select("raw, avis_resume")
        .eq("id", id as string)
        .maybeSingle();
      if (error) throw error;
      const row = data as Partial<VeilleAvisComplet> | null;
      return { raw: row?.raw ?? null, avis_resume: row?.avis_resume ?? null };
    },
  });
}

export function useResumerAvis() {
  const qc = useQueryClient();
  const run = useServerFn(resumerAvisFn);
  return useMutation({
    mutationFn: async (input: { id: string; force?: boolean }) => run({ data: input }),
    onSuccess: (res, input) => {
      if (!res.ok) return;
      qc.setQueryData<VeilleAvisComplet>(["veille-avis", input.id], (old) => ({
        raw: old?.raw ?? null,
        avis_resume: res.resume,
      }));
    },
  });
}
