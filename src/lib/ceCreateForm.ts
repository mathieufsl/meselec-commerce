import type { CeSituationJuridique, CeStatut } from "@/lib/commerceTypes";

export type CeCreateFormState = {
  nom_cible: string;
  activite: string;
  situation_juridique: CeSituationJuridique | "";
  lieu: string;
  ca_estime: string;
  ebitda_estime: string;
  valorisation_estimee: string;
  effectif: string;
  interlocuteur: string;
  date_detection: string;
  date_echeance_offre: string;
  date_closing_cible: string;
};

export function emptyCreateForm(): CeCreateFormState {
  return {
    nom_cible: "",
    activite: "",
    situation_juridique: "in_bonis",
    lieu: "",
    ca_estime: "",
    ebitda_estime: "",
    valorisation_estimee: "",
    effectif: "",
    interlocuteur: "",
    date_detection: "",
    date_echeance_offre: "",
    date_closing_cible: "",
  };
}

/** Génère la prochaine référence CE-YYYY-N à partir des références existantes. */
export function suggestNextCeReference(
  existingReferences: string[],
  year = new Date().getFullYear(),
): string {
  const prefix = `CE-${year}-`;
  let max = 0;
  for (const ref of existingReferences) {
    if (!ref.startsWith(prefix)) continue;
    const n = Number.parseInt(ref.slice(prefix.length), 10);
    if (Number.isFinite(n) && n > max) max = n;
  }
  return `${prefix}${max + 1}`;
}

export function validateCreateStep(
  stepId: string,
  form: CeCreateFormState,
): string | null {
  switch (stepId) {
    case "identification":
      if (!form.nom_cible.trim()) return "La raison sociale est obligatoire.";
      return null;
    case "situation":
      if (!form.situation_juridique) return "Choisissez une situation juridique.";
      if (form.situation_juridique === "redressement" && !form.date_echeance_offre) {
        return "Indiquez la date d'échéance d'offre.";
      }
      return null;
    case "organisation":
      return null;
    case "recap":
      return (
        validateCreateStep("identification", form) ??
        validateCreateStep("situation", form) ??
        validateCreateStep("organisation", form)
      );
    default:
      return null;
  }
}

function parseOptionalNumber(value: string): number | null {
  if (!value.trim()) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function parseOptionalInt(value: string): number | null {
  if (!value.trim()) return null;
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) ? n : null;
}

export function toCreatePayload(
  form: CeCreateFormState,
  reference: string,
  statut: CeStatut = "detection",
) {
  const nomCible = form.nom_cible.trim();
  return {
    reference,
    /** Conservé en base pour NOT NULL : miroir de la raison sociale. */
    titre: nomCible,
    nom_cible: nomCible,
    activite: form.activite.trim() || null,
    situation_juridique: form.situation_juridique as CeSituationJuridique,
    lieu: form.lieu.trim() || null,
    ca_estime: parseOptionalNumber(form.ca_estime),
    ebitda_estime: parseOptionalNumber(form.ebitda_estime),
    valorisation_estimee: parseOptionalNumber(form.valorisation_estimee),
    effectif: parseOptionalInt(form.effectif),
    societe_acheteuse_id: null,
    interlocuteur: form.interlocuteur.trim() || null,
    date_detection: form.date_detection || null,
    date_echeance_offre:
      form.situation_juridique === "redressement"
        ? form.date_echeance_offre || null
        : null,
    date_closing_cible: form.date_closing_cible || null,
    statut,
  };
}
