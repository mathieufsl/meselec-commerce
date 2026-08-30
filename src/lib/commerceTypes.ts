export type AoStatut =
  | "veille"
  | "analyse"
  | "en_cours"
  | "depose"
  | "gagne"
  | "perdu"
  | "abandonne";

export type BpuType = "bpu" | "dpgf";
export type BpuNiveau = "section" | "sous_section" | "ligne";
export type AoDocumentType =
  | "dce"
  | "rc"
  | "cctp"
  | "ae"
  | "dpgf"
  | "bpu"
  | "memoire"
  | "reponse"
  | "annexe"
  | "autre";
export type ProspectionStatut =
  | "a_contacter"
  | "en_cours"
  | "relance"
  | "gagne"
  | "perdu"
  | "inactif";

export const AO_STATUTS: AoStatut[] = [
  "veille",
  "analyse",
  "en_cours",
  "depose",
  "gagne",
  "perdu",
  "abandonne",
];

export const AO_STATUT_LABELS: Record<AoStatut, string> = {
  veille: "Veille",
  analyse: "Analyse",
  en_cours: "En cours",
  depose: "Déposé",
  gagne: "Gagné",
  perdu: "Perdu",
  abandonne: "Abandonné",
};

export const AO_PIPELINE_COLUMNS: AoStatut[] = [
  "veille",
  "analyse",
  "en_cours",
  "depose",
  "gagne",
];

export interface SocieteExploitation {
  id: string;
  code: string;
  nom: string;
  groupe?: string | null;
  erp_bridge_url: string | null;
  actif: boolean;
}

export interface Client {
  id: string;
  nom_entreprise: string;
  code_entreprise: string | null;
  agence: string | null;
  secteur: string | null;
  telephone: string | null;
  email: string | null;
}

export interface AppelOffre {
  id: string;
  reference: string;
  titre: string;
  donneur_ordre_id: string | null;
  type_marche: string | null;
  lieu: string | null;
  date_publication: string | null;
  date_limite_depot: string | null;
  montant_estime: number | null;
  statut: AoStatut;
  societe_attribuee_id: string | null;
  chantier_erp_id: string | null;
  handoff_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  clients?: Client | null;
  societes_exploitation?: SocieteExploitation | null;
}

export interface AoLot {
  id: string;
  ao_id: string;
  numero_lot: string;
  designation: string;
  montant_estime: number | null;
  ordre: number;
}

export interface AoDocument {
  id: string;
  ao_id: string;
  type: AoDocumentType;
  nom_fichier: string;
  fichier_url: string | null;
  storage_path: string | null;
  taille_octets: number | null;
  mime_type: string | null;
  version: number;
  notes: string | null;
  uploaded_by: string | null;
  uploaded_by_email: string | null;
  created_at: string;
}

export interface BpuCatalogue {
  id: string;
  nom: string;
  client_id: string | null;
  type: BpuType;
  poste_code: string | null;
  secteur: "EP" | "Tertiaire" | "Enedis" | null;
  source_fichier: string | null;
  actif: boolean;
  notes: string | null;
  ligne_count?: number;
}

export interface BpuLigne {
  id: string;
  catalogue_id: string;
  poste_code: string | null;
  numero_prix: string;
  designation: string;
  unite: string | null;
  pu_ht: number | null;
  niveau: BpuNiveau;
  parent_numero: string | null;
  ordre: number;
}

export interface AoReponse {
  id: string;
  ao_id: string;
  lot_id: string | null;
  catalogue_id: string | null;
  statut: "brouillon" | "finalise" | "depose";
  montant_retenu: number | null;
  libelle: string;
  source_fichier: string | null;
  version: number;
  notes: string | null;
  created_at?: string;
}

export interface AoReponseLigne {
  id: string;
  reponse_id: string;
  bpu_ligne_id: string | null;
  numero_prix: string;
  designation: string;
  unite: string | null;
  quantite: number;
  pu_ht: number;
  montant: number;
  ordre: number;
}

export interface MemoireTechnique {
  id: string;
  ao_id: string;
  version: number;
  titre: string;
  contenu_json: Record<string, unknown>;
  statut: "brouillon" | "valide";
}

export interface FournisseurCommercial {
  id: string;
  nom: string;
  specialites: string[];
  siret: string | null;
  contacts_json: Array<{ nom?: string; email?: string; tel?: string }>;
  notes: string | null;
  actif: boolean;
}

export interface ProspectionSuivi {
  id: string;
  commune_key: string;
  departement: string | null;
  qui_cible: string;
  statut: ProspectionStatut;
  prochaine_action: string | null;
  notes: string;
}

export interface ErpEmploye {
  id: string;
  nom: string;
  prenom: string;
  poste: string | null;
  secteur: string | null;
}
