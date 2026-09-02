import type { AoSecteurCode } from "@/lib/commerceTypes";

export type VeilleDomaine =
  | "Éclairage public"
  | "Illuminations"
  | "Réseaux électriques"
  | "CFO / installations électriques"
  | "VRD / voirie";

export type VeilleStatut = "nouveau" | "ignore" | "importe";

export const VEILLE_STATUT_LABELS: Record<VeilleStatut, string> = {
  nouveau: "Nouveau",
  ignore: "Ignoré",
  importe: "Importé",
};

export const DEPARTEMENTS_IDF = ["75", "77", "78", "91", "92", "93", "94", "95"];

export const CPV_PREFIXES: Record<VeilleDomaine, string[]> = {
  "Éclairage public": ["45316110", "34928500", "50232100"],
  Illuminations: ["45316100", "51110000"],
  "Réseaux électriques": ["45231400", "45232210", "45314300"],
  "CFO / installations électriques": ["45310000", "45311000", "45315000"],
  "VRD / voirie": ["45233140", "45232000", "45112500", "45231000"],
};

export const MOTS_CLES: Record<VeilleDomaine, string[]> = {
  "Éclairage public": [
    "eclairage public",
    "candelabre",
    "mat d'eclairage",
    "point lumineux",
    "luminaire",
    "led",
  ],
  Illuminations: ["illumination", "eclairage festif", "decoration lumineuse", "guirlande"],
  "Réseaux électriques": [
    "reseau electrique",
    "raccordement",
    "enedis",
    "ligne aerienne",
    "poste transformation",
    "basse tension",
    "haute tension",
  ],
  "CFO / installations électriques": [
    "courant fort",
    "installation electrique",
    "cfo",
    "distribution electrique",
    "tableau electrique",
  ],
  "VRD / voirie": [
    "vrd",
    "voirie",
    "terrassement",
    "tranchee",
    "genie civil",
    "canalisation",
    "reseaux secs",
    "amenagement urbain",
  ],
};

export const DOMAINE_TO_SECTEUR: Record<VeilleDomaine, AoSecteurCode> = {
  "Éclairage public": "EP",
  Illuminations: "Illumination",
  "Réseaux électriques": "Enedis",
  "CFO / installations électriques": "CFO_CFA",
  "VRD / voirie": "VRD",
};

const DOMAINES = Object.keys(CPV_PREFIXES) as VeilleDomaine[];

export function sansAccents(texte: string): string {
  return texte
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export type VeilleAnnonce = {
  source: string;
  source_id: string;
  intitule: string;
  acheteur: string | null;
  cpv: string | null;
  departement: string | null;
  date_parution: string | null;
  date_limite: string | null;
  lien: string | null;
  domaines: VeilleDomaine[];
  secteurs: AoSecteurCode[];
  texte_recherche?: string;
};

export function domainesDetectes(cpv: string, texte: string): VeilleDomaine[] {
  const cpvClean = cpv.replace(/\s/g, "");
  const texteNorm = sansAccents(texte);
  const found = new Set<VeilleDomaine>();

  for (const domaine of DOMAINES) {
    if (CPV_PREFIXES[domaine].some((p) => cpvClean.includes(p.slice(0, 5)))) {
      found.add(domaine);
      continue;
    }
    if (MOTS_CLES[domaine].some((mot) => texteNorm.includes(sansAccents(mot)))) {
      found.add(domaine);
    }
  }
  return DOMAINES.filter((d) => found.has(d));
}

export function estIdf(departement: string): boolean {
  return DEPARTEMENTS_IDF.some((code) => departement.includes(code));
}

export function secteursFromDomaines(domaines: VeilleDomaine[]): AoSecteurCode[] {
  const set = new Set<AoSecteurCode>();
  for (const d of domaines) set.add(DOMAINE_TO_SECTEUR[d]);
  return [...set];
}

export interface VeilleAnnonceRow {
  id: string;
  source: string;
  source_id: string;
  intitule: string;
  acheteur: string | null;
  cpv: string | null;
  departement: string | null;
  date_parution: string | null;
  date_limite: string | null;
  lien: string | null;
  domaines: string[];
  secteurs: string[];
  statut: VeilleStatut;
  ao_id: string | null;
  created_at: string;
  updated_at: string;
}
