/**
 * Collecte des consultations publiées sur les plateformes Atexo (Maximilien,
 * PLACE) : beaucoup de petits marchés (MAPA) n'y sont pas doublés au BOAMP.
 *
 * Pour chaque plateforme, une recherche par mot-clé métier (même champ que notre
 * filtre : l'intitulé et l'objet), lecture des pages de résultats, filtre zone +
 * métier, puis lecture de la fiche des seules consultations nouvelles (CPV,
 * texte complet). Les doublons avec le BOAMP sont écartés : même numéro de
 * consultation dans le lien du DCE, ou même intitulé et même date limite.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { domainesDetectes, sansAccents, secteursFromDomaines } from "@/lib/veille";
import { indicesDepuisTexte, type VeillePlateforme } from "@/lib/veilleAvis";
import { trouverDoublon } from "@/lib/veilleDoublons.server";
import { zoneCollecte, type OptionsCollecte } from "@/lib/veilleCollect.server";
import {
  lireDetailAtexo,
  lireResultatsAtexo,
  totalResultats,
  departementsDepuisTexte,
  type ConsultationAtexo,
} from "@/lib/veilleAtexo";

export type PlateformeAtexo = {
  source: string;
  plateforme: VeillePlateforme;
  libelle: string;
  base: string;
};

export const PLATEFORMES_ATEXO: PlateformeAtexo[] = [
  {
    source: "MAXIMILIEN",
    plateforme: "Maximilien",
    libelle: "Maximilien",
    base: "https://marches.maximilien.fr",
  },
  {
    source: "PLACE",
    plateforme: "PLACE",
    libelle: "PLACE",
    base: "https://www.marches-publics.gouv.fr",
  },
];

/** Mots cherchés sur les plateformes : nos métiers (le filtre fin vient après). */
export const MOTS_RECHERCHE_ATEXO = [
  "eclairage",
  "candelabre",
  "luminaire",
  "illumination",
  "electricite",
  "electrique",
  "courant fort",
  "vrd",
  "voirie",
  "reseaux",
  "genie civil",
  "terrassement",
  "enfouissement",
  "assainissement",
  "eau potable",
  "canalisation",
  "raccordement",
  "signalisation",
  "feux tricolores",
  "irve",
  "borne de recharge",
  "courant faible",
  "electrotechnique",
  "espaces publics",
  "chaussee",
  "trottoir",
  "enrobe",
  "eaux pluviales",
];

const UA = "rms-commerce-veille/1.0 (veille appels d'offres)";
const PAUSE_MS = 400;
const MAX_PAGES_PAR_MOT = 40;

const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Petite session HTTP avec cookies (les pages suivantes sont des « postbacks » PRADO). */
export function sessionHttp() {
  const cookies = new Map<string, string>();
  return async function lire(url: string, corps?: URLSearchParams): Promise<string> {
    const res = await fetch(url, {
      method: corps ? "POST" : "GET",
      redirect: "follow",
      signal: AbortSignal.timeout(60_000),
      headers: {
        "User-Agent": UA,
        Accept: "text/html",
        ...(corps ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
        ...(cookies.size ? { Cookie: [...cookies].map(([k, v]) => `${k}=${v}`).join("; ") } : {}),
      },
      ...(corps ? { body: corps.toString() } : {}),
    });
    for (const c of res.headers.getSetCookie?.() ?? []) {
      const [paire] = c.split(";");
      const i = paire?.indexOf("=") ?? -1;
      if (paire && i > 0) cookies.set(paire.slice(0, i).trim(), paire.slice(i + 1).trim());
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.text();
  };
}

function decoderAttribut(v: string) {
  return v.replace(/&amp;/g, "&");
}

/** Toutes les consultations d'une recherche par mot-clé (pages suivantes comprises). */
export async function chercher(p: PlateformeAtexo, mot: string): Promise<ConsultationAtexo[]> {
  const lire = sessionHttp();
  let html = await lire(
    `${p.base}/?page=Entreprise.EntrepriseAdvancedSearch&searchAnnCons&keyWord=${encodeURIComponent(mot)}`,
  );
  const resultats = lireResultatsAtexo(html, p.base);
  const total = totalResultats(html) ?? resultats.length;
  const pages = Math.min(Math.ceil(total / 10), MAX_PAGES_PAR_MOT);
  for (let page = 2; page <= pages; page += 1) {
    const etat = html.match(/name="PRADO_PAGESTATE" id="PRADO_PAGESTATE" value="([^"]+)"/)?.[1];
    const action = html.match(/<form id="ctl0_ctl1" method="post" action="([^"]+)"/)?.[1];
    if (!etat || !action) break;
    await pause(PAUSE_MS);
    html = await lire(
      `${p.base}${decoderAttribut(action)}`,
      new URLSearchParams({
        PRADO_PAGESTATE: etat,
        PRADO_POSTBACK_TARGET: "ctl0$CONTENU_PAGE$resultSearch$PagerTop$ctl2",
        PRADO_POSTBACK_PARAMETER: "",
      }),
    );
    const suite = lireResultatsAtexo(html, p.base);
    if (suite.length === 0) break;
    resultats.push(...suite);
  }
  return resultats;
}

