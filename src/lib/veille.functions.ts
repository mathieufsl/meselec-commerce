import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const refreshVeille = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { fenetreJours?: number; idfSeulement?: boolean }) => ({
    fenetreJours: Math.min(Math.max(input.fenetreJours ?? 7, 1), 60),
    idfSeulement: input.idfSeulement ?? true,
  }))
  .handler(async ({ data, context }) => {
    const { collecterVeille } = await import("@/lib/veilleCollect.server");
    const res = await collecterVeille(context.supabase, data);
    if (!res.ok) {
      return {
        ok: false as const,
        error: res.error,
        collectees: res.collectees,
        retenues: res.retenues,
        nouvelles: res.nouvelles,
      };
    }
    return {
      ok: true as const,
      collectees: res.collectees,
      retenues: res.retenues,
      nouvelles: res.nouvelles,
    };
  });

const GITHUB_DEPOT = "mathieufsl/meselec-commerce";
const GITHUB_WORKFLOW = "veille-dce.yml";

/**
 * Demande l'analyse du DCE d'une annonce (bouton de la page Veille) : marque
 * l'annonce « à faire » puis lance le robot GitHub Actions. Sans jeton GitHub
 * configuré, la demande est reprise au passage planifié du matin.
 */
export const demanderAnalyseDce = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => {
    if (!/^[0-9a-f-]{36}$/i.test(input.id)) throw new Error("Annonce invalide");
    return { id: input.id };
  })
  .handler(async ({ data, context }) => {
    // Passe par le client de l'utilisateur : les droits d'édition (RLS) s'appliquent.
    const { data: maj, error } = await context.supabase
      .from("veille_annonces")
      .update({ analyse_statut: "a_faire", analyse_tentatives: 0, analyse_erreur: null })
      .eq("id", data.id)
      .select("id");
    if (error) throw new Error(error.message);
    if (!maj || maj.length === 0) throw new Error("Annonce introuvable ou droits insuffisants");

    const jeton = process.env["GITHUB_DISPATCH_TOKEN"];
    if (!jeton) return { lance: false as const };

    const res = await fetch(
      `https://api.github.com/repos/${GITHUB_DEPOT}/actions/workflows/${GITHUB_WORKFLOW}/dispatches`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${jeton}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
          "User-Agent": "rms-commerce-veille",
        },
        // Pas d'annonce ciblée : le robot traite toutes les demandes en attente,
        // ce qui couvre plusieurs clics rapprochés (une seule exécution à la fois).
        body: JSON.stringify({ ref: "main", inputs: { collecte: "false" } }),
      },
    );
    if (!res.ok) {
      console.error(`[veille-dce] GitHub ${res.status} : ${await res.text()}`);
      return { lance: false as const };
    }
    return { lance: true as const };
  });
