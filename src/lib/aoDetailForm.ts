import type { AppelOffre, AoNatureMarche, AoPrestation, AoSecteur, AoSecteurCode, AoStatut } from "@/lib/commerceTypes";
import type { AoSecteurDraft } from "@/lib/aoCreateForm";
import { emptySecteurDraft, suggestBailExpirationDate } from "@/lib/aoCreateForm";

export type AoDetailFormState = {
  reference: string;
  titre: string;
  donneur_ordre_libre: string;
  lieu: string;
  date_publication: string;
  date_limite_depot: string;
  marche_pluriannuel: boolean;
  montant_estime: string;
  statut: AoStatut;
  societe_attribuee_id: string;
  lien_source: string;
  notes: string;
  secteurs: AoSecteurDraft[];
};

function secteurToDraft(s: AoSecteur): AoSecteurDraft {
  const debut = s.bail_date_debut?.slice(0, 10) ?? "";
  const duree = s.bail_duree_mois != null ? String(s.bail_duree_mois) : "";
  let fin = s.bail_date_fin?.slice(0, 10) ?? "";
  if (!fin && s.nature_marche === "bail" && debut && duree) {
    fin = suggestBailExpirationDate(debut, duree);
  }
  return {
    localId: s.id,
    secteur: s.secteur,
    nature_marche: s.nature_marche,
    prestations: s.prestations ?? [],
    bail_duree_mois: duree,
    bail_date_debut: debut,
    bail_date_fin: fin,
  };
}

export function toForm(ao: AppelOffre, secteurs: AoSecteur[] = ao.ao_secteurs ?? []): AoDetailFormState {
  return {
    reference: ao.reference ?? "",
    titre: ao.titre ?? "",
    donneur_ordre_libre: ao.donneur_ordre_libre ?? ao.clients?.nom_entreprise ?? "",
    lieu: ao.lieu ?? "",
    date_publication: ao.date_publication?.slice(0, 10) ?? "",
    date_limite_depot: ao.date_limite_depot?.slice(0, 10) ?? "",
    marche_pluriannuel: ao.marche_pluriannuel ?? false,
    montant_estime: ao.montant_estime != null ? String(ao.montant_estime) : "",
    statut: ao.statut,
    societe_attribuee_id: ao.societe_attribuee_id ?? "",
    lien_source: ao.lien_source ?? "",
    notes: ao.notes ?? "",
    secteurs: secteurs.length > 0 ? secteurs.map(secteurToDraft) : [emptySecteurDraft()],
  };
}

function normalizeSecteurs(secteurs: AoSecteurDraft[]) {
  return secteurs
    .filter((s) => s.secteur && s.nature_marche)
    .map((s) => ({
      secteur: s.secteur as AoSecteurCode,
      nature_marche: s.nature_marche as AoNatureMarche,
      prestations: (s.nature_marche === "travaux_neuf" ? s.prestations : []) as AoPrestation[],
      bail_duree_mois: s.bail_duree_mois ? Number(s.bail_duree_mois) : null,
      bail_date_debut: s.nature_marche === "bail" ? s.bail_date_debut || null : null,
      bail_date_fin: s.nature_marche === "bail" ? s.bail_date_fin || null : null,
    }));
}

export function toPayload(form: AoDetailFormState) {
  const secteurs = normalizeSecteurs(form.secteurs);
  const typeMarche = secteurs.map((s) => `${s.secteur} — ${s.nature_marche}`).join(" ; ");

  return {
    ao: {
      reference: form.reference.trim(),
      titre: form.titre.trim(),
      donneur_ordre_libre: form.donneur_ordre_libre.trim() || null,
      lieu: form.lieu.trim() || null,
      date_publication: form.date_publication || null,
      date_limite_depot: form.date_limite_depot || null,
      marche_pluriannuel: form.marche_pluriannuel,
      montant_estime: form.montant_estime ? Number(form.montant_estime) : null,
      statut: form.statut,
      societe_attribuee_id: form.societe_attribuee_id || null,
      lien_source: form.lien_source.trim() || null,
      notes: form.notes.trim() || null,
      type_marche: typeMarche || null,
    },
    secteurs,
  };
}

function secteursEqual(a: AoSecteurDraft[], b: AoSecteurDraft[]): boolean {
  const na = normalizeSecteurs(a);
  const nb = normalizeSecteurs(b);
  if (na.length !== nb.length) return false;
  return JSON.stringify(na) === JSON.stringify(nb);
}

export function isFormDirty(baseline: AoDetailFormState, form: AoDetailFormState): boolean {
  const keys: (keyof AoDetailFormState)[] = [
    "reference",
    "titre",
    "donneur_ordre_libre",
    "lieu",
    "date_publication",
    "date_limite_depot",
    "montant_estime",
    "statut",
    "societe_attribuee_id",
    "lien_source",
    "notes",
  ];
  for (const key of keys) {
    const a = String(form[key] ?? "").trim();
    const b = String(baseline[key] ?? "").trim();
    if (a !== b) return true;
  }
  if (form.marche_pluriannuel !== baseline.marche_pluriannuel) return true;
  if (!secteursEqual(form.secteurs, baseline.secteurs)) return true;
  return false;
}