/** Déjà dans la veille (même consultation, ou même AO venu d'une autre source) ? */
async function dejaConnue(
  client: SupabaseClient,
  p: PlateformeAtexo,
  c: ConsultationAtexo,
): Promise<boolean> {
  const sourceId = `${c.org}-${c.id}`;
  const { data: meme } = await client
    .from("veille_annonces")
    .select("id")
    .eq("source", p.source)
    .eq("source_id", sourceId)
    .limit(1);
  if (meme?.length) return true;
  return (
    (await trouverDoublon(client, {
      source: p.source,
      source_id: sourceId,
      intitule: c.intitule,
      date_limite: c.date_limite,
      liens: [c.lien],
      acheteur: c.organisme?.replace(/\s*\(\d{4,5}\s*-[^)]*\)\s*$/, "") ?? null,
    })) != null
  );
}

export type CollecteAtexoResultat = {
  plateforme: string;
  lues: number;
  retenues: number;
  nouvelles: number;
  erreurs: string[];
  idsNouvelles: string[];
};

export async function collecterAtexo(
  client: SupabaseClient,
  plateforme: PlateformeAtexo,
  journal: (m: string) => void = () => undefined,
  options: OptionsCollecte = {},
): Promise<CollecteAtexoResultat> {
  const zone = zoneCollecte(options);
  const dansLaZone = (deps: string[]) => !zone || deps.some((d) => zone.includes(d));
  const { parutionDu, parutionAu, limiteDu, limiteAu } = options;
  const res: CollecteAtexoResultat = {
    plateforme: plateforme.libelle,
    lues: 0,
    retenues: 0,
    nouvelles: 0,
    erreurs: [],
    idsNouvelles: [],
  };
  const aujourdhui = new Date().toISOString().slice(0, 10);
  const candidates = new Map<string, ConsultationAtexo>();

  for (const mot of MOTS_RECHERCHE_ATEXO) {
    try {
      const trouvees = await chercher(plateforme, mot);
      res.lues += trouvees.length;
      for (const c of trouvees) {
        // Par défaut, seulement les consultations encore ouvertes.
        if (c.date_limite && c.date_limite < (limiteDu ?? aujourdhui)) continue;
        if (limiteAu && (!c.date_limite || c.date_limite > limiteAu)) continue;
        if (parutionDu && (!c.date_parution || c.date_parution < parutionDu)) continue;
        if (parutionAu && (!c.date_parution || c.date_parution > parutionAu)) continue;
        // Zone : départements du lieu d'exécution ; sans lieu connu, on vérifie sur la fiche.
        if (c.departements.length && !dansLaZone(c.departements)) continue;
        // Pas de filtre métier sur l'intitulé : la recherche a déjà trouvé un de nos
        // mots ; la fiche (CPV, texte) puis la qualification IA font le tri.
        candidates.set(`${c.org}-${c.id}`, c);
      }
    } catch (e) {
      res.erreurs.push(`« ${mot} » : ${(e as Error).message}`);
    }
    await pause(PAUSE_MS);
  }
  res.retenues = candidates.size;
  journal(`${plateforme.libelle} : ${res.lues} lues, ${res.retenues} ouvertes dans la zone`);

  const lireFiche = sessionHttp();
  for (const [sourceId, c] of candidates) {
    try {
      if (await dejaConnue(client, plateforme, c)) continue;
      await pause(PAUSE_MS);
      const fiche = lireDetailAtexo(await lireFiche(c.lien));
      let departements = c.departements;
      if (departements.length === 0) {
        const lieu = fiche.texte.match(/Lieu d'ex[ée]cution\s*:\s*([^\n]{0,400})/i)?.[1] ?? "";
        departements = departementsDepuisTexte(lieu);
        if (!dansLaZone(departements)) continue;
      }
      const cpv = fiche.cpv.join(" ") || null;
      const domaines = domainesDetectes(
        cpv ?? "",
        `${c.intitule} ${c.objet ?? ""} ${fiche.texte.slice(0, 4000)}`,
      );
      const acheteur = c.organisme?.replace(/\s*\(\d{4,5}\s*-[^)]*\)\s*$/, "") || null;
      const { data, error } = await client
        .from("veille_annonces")
        .insert({
          source: plateforme.source,
          source_id: sourceId,
          intitule: c.intitule.slice(0, 500),
          acheteur,
          cpv,
          departement: departements.filter((d) => !zone || zone.includes(d)).join(" ") || null,
          date_parution: c.date_parution,
          date_limite: c.date_limite,
          lien: c.lien,
          domaines,
          secteurs: secteursFromDomaines(domaines),
          url_dce: c.lien,
          plateforme: plateforme.plateforme,
          avis_indices: indicesDepuisTexte(fiche.texte),
          raw: {
            donnees: { [`Consultation (${plateforme.libelle})`]: fiche.texte },
            reference: c.reference,
            procedure: c.procedure,
            categorie: c.categorie,
            objet: c.objet,
          },
        })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      res.nouvelles += 1;
      res.idsNouvelles.push(data.id as string);
    } catch (e) {
      res.erreurs.push(`${sourceId} : ${(e as Error).message}`);
    }
  }
  journal(`${plateforme.libelle} : ${res.nouvelles} nouvelle(s) ajoutée(s)`);
  return res;
}
