import type { AoSecteurCode } from "@/lib/commerceTypes";
import type { VeilleIndicesAvis, VeillePlateforme } from "@/lib/veilleAvis";
import type { VeilleAnalyse, VeilleAnalyseStatut, VeilleDceFichier } from "@/lib/veilleAnalyse";

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

/** Pourquoi une annonce est ignorée (« Pas pour nous »). */
export const MOTIFS_IGNORE = [
  { code: "hors_metier", label: "Hors métier" },
  { code: "hors_zone", label: "Hors zone" },
  { code: "taille", label: "Trop gros / trop petit" },
  { code: "certif", label: "Certification ou qualification manquante" },
  { code: "delai", label: "Délai trop court" },
  { code: "charge", label: "Pas de capacité (charge)" },
  { code: "chances", label: "Peu de chances (concurrence, prix)" },
  { code: "autre", label: "Autre" },
] as const;

export type MotifIgnore = (typeof MOTIFS_IGNORE)[number]["code"];

export function libelleMotif(code: string | null | undefined): string | null {
  return MOTIFS_IGNORE.find((m) => m.code === code)?.label ?? null;
}

export const DEPARTEMENTS_IDF = ["75", "77", "78", "91", "92", "93", "94", "95"];

/** Zone de veille : Île-de-France élargie à l'Oise (60) et l'Eure (27). */
export const DEPARTEMENTS_VEILLE = [...DEPARTEMENTS_IDF, "60", "27"];

/**
 * Codes CPV surveillés par métier. On prend de préférence les codes « parents » :
 * la comparaison se fait sur le début du code (45316000 attrape 45316110,
 * 45316212…). Le CPV seul ne suffit pas (beaucoup d'avis portent 45000000) :
 * les mots-clés ci-dessous complètent, et la qualification IA trie ensuite.
 */
