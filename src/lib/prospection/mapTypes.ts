export type ProspectionMapSecteur = "EP" | "VRD";

export type ProspectionMapColorMode = "prestataire" | "gestion" | "statut";

export type ProspectionMapDataSource = {
  secteur: ProspectionMapSecteur;
  label: string;
  available: boolean;
};

export const PROSPECTION_MAP_SECTEURS: ProspectionMapDataSource[] = [
  { secteur: "EP", label: "Éclairage public", available: true },
  { secteur: "VRD", label: "VRD", available: false },
];

export const PROSPECTION_MAP_COLOR_MODES: { value: ProspectionMapColorMode; label: string }[] = [
  { value: "prestataire", label: "Prestataire EP" },
  { value: "gestion", label: "Qui gère EP" },
  { value: "statut", label: "Statut prospection" },
];
