// Nommage des dossiers SharePoint des AO (site RMS COMMERCE).
// Convention reprise de l'existant : AO/1_Non traité/<jj_mm_aaaa>/<VILLE>_<SECTEURS>/
// Partagé entre l'app et l'Edge Function `ao-sharepoint-dossier` (import relatif, sans alias).

export const SHAREPOINT_SITE_DEFAUT = "meselec44.sharepoint.com:/sites/rms.commerce";
export const SHAREPOINT_RACINE_NON_TRAITE = "General/AO/1_Non traité";

/** Ordre d'écriture des secteurs dans le nom du dossier (comme « Grigny_EP_VRD »). */
const ORDRE_SECTEURS = ["EP", "VRD", "CFO_CFA", "Illumination", "Hydraulique", "Enedis"];

const PREFIXES_ACHETEUR =
  /^(commune|ville|mairie|cité|departement|département|conseil départemental|communauté d'agglomération|communauté de communes)\s+(de la|de l'|de l’|de|du|des|d'|d’)\s*/i;

/** Retire les caractères refusés par SharePoint et les espaces/points en bord de nom. */
export function nettoyerNomSharepoint(nom: string): string {
  return nom
    .replace(/["*:<>?/\\|#%~&{}]/g, " ")
    .replace(/[\u0000-\u001f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^[.\s]+|[.\s]+$/g, "");
}

export function villeDepuisAcheteur(acheteur: string | null | undefined): string {
  const brut = (acheteur ?? "").trim();
  if (!brut) return "";
  const sans = brut.replace(PREFIXES_ACHETEUR, "").trim();
  return nettoyerNomSharepoint(sans || brut).slice(0, 60).trim();
}

export function nomDossierAo(ao: {
  donneur_ordre_libre?: string | null;
  reference?: string | null;
  secteurs?: (string | null | undefined)[];
}): string {
  const ville =
    villeDepuisAcheteur(ao.donneur_ordre_libre) ||
    nettoyerNomSharepoint(ao.reference ?? "") ||
    "AO";
  const secteurs = [...new Set((ao.secteurs ?? []).filter((s): s is string => !!s))].sort(
    (a, b) => rang(a) - rang(b),
  );
  return [ville, ...secteurs].join("_");
}

function rang(secteur: string): number {
  const i = ORDRE_SECTEURS.indexOf(secteur);
  return i === -1 ? ORDRE_SECTEURS.length : i;
}

/** Dossier du jour, au format des dossiers existants : 09_11_2026 (heure de Paris). */
export function dossierDuJour(date: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).formatToParts(date);
  const v = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${v("day")}_${v("month")}_${v("year")}`;
}
