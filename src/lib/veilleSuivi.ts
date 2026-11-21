/**
 * Suivi des traitements de la page Veille, annonce par annonce :
 * - « en cours » : envoi de fichiers, qualification IA, résumé IA (côté
 *   navigateur ; l'analyse du robot DCE se lit directement sur l'annonce) ;
 * - « à revoir » : un traitement a fini (ou échoué) pendant qu'on regardait
 *   une autre annonce. La marque disparaît quand on ouvre l'annonce.
 * Les marques sont gardées dans le navigateur (localStorage) d'une visite à l'autre.
 */
import { useSyncExternalStore } from "react";

export type MarqueSuivi = "pret" | "erreur";

type Etat = {
  /** id annonce → (clé du traitement → libellé affiché) */
  activites: Record<string, Record<string, string>>;
  marques: Record<string, MarqueSuivi>;
};

const CLE_STOCKAGE = "veille-suivi-marques";

function lireMarques(): Record<string, MarqueSuivi> {
  try {
    const brut = window.localStorage.getItem(CLE_STOCKAGE);
    return brut ? (JSON.parse(brut) as Record<string, MarqueSuivi>) : {};
  } catch {
    return {};
  }
}

let etat: Etat = { activites: {}, marques: {} };
let charge = false;
let courantId: string | null = null;
const abonnes = new Set<() => void>();

function publier(suivant: Etat) {
  etat = suivant;
  try {
    window.localStorage.setItem(CLE_STOCKAGE, JSON.stringify(etat.marques));
  } catch {
    // Stockage indisponible (navigation privée) : les marques restent en mémoire.
  }
  for (const f of abonnes) f();
}

function abonner(f: () => void) {
  if (!charge && typeof window !== "undefined") {
    charge = true;
    etat = { ...etat, marques: { ...lireMarques(), ...etat.marques } };
  }
  abonnes.add(f);
  return () => abonnes.delete(f);
}

const ETAT_VIDE: Etat = { activites: {}, marques: {} };

export function useSuiviVeille(): Etat {
  return useSyncExternalStore(
    abonner,
    () => etat,
    () => ETAT_VIDE,
  );
}

/** Annonce actuellement ouverte : ce qui s'y termine est déjà sous les yeux, pas de marque. */
export function definirAnnonceOuverte(id: string | null) {
  courantId = id;
  if (id && etat.marques[id]) {
    const { [id]: _vu, ...reste } = etat.marques;
    publier({ ...etat, marques: reste });
  }
}

export function marquerAnnonce(id: string, marque: MarqueSuivi) {
  if (id === courantId) return;
  publier({ ...etat, marques: { ...etat.marques, [id]: marque } });
}

export function debuterActivite(id: string, cle: string, libelle: string) {
  publier({
    ...etat,
    activites: { ...etat.activites, [id]: { ...etat.activites[id], [cle]: libelle } },
  });
}

/** Fin d'un traitement ; `resultat` pose une marque « à revoir » si l'annonce n'est pas ouverte. */
export function finirActivite(id: string, cle: string, resultat?: MarqueSuivi) {
  const { [cle]: _fini, ...reste } = etat.activites[id] ?? {};
  const activites = { ...etat.activites };
  if (Object.keys(reste).length) activites[id] = reste;
  else delete activites[id];
  const marques = resultat && id !== courantId ? { ...etat.marques, [id]: resultat } : etat.marques;
  publier({ ...etat, activites, marques });
}
