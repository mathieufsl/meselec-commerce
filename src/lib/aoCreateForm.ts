import type {
  AoNatureMarche,
  AoPrestation,
  AoSecteurCode,
  AoStatut,
} from "@/lib/commerceTypes";

export type AoSecteurDraft = {
  localId: string;
  secteur: AoSecteurCode | "";
  nature_marche: AoNatureMarche | "";
  prestations: AoPrestation[];
  bail_duree_mois: string;
  bail_date_debut: string;
  bail_date_fin: string;
};

export type AoCreateFormState = {
  reference: string;
  titre: string;
  donneur_ordre_libre: string;
  lieu: string;
  date_publication: string;
  date_limite_depot: string;
  marche_pluriannuel: boolean;
  societe_attribuee_id: string;
  montant_estime: string;
  secteurs: AoSecteurDraft[];
};

export function emptySecteurDraft(): AoSecteurDraft {
  return {
    localId: crypto.randomUUID(),
    secteur: "",
    nature_marche: "",
    prestations: [],
    bail_duree_mois: "",
    bail_date_debut: "",
    bail_date_fin: "",
  };
}

/** Calcule la date d'expiration d'un bail : entrée en vigueur + durée en mois. */
export function suggestBailExpirationDate(debut: string, dureeMois: string): string {
  const months = Number(dureeMois);
  if (!debut || !Number.isFinite(months) || months <= 0) return "";
  const parts = debut.split("-").map(Number);
  const y = parts[0];
  const m = parts[1];
  const d = parts[2];
  if (!y || !m || !d) return "";
  const date = new Date(y, m - 1, d);
  date.setMonth(date.getMonth() + months);
  const yy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

export function patchBailSecteurFields(
  secteur: AoSecteurDraft,
  patch: Partial<AoSecteurDraft>,
): Partial<AoSecteurDraft> {
  const next = { ...patch };
  if ("bail_date_debut" in patch || "bail_duree_mois" in patch) {
    const suggested = suggestBailExpirationDate(
      patch.bail_date_debut ?? secteur.bail_date_debut,
      patch.bail_duree_mois ?? secteur.bail_duree_mois,
    );
    if (suggested) next.bail_date_fin = suggested;
  }
  return next;
}

export function emptyCreateForm(defaultSocieteId = ""): AoCreateFormState {
  return {
    reference: "",
    titre: "",
    donneur_ordre_libre: "",
    lieu: "",
    date_publication: "",
    date_limite_depot: "",
    marche_pluriannuel: false,
    societe_attribuee_id: defaultSocieteId,
    montant_estime: "",
    secteurs: [emptySecteurDraft()],
  };
}

export function validateCreateStep(
  stepId: string,
  form: AoCreateFormState,
): string | null {
  switch (stepId) {
    case "identification":
      if (!form.reference.trim()) return "La référence est obligatoire.";
      if (!form.titre.trim()) return "Le titre est obligatoire.";
      return null;
    case "calendrier":
      return null;
    case "organisation":
      if (!form.societe_attribuee_id) return "Choisissez une société d'exploitation.";
      return null;
    case "secteurs": {
      const valid = form.secteurs.filter((s) => s.secteur);
      if (valid.length === 0) return "Ajoutez au moins un secteur.";
      const codes = valid.map((s) => s.secteur);
      if (new Set(codes).size !== codes.length) return "Chaque secteur ne peut être choisi qu'une fois.";
      for (const s of valid) {
        if (!s.nature_marche) return "Indiquez la nature du marché pour chaque secteur.";
        if (s.nature_marche === "travaux_neuf" && s.prestations.length === 0) {
          return "Sélectionnez au moins une prestation (pose, fourniture, autre).";
        }
        if (s.nature_marche === "bail") {
          if (!s.bail_date_debut || !s.bail_date_fin) {
            return "Renseignez les dates de début et d'expiration du bail.";
          }
        }
      }
      return null;
    }
    case "recap":
      return validateCreateStep("identification", form) ?? validateCreateStep("secteurs", form);
    default:
      return null;
  }
}

export function toCreatePayload(form: AoCreateFormState, statut: AoStatut = "non_traite") {
  const secteurs = form.secteurs
    .filter((s) => s.secteur && s.nature_marche)
    .map((s) => ({
      secteur: s.secteur as AoSecteurCode,
      nature_marche: s.nature_marche as AoNatureMarche,
      prestations: s.nature_marche === "travaux_neuf" ? s.prestations : [],
      bail_duree_mois: s.bail_duree_mois ? Number(s.bail_duree_mois) : null,
      bail_date_debut: s.nature_marche === "bail" ? s.bail_date_debut || null : null,
      bail_date_fin: s.nature_marche === "bail" ? s.bail_date_fin || null : null,
    }));

  const typeMarche = secteurs
    .map((s) => `${s.secteur} — ${s.nature_marche}`)
    .join(" ; ");

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
      societe_attribuee_id: form.societe_attribuee_id || null,
      type_marche: typeMarche || null,
      statut,
    },
    secteurs,
  };
}
