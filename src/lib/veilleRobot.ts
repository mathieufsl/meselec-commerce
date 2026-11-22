/** Exécution du robot DCE (workflow GitHub Actions), vue depuis l'appli. */
export type ExecutionRobot = {
  id: number;
  /** queued, waiting, pending, in_progress, completed… */
  statut: string;
  /** success, failure, cancelled… (null tant que l'exécution tourne). */
  conclusion: string | null;
  debut: string;
  url: string;
  /** schedule (passage du matin) ou workflow_dispatch (lancé depuis l'appli). */
  declenchement: string;
};

export type DiagnosticAttente = {
  texte: string;
  url: string | null;
  /** La demande semble perdue : proposer de la relancer. */
  relancer: boolean;
  /** Affichage en alerte (échec, blocage) plutôt qu'en attente normale. */
  alerte: boolean;
};

const MINUTE = 60_000;
const EN_ATTENTE = new Set(["queued", "waiting", "pending", "requested"]);

function depuis(iso: string, maintenant: number): string {
  const min = Math.max(0, Math.round((maintenant - new Date(iso).getTime()) / MINUTE));
  if (min < 1) return "moins d'une minute";
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  return `${h} h ${String(min % 60).padStart(2, "0")}`;
}

/**
 * Où en est une demande d'analyse que le robot n'a pas encore prise en main
 * (aucune étape écrite par le robot) : file d'attente derrière une autre
 * exécution, installation, échec au démarrage, ou demande perdue.
 * `executions` : null si l'état GitHub est inconnu (pas de jeton, réseau).
 */
export function diagnostiquerAttente(
  demandeAt: string,
  executions: ExecutionRobot[] | null,
  maintenant: number = Date.now(),
): DiagnosticAttente | null {
  const demande = new Date(demandeAt).getTime();
  const age = maintenant - demande;

  if (!executions) {
    return age > 10 * MINUTE
      ? {
          texte: `Le robot n'a pas démarré depuis ${depuis(demandeAt, maintenant)}`,
          url: null,
          relancer: true,
          alerte: true,
        }
      : null;
  }

  const enCours = executions.find((e) => e.statut === "in_progress");
  // GitHub crée l'exécution au moment de la demande (marge pour l'écart d'horloge).
  const apres = executions.filter((e) => new Date(e.debut).getTime() >= demande - MINUTE);
  const pourDemande = apres.find((e) => e.statut !== "completed") ?? apres[0] ?? null;

  const fileAttente = (url: string): DiagnosticAttente => {
    const bloque = enCours && maintenant - new Date(enCours.debut).getTime() > 40 * MINUTE;
    const quoi =
      enCours?.declenchement === "schedule" ? "le passage du matin" : "une autre exécution";
    return {
      texte: enCours
        ? `En file d'attente : le robot termine ${quoi}, démarrée il y a ${depuis(enCours.debut, maintenant)}` +
          (bloque ? " (elle semble bloquée : tu peux l'annuler sur GitHub)" : "")
        : "En file d'attente chez GitHub",
      url: enCours?.url ?? url,
      relancer: false,
      alerte: Boolean(bloque),
    };
  };

  if (pourDemande) {
    if (EN_ATTENTE.has(pourDemande.statut)) return fileAttente(pourDemande.url);
    if (pourDemande.statut === "in_progress")
      return {
        texte: "Robot en préparation (installation, 2 à 4 min)",
        url: pourDemande.url,
        relancer: false,
        alerte: false,
      };
    return {
      texte:
        pourDemande.conclusion === "success"
          ? "Le robot s'est terminé sans prendre cette demande"
          : pourDemande.conclusion === "cancelled"
            ? "L'exécution du robot a été annulée"
            : "Le robot s'est arrêté en erreur avant de lire le DCE",
      url: pourDemande.url,
      relancer: true,
      alerte: true,
    };
  }

  // Aucune exécution créée pour cette demande.
  if (enCours) return fileAttente(enCours.url);
  return age > 3 * MINUTE
    ? {
        texte: "Le robot n'a pas été lancé par GitHub",
        url: null,
        relancer: true,
        alerte: true,
      }
    : null;
}
