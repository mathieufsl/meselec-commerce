import type { SupabaseClient } from "@supabase/supabase-js";
import {
  DEPARTEMENTS_VEILLE,
  domainesDetectes,
  secteursFromDomaines,
  type VeilleAnnonce,
} from "@/lib/veille";
import { extraireCpv, lireAvis } from "@/lib/veilleAvis";

const BASE_URL =
  "https://boamp-datadila.opendatasoft.com/api/explore/v2.1/catalog/datasets/boamp/records";

type OdsRecord = Record<string, unknown>;

function texte(record: OdsRecord, ...cles: string[]): string {
  for (const cle of cles) {
    const val = record[cle];
    if (val == null) continue;
    const str = Array.isArray(val) ? val.filter(Boolean).map(String).join(" ") : String(val);
    if (str.trim()) return str.trim();
  }
  return "";
}

function dateOnly(value: string): string | null {
  if (!value) return null;
  const iso = value.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso : null;
}

export type VeilleAnnonceCollectee = VeilleAnnonce & { raw: OdsRecord };

export function normaliser(record: OdsRecord): VeilleAnnonceCollectee | null {
  const idweb = texte(record, "idweb", "id");
  const intitule = texte(record, "objet", "intitule", "titre");
  if (!intitule) return null;
  const acheteur = texte(record, "nomacheteur", "acheteur", "organisme");
  // L'API ne renvoie pas de champ CPV : on le lit dans le texte complet de l'avis.
  const cpv = [texte(record, "code_cpv", "cpv", "codecpv"), ...extraireCpv(record["donnees"])]
    .filter(Boolean)
    .join(" ")
    .split(/\s+/)
    .filter((c, i, arr) => c && arr.indexOf(c) === i)
    .join(" ");
  const departement = texte(record, "code_departement", "departement", "dc");
  const descripteur = texte(record, "descripteur", "descripteur_libelle");

  // Mots-clés sur l'intitulé et le descripteur seulement (pas le nom de l'acheteur).
  const domaines = domainesDetectes(cpv, [intitule, descripteur].join(" "));
  const avis = lireAvis(record);

  return {
    source: "BOAMP",
    source_id: idweb || intitule.slice(0, 120),
    intitule,
    acheteur: acheteur || null,
    cpv: cpv || null,
    departement: departement || null,
    date_parution: dateOnly(texte(record, "dateparution", "date_parution")),
    date_limite: dateOnly(texte(record, "datelimitereponse", "date_limite_reponse")),
    lien: idweb ? `https://www.boamp.fr/avis/detail/${idweb}` : null,
    domaines,
    secteurs: secteursFromDomaines(domaines),
    url_dce: avis.url_dce,
    plateforme: avis.plateforme,
    avis_indices: avis.indices,
    raw: record,
  };
}

/** Récupère un record BOAMP complet par son idweb (rattrapage de `raw`). */
export async function fetchBoampRecord(idweb: string): Promise<OdsRecord | null> {
  const url = `${BASE_URL}?${new URLSearchParams({
    where: `idweb="${idweb.replace(/"/g, "")}"`,
    limit: "1",
  }).toString()}`;
  const res = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": "rms-commerce-veille/1.0" },
  });
  if (!res.ok) throw new Error(`L'API BOAMP a répondu ${res.status}.`);
  const json = (await res.json()) as { results?: OdsRecord[] };
  return json.results?.[0] ?? null;
}

export type CollecteVeilleResultat =
  | {
      ok: false;
      error: string;
      collectees: number;
      retenues: number;
      nouvelles: number;
      annoncesNouvelles: VeilleAnnonce[];
      idsNouvelles: string[];
    }
  | {
      ok: true;
      collectees: number;
      retenues: number;
      nouvelles: number;
      annoncesNouvelles: VeilleAnnonce[];
      idsNouvelles: string[];
    };

/**
 * Collecte les annonces BOAMP, les filtre sur le périmètre métier puis les
 * enregistre dans `veille_annonces`. Renvoie les annonces réellement nouvelles.
 */
