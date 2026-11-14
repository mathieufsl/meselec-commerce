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

export const qualifierVeille = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { ids?: string[]; limit?: number }) => ({
    ids: Array.isArray(input.ids) ? input.ids.filter((i) => typeof i === "string").slice(0, 200) : undefined,
    limit: Math.min(Math.max(input.limit ?? 50, 1), 200),
  }))
  .handler(async ({ data, context }) => {
    const { qualifierAnnonces } = await import("@/lib/veilleQualif.server");
    const res = await qualifierAnnonces(context.supabase, data);
    if (res.dceDemandes > 0) {
      const { lancerRobotDce } = await import("@/lib/veilleDce.server");
      await lancerRobotDce();
    }
    return res;
  });

export const rattraperVeilleFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { jours?: number; idwebs?: string[] }) => ({
    jours: Math.min(Math.max(input.jours ?? 14, 1), 60),
    idwebs: Array.isArray(input.idwebs)
      ? input.idwebs.filter((i) => typeof i === "string" && /^[\w-]+$/.test(i)).slice(0, 100)
      : undefined,
  }))
  .handler(async ({ data, context }) => {
    const { rattraperVeille } = await import("@/lib/veilleQualif.server");
    const res = await rattraperVeille(context.supabase, data);
    if (res.dceDemandes > 0) {
      const { lancerRobotDce } = await import("@/lib/veilleDce.server");
      await lancerRobotDce();
    }
    return res;

  });

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

    const { lancerRobotDce } = await import("@/lib/veilleDce.server");
    return { lance: await lancerRobotDce() };
  });
