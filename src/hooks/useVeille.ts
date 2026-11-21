import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import {
  ajouterAnnonceParLienFn,
  demanderAnalyseDce,
  qualifierVeille,
  rattraperVeilleFn,
  refreshVeille,
} from "@/lib/veille.functions";
import type { AvisResume } from "@/lib/veilleResume";
import type { QualificationProfil } from "@/lib/veilleQualif";
import {
  analyseEnCours,
  VEILLE_ANNONCE_COLONNES,
  type VeilleAnnonceRow,
  type VeilleStatut,
} from "@/lib/veille";
import { resumeAnalyseLignes } from "@/lib/veilleAnalyse";
import { copierDepotVeilleVersAo } from "@/lib/aoDocuments";
import { toast } from "sonner";
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
    refetchInterval: (query) => (query.state.data?.some(analyseEnCours) ? 5_000 : false),
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
    mutationFn: async ({
      id,
      statut,
      motif,
      note,
    }: {
      id: string;
      statut: VeilleStatut;
      /** Motif quand on ignore ; effacé quand on restaure. */
      motif?: string | null;
      note?: string | null;
    }) => {
      const { error } = await supabase
        .from("veille_annonces")
        .update({
          statut,
          motif_ignore: statut === "ignore" ? (motif ?? null) : null,
          motif_ignore_note: statut === "ignore" ? note?.trim() || null : null,
        } as never)
        .eq("id", id);
      if (error) throw error;
    },
    // Mise à jour immédiate de la liste : l'annonce triée disparaît sans attendre le serveur.
    onMutate: async ({ id, statut, motif, note }) => {
      await qc.cancelQueries({ queryKey: ["veille-annonces"] });
      const avant = qc.getQueryData<VeilleAnnonceRow[]>(["veille-annonces"]);
      qc.setQueryData<VeilleAnnonceRow[]>(["veille-annonces"], (old) =>
        old?.map((a) =>
          a.id === id
            ? {
                ...a,
                statut,
                motif_ignore: statut === "ignore" ? (motif ?? null) : null,
                motif_ignore_note: statut === "ignore" ? note?.trim() || null : null,
              }
            : a,
        ),
      );
      return { avant };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.avant) qc.setQueryData(["veille-annonces"], ctx.avant);
    },
    onSettled: () => {
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

      // Pièces du DCE déposées à la main sur la Veille : on les garde dans les documents de l'AO.
      const depot = await copierDepotVeilleVersAo({ annonceId: annonce.id, aoId: ao.id });
      if (depot.copies > 0) {
        toast.success(`${depot.copies} document(s) déposé(s) ajouté(s) à l'AO`);
      }
      if (depot.echecs.length > 0) {
        toast.error(`Documents non copiés vers l'AO : ${depot.echecs.join(" · ")}`);
      }

      return ao.id as string;
    },
    onMutate: async (annonce) => {
      await qc.cancelQueries({ queryKey: ["veille-annonces"] });
      qc.setQueryData<VeilleAnnonceRow[]>(["veille-annonces"], (old) =>
        old?.map((a) => (a.id === annonce.id ? { ...a, statut: "importe" } : a)),
      );
    },
    onSettled: () => {
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
    // Court : un résumé fait dans un autre onglet (ou dont la réponse s'est perdue) réapparaît.
    staleTime: 30_000,
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

/** Résumé déjà enregistré en base pour cette annonce (ou null). */
async function lireResumeEnregistre(id: string): Promise<AvisResume | null> {
  const { data } = await supabase
    .from("veille_annonces")
    .select("avis_resume")
    .eq("id", id)
    .maybeSingle();
  return ((data as { avis_resume?: AvisResume | null } | null)?.avis_resume ??
    null) as AvisResume | null;
}

export function useResumerAvis() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      force?: boolean;
    }): Promise<{ ok: true; resume: AvisResume } | { ok: false; error: string }> => {
      // Edge Function Supabase : elle lit le secret ANTHROPIC_API_KEY du projet.
      // Elle coupe l'appel IA à 90 s ; ce délai couvre une fonction qui ne répond plus.
      let timer: ReturnType<typeof setTimeout> | undefined;
      const delai = new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error("Pas de réponse de l'IA après 100 s. Réessayez.")),
          100_000,
        );
      });
      let message: string;
      try {
        const { data, error } = await Promise.race([
          supabase.functions.invoke<
            { ok: true; resume: AvisResume } | { ok: false; error: string }
          >("veille-resume-avis", { body: input }),
          delai,
        ]);
        if (data) return data;
        message = error?.message ?? "Échec du résumé IA";
        const ctx = (error as { context?: Response } | null)?.context;
        if (ctx && typeof ctx.json === "function") {
          const corps = (await ctx.json().catch(() => null)) as { error?: string } | null;
          if (corps?.error) message = corps.error;
        }
      } catch (e) {
        message = e instanceof Error ? e.message : "Échec du résumé IA";
      } finally {
        clearTimeout(timer);
      }
      // La réponse a pu se perdre en route (« Failed to fetch ») alors que le résumé
      // a bien été fait et enregistré côté serveur : on le relit avant d'afficher l'erreur.
      const enregistre = await lireResumeEnregistre(input.id).catch(() => null);
      if (enregistre && !input.force) return { ok: true, resume: enregistre };
      return { ok: false, error: `${message} — réessayez.` };
    },
    onSuccess: (res, input) => {
      if (!res.ok) return;
      qc.setQueryData<VeilleAvisComplet>(["veille-avis", input.id], (old) => ({
        raw: old?.raw ?? null,
        avis_resume: res.resume,
      }));
    },
    onSettled: (_res, _err, input) => {
      void qc.invalidateQueries({ queryKey: ["veille-avis", input.id] });
    },
  });
}

/** Arrête les essais du robot DCE sur une annonce (après un échec). */
export function useAbandonnerAnalyseDce() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("veille_annonces")
        .update({
          analyse_statut: "non_demande",
          analyse_etape: null,
          analyse_etape_at: null,
        } as never)
        .eq("id", id);
      if (error) throw error;
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: ["veille-annonces"] });
    },
  });
}

/** Ajoute un AO trouvé sur un autre site à partir du lien de son avis. */
export function useAjouterAnnonceParLien() {
  const qc = useQueryClient();
  const run = useServerFn(ajouterAnnonceParLienFn);
  return useMutation({
    mutationFn: async (url: string) => run({ data: { url } }),
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: ["veille-annonces"] });
    },
  });
}