export type OptionsCollecte = {
  /** Fenêtre de parution en jours (collecte quotidienne), si aucune date n'est donnée. */
  fenetreJours?: number;
  idfSeulement?: boolean;
  /** Veille manuelle : bornes AAAA-MM-JJ incluses. */
  parutionDu?: string | null;
  parutionAu?: string | null;
  limiteDu?: string | null;
  limiteAu?: string | null;
  /** Départements retenus ; null = France entière. Par défaut : IDF + 60 + 27. */
  departements?: string[] | null;
};

const JOUR_ISO = /^\d{4}-\d{2}-\d{2}$/;

/** Zone retenue : liste de départements, ou null pour la France entière. */
export function zoneCollecte(options: OptionsCollecte): string[] | null {
  if (options.departements !== undefined) return options.departements;
  return (options.idfSeulement ?? true) ? DEPARTEMENTS_VEILLE : null;
}

/** « 75 92 60 » ou « 2A, 93 » : l'annonce est-elle dans la zone ? */
export function dansZone(departement: string | null, zone: string[] | null): boolean {
  if (!zone) return true;
  const codes = (departement ?? "").split(/[^0-9AB]+/i).filter(Boolean);
  return codes.some((c) => zone.includes(c.padStart(2, "0")) || zone.includes(c));
}

