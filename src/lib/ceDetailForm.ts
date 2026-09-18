import type { CeDossier, CeSituationJuridique, CeStatut } from "@/lib/commerceTypes";

export type CeDetailFormState = {
  nom_cible: string;
  activite: string;
  situation_juridique: CeSituationJuridique;
  statut: CeStatut;
  lieu: string;
  ca_estime: string;
  ebitda_estime: string;
  valorisation_estimee: string;
  effectif: string;
  interlocuteur: string;
  date_detection: string;
  date_echeance_offre: string;
  date_closing_cible: string;
  notes: string;
};

export function toForm(dossier: CeDossier): CeDetailFormState {
  return {
    nom_cible: dossier.nom_cible ?? "",
    activite: dossier.activite ?? "",
    situation_juridique: dossier.situation_juridique,
    statut: dossier.statut,
    lieu: dossier.lieu ?? "",
    ca_estime: dossier.ca_estime != null ? String(dossier.ca_estime) : "",
    ebitda_estime: dossier.ebitda_estime != null ? String(dossier.ebitda_estime) : "",
    valorisation_estimee:
      dossier.valorisation_estimee != null ? String(dossier.valorisation_estimee) : "",
    effectif: dossier.effectif != null ? String(dossier.effectif) : "",
    interlocuteur: dossier.interlocuteur ?? "",
    date_detection: dossier.date_detection?.slice(0, 10) ?? "",
    date_echeance_offre: dossier.date_echeance_offre?.slice(0, 10) ?? "",
    date_closing_cible: dossier.date_closing_cible?.slice(0, 10) ?? "",
    notes: dossier.notes ?? "",
  };
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

export function toPayload(form: CeDetailFormState) {
  const nomCible = form.nom_cible.trim();
  return {
    titre: nomCible,
    nom_cible: nomCible,
    activite: form.activite.trim() || null,
    situation_juridique: form.situation_juridique,
    statut: form.statut,
    lieu: form.lieu.trim() || null,
    ca_estime: parseOptionalNumber(form.ca_estime),
    ebitda_estime: parseOptionalNumber(form.ebitda_estime),
    valorisation_estimee: parseOptionalNumber(form.valorisation_estimee),
    effectif: parseOptionalInt(form.effectif),
    interlocuteur: form.interlocuteur.trim() || null,
    date_detection: form.date_detection || null,
    date_echeance_offre:
      form.situation_juridique === "redressement"
        ? form.date_echeance_offre || null
        : null,
    date_closing_cible: form.date_closing_cible || null,
    notes: form.notes.trim() || null,
  };
}

export function isFormDirty(baseline: CeDetailFormState, form: CeDetailFormState): boolean {
  const keys = Object.keys(baseline) as (keyof CeDetailFormState)[];
  for (const key of keys) {
    if (String(form[key] ?? "").trim() !== String(baseline[key] ?? "").trim()) return true;
  }
  return false;
}