export const CPV_PREFIXES: Record<VeilleDomaine, string[]> = {
  "Éclairage public": [
    "45316000", // installation de systèmes d'éclairage et de signalisation (dont 45316110, 45316212)
    "50232000", // entretien de l'éclairage public et des feux de signalisation
    "34928500", // matériel d'éclairage public (candélabres, lanternes)
    "31527200", // éclairage extérieur (fourniture)
  ],
  Illuminations: [
    "45316100", // installation de matériel d'éclairage extérieur
    "31522000", // guirlandes lumineuses
    "51110000", // installation de matériel électrique
  ],
  "Réseaux électriques": [
    "45231400", // construction de lignes électriques
    "45232200", // ouvrages connexes pour lignes électriques (dont 45232210)
    "45314300", // infrastructures de câblage
  ],
  "CFO / installations électriques": [
    "45310000", // travaux d'équipement électrique (dont 45311000, 45315000, 45317000)
    "31681500", // équipement de recharge (bornes IRVE)
  ],
  "VRD / voirie": [
    "45233000", // construction, fondation et surface de routes (dont 45233140, 45233221)
    "45232000", // ouvrages connexes (canalisations, réseaux)
    "45112500", // terrassement
    "45231000", // canalisations, lignes de communication et lignes électriques
  ],
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

/**
 * Mots-clés cherchés par mot entier dans l'intitulé (et le descripteur), sans
 * accents. Volontairement larges : mieux vaut un avis de trop, que la
 * qualification IA classe « hors sujet », qu'un AO raté.
 */
export const MOTS_CLES: Record<VeilleDomaine, string[]> = {
  "Éclairage public": [
    "eclairage public",
    "eclairage",
    "eclairages",
    "candelabre",
    "candelabres",
    "mat d'eclairage",
    "point lumineux",
    "points lumineux",
    "luminaire",
    "luminaires",
    "led",
    "signalisation lumineuse",
    "signalisation tricolore",
    "feux tricolores",
    "feux de signalisation",
    "feux de circulation",
  ],
  Illuminations: [
    "illumination",
    "illuminations",
    "eclairage festif",
    "decoration lumineuse",
    "decorations lumineuses",
    "guirlande",
    "guirlandes",
    "motifs lumineux",
  ],
  "Réseaux électriques": [
    "reseau electrique",
    "reseaux electriques",
    "raccordement electrique",
    "raccordement enedis",
    "branchement electrique",
    "enedis",
    "ligne aerienne",
    "lignes aeriennes",
    "poste transformation",
    "poste de transformation",
    "basse tension",
    "haute tension",
    "hta",
    "enfouissement",
    "enfouissement des reseaux",
  ],
  "CFO / installations électriques": [
    "courant fort",
    "courants forts",
    "courant faible",
    "courants faibles",
    "installation electrique",
    "installations electriques",
    "cfo",
    "cfa",
    "distribution electrique",
    "tableau electrique",
    "electricite",
    "electrique",
    "electriques",
    "electrotechnique",
    "eclairage de securite",
    "baes",
    "irve",
    "borne de recharge",
    "bornes de recharge",
  ],
  "VRD / voirie": [
    "vrd",
    "voirie",
    "voiries",
    "terrassement",
    "terrassements",
    "tranchee",
    "tranchees",
    "genie civil",
    "canalisation",
    "canalisations",
    "reseaux secs",
    "reseaux divers",
    "amenagement urbain",
    "espaces publics",
    "espace public",
    "chaussee",
    "chaussees",
    "trottoir",
    "trottoirs",
    "marquage routier",
    "enrobes",
  ],
  Hydraulique: [
    "aep",
    "alimentation en eau potable",
    "eau potable",
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
    "eaux pluviales",
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
  url_dce?: string | null;
  plateforme?: VeillePlateforme | null;
  avis_indices?: VeilleIndicesAvis;
  raw?: Record<string, unknown>;
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
  motif_ignore?: string | null;
  motif_ignore_note?: string | null;
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
  dce_url?: string | null;
  qualif_model?: string | null;
  qualif_error?: string | null;
  qualified_at?: string | null;
  url_dce: string | null;
  plateforme: VeillePlateforme | null;
  avis_indices: Partial<VeilleIndicesAvis> | null;
  analyse_statut: VeilleAnalyseStatut;
  analyse_dce: VeilleAnalyse | null;
  analyse_erreur: string | null;
  analyse_at: string | null;
  /** Essais de téléchargement du DCE déjà faits par le robot. */
  analyse_tentatives?: number;
  /** Étape en cours du robot DCE (suivi en direct). */
  analyse_etape: string | null;
  analyse_etape_at: string | null;
  /** Exécution GitHub Actions qui traite l'annonce. */
  analyse_run_url: string | null;
  dce_fichiers: VeilleDceFichier[];
}

/** Colonnes lues par l'application (sans `raw`, l'avis brut, trop volumineux). */
export const VEILLE_ANNONCE_COLONNES =
  "id, source, source_id, intitule, acheteur, cpv, departement, date_parution, date_limite, lien, domaines, secteurs, statut, motif_ignore, motif_ignore_note, ao_id, created_at, updated_at, url_dce, plateforme, avis_indices, analyse_statut, analyse_dce, analyse_erreur, analyse_at, analyse_tentatives, analyse_etape, analyse_etape_at, analyse_run_url, dce_fichiers, qualif_statut, entite, decision, score, resume, raisons, points_rouges, exigences, certif_manquante, interet_relationnel, type_marche, dce_url, qualif_model, qualif_error, qualified_at";

/**
 * Le robot a échoué et attend son prochain passage planifié (statut encore
 * « à faire ») : rien ne tourne, il ne faut ni animation ni rafraîchissement.
 */
export function analyseEnAttenteApresEchec(a: VeilleAnnonceRow): boolean {
  return a.analyse_statut === "a_faire" && (a.analyse_tentatives ?? 0) > 0 && !!a.analyse_erreur;
}

/** Sans nouvelle étape du robot depuis ce délai, l'analyse n'est plus « en cours ». */
export const DELAI_ANALYSE_SANS_NOUVELLE_MS = 30 * 60_000;

/**
 * Analyse demandée mais le robot ne s'en occupe pas (pas encore lancé, file
 * d'attente, exécution interrompue) : aucune étape depuis 30 min.
 */
export function analyseEnAttenteDuRobot(a: VeilleAnnonceRow, maintenant = Date.now()): boolean {
  if (a.analyse_statut !== "a_faire" || analyseEnAttenteApresEchec(a)) return false;
  const derniere = a.analyse_etape_at ? new Date(a.analyse_etape_at).getTime() : 0;
  return maintenant - derniere > DELAI_ANALYSE_SANS_NOUVELLE_MS;
}

/** Le robot DCE travaille réellement sur l'annonce (étape récente, pas d'échec ni d'attente). */
export function analyseEnCours(a: VeilleAnnonceRow): boolean {
  return (
    a.analyse_statut === "a_faire" && !analyseEnAttenteApresEchec(a) && !analyseEnAttenteDuRobot(a)
  );
}
