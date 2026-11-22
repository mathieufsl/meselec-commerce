import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type SourceVeille = "BOAMP" | "MAXIMILIEN" | "PLACE" | "AWS";

const SOURCES: SourceVeille[] = ["BOAMP", "MAXIMILIEN", "PLACE", "AWS"];

export type ParametresVeille = {
  fenetreJours?: number;
  idfSeulement?: boolean;
  /** Sources à interroger (toutes par défaut). */
  sources?: SourceVeille[];
  parutionDu?: string | null;
  parutionAu?: string | null;
  limiteDu?: string | null;
  limiteAu?: string | null;
  /** Départements ; null = France entière ; absent = IDF + 60 + 27. */
  departements?: string[] | null;
};

const JOUR = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Veille (quotidienne ou manuelle) : le BOAMP est lu tout de suite ; Maximilien,
 * PLACE et AWS sont lus par le robot (plusieurs minutes), lancé avec les mêmes critères.
 */
export const refreshVeille = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: ParametresVeille) => {
    const jour = (v: unknown) => (typeof v === "string" && JOUR.test(v) ? v : null);
    const sources = (Array.isArray(input.sources) ? input.sources : SOURCES).filter(
      (s): s is SourceVeille => SOURCES.includes(s),
    );
    return {
      fenetreJours: Math.min(Math.max(input.fenetreJours ?? 7, 1), 60),
      idfSeulement: input.idfSeulement ?? true,
      sources,
      parutionDu: jour(input.parutionDu),
      parutionAu: jour(input.parutionAu),
      limiteDu: jour(input.limiteDu),
      limiteAu: jour(input.limiteAu),
      ...(input.departements === undefined
        ? {}
        : {
            departements: Array.isArray(input.departements)
              ? input.departements
                  .map((d) => String(d).trim().toUpperCase())
                  .filter((d) => /^(\d{2,3}|2[AB])$/.test(d))
                  .slice(0, 101)
              : null,
          }),
    };
  })
  .handler(async ({ data, context }) => {
    const { sources, ...options } = data;
    const plateformes = sources.filter((s) => s !== "BOAMP");
    const { lancerRobotDce } = await import("@/lib/veilleDce.server");
    const plateformesLancees = plateformes.length
      ? await lancerRobotDce({
          collecte: true,
          parametres: { ...options, sources: plateformes },
        }).catch(() => false)
      : false;
    if (!sources.includes("BOAMP")) {
      return {
        ok: true as const,
        collectees: 0,
        retenues: 0,
        nouvelles: 0,
        idsNouvelles: [] as string[],
        plateformesLancees,
      };
    }
    const { collecterVeille } = await import("@/lib/veilleCollect.server");
    const res = await collecterVeille(context.supabase, options);
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
      idsNouvelles: res.idsNouvelles,
      plateformesLancees,
    };
  });

export const qualifierVeille = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { ids?: string[]; limit?: number }) => ({
    ids: Array.isArray(input.ids)
      ? input.ids.filter((i) => typeof i === "string").slice(0, 200)
      : undefined,
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
      .update({
        analyse_statut: "a_faire",
        analyse_tentatives: 0,
        analyse_erreur: null,
        analyse_etape: "Demande envoyée au robot",
        analyse_etape_at: new Date().toISOString(),
        analyse_run_url: null,
      })
      .eq("id", data.id)
      .select("id");
    if (error) throw new Error(error.message);
    if (!maj || maj.length === 0) throw new Error("Annonce introuvable ou droits insuffisants");

    const { lancerRobotDce } = await import("@/lib/veilleDce.server");
    const lance = await lancerRobotDce();
    if (!lance) {
      await context.supabase
        .from("veille_annonces")
        .update({ analyse_etape: "En attente du passage automatique (7h17)" })
        .eq("id", data.id);
    }
    return { lance };
  });

/** Résumé IA de l'avis BOAMP d'une annonce (mis en cache dans `avis_resume`). */
export const resumerAvisFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string; force?: boolean }) => {
    if (typeof input?.id !== "string" || !/^[0-9a-f-]{36}$/i.test(input.id)) {
      throw new Error("Identifiant d'annonce invalide");
    }
    return { id: input.id, force: input.force === true };
  })
  .handler(async ({ data, context }) => {
    const { resumerAvis } = await import("@/lib/veilleResume.server");
    return resumerAvis(context.supabase, data.id, data.force);
  });

/**
 * Ajoute à la veille un AO trouvé sur un autre site, à partir du lien de son
 * avis, puis le qualifie (IA) comme une annonce collectée.
 */
export const ajouterAnnonceParLienFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { url: string }) => {
    if (typeof input?.url !== "string" || input.url.length > 2000) {
      throw new Error("Lien invalide");
    }
    return { url: input.url.trim() };
  })
  .handler(async ({ data, context }) => {
    const { ajouterAnnonceParLien } = await import("@/lib/veilleManuel.server");
    const res = await ajouterAnnonceParLien(context.supabase, data.url);
    if (!res.ok || res.deja) return { ...res, qualifiee: false };
    let qualifiee = false;
    try {
      const { qualifierAnnonces } = await import("@/lib/veilleQualif.server");
      const q = await qualifierAnnonces(context.supabase, { ids: [res.id] });
      qualifiee = q.ok && q.qualifiees > 0;
      if (q.dceDemandes > 0) {
        const { lancerRobotDce } = await import("@/lib/veilleDce.server");
        await lancerRobotDce();
      }
    } catch (e) {
      console.error("[veille] qualification de l'annonce ajoutée :", e);
    }
    return { ...res, qualifiee };
  });
