import type { AoSecteurCode } from "@/lib/commerceTypes";

export type VeilleDomaine =
  | "Éclairage public"
  | "Illuminations"
  | "Réseaux électriques"
  | "CFO / installations électriques"
  | "VRD / voirie"
  | "Hydraulique"
  | "Fournitures éclairage / électrique";

export type VeilleStatut = "nouveau" | "ignore" | "importe";

export const VEILLE_STATUT_LABELS: Record<VeilleStatut, string> = {
  nouveau: "Nouveau",
  ignore: "Ignoré",
  importe: "Importé",
};

export const DEPARTEMENTS_IDF = ["75", "77", "78", "91", "92", "93", "94", "95"];

/** Zone de veille : Île-de-France élargie à l'Oise (60) et l'Eure (27). */
export const DEPARTEMENTS_VEILLE = [...DEPARTEMENTS_IDF, "60", "27"];

export const CPV_PREFIXES: Record<VeilleDomaine, string[]> = {
  "Éclairage public": ["45316110", "34928500", "50232100"],
  Illuminations: ["45316100", "51110000"],
  "Réseaux électriques": ["45231400", "45232210", "45314300"],
  "CFO / installations électriques": ["45310000", "45311000", "45315000"],
  "VRD / voirie": ["45233140", "45232000", "45112500", "45231000"],
  Hydraulique: ["45232150", "45232400", "45232420", "45252100", "45240000"],
  "Fournitures éclairage / électrique": [
    "31500000",
    "31520000",
    "31527000",
    "34928500",
    "34993000",
    "31600000",
  ],
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
    "raccordement electrique",
    "raccordement enedis",
    "branchement electrique",
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
  Hydraulique: [
    "aep",
    "alimentation en eau potable",
    "assainissement",
    "epuration",
    "step",
    "station de pompage",
    "adduction en eau",
    "inondation",
    "innondation",
    "bassin d'orage",
    "dessalement",
    "eaux usees",
  ],
  "Fournitures éclairage / électrique": [
    "fourniture de luminaires",
    "fourniture de candelabres",
    "materiel d'eclairage",
    "fourniture de motifs lumineux",
  ],
};

export const DOMAINE_TO_SECTEUR: Record<VeilleDomaine, AoSecteurCode> = {
  "Éclairage public": "EP",
  Illuminations: "Illumination",
  "Réseaux électriques": "Enedis",
  "CFO / installations électriques": "CFO_CFA",
  "VRD / voirie": "VRD",
  Hydraulique: "Hydraulique",
  "Fournitures éclairage / électrique": "EP",
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

/** Normalise un texte pour la recherche par mots entiers (minuscules, sans accents ni ponctuation). */
function normaliserMots(texte: string): string {
  return ` ${sansAccents(texte)
    .replace(/[\u2019']/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()} `;
}

/** Préfixe CPV significatif : le code sans ses zéros finaux (ex. 45316110 → 4531611). */
function prefixeCpv(code: string): string {
  const p = code.replace(/0+$/, "");
  return p.length >= 3 ? p : code.slice(0, 3);
}

/**
 * Détecte les domaines d'une annonce.
 * - CPV : un code de l'avis correspond s'il commence par le préfixe significatif
 *   du code de référence (45316110 attrape 45316110 et ses sous-codes, pas 45316000).
 * - Mots-clés : comparaison par mot entier sur l'intitulé et le descripteur
 *   (jamais le nom de l'acheteur, sinon tout le SIAAP passe en Hydraulique).
 */
export function domainesDetectes(cpv: string, texte: string): VeilleDomaine[] {
  const codes = cpv.match(/\d{8}/g) ?? [];
  const texteNorm = normaliserMots(texte);
  const found = new Set<VeilleDomaine>();

  for (const domaine of DOMAINES) {
    const prefixes = CPV_PREFIXES[domaine].map(prefixeCpv);
    if (codes.some((c) => prefixes.some((p) => c.startsWith(p)))) {
      found.add(domaine);
      continue;
    }
    if (MOTS_CLES[domaine].some((mot) => texteNorm.includes(normaliserMots(mot)))) {
      found.add(domaine);
    }
  }
  return DOMAINES.filter((d) => found.has(d));
}

export function estIdf(departement: string): boolean {
  return DEPARTEMENTS_VEILLE.some((code) => departement.includes(code));
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
  qualif_statut?: "a_qualifier" | "qualifie" | "erreur";
  entite?: "MESELEC" | "MESTP" | "aucune" | null;
  decision?: "hors_sujet" | "a_creuser" | "prioritaire" | null;
  score?: number | null;
  resume?: string | null;
  raisons?: string[];
  points_rouges?: string[];
  exigences?: Partial<import("@/lib/veilleQualif").VeilleExigences> | null;
  certif_manquante?: boolean;
  interet_relationnel?: boolean;
  type_marche?: string | null;
  plateforme?: string | null;
  dce_url?: string | null;
  qualif_model?: string | null;
  qualif_error?: string | null;
  qualified_at?: string | null;
}
