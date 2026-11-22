/**
 * Lecture des résultats de recherche d'AWS (marches-publics.info) : une
 * consultation par bloc `id="entity"`. Fonctions pures.
 */
import { texteBrut } from "@/lib/veilleAtexo";

export type ConsultationAws = {
  /** Numéro de l'avis (MPI-pub-…). */
  id: string;
  /** Numéro du marché sur la plateforme (IDM), aussi présent dans les avis BOAMP. */
  idm: string | null;
  reference: string | null;
  intitule: string;
  acheteur: string | null;
  departement: string | null;
  date_parution: string | null;
  date_limite: string | null;
  lien: string;
  url_dce: string | null;
};

const BASE = "https://www.marches-publics.info";

/** « 26/11/26 » ou « 26/11/2026 » → AAAA-MM-JJ. */
export function dateCourte(v: string | undefined): string | null {
  const m = v?.match(/(\d{2})\/(\d{2})\/(\d{2,4})/);
  if (!m) return null;
  const annee = m[3]?.length === 2 ? `20${m[3]}` : m[3];
  return `${annee}-${m[2]}-${m[1]}`;
}

/** Nombre de consultations par onglet (travaux, services, fournitures). */
export function comptesParNature(html: string): { t: number; s: number; f: number } {
  const n = (cle: string) =>
    Number(html.match(new RegExp(`id="badge_${cle}">\\s*(\\d+)`))?.[1] ?? 0);
  return { t: n("travaux"), s: n("services"), f: n("fournitures") };
}

export function lireResultatsAws(html: string): ConsultationAws[] {
  const blocs = html.split('id="entity"').slice(1);
  const out: ConsultationAws[] = [];
  for (const bloc of blocs) {
    const id = bloc.match(/\/Annonces\/(MPI-pub-\d+)\.htm/)?.[1];
    if (!id) continue;
    const h2 = texteBrut(bloc.match(/<h2 class="h2-avis">([\s\S]*?)<\/h2>/)?.[1] ?? "");
    const code = h2.match(/\((\d{5}|2[AB]\d{3})\)\s*$/)?.[1] ?? null;
    const acheteur = h2.replace(/\s*\([^)]*\)\s*$/, "").trim() || null;
    const boite = bloc.match(/id='titre_box'>([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/)?.[1] ?? "";
    const reference = texteBrut(boite.match(/\[r[ée]f\.\s*([\s\S]*?)\]/)?.[1] ?? "") || null;
    const intitule = texteBrut(
      boite
        .replace(/<div[^>]*ref-acheteur[^>]*>[\s\S]*?<\/div>/, "")
        .replace(/<p[\s\S]*?<\/p>/g, ""),
    );
    if (!intitule) continue;
    const texte = texteBrut(bloc);
    const idm = bloc.match(/[?&;]IDM=(\d+)/i)?.[1] ?? null;
    const dce = bloc.match(/href="([^"]*type=DCE[^"]*)"/i)?.[1]?.replace(/&amp;/g, "&") ?? null;
    out.push({
      id,
      idm,
      reference,
      intitule,
      acheteur,
      departement: code ? (code.startsWith("97") ? code.slice(0, 3) : code.slice(0, 2)) : null,
      date_parution: dateCourte(texte.match(/Publi[ée] le\s*([\d/]+)/i)?.[1]),
      date_limite: dateCourte(texte.match(/Date limite\s*:\s*le\s*([\d/]+)/i)?.[1]),
      lien: `${BASE}/Annonces/${id}.htm`,
      url_dce: dce,
    });
  }
  return out;
}