export async function collecterVeille(
  client: SupabaseClient,
  options: OptionsCollecte = {},
): Promise<CollecteVeilleResultat> {
  const fenetreJours = Math.min(Math.max(options.fenetreJours ?? 7, 1), 60);
  const zone = zoneCollecte(options);
  const jour = (v: string | null | undefined) => (v && JOUR_ISO.test(v) ? v : null);
  const parutionDu = jour(options.parutionDu);
  const parutionAu = jour(options.parutionAu);
  const limiteDu = jour(options.limiteDu);
  const limiteAu = jour(options.limiteAu);
  const manuelle = Boolean(parutionDu || parutionAu || limiteDu || limiteAu);

  const conditions = [`nature = "APPEL_OFFRE"`];
  if (!manuelle) {
    const dateMin = new Date(Date.now() - fenetreJours * 86400000).toISOString().slice(0, 10);
    conditions.push(`dateparution >= date'${dateMin}'`);
  }
  if (parutionDu) conditions.push(`dateparution >= date'${parutionDu}'`);
  if (parutionAu) conditions.push(`dateparution <= date'${parutionAu}'`);
  if (limiteDu) conditions.push(`datelimitereponse >= date'${limiteDu}'`);
  if (limiteAu) conditions.push(`datelimitereponse <= date'${limiteAu}T23:59:59'`);
  if (zone) {
    // L'API écrit « 2 » pour l'Aisne : on demande les deux formes.
    const codes = [...new Set(zone.flatMap((c) => [c, c.replace(/^0/, "")]))];
    conditions.push(`(${codes.map((c) => `code_departement = "${c}"`).join(" or ")})`);
  }

  const collected: OdsRecord[] = [];
  const pageSize = 100;
  const maxPages = manuelle ? 40 : 10;

  for (let page = 0; page < maxPages; page += 1) {
    const url = `${BASE_URL}?${new URLSearchParams({
      // Uniquement les avis de marché : pas les résultats (ATTRIBUTION), rectificatifs, annulations…
      where: conditions.join(" and "),
      order_by: "dateparution desc",
      limit: String(pageSize),
      offset: String(page * pageSize),
    }).toString()}`;

    const res = await fetch(url, {
      headers: { Accept: "application/json", "User-Agent": "rms-commerce-veille/1.0" },
    });
    if (!res.ok) {
      return {
        ok: false,
        error: `L'API BOAMP a répondu ${res.status}.`,
        collectees: 0,
        retenues: 0,
        nouvelles: 0,
        annoncesNouvelles: [],
        idsNouvelles: [],
      };
    }
    const json = (await res.json()) as { results?: OdsRecord[] };
    const results = json.results ?? [];
    collected.push(...results);
    if (results.length < pageSize) break;
  }

  const normalisees = collected
    .map(normaliser)
    .filter((a): a is VeilleAnnonceCollectee => a !== null)
    .filter((a) => a.domaines.length > 0)
    .filter((a) => dansZone(a.departement, zone));

  const uniques = new Map<string, VeilleAnnonceCollectee>();
  for (const a of normalisees) uniques.set(`${a.source}::${a.source_id}`, a);
  let annonces = [...uniques.values()];

  if (annonces.length === 0) {
    return {
      ok: true,
      collectees: collected.length,
      retenues: 0,
      nouvelles: 0,
      annoncesNouvelles: [],
      idsNouvelles: [],
    };
  }

  const { data: existing, error: existErr } = await client
    .from("veille_annonces")
    .select("source_id")
    .eq("source", "BOAMP")
    .in(
      "source_id",
      annonces.map((a) => a.source_id),
    );
  if (existErr) throw existErr;
  const known = new Set((existing ?? []).map((r: { source_id: string }) => r.source_id));

  // Nouvelles annonces déjà connues (autre source, ou avis BOAMP republié pour la même
  // consultation) : écartées. Un avis plus récent qui change la date limite met à jour
  // l'annonce existante au lieu d'en créer une seconde.
  const doublons = new Set<string>();
  const { trouverDoublon, numerosConsultation, titreNormalise } =
    await import("@/lib/veilleDoublons.server");
  // Dans un même lot, l'avis le plus récent passe en premier.
  const parRecence = [...annonces].sort((x, y) =>
    (y.date_parution ?? "").localeCompare(x.date_parution ?? ""),
  );
  const retenus: Array<{ nums: string[]; titre: string; acheteur: string }> = [];
  for (const a of parRecence) {
    if (known.has(a.source_id)) continue;
    const nums = numerosConsultation(a.url_dce, a.lien);
    const titre = titreNormalise(a.intitule);
    const acheteur = titreNormalise(a.acheteur);
    if (
      retenus.some(
        (r) =>
          r.nums.some((n) => nums.includes(n)) ||
          (titre.length > 15 && r.titre === titre && r.acheteur === acheteur),
      )
    ) {
      doublons.add(a.source_id);
      continue;
    }
    const id = await trouverDoublon(client, {
      source: a.source,
      source_id: a.source_id,
      intitule: a.intitule,
      date_limite: a.date_limite,
      liens: [a.url_dce, a.lien],
      acheteur: a.acheteur,
    });
    if (id) {
      doublons.add(a.source_id);
      const { data: existante } = await client
        .from("veille_annonces")
        .select("date_parution, date_limite")
        .eq("id", id)
        .maybeSingle();
      if (
        existante &&
        a.date_limite &&
        a.date_limite !== existante.date_limite &&
        (a.date_parution ?? "") > (existante.date_parution ?? "")
      ) {
        await client
          .from("veille_annonces")
          .update({ date_limite: a.date_limite } as never)
          .eq("id", id);
      }
      continue;
    }
    retenus.push({ nums, titre, acheteur });
  }
  annonces = annonces.filter((a) => !doublons.has(a.source_id));
  if (annonces.length === 0) {
    return {
      ok: true,
      collectees: collected.length,
      retenues: 0,
      nouvelles: 0,
      annoncesNouvelles: [],
      idsNouvelles: [],
    };
  }

  const rows = annonces.map((a) => ({
    source: a.source,
    source_id: a.source_id,
    intitule: a.intitule,
    acheteur: a.acheteur,
    cpv: a.cpv,
    departement: a.departement,
    date_parution: a.date_parution,
    date_limite: a.date_limite,
    lien: a.lien,
    domaines: a.domaines,
    secteurs: a.secteurs,
    url_dce: a.url_dce ?? null,
    plateforme: a.plateforme ?? null,
    avis_indices: a.avis_indices ?? {},
    raw: a.raw ?? {},
  }));

  const { data: upserted, error } = await client
    .from("veille_annonces")
    .upsert(rows, { onConflict: "source,source_id", ignoreDuplicates: false })
    .select("id, source_id");
  if (error) throw error;

  const annoncesNouvelles = annonces
    .filter((a) => !known.has(a.source_id))
    .map(({ raw: _raw, ...a }) => a);
  const idsNouvelles = ((upserted ?? []) as Array<{ id: string; source_id: string }>)
    .filter((r) => !known.has(r.source_id))
    .map((r) => r.id);

  return {
    ok: true,
    collectees: collected.length,
    retenues: annonces.length,
    nouvelles: annoncesNouvelles.length,
    annoncesNouvelles,
    idsNouvelles,
  };
}
