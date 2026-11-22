/**
 * Collecte des consultations en cours sur AWS (marches-publics.info), très
 * utilisé par les communes pour leurs MAPA. Même principe que Maximilien et
 * PLACE : recherche par mot-clé métier sur la zone, pages de chaque onglet
 * (travaux, services, fournitures), filtre métier et dates, anti-doublons
 * (numéro IDM repris dans les avis BOAMP), puis lecture de l'avis complet.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { domainesDetectes, secteursFromDomaines } from "@/lib/veille";
import { indicesDepuisTexte } from "@/lib/veilleAvis";
import { comptesParNature, lireResultatsAws, type ConsultationAws } from "@/lib/veilleAws";
import { MOTS_RECHERCHE_ATEXO, sessionHttp } from "@/lib/veilleAtexo.server";
import { zoneCollecte, dansZone, type OptionsCollecte } from "@/lib/veilleCollect.server";
import { trouverDoublon } from "@/lib/veilleDoublons.server";
import { extraireSansIa, texteDeLaPage } from "@/lib/veilleManuel.server";
import type { CollecteAtexoResultat } from "@/lib/veilleAtexo.server";

const BASE = "https://www.marches-publics.info";
const PAUSE_MS = 300;
const MAX_PAGES_PAR_ONGLET = 10;

const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Champs du formulaire de recherche avancée (le site attend le formulaire complet). */
function formulaire(mot: string, zone: string[] | null) {
  const champs: Record<string, string> = {
    IDE: "EC", // consultations en cours
    IDN: "X",
    listeCPV: "",
    IDP: "X",
    IDR: zone ? zone.join(",") : "X",
    txtLibre: mot,
    txtLibreLieuExec: "",
    dateNotifDebut: "",
    dateNotifFin: "",
    txtAcheteurNom: "",
    txtAcheteurSiret: "",
    txtTitulaireNom: "",
    txtTitulaireSiret: "",
    txtLibreAcheteur: "",
    txtLibreVille: "",
    txtLibreRef: "",
    txtLibreObjet: "",
    dateParution: "",
    dateExpiration: "",
    annee: "X",
    Rechercher: "Rechercher",
  };
  return new URLSearchParams(champs);
}

export async function chercherAws(mot: string, zone: string[] | null): Promise<ConsultationAws[]> {
  const lire = sessionHttp();
  await lire(`${BASE}/Annonces/rechercher`);
  const html = await lire(`${BASE}/Annonces/lister`, formulaire(mot, zone));
  const resultats = lireResultatsAws(html);
  const comptes = comptesParNature(html);
  // Les pages suivantes de chaque onglet restent dans la session de recherche.
  for (const [onglet, total] of [
    ["t", comptes.t],
    ["s", comptes.s],
    ["f", comptes.f],
  ] as const) {
    const pages = Math.min(Math.ceil(total / 10), MAX_PAGES_PAR_ONGLET);
    for (let page = 2; page <= pages; page += 1) {
      await pause(PAUSE_MS);
      const suite = lireResultatsAws(await lire(`${BASE}/Annonces/lister?pager_${onglet}=${page}`));
      const connus = new Set(resultats.map((r) => r.id));
      const nouveaux = suite.filter((r) => !connus.has(r.id));
      if (nouveaux.length === 0) break;
      resultats.push(...nouveaux);
    }
  }
  return resultats;
}

export async function collecterAws(
  client: SupabaseClient,
  journal: (m: string) => void = () => undefined,
  options: OptionsCollecte = {},
): Promise<CollecteAtexoResultat> {
  const res: CollecteAtexoResultat = {
    plateforme: "AWS",
    lues: 0,
    retenues: 0,
    nouvelles: 0,
    erreurs: [],
    idsNouvelles: [],
  };
  const zone = zoneCollecte(options);
  const { parutionDu, parutionAu, limiteDu, limiteAu } = options;
  const aujourdhui = new Date().toISOString().slice(0, 10);
  const candidates = new Map<string, ConsultationAws>();

  for (const mot of MOTS_RECHERCHE_ATEXO) {
    try {
      const trouvees = await chercherAws(mot, zone);
      res.lues += trouvees.length;
      for (const c of trouvees) {
        if (c.date_limite && c.date_limite < (limiteDu ?? aujourdhui)) continue;
        if (limiteAu && (!c.date_limite || c.date_limite > limiteAu)) continue;
        if (parutionDu && (!c.date_parution || c.date_parution < parutionDu)) continue;
        if (parutionAu && (!c.date_parution || c.date_parution > parutionAu)) continue;
        if (c.departement && !dansZone(c.departement, zone)) continue;
        candidates.set(c.id, c);
      }
    } catch (e) {
      res.erreurs.push(`« ${mot} » : ${(e as Error).message}`);
    }
    await pause(PAUSE_MS);
  }
  res.retenues = candidates.size;
  journal(`AWS : ${res.lues} lues, ${res.retenues} ouvertes dans la zone`);

  const lireAvis = sessionHttp();
  for (const [sourceId, c] of candidates) {
    try {
      const { data: meme } = await client
        .from("veille_annonces")
        .select("id")
        .eq("source", "AWS")
        .eq("source_id", sourceId)
        .limit(1);
      if (meme?.length) continue;
      const doublon = await trouverDoublon(client, {
        source: "AWS",
        source_id: sourceId,
        intitule: c.intitule,
        date_limite: c.date_limite,
        liens: [c.lien, c.url_dce],
      });
      if (doublon) continue;

      await pause(PAUSE_MS);
      const { texte } = texteDeLaPage(await lireAvis(c.lien));
      const lu = extraireSansIa(texte);
      const cpv = lu.cpv.join(" ") || null;
      const domaines = domainesDetectes(cpv ?? "", `${c.intitule} ${texte.slice(0, 4000)}`);
      const { data, error } = await client
        .from("veille_annonces")
        .insert({
          source: "AWS",
          source_id: sourceId,
          intitule: c.intitule.slice(0, 500),
          acheteur: c.acheteur,
          cpv,
          departement: c.departement ?? lu.departement,
          date_parution: c.date_parution,
          date_limite: c.date_limite ?? lu.date_limite,
          lien: c.lien,
          domaines,
          secteurs: secteursFromDomaines(domaines),
          url_dce: c.url_dce ?? c.lien,
          plateforme: "AWS",
          avis_indices: indicesDepuisTexte(texte),
          raw: { donnees: { "Avis (AWS)": texte }, reference: c.reference, idm: c.idm },
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
  journal(`AWS : ${res.nouvelles} nouvelle(s) ajoutée(s)`);
  return res;
}
