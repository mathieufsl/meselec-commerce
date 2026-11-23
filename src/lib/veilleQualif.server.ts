import type { SupabaseClient } from "@supabase/supabase-js";
import {
  aplatirDonnees,
  detecterPlateforme,
  extraireCpv,
  extraireUrls,
  lireAvis,
} from "@/lib/veilleAvis";
import {
  buildSystemPrompt,
  buildUserMessage,
  DEFAULT_QUALIF_MODEL,
  parseQualificationResponse,
  QUALIF_TOOL,
  QUALIF_TOOL_NAME,
  type QualificationProfil,
} from "@/lib/veilleQualif";
import { fetchBoampRecord } from "@/lib/veilleCollect.server";

const API_URL = "https://api.anthropic.com/v1/messages";
const TIMEOUT_MS = 90_000;
const CONCURRENCE = 3;

type AnnonceRow = {
  id: string;
  source_id: string;
  intitule: string;
  acheteur: string | null;
  cpv: string | null;
  departement: string | null;
  date_limite: string | null;
  raw: Record<string, unknown> | null;
  analyse_statut: string | null;
};

export type QualifResultat = {
  ok: boolean;
  error?: string;
  traitees: number;
  qualifiees: number;
  erreurs: number;
  /** Annonces prioritaires dont l'analyse du DCE vient d'être demandée au robot. */
  dceDemandes: number;
};

function modele(): string {
  return process.env["QUALIF_MODEL"]?.trim() || DEFAULT_QUALIF_MODEL;
}

async function appelerClaude(system: string, user: string, model: string, apiKey: string) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(API_URL, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: 4000,
        // Haiku 5.5 refuse une température non par défaut ; la réflexion est
        // désactivée pour que l'appel forcé de l'outil soit accepté.
        thinking: { type: "disabled" },
        system,
        tools: [QUALIF_TOOL],
        tool_choice: { type: "tool", name: QUALIF_TOOL_NAME },
        messages: [{ role: "user", content: user }],
      }),
    });
    const body = await res.text();
    if (!res.ok) throw new Error(`API Anthropic ${res.status} : ${body.slice(0, 300)}`);
    return parseQualificationResponse(JSON.parse(body));
  } finally {
    clearTimeout(timer);
  }
}

async function qualifierUne(
  client: SupabaseClient,
  a: AnnonceRow,
  system: string,
  model: string,
  apiKey: string,
): Promise<"ok" | "ok_dce" | "erreur"> {
  const donnees = a.raw?.["donnees"];
  const { plateforme, dce_url } = detecterPlateforme(extraireUrls(donnees ?? ""));
  const user = buildUserMessage({
    intitule: a.intitule,
    acheteur: a.acheteur,
    cpv: a.cpv,
    departement: a.departement,
    date_limite: a.date_limite,
    texteAvis: donnees ? aplatirDonnees(donnees, 40000) : "",
  });

  let lastError: unknown = null;
  for (let tentative = 0; tentative < 2; tentative += 1) {
    try {
      const { qualification: q, usage } = await appelerClaude(system, user, model, apiKey);
      // L'analyse du DCE (Sonnet, 5 à 30 centimes) ne part que sur clic. Mettre
      // VEILLE_DCE_AUTO=1 pour l'envoyer d'office au robot sur les prioritaires.
      const demanderDce =
        process.env["VEILLE_DCE_AUTO"] === "1" &&
        q.decision === "prioritaire" &&
        (a.analyse_statut ?? "non_demande") === "non_demande";
      const { error } = await client
        .from("veille_annonces")
        .update({
          qualif_statut: "qualifie",
          entite: q.entite,
          decision: q.decision,
          score: q.score,
          resume: q.resume,
          raisons: q.raisons,
          points_rouges: q.points_rouges,
          exigences: q.exigences,
          certif_manquante: q.certif_manquante,
          interet_relationnel: q.interet_relationnel,
          type_marche: q.type_marche,
          plateforme,
          dce_url,
          qualif_model: model,
          qualif_error: null,
          qualif_usage: usage,
          qualified_at: new Date().toISOString(),
          ...(demanderDce
            ? {
                analyse_statut: "a_faire",
                analyse_tentatives: 0,
                analyse_etape: "Prioritaire : analyse du DCE demandée au robot",
                analyse_etape_at: new Date().toISOString(),
              }
            : {}),
        } as never)
        .eq("id", a.id);
      if (error) throw error;
      return demanderDce ? "ok_dce" : "ok";
    } catch (e) {
      lastError = e;
    }
  }
  const message =
    lastError instanceof Error ? lastError.message : String(lastError ?? "Erreur inconnue");
  await client
    .from("veille_annonces")
    .update({
      qualif_statut: "erreur",
      qualif_error: message.slice(0, 1000),
      plateforme,
      dce_url,
      qualif_model: model,
    } as never)
    .eq("id", a.id);
  return "erreur";
}

