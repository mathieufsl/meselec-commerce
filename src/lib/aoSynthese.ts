/** Utilitaires d'affichage de la synthèse d'un AO. */

/** Jours restants avant l'échéance (négatif si dépassée), ou null sans date. */
export function joursAvant(iso: string, aujourdhui = new Date()): number | null {
  if (!iso) return null;
  const echeance = new Date(`${iso}T00:00:00`);
  const jour = new Date(aujourdhui.getFullYear(), aujourdhui.getMonth(), aujourdhui.getDate());
  return Math.round((echeance.getTime() - jour.getTime()) / 86_400_000);
}

/** « 93 » → « Dép. 93 » ; un lieu en clair reste tel quel. */
export function libelleLieu(lieu: string): string {
  const l = lieu.trim();
  return /^(\d{2,3}|2[AB])$/i.test(l) ? `Dép. ${l}` : l;
}
