import type { SupabaseClient } from "@supabase/supabase-js";
import {
  domainesDetectes,
  estIdf,
  secteursFromDomaines,
  type VeilleAnnonce,
} from "@/lib/veille";

const BASE_URL =
  "https://boamp-datadila.opendatasoft.com/api/explore/v2.1/catalog/datasets/boamp/records";

type OdsRecord = Record<string, unknown>;

function texte(record: OdsRecord, ...cles: string[]): string {
  for (const cle of cles) {
    const val = record[cle];
    if (val == null) continue;
    const str = Array.isArray(val)
      ? val.filter(Boolean).map(String).join(" ")
      : String(val);
    if (str.trim()) return str.trim();
  }
  return "";
}

function dateOnly(value: string): string | null {
  if (!value) return null;
  const iso = value.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso : null;
}

function normaliser(record: OdsRecord): VeilleAnnonce | null {
  const idweb = texte(record, "idweb", "id");
  const intitule = texte(record, "objet", "intitule", "titre");
  if (!intitule) return null;
  const acheteur = texte(record, "nomacheteur", "acheteur", "organisme");
  const cpv = texte(record, "code_cpv", "cpv", "codecpv");
  const departement = texte(record, "code_departement", "departement", "dc");
  const descripteur = texte(record, "descripteur", "descripteur_libelle");

  const domaines = domainesDetectes(cpv, [intitule, acheteur, descripteur].join(" "));

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
  };
}

export type CollecteVeilleResultat =
  | {
      ok: false;
      error: string;
      collectees: number;
      retenues: number;
      nouvelles: number;
      annoncesNouvelles: VeilleAnnonce[];
    }
  | {
      ok: true;
      collectees: number;
      retenues: number;
      nouvelles: number;
      annoncesNouvelles: VeilleAnnonce[];
    };

/**
 * Collecte les annonces BOAMP, les filtre sur le périmètre métier puis les
 * enregistre dans `veille_annonces`. Renvoie les annonces réellement nouvelles.
 */
export async function collecterVeille(
  client: SupabaseClient,
  options: { fenetreJours?: number; idfSeulement?: boolean } = {},
): Promise<CollecteVeilleResultat> {
  const fenetreJours = Math.min(Math.max(options.fenetreJours ?? 7, 1), 60);
  const idfSeulement = options.idfSeulement ?? true;

  const dateMin = new Date(Date.now() - fenetreJours * 86400000)
    .toISOString()
    .slice(0, 10);

  const collected: OdsRecord[] = [];
  const pageSize = 100;

  for (let page = 0; page < 10; page += 1) {
    const url = `${BASE_URL}?${new URLSearchParams({
      where: `dateparution >= date'${dateMin}'`,
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
      };
    }
    const json = (await res.json()) as { results?: OdsRecord[] };
    const results = json.results ?? [];
    collected.push(...results);
    if (results.length < pageSize) break;
  }

  const normalisees = collected
    .map(normaliser)
    .filter((a): a is VeilleAnnonce => a !== null)
    .filter((a) => a.domaines.length > 0)
    .filter((a) => !idfSeulement || estIdf(a.departement ?? ""));

  const uniques = new Map<string, VeilleAnnonce>();
  for (const a of normalisees) uniques.set(`${a.source}::${a.source_id}`, a);
  const annonces = [...uniques.values()];

  if (annonces.length === 0) {
    return {
      ok: true,
      collectees: collected.length,
      retenues: 0,
      nouvelles: 0,
      annoncesNouvelles: [],
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
  }));

  const { error } = await client
    .from("veille_annonces")
    .upsert(rows, { onConflict: "source,source_id", ignoreDuplicates: false });
  if (error) throw error;

  const annoncesNouvelles = annonces.filter((a) => !known.has(a.source_id));

  return {
    ok: true,
    collectees: collected.length,
    retenues: annonces.length,
    nouvelles: annoncesNouvelles.length,
    annoncesNouvelles,
  };
}