/** Exécute `fn` sur chaque élément avec au plus `n` appels simultanés. */
async function parLots<T>(items: T[], n: number, fn: (item: T) => Promise<void>) {
  let i = 0;
  const workers = Array.from({ length: Math.min(n, items.length) }, async () => {
    while (i < items.length) {
      const item = items[i] as T;
      i += 1;
      await fn(item);
    }
  });
  await Promise.all(workers);
}

/**
 * Qualifie par Claude les annonces en attente (ou celles listées dans `ids`,
 * même déjà qualifiées : requalification).
 */
export async function qualifierAnnonces(
  client: SupabaseClient,
  options: { ids?: string[] | undefined; limit?: number } = {},
): Promise<QualifResultat> {
  const apiKey = process.env["ANTHROPIC_API_KEY"];
  if (!apiKey) {
    return {
      ok: false,
      error: "Clé ANTHROPIC_API_KEY absente côté serveur.",
      traitees: 0,
      qualifiees: 0,
      erreurs: 0,
      dceDemandes: 0,
    };
  }
  const limit = Math.min(Math.max(options.limit ?? 50, 1), 200);

  const { data: profils, error: pErr } = await client
    .from("qualification_profil")
    .select("*")
    .eq("actif", true)
    .order("entite");
  if (pErr) throw pErr;
  if (!profils?.length) {
    return {
      ok: false,
      error: "Aucun profil de qualification actif.",
      traitees: 0,
      qualifiees: 0,
      erreurs: 0,
      dceDemandes: 0,
    };
  }

  let query = client
    .from("veille_annonces")
    .select(
      "id, source_id, intitule, acheteur, cpv, departement, date_limite, raw, analyse_statut",
    );
  if (options.ids?.length) query = query.in("id", options.ids);
  else
    query = query.eq("qualif_statut", "a_qualifier").order("date_parution", { ascending: false });
  const { data: annonces, error: aErr } = await query.limit(limit);
  if (aErr) throw aErr;

  const system = buildSystemPrompt(profils as unknown as QualificationProfil[]);
  const model = modele();
  let qualifiees = 0;
  let erreurs = 0;
  let dceDemandes = 0;
  await parLots((annonces ?? []) as unknown as AnnonceRow[], CONCURRENCE, async (a) => {
    const r = await qualifierUne(client, a, system, model, apiKey);
    if (r === "erreur") erreurs += 1;
    else qualifiees += 1;
    if (r === "ok_dce") dceDemandes += 1;
  });

  return { ok: true, traitees: (annonces ?? []).length, qualifiees, erreurs, dceDemandes };
}

/**
 * Rattrapage : pour les annonces BOAMP récentes dont `raw` est vide (ou listées
 * par idweb), re-télécharge l'avis complet, remplit `raw`, puis les qualifie.
 */
export async function rattraperVeille(
  client: SupabaseClient,
  options: { jours?: number; idwebs?: string[] | undefined } = {},
): Promise<QualifResultat & { rattrapees: number }> {
  let query = client.from("veille_annonces").select("id, source_id, raw").eq("source", "BOAMP");
  if (options.idwebs?.length) {
    query = query.in("source_id", options.idwebs);
  } else {
    const depuis = new Date(Date.now() - (options.jours ?? 14) * 86400000)
      .toISOString()
      .slice(0, 10);
    query = query.gte("date_parution", depuis);
  }
  const { data, error } = await query.limit(300);
  if (error) throw error;

  const rows = (data ?? []) as Array<{ id: string; source_id: string; raw: unknown }>;
  const aRemplir = rows.filter(
    (r) => !r.raw || (typeof r.raw === "object" && Object.keys(r.raw as object).length === 0),
  );

  let rattrapees = 0;
  await parLots(aRemplir, 4, async (r) => {
    try {
      const record = await fetchBoampRecord(r.source_id);
      if (!record) return;
      const cpv = extraireCpv(record["donnees"]).join(" ") || null;
      const avis = lireAvis(record);
      const { error: upErr } = await client
        .from("veille_annonces")
        .update({
          raw: record,
          url_dce: avis.url_dce,
          plateforme: avis.plateforme,
          avis_indices: avis.indices,
          ...(cpv ? { cpv } : {}),
        } as never)
        .eq("id", r.id);
      if (!upErr) rattrapees += 1;
    } catch {
      /* annonce introuvable ou API indisponible : on la qualifie quand même */
    }
  });

  // idweb explicites : on (re)qualifie tout. Fenêtre de jours : seulement le non qualifié.
  let idsAQualifier = rows.map((r) => r.id);
  if (!options.idwebs?.length && idsAQualifier.length > 0) {
    const { data: aQualifier } = await client
      .from("veille_annonces")
      .select("id")
      .in("id", idsAQualifier)
      .neq("qualif_statut", "qualifie");
    idsAQualifier = ((aQualifier ?? []) as Array<{ id: string }>).map((r) => r.id);
  }

  if (idsAQualifier.length === 0) {
    return { ok: true, traitees: 0, qualifiees: 0, erreurs: 0, dceDemandes: 0, rattrapees };
  }
  const res = await qualifierAnnonces(client, { ids: idsAQualifier, limit: 200 });
  return { ...res, rattrapees };
}
