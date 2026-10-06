/**
 * Résultat de l'analyse IA du RC / CCTP d'une annonce de veille, produit par le
 * robot `scripts/dce` (GitHub Actions) et stocké dans `veille_annonces.analyse`.
 */

export type VeilleAnalyseStatut = "a_faire" | "termine" | "sans_dce" | "echec" | "non_demande";

export const VEILLE_ANALYSE_STATUT_LABELS: Record<VeilleAnalyseStatut, string> = {
  a_faire: "Analyse DCE en attente",
  termine: "DCE analysé",
  sans_dce: "Analyse sur l'avis seul",
  echec: "DCE non récupéré",
  non_demande: "Non analysé",
};

export type VeilleVisite = "obligatoire" | "facultative" | "non_mentionnee";

export type VeilleCertification = {
  nom: string;
  exigence: "obligatoire" | "equivalent_accepte" | "apprecie";
  detail: string | null;
  source: string | null;
};

export type VeilleAnalyse = {
  visite: {
    exigee: VeilleVisite;
    dates: string[];
    modalites: string | null;
    source: string | null;
  };
  certifications: VeilleCertification[];
  autres_exigences: string[];
  date_limite_questions: string | null;
  resume: string;
  points_attention: string[];
  /** Ajouté par le robot : fichiers réellement lus (RC, CCTP…). */
  documents_analyses?: string[];
};

export type VeilleDceFichier = { nom: string; type: string; path: string; taille: number };

const nullableString = { anyOf: [{ type: "string" }, { type: "null" }] };

/** Schéma JSON pour la sortie structurée de l'API Claude. */
export const VEILLE_ANALYSE_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "visite",
    "certifications",
    "autres_exigences",
    "date_limite_questions",
    "resume",
    "points_attention",
  ],
  properties: {
    visite: {
      type: "object",
      additionalProperties: false,
      required: ["exigee", "dates", "modalites", "source"],
      properties: {
        exigee: { type: "string", enum: ["obligatoire", "facultative", "non_mentionnee"] },
        dates: { type: "array", items: { type: "string" } },
        modalites: nullableString,
        source: nullableString,
      },
    },
    certifications: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["nom", "exigence", "detail", "source"],
        properties: {
          nom: { type: "string" },
          exigence: { type: "string", enum: ["obligatoire", "equivalent_accepte", "apprecie"] },
          detail: nullableString,
          source: nullableString,
        },
      },
    },
    autres_exigences: { type: "array", items: { type: "string" } },
    date_limite_questions: nullableString,
    resume: { type: "string" },
    points_attention: { type: "array", items: { type: "string" } },
  },
} as const;

export const VISITE_LABELS: Record<VeilleVisite, string> = {
  obligatoire: "Visite obligatoire",
  facultative: "Visite facultative",
  non_mentionnee: "Pas de visite",
};

export const EXIGENCE_LABELS: Record<VeilleCertification["exigence"], string> = {
  obligatoire: "exigée",
  equivalent_accepte: "ou équivalent",
  apprecie: "appréciée",
};

/** Texte court pour les notes d'AO et le mail récapitulatif. */
export function resumeAnalyseLignes(analyse: VeilleAnalyse): string[] {
  const lignes: string[] = [];
  const v = analyse.visite;
  lignes.push(
    `${VISITE_LABELS[v.exigee]}${v.dates.length ? ` (${v.dates.join(", ")})` : ""}${
      v.modalites ? ` — ${v.modalites}` : ""
    }`,
  );
  if (analyse.certifications.length) {
    lignes.push(
      `Certifications : ${analyse.certifications
        .map((c) => `${c.nom} ${EXIGENCE_LABELS[c.exigence]}`)
        .join(", ")}`,
    );
  } else {
    lignes.push("Certifications : aucune exigée");
  }
  if (analyse.autres_exigences.length) {
    lignes.push(`Autres exigences : ${analyse.autres_exigences.join(" ; ")}`);
  }
  if (analyse.date_limite_questions) {
    lignes.push(`Questions jusqu'au : ${analyse.date_limite_questions}`);
  }
  return lignes;
}

/**
 * Lignes « visite / certifications » pour le mail : analyse DCE si elle existe,
 * sinon indices relevés dans l'avis.
 */
export function pointsRecap(row: {
  analyse_dce: VeilleAnalyse | null;
  analyse_statut?: string | null;
  avis_indices?: {
    visite?: { mentionnee?: boolean; obligatoire?: boolean | null };
    certifications?: string[];
  } | null;
}): string[] {
  if (row.analyse_dce) {
    return resumeAnalyseLignes(row.analyse_dce).slice(0, 3);
  }
  const points: string[] = [];
  const visite = row.avis_indices?.visite;
  if (visite?.mentionnee) {
    points.push(
      visite.obligatoire === false
        ? "Visite facultative (selon l'avis)"
        : visite.obligatoire
          ? "Visite obligatoire (selon l'avis)"
          : "Visite mentionnée dans l'avis",
    );
  }
  const certifs = row.avis_indices?.certifications ?? [];
  if (certifs.length) points.push(`Certifications citées dans l'avis : ${certifs.join(", ")}`);
  if (row.analyse_statut === "a_faire") points.push("Analyse du DCE à venir");
  return points;
}
